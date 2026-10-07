import type { EnrichedRoute } from "../../types/intelligence"

export interface RouteFeatureVector {
  routeId: string
  // 7-dimensional normalized feature vector [0.0, 1.0] where 1.0 is optimal
  features: {
    time: number          // 1 - (duration / max_duration)
    cost: number          // 1 - (fare / max_fare)
    walking: number       // 1 - (walking_meters / max_walking)
    reliability: number   // score / 100
    accessibility: number // 1.0 = accessible, 0.6 = partial, 0.2 = not accessible
    crowd: number         // 1.0 = LOW, 0.6 = MEDIUM, 0.2 = HIGH
    weather: number       // 1.0 = low impact, 0.6 = medium, 0.2 = high
  }
  featureArray: number[] // [time, cost, walking, reliability, accessibility, crowd, weather]
}

export const FEATURE_NAMES = [
  "time",
  "cost",
  "walking",
  "reliability",
  "accessibility",
  "crowd",
  "weather",
] as const

export type FeatureName = (typeof FEATURE_NAMES)[number]

/**
 * Normalizes route attributes across a candidate route set using relative Min-Max scaling.
 * All features are normalized such that 1.0 is optimal/desirable and 0.0 is worst/least desirable.
 */
export function extractRouteFeatures(
  route: EnrichedRoute,
  allCandidates: EnrichedRoute[] = [route],
): RouteFeatureVector {
  // Compute bounds across all candidate routes for relative scaling
  const durations = allCandidates.map((r) => r.totalDurationSeconds / 60)
  const fares = allCandidates.map((r) => r.totalFare)
  const walkings = allCandidates.map((r) => r.totalWalkingMeters)

  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  const minFare = Math.min(...fares)
  const maxFare = Math.max(...fares)
  const minWalk = Math.min(...walkings)
  const maxWalk = Math.max(...walkings)

  // 1. Time feature (lower duration is better)
  const durationMin = route.totalDurationSeconds / 60
  let timeNorm: number
  if (maxDuration > minDuration) {
    timeNorm = 1 - (durationMin - minDuration) / (maxDuration - minDuration)
  } else {
    // Single route or identical duration fallback (assume 90 min max)
    timeNorm = Math.max(0, Math.min(1, 1 - durationMin / 90))
  }

  // 2. Cost feature (lower fare is better)
  let costNorm: number
  if (maxFare > minFare) {
    costNorm = 1 - (route.totalFare - minFare) / (maxFare - minFare)
  } else {
    // Single route or identical fare fallback (assume 150 fare max)
    costNorm = Math.max(0, Math.min(1, 1 - route.totalFare / 150))
  }

  // 3. Walking feature (lower walking distance is better)
  let walkNorm: number
  if (maxWalk > minWalk) {
    walkNorm = 1 - (route.totalWalkingMeters - minWalk) / (maxWalk - minWalk)
  } else {
    // Single route or identical walking fallback (assume 2000m max)
    walkNorm = Math.max(0, Math.min(1, 1 - route.totalWalkingMeters / 2000))
  }

  // 4. Reliability feature (higher score is better, score is 0..100)
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

  const features = {
    time: Number(timeNorm.toFixed(4)),
    cost: Number(costNorm.toFixed(4)),
    walking: Number(walkNorm.toFixed(4)),
    reliability: Number(relNorm.toFixed(4)),
    accessibility: Number(accNorm.toFixed(4)),
    crowd: Number(crowdNorm.toFixed(4)),
    weather: Number(weatherNorm.toFixed(4)),
  }

  const featureArray = [
    features.time,
    features.cost,
    features.walking,
    features.reliability,
    features.accessibility,
    features.crowd,
    features.weather,
  ]

  return {
    routeId: route.id,
    features,
    featureArray,
  }
}
