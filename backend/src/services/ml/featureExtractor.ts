import type { EnrichedRoute } from "../../types/intelligence"

export interface RouteFeatureVector {
  routeId: string
  // 9-dimensional normalized feature vector [0.0, 1.0] where 1.0 is optimal
  features: {
    time: number          // 1 - (duration / max_duration)
    cost: number          // 1 - (fare / max_fare)
    walking: number       // 1 - (walking_meters / max_walking)
    reliability: number   // score / 100
    accessibility: number // 1.0 = accessible, 0.6 = partial, 0.2 = not accessible
    crowd: number         // 1.0 = LOW, 0.6 = MEDIUM, 0.2 = HIGH
    weather: number       // 1.0 = low impact, 0.6 = medium, 0.2 = high
    connectionRisk: number // 1 - (missedConnectionRisk% / 100)
    transfers: number     // 1 - (transferCount / max_transfers)
  }
  featureArray: number[] // [time, cost, walking, reliability, accessibility, crowd, weather, connectionRisk, transfers]
}

export const FEATURE_NAMES = [
  "time",
  "cost",
  "walking",
  "reliability",
  "accessibility",
  "crowd",
  "weather",
  "connectionRisk",
  "transfers",
] as const

export type FeatureName = (typeof FEATURE_NAMES)[number]

// Phase 7 fix — relative min-max normalization let a small absolute difference
// (e.g. 3 minutes) swing a feature across its entire [0,1] range whenever it
// happened to be the only point of difference between two candidates, drowning
// out features with genuinely larger real-world gaps (verified: a 3-minute-
// faster, 45%-risk route outranked a 5%-risk route under reliability priority).
// Each magnitude-sensitive feature now normalizes against whichever is larger:
// the candidates' actual spread, or a documented floor approximating "a
// difference this small isn't decisive on its own". This only dampens
// degenerate tiny-spread cases; normal-sized spreads are unaffected.
const MIN_SPREAD_MINUTES = 10
const MIN_SPREAD_FARE = 20
const MIN_SPREAD_WALK_METERS = 500
const MIN_SPREAD_TRANSFERS = 1

const ASSUMED_MAX_DURATION_MIN = 90
const ASSUMED_MAX_FARE = 150
const ASSUMED_MAX_WALK_METERS = 2000
const ASSUMED_MAX_TRANSFERS = 4

// Missing risk data defaults to a neutral-good assumption (20%), mirroring the
// existing reliability-score default (80/100) rather than rewarding missing
// data with a perfect score — consistent with the Phase 4 B5 lesson that
// unrecorded signals must not be silently treated as optimal.
const DEFAULT_RISK_PERCENT = 20

function normalizeLowerIsBetter(value: number, allValues: number[], floor: number, assumedMax: number): number {
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const spread = max - min
  if (spread > 0) {
    const effectiveSpread = Math.max(spread, floor)
    return Math.max(0, Math.min(1, 1 - (value - min) / effectiveSpread))
  }
  // Single route, or every candidate identical on this dimension.
  return Math.max(0, Math.min(1, 1 - value / assumedMax))
}

/**
 * Normalizes route attributes across a candidate route set using relative Min-Max scaling.
 * All features are normalized such that 1.0 is optimal/desirable and 0.0 is worst/least desirable.
 */
export function extractRouteFeatures(
  route: EnrichedRoute,
  allCandidates: EnrichedRoute[] = [route],
): RouteFeatureVector {
  const durations = allCandidates.map((r) => r.totalDurationSeconds / 60)
  const fares = allCandidates.map((r) => r.totalFare)
  const walkings = allCandidates.map((r) => r.totalWalkingMeters)
  const transferCounts = allCandidates.map((r) => r.transferCount)

  // 1. Time feature (lower duration is better)
  const timeNorm = normalizeLowerIsBetter(
    route.totalDurationSeconds / 60,
    durations,
    MIN_SPREAD_MINUTES,
    ASSUMED_MAX_DURATION_MIN,
  )

  // 2. Cost feature (lower fare is better)
  const costNorm = normalizeLowerIsBetter(route.totalFare, fares, MIN_SPREAD_FARE, ASSUMED_MAX_FARE)

  // 3. Walking feature (lower walking distance is better)
  const walkNorm = normalizeLowerIsBetter(
    route.totalWalkingMeters,
    walkings,
    MIN_SPREAD_WALK_METERS,
    ASSUMED_MAX_WALK_METERS,
  )

  // 4. Reliability feature (higher score is better, score is 0..100) — already an
  // absolute, real-world-calibrated scale, so it is deliberately NOT relative
  // min-max normalized (same reasoning now applied to connectionRisk below).
  const relScore = route.reliability?.score ?? 80
  const relNorm = Math.max(0, Math.min(1, relScore / 100))

  // 5. Accessibility feature — uses transparent score from Problem 4 when available
  let accNorm = 0.6
  if (route.accessibility?.accessibilityScore !== undefined) {
    // Problem 4 computed score (0–100 → normalize to 0.0–1.0)
    accNorm = Math.max(0, Math.min(1, route.accessibility.accessibilityScore / 100))
  } else {
    const status = route.accessibility?.status
    if (status === "accessible") accNorm = 1.0
    else if (status === "partially_accessible") accNorm = 0.6
    else if (status === "not_accessible") accNorm = 0.2
  }

  // 6. Crowd feature (LOW > MEDIUM > HIGH)
  let crowdNorm = 0.6
  const crowdLevel = route.crowd?.level
  if (crowdLevel === "LOW") crowdNorm = 1.0
  else if (crowdLevel === "MEDIUM") crowdNorm = 0.6
  else if (crowdLevel === "HIGH") crowdNorm = 0.2

  // 7. Weather Impact feature (low impact > medium > high)
  let weatherNorm = 1.0
  const weatherLevel = route.weatherImpact?.level
  if (weatherLevel === "low") weatherNorm = 1.0
  else if (weatherLevel === "medium") weatherNorm = 0.6
  else if (weatherLevel === "high") weatherNorm = 0.2

  // 8. Missed-connection risk feature (lower risk is better) — Phase 7 addition.
  // Absolute 0-100 scale like reliability, not relative min-max: a 5% risk is
  // genuinely low in real terms regardless of what else is in the candidate set.
  const riskPercent = route.missedConnectionRisk?.overallRiskPercent ?? DEFAULT_RISK_PERCENT
  const connectionRiskNorm = Math.max(0, Math.min(1, 1 - riskPercent / 100))

  // 9. Transfer count feature (fewer transfers is better) — Phase 7 addition.
  const transfersNorm = normalizeLowerIsBetter(
    route.transferCount,
    transferCounts,
    MIN_SPREAD_TRANSFERS,
    ASSUMED_MAX_TRANSFERS,
  )

  const features = {
    time: Number(timeNorm.toFixed(4)),
    cost: Number(costNorm.toFixed(4)),
    walking: Number(walkNorm.toFixed(4)),
    reliability: Number(relNorm.toFixed(4)),
    accessibility: Number(accNorm.toFixed(4)),
    crowd: Number(crowdNorm.toFixed(4)),
    weather: Number(weatherNorm.toFixed(4)),
    connectionRisk: Number(connectionRiskNorm.toFixed(4)),
    transfers: Number(transfersNorm.toFixed(4)),
  }

  const featureArray = [
    features.time,
    features.cost,
    features.walking,
    features.reliability,
    features.accessibility,
    features.crowd,
    features.weather,
    features.connectionRisk,
    features.transfers,
  ]

  return {
    routeId: route.id,
    features,
    featureArray,
  }
}
