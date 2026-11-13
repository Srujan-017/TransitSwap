import mongoose from "mongoose"
import { User } from "../models/User"
import { accessibilityService } from "./accessibilityService"
import { crowdService } from "./crowdService"
import { multimodalService } from "./multimodalService"
import { calculateWeatherImpact, weatherService } from "./weatherService"
import { reliabilityService } from "./reliabilityService"
import { transitDnaService } from "./transitDnaService"
import { mlPreferenceService } from "./ml/mlPreferenceService"
import { sustainabilityService } from "./sustainabilityService"
import { parseLocalDateTime } from "../utils/dateTime"
import { describeRoute } from "../utils/routeDescription"
import { AppError } from "../middleware/errorHandler"
import {
  PROFILE_POLICIES, buildProfileFit, compareKeys, coreSignature, evaluatePolicy, fitKey, isPolicyProfile,
  type ProfilePolicy,
} from "./profilePolicy"
import type { MultimodalRequest, MultimodalRoute } from "../types/multimodal"
import type { AccessibilityEvaluation, EnrichedRoute, ExcludedRouteSummary, RouteCrowdSummary } from "../types/intelligence"

export const NO_ACCESSIBLE_ROUTE_MESSAGE =
  "No accessible multimodal route found for the selected profile in the current demo dataset."

// Completion-phase 2 (B3): turns an excluded route + its typed rejection into the
// shape the client shows ("this route existed, and here is why it was ruled out").
export function toExcludedSummary(route: MultimodalRoute, evaluation: AccessibilityEvaluation): ExcludedRouteSummary {
  return {
    summary: describeRoute(route),
    durationMinutes: Math.round(route.totalDurationSeconds / 60),
    walkingMeters: Math.round(route.totalWalkingMeters),
    reasonType: evaluation.blockedReasonType ?? "station",
    reason: evaluation.rejectionReason ?? evaluation.summary,
  }
}

const MAX_OPTIONS_SHOWN = 3
const MAX_EXCLUDED_SHOWN = 12

// Distinct excluded routes, interleaved across reason types so a long list of (say) walking exclusions
// cannot push the crowd or station reasons out of the capped list the rider sees.
function dedupeExcluded(list: ExcludedRouteSummary[]): ExcludedRouteSummary[] {
  const seen = new Set<string>()
  const byType = new Map<string, ExcludedRouteSummary[]>()
  for (const item of list) {
    const key = `${item.summary}|${item.reasonType}`
    if (seen.has(key)) continue
    seen.add(key)
    const group = byType.get(item.reasonType)
    if (group) group.push(item)
    else byType.set(item.reasonType, [item])
  }
  const groups = [...byType.values()]
  const out: ExcludedRouteSummary[] = []
  for (let i = 0; out.length < MAX_EXCLUDED_SHOWN && groups.some((g) => i < g.length); i++) {
    for (const group of groups) if (i < group.length && out.length < MAX_EXCLUDED_SHOWN) out.push(group[i])
  }
  return out
}

interface ProfileSelection {
  routes: Array<MultimodalRoute & { accessibility?: AccessibilityEvaluation }>
  crowd: Map<string, RouteCrowdSummary>
  excludedRoutes: ExcludedRouteSummary[]
  suitableCount: number
}

/**
 * Candidate selection for an accessibility profile. Generates the full pool (including autos for
 * the first and last mile and a door-to-door auto), applies the station and walking rules, then the
 * profile rules (modes, walking caps, crowd, metro hours), and keeps the best option for each
 * distinct way of travelling — at most three, best first.
 */
async function selectForProfile(body: MultimodalRequest, policy: ProfilePolicy, travelTime: Date): Promise<ProfileSelection> {
  const pool = await multimodalService.generateRoutes(body, { pool: true })
  if (pool.length === 0) {
    throw new AppError("No multimodal route found. The selected locations may be outside the demo transit service area.", 404)
  }

  const { feasible, excluded } = await accessibilityService.partitionRoutes(pool, policy.profile)
  const excludedAll: ExcludedRouteSummary[] = excluded.map(({ route, evaluation }) => toExcludedSummary(route, evaluation))

  const withCrowd = await Promise.all(feasible.map(async (route) => ({ route, crowd: await crowdService.routeSummary(route, travelTime) })))
  const suitable: Array<{ route: (typeof feasible)[number]; crowd: RouteCrowdSummary; key: number[] }> = []
  for (const { route, crowd } of withCrowd) {
    const verdict = evaluatePolicy(route, crowd, travelTime, policy)
    if (verdict.blocked) {
      excludedAll.push({
        summary: describeRoute(route),
        durationMinutes: Math.round(route.totalDurationSeconds / 60),
        walkingMeters: Math.round(route.totalWalkingMeters),
        reasonType: verdict.reasonType!,
        reason: verdict.reason!,
      })
    } else {
      suitable.push({ route, crowd, key: fitKey(route, crowd.level, policy) })
    }
  }

  if (suitable.length === 0) {
    throw new AppError(NO_ACCESSIBLE_ROUTE_MESSAGE, 404, { excludedRoutes: dedupeExcluded(excludedAll) })
  }

  // Never offer a route that another suitable one beats on time, fare, walking AND crowd — e.g. an
  // auto -> metro -> auto that is slower and dearer than a plain auto.
  const crowdRank = (level?: string) => (level === "HIGH" ? 2 : level === "MEDIUM" ? 1 : 0)
  const beats = (a: (typeof suitable)[number], b: (typeof suitable)[number]) => {
    const noWorse =
      a.route.totalDurationSeconds <= b.route.totalDurationSeconds && a.route.totalFare <= b.route.totalFare &&
      a.route.totalWalkingMeters <= b.route.totalWalkingMeters && crowdRank(a.crowd.level) <= crowdRank(b.crowd.level)
    const better =
      a.route.totalDurationSeconds < b.route.totalDurationSeconds || a.route.totalFare < b.route.totalFare ||
      a.route.totalWalkingMeters < b.route.totalWalkingMeters || crowdRank(a.crowd.level) < crowdRank(b.crowd.level)
    return noWorse && better
  }
  const undominated = suitable.filter((entry) => !suitable.some((other) => other !== entry && beats(other, entry)))
  suitable.length = 0
  suitable.push(...undominated)

  suitable.sort((a, b) => compareKeys(a.key, b.key))
  const bestPerOption = new Map<string, (typeof suitable)[number]>()
  for (const entry of suitable) {
    const core = coreSignature(entry.route)
    if (!bestPerOption.has(core)) bestPerOption.set(core, entry)
  }
  const chosen = [...bestPerOption.values()].slice(0, MAX_OPTIONS_SHOWN)

  const routes = await Promise.all(chosen.map((entry) => multimodalService.snapRouteGeometry(entry.route)))
  const crowd = new Map(chosen.map((entry, i) => [routes[i].id, entry.crowd] as const))
  return { routes, crowd, excludedRoutes: dedupeExcluded(excludedAll), suitableCount: bestPerOption.size }
}

// Labels, the "why this suits you" explanation, and wheelchair-specific wording for the chosen routes.
function decorateForProfile(routes: EnrichedRoute[], policy: ProfilePolicy, suitableCount: number) {
  routes.forEach((route, index) => {
    const rank = index + 1
    route.profileFit = buildProfileFit(route, rank, suitableCount, routes, policy)
    route.labelDisplay = rank === 1 ? "Best for you" : "Also suitable"
    route.labelColor = rank === 1 ? "#0f766e" : "#475569"
    if (policy.autoLabel !== "auto") {
      route.segments = route.segments.map((segment) =>
        segment.mode === "auto" ? { ...segment, instruction: segment.instruction.replace(/^Take Auto/, `Take an ${policy.autoLabel}`) } : segment,
      )
      route.summary = route.summary.replace(/Auto/g, "Auto / accessible cab")
    }
  })
}

export interface TripPlan {
  rankedRoutes: EnrichedRoute[]
  statusMessage: string
  isPersonalized: boolean
  excludedRoutes: ExcludedRouteSummary[]
  busAlternativeNote: string
}

/**
 * The whole route-planning pipeline (candidate generation -> hard accessibility constraints ->
 * enrichment -> crowd constraint -> ranking -> explanations). Lives here, not in the controller,
 * so the HTTP endpoint and the offline test matrix run exactly the same code.
 * Throws AppError (404) when no route exists or every route is excluded.
 */
export async function planTrip(body: MultimodalRequest, options: { userId?: string } = {}): Promise<TripPlan> {
  {
    const profile = body.profile ?? "standard"
    const weather = await weatherService.getCurrent(body.destination.latitude, body.destination.longitude)
    // The time the rider will actually be at the stations — the chosen departure
    // time, or now — against which historical crowd data is matched (B4).
    const travelTime = parseLocalDateTime(body.departureTime) ?? new Date()

    // Accessibility profiles: candidates are chosen by the profile's own rules (profilePolicy.ts) and
    // come back already ordered, best first. Everyone else keeps the original flow.
    const policy = isPolicyProfile(profile) ? PROFILE_POLICIES[profile] : undefined
    let accessibilityFiltered: Array<MultimodalRoute & { accessibility?: AccessibilityEvaluation }>
    let excludedRoutes: ExcludedRouteSummary[]
    const precomputedCrowd = new Map<string, RouteCrowdSummary>()
    let suitableCount = 0

    if (policy) {
      const selection = await selectForProfile(body, policy, travelTime)
      accessibilityFiltered = selection.routes
      excludedRoutes = selection.excludedRoutes
      suitableCount = selection.suitableCount
      for (const [id, crowd] of selection.crowd) precomputedCrowd.set(id, crowd)
    } else {
      const routes = await multimodalService.generateRoutes(body)
      if (routes.length === 0) {
        throw new AppError(
          "No multimodal route found. The selected locations may be outside the demo transit service area.",
          404,
        )
      }
      const partition = await accessibilityService.partitionRoutes(routes, profile)
      accessibilityFiltered = partition.feasible
      excludedRoutes = partition.excluded.map(({ route, evaluation }) => toExcludedSummary(route, evaluation))
    }
    const allWalkingMeters = accessibilityFiltered.map((route) => route.totalWalkingMeters)

    // Load authenticated user's profile preferences
    let userPreferences: import("../types").UserPreferences | undefined = undefined
    const authUserId = options.userId

    if (authUserId && mongoose.connection.readyState === 1) {
      try {
        const dbUser = await User.findById(authUserId)
        if (dbUser?.preferences) {
          userPreferences = dbUser.preferences
        }
      } catch {
        // Non-fatal — fall back to baseline defaults
      }
    }

    // Phase 4 fix (B2) — the enrichment loop below used to score each route
    // with User.transitDNA.learnedWeights ("personalizedWeights"), but
    // mlPreferenceService.rankRoutes() (called further down, after
    // enrichment) scores from UserPreferenceModel via getModelStatus() and
    // always overwrites transitDnaScore whenever there are 2+ candidate
    // routes — so that computation was discarded on every multi-route
    // request. It was NOT discarded for a single-route result (rankRoutes()
    // returns a 1-route set unchanged), so fetching the weights from the
    // same source used below keeps that one real case correct too, instead
    // of silently reading a value (User.transitDNA.learnedWeights) nothing
    // else in the system treats as authoritative.
    const { weights: scoringWeights } = await mlPreferenceService.getModelStatus(authUserId, profile, userPreferences)

    // Enrich each route with weather, crowd, reliability, and intelligence scores
    const enriched: EnrichedRoute[] = await Promise.all(
      accessibilityFiltered.map(async (route, index) => {
        const enrichedRoute: EnrichedRoute = {
          ...route,
          weatherImpact: calculateWeatherImpact(
            weather,
            route.totalWalkingMeters,
            allWalkingMeters.filter((_, otherIndex) => otherIndex !== index),
          ),
          crowd: precomputedCrowd.get(route.id) ?? (await crowdService.routeSummary(route, travelTime)),
        }

        // Bug fix — confirmed by manually testing every profile: a route
        // through a known HIGH-crowd station was ranked and shown with no
        // indication at all that crowding might matter for a profile like
        // pregnant/stroller/senior/wheelchair/luggage/reduced_mobility — the
        // soft ranking weight alone (mlPreferenceService.ts) can still be
        // outvoted by faster/cheaper options, so the rider needs to actually
        // SEE this, the same way they already see a walking-distance warning
        // (accessibilityService.ts's walkingWarnings). Appended here, after
        // crowd is computed, rather than inside accessibilityService itself,
        // so the existing hard-constraint accessibility engine stays
        // untouched — this is a pure warning, never a route rejection, and
        // only fires on a genuinely known (not "UNAVAILABLE") HIGH reading.
        if (
          profile !== "standard" &&
          enrichedRoute.crowd?.level === "HIGH" &&
          enrichedRoute.crowd?.source !== "UNAVAILABLE" &&
          enrichedRoute.accessibility
        ) {
          enrichedRoute.accessibility.warnings.push(
            `This route passes through a HIGH-crowd station — may be uncomfortable or difficult to navigate for your selected profile.`,
          )
        }

        // Rule-based prototype reliability estimate (not a calibrated ML model)
        enrichedRoute.reliability = reliabilityService.calculateReliability(enrichedRoute)

        // Data-driven 90% prediction interval derived from historical journey duration prediction errors
        enrichedRoute.confidenceInterval = await reliabilityService.calculateConfidenceInterval(
          enrichedRoute,
          body.departureTime,
        )

        // Data-Driven Monte Carlo simulation (1,000 empirical trials over historical delay distribution)
        enrichedRoute.missedConnectionRisk = await reliabilityService.calculateMissedConnectionRisk(enrichedRoute)

        // Smart departure suggestion — null when no departure time was supplied,
        // so the frontend can honestly ask the user to pick one.
        enrichedRoute.departureSuggestion =
          (await reliabilityService.calculateSmartDeparture(enrichedRoute, body.departureTime)) ?? undefined

        // Last-mile connectivity options
        enrichedRoute.lastMileOptions = reliabilityService.calculateLastMileOptions(enrichedRoute)

        // Initial feature score using TransitDNA and user preferences. Only
        // user-visible when mlPreferenceService.rankRoutes() below leaves a
        // single route unchanged; otherwise it recomputes this from the same
        // scoringWeights source anyway.
        enrichedRoute.transitDnaScore = transitDnaService.scoreRoute(
          enrichedRoute,
          scoringWeights,
          profile,
          userPreferences,
        )

        // Problem 9 — relative (0-100) sustainability score, an additional
        // decision-support metric. Not part of the 7-feature ML ranking model.
        const sustainability = sustainabilityService.calculateSustainability(enrichedRoute)
        enrichedRoute.sustainabilityScore = sustainability.sustainabilityScore
        enrichedRoute.sustainabilitySummary = sustainability.sustainabilitySummary

        return enrichedRoute
      }),
    )

    if (enriched.length === 0) {
      throw new AppError(NO_ACCESSIBLE_ROUTE_MESSAGE, 404, { excludedRoutes })
    }

    const crowdFiltered = enriched

    // Pairwise Logistic Regression ML Learning-to-Rank Engine + TransitDNA Explicit User Preferences
    // For accessibility profiles the order was already decided by the profile's rules (best first); the
    // learned ranker is for everyone else, and personalisation never overrides a safety rule.
    const { rankedRoutes, statusMessage, isPersonalized } = policy
      ? {
          rankedRoutes: crowdFiltered,
          statusMessage: `${policy.label} profile rules: autos and metro first, limited walking, no crowded metro, buses only where allowed`,
          isPersonalized: false,
        }
      : await mlPreferenceService.rankRoutes(authUserId, crowdFiltered, profile, userPreferences)

    if (policy) decorateForProfile(rankedRoutes, policy, suitableCount)

    // Attach plain-language explainability reasons and an honest personalization
    // status to each route (Problem 23 — surfaced in the UI as a badge, distinct
    // from a merely profile-based recommendation).
    rankedRoutes.forEach((route) => {
      route.whyRecommended = transitDnaService.generateWhyRecommended(
        route,
        rankedRoutes,
        profile,
        userPreferences,
        isPersonalized,
      )
      route.isPersonalized = isPersonalized
    })

    // Bug fix — confirmed by manually testing: a rider near bus stops at both
    // ends of their trip could still see zero bus-involving routes with no
    // explanation, because the graph search (buildTransitGraph) correctly
    // explored a bus/bus-transfer path but then correctly Pareto-filtered it
    // out for being strictly worse than the metro route on every measure —
    // a real result, not a bug, but invisible to the rider, who has no way
    // to tell "no bus exists here" apart from "bus exists but loses." Reuses
    // the already-exported, already-tested getNearbyTransit() to check bus
    // proximity at both ends; never changes which routes are recommended.
    const noBusInResults = !policy && !rankedRoutes.some((route) => route.segments.some((seg) => seg.mode === "bus"))
    let busAlternativeNote = ""
    if (noBusInResults) {
      const [originBus, destinationBus] = await Promise.all([
        multimodalService.getNearbyTransit(body.origin.latitude, body.origin.longitude),
        multimodalService.getNearbyTransit(body.destination.latitude, body.destination.longitude),
      ])
      if (originBus.bus && destinationBus.bus) {
        busAlternativeNote =
          ` A bus stop exists near both your origin (${originBus.bus.stationName}) and destination (${destinationBus.bus.stationName}), ` +
          `but TransitSwap's route search found no bus-based path that beats the recommended route on time, fare, walking, or transfers for this specific trip.`
      }
    }

    return { rankedRoutes, statusMessage, isPersonalized, excludedRoutes, busAlternativeNote: busAlternativeNote.trim() }
  }
}
