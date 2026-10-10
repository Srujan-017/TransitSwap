import type { Request, Response, NextFunction } from "express"
import mongoose from "mongoose"
import { User } from "../models/User"
import { accessibilityService } from "../services/accessibilityService"
import { crowdService } from "../services/crowdService"
import { multimodalService } from "../services/multimodalService"
import type { NearbyTransitResult } from "../services/multimodalService"
import { calculateWeatherImpact, weatherService } from "../services/weatherService"
import { reliabilityService } from "../services/reliabilityService"
import { transitDnaService } from "../services/transitDnaService"
import { mlPreferenceService } from "../services/ml/mlPreferenceService"
import { sustainabilityService } from "../services/sustainabilityService"
import { sendSuccess } from "../utils/response"
import { AppError } from "../middleware/errorHandler"
import type { MultimodalRequest } from "../types/multimodal"
import type { EnrichedRoute } from "../types/intelligence"

export async function calculateMultimodalRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as MultimodalRequest
    const routes = await multimodalService.generateRoutes(body)

    if (routes.length === 0) {
      throw new AppError(
        "No multimodal route found. The selected locations may be outside the demo transit service area.",
        404,
      )
    }

    const profile = body.profile ?? "standard"
    const weather = await weatherService.getCurrent(body.destination.latitude, body.destination.longitude)
    const accessibilityFiltered = await accessibilityService.filterRoutes(routes, profile)
    const allWalkingMeters = accessibilityFiltered.map((route) => route.totalWalkingMeters)

    // Load authenticated user's profile preferences
    let userPreferences: import("../types").UserPreferences | undefined = undefined
    const authUserId = (req as unknown as { user?: { userId: string } }).user?.userId

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
          crowd: await crowdService.routeSummary(route),
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
      throw new AppError(
        "No accessible multimodal route found for the selected profile in the current demo dataset.",
        404,
      )
    }

    // Bug fix — confirmed by manually testing every profile: a route through
    // a known HIGH-crowd station was never excluded for pregnant, senior,
    // stroller, luggage, or wheelchair profiles — only the soft warning above
    // and the ranking weight (mlPreferenceService.ts) existed, and both can
    // be outvoted by a faster/cheaper alternative. Crowd data only exists
    // after the enrichment loop above runs (accessibilityService.filterRoutes
    // executes before crowd is computed), so this is a second, stricter pass
    // layered on top rather than folded into accessibilityService itself —
    // reuses the crowd already computed per-route above, no extra DB queries.
    // reduced_mobility is deliberately excluded (not part of the reported cases).
    const CROWD_HARD_BLOCK_PROFILES = new Set(["pregnant", "senior", "stroller", "luggage", "wheelchair"])
    const crowdFiltered = enriched.filter((route) => {
      if (!CROWD_HARD_BLOCK_PROFILES.has(profile)) return true
      if (route.crowd?.level !== "HIGH" || route.crowd?.source === "UNAVAILABLE") return true
      if (route.accessibility) {
        route.accessibility.blocked = true
        route.accessibility.accessibilityScore = 0
        route.accessibility.rejectionReason =
          "Route excluded: passes through a HIGH-crowd station, unsuitable for your selected profile."
        route.accessibility.summary = route.accessibility.rejectionReason
        route.accessibility.blockedReasonType = "crowd"
      }
      return false
    })

    if (crowdFiltered.length === 0) {
      throw new AppError(
        "No accessible multimodal route found for the selected profile in the current demo dataset.",
        404,
      )
    }

    // Pairwise Logistic Regression ML Learning-to-Rank Engine + TransitDNA Explicit User Preferences
    const { rankedRoutes, statusMessage, isPersonalized } = await mlPreferenceService.rankRoutes(
      authUserId,
      crowdFiltered,
      profile,
      userPreferences,
    )

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
    const noBusInResults = !rankedRoutes.some((route) => route.segments.some((seg) => seg.mode === "bus"))
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

    // Not sendSuccess() here — busAlternativeNote is a new, optional,
    // top-level field alongside the unchanged `data` array, so every
    // existing consumer (frontend service, tests) that reads only
    // `data`/`message` is completely unaffected.
    res.status(200).json({
      success: true,
      data: rankedRoutes,
      message: `TransitSwap ML Intelligence Engine: Pairwise Logistic Regression ranker active (${statusMessage}). Evaluated with weather, accessibility, reliability & Monte Carlo simulation.`,
      ...(busAlternativeNote ? { busAlternativeNote: busAlternativeNote.trim() } : {}),
    })
  } catch (err: unknown) {
    next(err)
  }
}

// ── Problem 11 — Nearby Transit ─────────────────────────────────────────────
// Reuses multimodalService.getNearbyTransit() (which itself reuses the existing
// nearestMetro()/nearestBusStop()/haversine() helpers), then enriches each result
// with the existing accessibilityService and crowdService — no duplicate crowd
// algorithm and no duplicate accessibility dataset are introduced here.

interface NearbyTransitStationView extends NearbyTransitResult {
  accessibility: {
    status: string
    hasLift: boolean | null
    hasRamp: boolean | null
  } | "unknown"
  crowd: {
    level?: "LOW" | "MEDIUM" | "HIGH"
    source: string
  } | "unavailable"
}

async function enrichNearbyStation(station: NearbyTransitResult): Promise<NearbyTransitStationView> {
  const [accessibilityRecord, crowdEstimate] = await Promise.all([
    accessibilityService.getStation(station.stationId).catch(() => null),
    crowdService.stationEstimate(station.stationId, station.stationName).catch(() => null),
  ])

  return {
    ...station,
    accessibility: accessibilityRecord
      ? {
          status: accessibilityRecord.status,
          hasLift: accessibilityRecord.hasLift,
          hasRamp: accessibilityRecord.hasRamp,
        }
      : "unknown",
    crowd: crowdEstimate && crowdEstimate.source !== "UNAVAILABLE"
      ? { level: crowdEstimate.crowdLevel, source: crowdEstimate.source }
      : "unavailable",
  }
}

export async function getNearbyTransit(req: Request, res: Response, next: NextFunction) {
  try {
    const latitude = Number(req.query.latitude)
    const longitude = Number(req.query.longitude)

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new AppError("latitude must be a number between -90 and 90.", 400)
    }
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new AppError("longitude must be a number between -180 and 180.", 400)
    }

    const nearby = multimodalService.getNearbyTransit(latitude, longitude)

    if (!nearby.metro && !nearby.bus) {
      sendSuccess(
        res,
        { metro: null, bus: null },
        "No nearby transit found in the current demonstration network.",
      )
      return
    }

    const [metro, bus] = await Promise.all([
      nearby.metro ? enrichNearbyStation(nearby.metro) : Promise.resolve(null),
      nearby.bus ? enrichNearbyStation(nearby.bus) : Promise.resolve(null),
    ])

    sendSuccess(res, { metro, bus }, "Nearby transit found in the current demonstration network.")
  } catch (err: unknown) {
    next(err)
  }
}
