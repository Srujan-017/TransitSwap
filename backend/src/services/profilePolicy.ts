import type { MultimodalRoute, RouteSegment } from "../types/multimodal"
import type { CrowdLevel, ExclusionReasonType, ProfileFit, RouteCrowdSummary } from "../types/intelligence"

/**
 * Travel rules for riders with accessibility needs — the single place they live.
 *
 * Wheelchair users, seniors, pregnant riders, stroller users, riders with heavy luggage and
 * riders with reduced mobility each get ONE best route chosen by these rules, not a ranked
 * list of everything. The rules (agreed with the project owner, Nov 2026):
 *   - autos and metro come first; autos cover the first and last mile instead of long walks;
 *   - walking is capped (per leg and in total) — a wheelchair rider rolls essentially nowhere;
 *   - a HIGH-crowd metro leg is never suggested;
 *   - buses: never for wheelchair / pregnant / stroller; for the others only when the bus is
 *     LOW crowd, and always ranked below metro and auto;
 *   - a door-to-door auto always exists inside Bengaluru, so there is always an answer.
 * The numeric limits (walking caps, metro hours) are design assumptions, not clinically
 * validated figures, and are listed in FEATURE_UPGRADE_PLAN.md §3.
 */

export const POLICY_PROFILES = ["wheelchair", "senior", "pregnant", "stroller", "luggage", "reduced_mobility"] as const
export type PolicyProfile = (typeof POLICY_PROFILES)[number]

export function isPolicyProfile(profile: unknown): profile is PolicyProfile {
  return typeof profile === "string" && (POLICY_PROFILES as readonly string[]).includes(profile)
}

export interface ProfilePolicy {
  profile: PolicyProfile
  /** How the rider is addressed in explanations: "a wheelchair user". */
  noun: string
  label: string
  /** Walking/rolling cap for one leg, and for the whole route, in metres. */
  maxWalkLegM: number
  maxWalkTotalM: number
  /** "never": no bus leg at all. "lowCrowdOnly": a bus leg is allowed only when its crowd is LOW. */
  bus: "never" | "lowCrowdOnly"
  /** True when a door-to-door auto is as good a first choice as a metro journey (heavy luggage). */
  autoIsFirstChoice: boolean
  /**
   * True when LOW crowd is preferred over MEDIUM in the ordering (pregnant, stroller, senior: standing
   * in a packed carriage is the problem). For the others only HIGH matters, and HIGH is excluded anyway.
   */
  preferLowCrowd: boolean
  /** Wheelchair riders are told the auto is an accessible cab. */
  autoLabel: string
}

export const PROFILE_POLICIES: Record<PolicyProfile, ProfilePolicy> = {
  wheelchair: { profile: "wheelchair", noun: "a wheelchair user", label: "Wheelchair", maxWalkLegM: 150, maxWalkTotalM: 300, bus: "never", autoIsFirstChoice: false, preferLowCrowd: false, autoLabel: "auto / accessible cab" },
  senior: { profile: "senior", noun: "a senior traveller", label: "Senior", maxWalkLegM: 300, maxWalkTotalM: 500, bus: "lowCrowdOnly", autoIsFirstChoice: false, preferLowCrowd: true, autoLabel: "auto" },
  pregnant: { profile: "pregnant", noun: "a pregnant rider", label: "Pregnant", maxWalkLegM: 300, maxWalkTotalM: 500, bus: "never", autoIsFirstChoice: false, preferLowCrowd: true, autoLabel: "auto" },
  stroller: { profile: "stroller", noun: "a rider with a stroller", label: "Stroller", maxWalkLegM: 300, maxWalkTotalM: 500, bus: "never", autoIsFirstChoice: false, preferLowCrowd: true, autoLabel: "auto" },
  luggage: { profile: "luggage", noun: "a rider with heavy luggage", label: "Heavy luggage", maxWalkLegM: 300, maxWalkTotalM: 400, bus: "lowCrowdOnly", autoIsFirstChoice: true, preferLowCrowd: false, autoLabel: "auto" },
  reduced_mobility: { profile: "reduced_mobility", noun: "a rider with reduced mobility", label: "Reduced mobility", maxWalkLegM: 300, maxWalkTotalM: 400, bus: "lowCrowdOnly", autoIsFirstChoice: false, preferLowCrowd: false, autoLabel: "auto" },
}

// Namma Metro service hours — a synthetic assumption (about 05:00 to 23:00).
export const METRO_FIRST_MINUTE = 5 * 60
export const METRO_LAST_MINUTE = 23 * 60

const CROWD_RANK: Record<CrowdLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }

export interface PolicyVerdict {
  blocked: boolean
  reasonType?: ExclusionReasonType
  reason?: string
}

function legLevel(crowd: RouteCrowdSummary | undefined, segment: RouteSegment): CrowdLevel | undefined {
  return crowd?.legs?.find((leg) => leg.segmentId === segment.id)?.level
}

function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * Applies the profile rules that need crowd and time of day (the station and walking-distance
 * rules in accessibilityService run first). Returns the first rule the route breaks.
 */
export function evaluatePolicy(
  route: MultimodalRoute,
  crowd: RouteCrowdSummary | undefined,
  travelTime: Date,
  policy: ProfilePolicy,
): PolicyVerdict {
  // 1. Buses.
  for (const segment of route.segments) {
    if (segment.mode !== "bus") continue
    const label = segment.transitDetails?.routeNumber ? `Bus ${segment.transitDetails.routeNumber}` : "A bus"
    if (policy.bus === "never") {
      return { blocked: true, reasonType: "mode", reason: `${label} is not suggested for ${policy.noun}: buses are avoided for this profile (autos and metro only).` }
    }
    const level = legLevel(crowd, segment)
    if (level !== "LOW") {
      return { blocked: true, reasonType: "crowd", reason: `${label} is ${level ?? "of unknown"} crowd; buses are only suggested for ${policy.noun} when they are not crowded.` }
    }
  }

  // 2. Walking: no single leg, and not the whole route, above the profile's caps.
  const walks = route.segments.filter((segment) => segment.mode === "walking")
  const longest = walks.reduce((max, segment) => Math.max(max, segment.distanceMeters), 0)
  const total = walks.reduce((sum, segment) => sum + segment.distanceMeters, 0)
  if (longest > policy.maxWalkLegM) {
    return { blocked: true, reasonType: "walking_distance", reason: `One walk is ${Math.round(longest)} m, over the ${policy.maxWalkLegM} m limit for ${policy.noun} (an auto should cover that stretch).` }
  }
  if (total > policy.maxWalkTotalM) {
    return { blocked: true, reasonType: "walking_distance", reason: `This route has ${Math.round(total)} m of walking, over the ${policy.maxWalkTotalM} m limit for ${policy.noun}.` }
  }

  // 3. Crowded metro legs are never suggested.
  for (const segment of route.segments) {
    if (segment.mode !== "metro") continue
    if (legLevel(crowd, segment) === "HIGH") {
      return { blocked: true, reasonType: "crowd", reason: `The metro leg ${segment.from.name} → ${segment.to.name} is HIGH crowd at that time, which is avoided for ${policy.noun}.` }
    }
  }

  // 4. Metro only runs about 05:00-23:00.
  let elapsedSeconds = 0
  for (const segment of route.segments) {
    if (segment.mode === "metro") {
      const boarding = minuteOfDay(new Date(travelTime.getTime() + elapsedSeconds * 1000))
      if (boarding < METRO_FIRST_MINUTE || boarding >= METRO_LAST_MINUTE) {
        return { blocked: true, reasonType: "service_hours", reason: "The metro is not running at that time (service is about 05:00 to 23:00)." }
      }
    }
    elapsedSeconds += segment.durationSeconds
  }

  return { blocked: false }
}

// ── Choosing the best route ───────────────────────────────────────────────────

function metroBusLegs(route: MultimodalRoute): RouteSegment[] {
  return route.segments.filter((segment) => segment.mode === "metro" || segment.mode === "bus")
}

/** Changes between metro/bus legs; autos and walks at the ends are not counted as changes. */
function transitChanges(route: MultimodalRoute): number {
  const legs = metroBusLegs(route)
  let changes = 0
  for (let i = 1; i < legs.length; i++) if (legs[i].mode !== legs[i - 1].mode || legs[i].from.name !== legs[i - 1].to.name) changes++
  return changes
}

/**
 * 0: metro-based (or a short walk-only trip); 1: door-to-door auto (0 too for heavy luggage,
 * where an auto is often the best choice); 2: involves a bus (always below metro and auto).
 */
export function suitabilityTier(route: MultimodalRoute, policy: ProfilePolicy): number {
  const legs = metroBusLegs(route)
  if (legs.some((segment) => segment.mode === "bus")) return policy.autoIsFirstChoice ? 1 : 2
  if (legs.length === 0) {
    const hasAuto = route.segments.some((segment) => segment.mode === "auto")
    return hasAuto && !policy.autoIsFirstChoice ? 1 : 0
  }
  return 0
}

// What a minute of travel time is worth when weighing it against fare: Rs 2 a minute (about Rs 120 an hour).
export const VALUE_OF_TIME_RS_PER_MIN = 2

/**
 * Lower sorts first: tier, crowd (where it matters), changes, walking, then cost. Cost weighs fare and
 * time together — fare plus Rs 2 per minute — so a route is not chosen just for being two minutes
 * faster at three times the fare. Heavy luggage keeps "quickest first": an auto is meant to win there.
 */
export function fitKey(route: MultimodalRoute, crowdLevel: CrowdLevel | undefined, policy: ProfilePolicy): number[] {
  const minutes = route.totalDurationSeconds / 60
  const cost = policy.autoIsFirstChoice
    ? [Math.round(route.totalDurationSeconds), route.totalFare]
    : [Math.round(route.totalFare + minutes * VALUE_OF_TIME_RS_PER_MIN)]
  return [
    suitabilityTier(route, policy),
    policy.preferLowCrowd ? CROWD_RANK[crowdLevel ?? "LOW"] : 0,
    transitChanges(route),
    Math.round(route.totalWalkingMeters / 50),
    ...cost,
  ]
}

export function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

/** Two routes that use the same metro/bus legs are the same option with different first/last-mile choices. */
export function coreSignature(route: MultimodalRoute): string {
  const legs = metroBusLegs(route)
  if (legs.length === 0) return route.segments.some((segment) => segment.mode === "auto") ? "auto-only" : "walk-only"
  return legs.map((segment) => `${segment.mode}:${segment.from.name}>${segment.to.name}`).join("|")
}

// ── Explanations ──────────────────────────────────────────────────────────────

export function buildProfileFit(
  route: MultimodalRoute & { crowd?: RouteCrowdSummary; accessibility?: { status?: string; checkedStations?: Array<{ stationName: string }> } },
  rank: number,
  suitableCount: number,
  allSuitable: Array<MultimodalRoute & { crowd?: RouteCrowdSummary }>,
  policy: ProfilePolicy,
): ProfileFit {
  const reasons: string[] = []
  const tips: string[] = []
  const hasMetro = route.segments.some((segment) => segment.mode === "metro")
  const hasBus = route.segments.some((segment) => segment.mode === "bus")
  const autoLegs = route.segments.filter((segment) => segment.mode === "auto")
  const walkTotal = Math.round(route.totalWalkingMeters)
  const level = route.crowd?.level

  if (autoLegs.length > 0 && walkTotal === 0) {
    reasons.push(hasMetro ? `No walking: ${policy.autoLabel === "auto" ? "autos" : "an accessible cab or auto"} cover the first and last mile.` : `No walking: a door-to-door ${policy.autoLabel} takes you from start to destination.`)
  } else if (walkTotal === 0) {
    reasons.push("No walking needed.")
  } else {
    reasons.push(`Only ${walkTotal} m of walking (the limit for ${policy.noun} is ${policy.maxWalkTotalM} m).`)
  }

  if (hasMetro) {
    const names = (route.accessibility?.checkedStations ?? []).map((station) => station.stationName)
    if (names.length) {
      const verified = route.accessibility?.status === "accessible"
      reasons.push(
        `${names.length === 1 ? "Station" : "Stations"} checked for your needs: ${names.join(", ")}` +
          (verified ? " (all marked accessible)." : " (some details are unverified — demo data)."),
      )
    }
  }

  if (!hasBus) {
    reasons.push(policy.bus === "never" ? "No bus on this route (buses are avoided for this profile)." : "No bus on this route.")
  } else {
    reasons.push("Includes a bus that is not crowded at that time.")
  }

  if (route.crowd?.source === "NOT_APPLICABLE") {
    reasons.push("No metro or bus, so no transit crowding.")
  } else if (level) {
    reasons.push(level === "LOW" ? "Crowd is LOW on every metro and bus leg." : `Crowd is ${level} at worst (HIGH is never suggested).`)
  }

  const fastestRoute = allSuitable.reduce((best, r) => (r.totalDurationSeconds < best.totalDurationSeconds ? r : best), allSuitable[0])
  const cheapest = Math.min(...allSuitable.map((r) => r.totalFare))
  if (suitableCount > 1 && rank === 1) {
    const extraMin = Math.round((route.totalDurationSeconds - fastestRoute.totalDurationSeconds) / 60)
    if (route.totalDurationSeconds === fastestRoute.totalDurationSeconds) {
      reasons.push(`Also the fastest of the ${suitableCount} suitable options.`)
    } else if (route.totalFare < fastestRoute.totalFare) {
      reasons.push(`Better value: ${extraMin} min slower than the fastest suitable option, but Rs ${fastestRoute.totalFare - route.totalFare} cheaper.`)
    } else {
      reasons.push(`Chosen for comfort over speed: ${extraMin} min slower than the fastest suitable option.`)
    }
    if (route.totalFare === cheapest && route.totalFare >= fastestRoute.totalFare) reasons.push("Also the lowest fare of the suitable options.")
  }

  if (policy.profile === "wheelchair") {
    if (autoLegs.length > 0) tips.push("Autos are labelled as accessible cabs: confirm the vehicle can take a wheelchair when you book.")
    if (hasMetro) tips.push("Ask metro station staff at the customer-care counter for help with lifts if you need it.")
  } else if (policy.profile === "pregnant" || policy.profile === "senior") {
    if (hasMetro) tips.push("Ask for a priority seat; station staff can help with lifts.")
  } else if (policy.profile === "luggage") {
    if (autoLegs.length > 0) tips.push("An auto can stop right at the station entrance, so you carry your luggage the shortest distance.")
  }

  return {
    profile: policy.profile,
    rank,
    isBest: rank === 1,
    headline: rank === 1 ? `Best for ${policy.noun}` : `Also suitable (option ${rank})`,
    reasons,
    tips,
  }
}
