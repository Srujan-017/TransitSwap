import { multimodalService } from "./multimodalService"
import { reliabilityService } from "./reliabilityService"
import { transitDnaService } from "./transitDnaService"
import { getProfileWeights } from "./ml/mlPreferenceService"
import { createSeededRandom } from "./ml/seededRandom"
import { getStation, getStop } from "../data/transitData"
import { createTtlCache } from "../utils/ttlCache"
import type { LogisticModelWeights } from "./ml/logisticRegression"
import type { EnrichedRoute } from "../types/intelligence"

// ── BUG 4 FIX: Remove the fake 92% hardcoded confidence coverage ─────────────
// confidenceIntervalCoveragePercent is now null with an honest label.
// ── BUG 3 FIX: All scenarios use real Namma Metro corridor coordinates ───────
// (Phase 5 migrated this from Mumbai to Bengaluru, matching transitData.ts)
// ── BUG 6: Clearly marked as SIMULATED PROTOTYPE BENCHMARK ───────────────────
//
// ── Phase 9 rebuild ───────────────────────────────────────────────────────
// Per PROJECT_MASTER_PLAN.md §39 Phase 9: the 5-scenario benchmark used exact
// station coordinates for every origin/destination, so every scenario's walk
// segment was the 0m degenerate case (§13's "zero-length walking segments"
// finding) — never a real trade-off. Expanded to 22 scenarios built from real
// named stations/stops but offset by a deterministic ~180-390m "nearby
// address" (see nearbyAddress() below), added 3 new baselines (least-walking,
// fewest-transfers, seeded-random), a 7-configuration ablation study, p50/p95
// latency, and reproducibility is enforced by this module's own determinism
// test (evaluationHarness.test.ts) via the existing offline road-leg provider
// hook, not assumed.

export interface EvaluationMetrics {
  totalScenariosEvaluated: number
  agreementRateWithShortestTimePercent: number
  agreementRateWithCheapestPercent: number
  // Phase 9 additions — 3 new baselines, per the master plan's explicit instruction.
  agreementRateWithLeastWalkingPercent: number
  agreementRateWithFewestTransfersPercent: number
  agreementRateWithRandomPercent: number
  transitSwapAverageReliability: number
  baselineShortestTimeAverageReliability: number
  transitSwapAverageWalkingMeters: number
  baselineShortestTimeAverageWalkingMeters: number
  transitSwapAverageMissedConnectionRiskPercent: number
  baselineShortestTimeMissedConnectionRiskPercent: number
  // BUG 4 FIX: null = not empirically validated. Never return a fake percentage.
  confidenceIntervalCoveragePercent: null
  confidenceIntervalCoverageNote: string
  averageComputationLatencyMs: number
  // Phase 9 additions — percentile latency, not just the mean.
  latencyP50Ms: number
  latencyP95Ms: number
  // Phase 9 — ablation study: for each of 6 features, the % of scenarios
  // where removing that single feature from the ranking weights (weight: 0,
  // all others unchanged) changes which route the full model would have
  // picked. A real per-feature sensitivity measurement, not a guess.
  ablationDecisionChangeRatePercent: Record<string, number>
  isSimulatedBenchmark: true
  benchmarkDisclaimer: string
  scenarioDatasetNote: string
  evaluatedAt: string
  scenarios: Array<{
    originName: string
    destinationName: string
    candidateCount: number
    transitSwapChosenLabel: string
    shortestTimeChosenLabel: string
    cheapestChosenLabel: string
    leastWalkingChosenLabel: string
    fewestTransfersChosenLabel: string
    randomChosenLabel: string
    durationDifferenceVsShortestMin: number
    walkingSavingsVsShortestTimeMeters: number
    reliabilityDifferenceVsShortestPercent: number
  }>
}

interface ScenarioRef {
  kind: "station" | "stop"
  id: string
}

interface ScenarioDef {
  originRef: ScenarioRef
  destinationRef: ScenarioRef
}

// Phase 9 — 22 scenarios (up from 5), curated by hand from the real
// transitData.ts network to span every line, both interchanges, bus-only
// corridors, cross-route bus transfers, and mixed metro/bus/auto trips —
// documented here, not auto-generated, so the trade-off profile each one is
// meant to exercise is legible.
const SCENARIO_DEFS: ScenarioDef[] = [
  // Purple Line — same-line direct (short/medium/long)
  { originRef: { kind: "station", id: "pl-08" }, destinationRef: { kind: "station", id: "pl-09" } }, // MG Road -> Cubbon Park (short)
  { originRef: { kind: "station", id: "pl-01" }, destinationRef: { kind: "station", id: "pl-03" } }, // Whitefield -> Baiyappanahalli (medium)
  { originRef: { kind: "station", id: "pl-05" }, destinationRef: { kind: "station", id: "pl-12" } }, // Indiranagar -> Majestic (long)
  // Green Line — same-line direct
  { originRef: { kind: "station", id: "gl-06" }, destinationRef: { kind: "station", id: "gl-08" } }, // Yeshwanthpur -> Rajajinagar
  { originRef: { kind: "station", id: "gl-01" }, destinationRef: { kind: "station", id: "gl-05" } }, // Madavara -> Peenya
  { originRef: { kind: "station", id: "gl-09" }, destinationRef: { kind: "station", id: "gl-13" } }, // Srirampura -> Jayanagar
  // Yellow Line — same-line direct
  { originRef: { kind: "station", id: "yl-02" }, destinationRef: { kind: "station", id: "yl-08" } }, // Silk Board -> Electronic City (long)
  { originRef: { kind: "station", id: "yl-01" }, destinationRef: { kind: "station", id: "yl-04" } }, // Jayadeva Hospital -> Hongasandra
  // Cross-line via interchange — real graph-search stress tests
  { originRef: { kind: "station", id: "pl-01" }, destinationRef: { kind: "station", id: "gl-14" } }, // Whitefield (Purple) -> RV Road (Green), via Majestic
  { originRef: { kind: "station", id: "gl-01" }, destinationRef: { kind: "station", id: "yl-10" } }, // Madavara (Green) -> Bommasandra (Yellow), full network span
  { originRef: { kind: "station", id: "pl-05" }, destinationRef: { kind: "station", id: "gl-13" } }, // Indiranagar (Purple) -> Jayanagar (Green), via Majestic
  { originRef: { kind: "station", id: "pl-10" }, destinationRef: { kind: "station", id: "yl-02" } }, // Vidhana Soudha (Purple) -> Silk Board (Yellow), via Majestic + RV Road
  // Bus-only, same route
  { originRef: { kind: "stop", id: "b-03" }, destinationRef: { kind: "stop", id: "b-01" } }, // Kempegowda -> Shivajinagar (R1)
  { originRef: { kind: "stop", id: "b-04" }, destinationRef: { kind: "stop", id: "b-06" } }, // Shantinagar -> Domlur (R3)
  { originRef: { kind: "stop", id: "b-07" }, destinationRef: { kind: "stop", id: "b-10" } }, // Yeshwanthpur -> Malleshwaram (R6)
  { originRef: { kind: "stop", id: "b-21" }, destinationRef: { kind: "stop", id: "b-20" } }, // Silk Board -> Electronic City (R8, Hosur Road)
  { originRef: { kind: "stop", id: "b-17" }, destinationRef: { kind: "stop", id: "b-12" } }, // Banashankari -> Jayanagar 4th Block (R9)
  { originRef: { kind: "stop", id: "b-23" }, destinationRef: { kind: "stop", id: "b-24" } }, // Mysuru Road -> Whitefield (R10, long)
  // Bus-only, cross-route (shared-stop transfer)
  { originRef: { kind: "stop", id: "b-05" }, destinationRef: { kind: "stop", id: "b-13" } }, // Koramangala (R2/R5) -> Marathahalli (R5)
  { originRef: { kind: "stop", id: "b-19" }, destinationRef: { kind: "stop", id: "b-01" } }, // HSR Layout (R5/R8) -> Shivajinagar (R1/R4), cross-route
  // Mixed metro + bus + auto
  { originRef: { kind: "stop", id: "b-06" }, destinationRef: { kind: "station", id: "pl-08" } }, // Domlur Bus Stop -> MG Road Metro
  { originRef: { kind: "stop", id: "b-19" }, destinationRef: { kind: "station", id: "yl-02" } }, // HSR Layout Bus Stop -> Silk Board Metro (near auto hub)
]

/**
 * Offsets a real named station/stop's coordinate by a deterministic
 * bearing + distance, producing a "nearby address" rather than the exact
 * station entrance. Fixes §13's "zero-length walking segments" finding: the
 * old benchmark used exact station coordinates for every scenario, so every
 * walk segment was the 0m degenerate case validateCandidate() happens to
 * permit, and the benchmark never exercised a real walk-then-board trade-off.
 * Uses the standard great-circle destination-point formula — accurate enough
 * at these distances (≤400m) for a reproducible demo scenario set.
 */
function nearbyAddress(
  entity: { name: string; latitude: number; longitude: number },
  bearingDeg: number,
  distanceM: number,
): { name: string; latitude: number; longitude: number } {
  const R = 6371000
  const bearing = (bearingDeg * Math.PI) / 180
  const latRad = (entity.latitude * Math.PI) / 180
  const lngRad = (entity.longitude * Math.PI) / 180
  const angularDist = distanceM / R

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDist) + Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearing),
  )
  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDist) * Math.cos(latRad),
      Math.cos(angularDist) - Math.sin(latRad) * Math.sin(newLatRad),
    )

  return {
    name: `Near ${entity.name} (~${distanceM}m away)`,
    latitude: Number(((newLatRad * 180) / Math.PI).toFixed(6)),
    longitude: Number(((newLngRad * 180) / Math.PI).toFixed(6)),
  }
}

function resolveRef(ref: ScenarioRef): { name: string; latitude: number; longitude: number } {
  const entity = ref.kind === "station" ? getStation(ref.id) : getStop(ref.id)
  if (!entity) {
    throw new Error(`Phase 9 evaluation scenario references unknown ${ref.kind} id "${ref.id}"`)
  }
  return entity
}

export const EVALUATION_SCENARIOS = SCENARIO_DEFS.map((def, index) => {
  const originEntity = resolveRef(def.originRef)
  const destinationEntity = resolveRef(def.destinationRef)
  // Deterministic, varied bearing/distance per scenario index — not random,
  // so the scenario set (and therefore the whole benchmark) is reproducible
  // by construction, independent of any seeded-RNG machinery.
  const originBearing = (index * 47) % 360
  const destinationBearing = (index * 83 + 29) % 360
  const distance = 180 + (index % 4) * 70 // 180 / 250 / 320 / 390 m, never 0

  return {
    origin: nearbyAddress(originEntity, originBearing, distance),
    destination: nearbyAddress(destinationEntity, destinationBearing, distance + 40),
  }
})

// Phase 9 — ablation study (7 configurations: the full model + these 6
// single-feature removals), per PROJECT_MASTER_PLAN.md §39's instruction to
// cover reliability/accessibility/crowd/weather plus the Phase 7 additions
// (connectionRisk, transfers) that weren't in the plan's original 5-feature
// list because they didn't exist yet when it was written.
const ABLATION_FEATURES = ["reliability", "accessibility", "crowd", "weather", "connectionRisk", "transfers"] as const

const FULL_WEIGHTS: LogisticModelWeights = getProfileWeights("standard")

function ablationWeights(feature: (typeof ABLATION_FEATURES)[number]): LogisticModelWeights {
  return { ...FULL_WEIGHTS, [feature]: 0 }
}

// Phase 9 — fixed seed so the "random" baseline is reproducible: the same
// scenario set always produces the same random picks, run to run.
const RANDOM_BASELINE_SEED = 2026

function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0
  const idx = Math.min(sortedAscending.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAscending.length) - 1))
  return sortedAscending[idx]
}

/**
 * Generates and enriches (reliability, confidence interval, missed-connection
 * risk, full-model TransitDnaScore) every candidate route for one scenario.
 * Pulled out of runEvaluation()'s loop and exported so the sensitivity-sweep
 * script (scripts/sensitivity-sweep.ts) exercises this EXACT same pipeline —
 * including whatever multimodalService.ROUTING_CONSTANTS values are current
 * at call time — rather than a hand-maintained near-copy that could drift.
 */
export async function enrichScenarioRoutes(scenario: {
  origin: { name: string; latitude: number; longitude: number }
  destination: { name: string; latitude: number; longitude: number }
}): Promise<EnrichedRoute[]> {
  const rawRoutes = await multimodalService.generateRoutes({
    origin: scenario.origin,
    destination: scenario.destination,
  })

  return Promise.all(
    rawRoutes.map(async (r) => {
      const route: EnrichedRoute = { ...r }
      route.reliability = reliabilityService.calculateReliability(route)
      route.confidenceInterval = await reliabilityService.calculateConfidenceInterval(route)
      route.missedConnectionRisk = await reliabilityService.calculateMissedConnectionRisk(route)
      route.transitDnaScore = transitDnaService.scoreRoute(route)
      return route
    }),
  )
}

// Phase 11 (P1) — the full 22-scenario benchmark (route generation + weather/
// accessibility/crowd enrichment + reliability + Monte Carlo + ablation for
// each) is expensive (measured ~2s+ offline, more with live OSRM) and was
// recomputed from scratch on every GET /api/evaluation call, including every
// DashboardPage mount (PROJECT_MASTER_PLAN.md §26 P1). A single-entry TTL
// cache is enough here — the whole endpoint takes no parameters, so there is
// only ever one possible result to cache. Kept OUTSIDE runEvaluation() itself
// (see getEvaluation() below) so evaluationHarness.test.ts's determinism
// check — two INDEPENDENT calls to runEvaluation() must agree — still
// exercises two genuinely fresh computations, not a cache hit.
const EVALUATION_CACHE_KEY = "evaluation"
const evaluationCache = createTtlCache<EvaluationMetrics>({ ttlMs: 5 * 60 * 1000, maxEntries: 1 })

export const evaluationService = {
  async runEvaluation(): Promise<EvaluationMetrics> {
    const scenarioResults = []
    const scenarioLatenciesMs: number[] = []

    let sameAsShortest = 0
    let sameAsCheapest = 0
    let sameAsLeastWalking = 0
    let sameAsFewestTransfers = 0
    let sameAsRandom = 0

    let totalTSScore = 0
    let totalBaseScore = 0

    let totalTSWalk = 0
    let totalBaseWalk = 0

    let totalTSRisk = 0
    let totalBaseRisk = 0

    const ablationDecisionChanges: Record<string, number> = {}
    for (const feature of ABLATION_FEATURES) ablationDecisionChanges[feature] = 0

    const randomRand = createSeededRandom(RANDOM_BASELINE_SEED)

    for (const scenario of EVALUATION_SCENARIOS) {
      const scenarioStart = Date.now()

      const enriched = await enrichScenarioRoutes(scenario)

      if (enriched.length === 0) continue

      scenarioLatenciesMs.push(Date.now() - scenarioStart)

      // TransitSwap: highest composite TransitDNA score (full model, standard weights)
      const tsRecommended = [...enriched].sort((a, b) => (b.transitDnaScore ?? 0) - (a.transitDnaScore ?? 0))[0]

      // Baseline A: Shortest travel time
      const shortestTime = [...enriched].sort((a, b) => a.totalDurationSeconds - b.totalDurationSeconds)[0]

      // Baseline B: Lowest cost
      const cheapest = [...enriched].sort((a, b) => a.totalFare - b.totalFare)[0]

      // Phase 9 — Baseline C: Least walking
      const leastWalking = [...enriched].sort((a, b) => a.totalWalkingMeters - b.totalWalkingMeters)[0]

      // Phase 9 — Baseline D: Fewest transfers
      const fewestTransfers = [...enriched].sort((a, b) => a.transferCount - b.transferCount)[0]

      // Phase 9 — Baseline E: Seeded random pick (reproducible, not cherry-picked)
      const randomPick = enriched[Math.floor(randomRand() * enriched.length)]

      if (tsRecommended.id === shortestTime.id) sameAsShortest++
      if (tsRecommended.id === cheapest.id) sameAsCheapest++
      if (tsRecommended.id === leastWalking.id) sameAsLeastWalking++
      if (tsRecommended.id === fewestTransfers.id) sameAsFewestTransfers++
      if (tsRecommended.id === randomPick.id) sameAsRandom++

      // Phase 9 — ablation: does removing each single feature change which
      // route the full model would have picked for this scenario?
      for (const feature of ABLATION_FEATURES) {
        const weights = ablationWeights(feature)
        const ablatedTop = [...enriched].sort(
          (a, b) => transitDnaService.scoreRoute(b, weights) - transitDnaService.scoreRoute(a, weights),
        )[0]
        if (ablatedTop.id !== tsRecommended.id) {
          ablationDecisionChanges[feature] += 1
        }
      }

      totalTSScore += tsRecommended.reliability?.score ?? 0
      totalBaseScore += shortestTime.reliability?.score ?? 0

      totalTSWalk += tsRecommended.totalWalkingMeters
      totalBaseWalk += shortestTime.totalWalkingMeters

      totalTSRisk += tsRecommended.missedConnectionRisk?.overallRiskPercent ?? 0
      totalBaseRisk += shortestTime.missedConnectionRisk?.overallRiskPercent ?? 0

      scenarioResults.push({
        originName: scenario.origin.name,
        destinationName: scenario.destination.name,
        candidateCount: enriched.length,
        transitSwapChosenLabel: tsRecommended.labelDisplay,
        shortestTimeChosenLabel: shortestTime.labelDisplay,
        cheapestChosenLabel: cheapest.labelDisplay,
        leastWalkingChosenLabel: leastWalking.labelDisplay,
        fewestTransfersChosenLabel: fewestTransfers.labelDisplay,
        randomChosenLabel: randomPick.labelDisplay,
        durationDifferenceVsShortestMin: Math.round(
          (tsRecommended.totalDurationSeconds - shortestTime.totalDurationSeconds) / 60,
        ),
        walkingSavingsVsShortestTimeMeters: Math.max(
          0,
          shortestTime.totalWalkingMeters - tsRecommended.totalWalkingMeters,
        ),
        reliabilityDifferenceVsShortestPercent: Math.round(
          (tsRecommended.reliability?.score ?? 0) - (shortestTime.reliability?.score ?? 0),
        ),
      })
    }

    const count = scenarioResults.length || 1
    const sortedLatencies = [...scenarioLatenciesMs].sort((a, b) => a - b)
    const totalLatency = scenarioLatenciesMs.reduce((a, b) => a + b, 0)

    const ablationDecisionChangeRatePercent: Record<string, number> = {}
    for (const feature of ABLATION_FEATURES) {
      ablationDecisionChangeRatePercent[feature] = Math.round((ablationDecisionChanges[feature] / count) * 100)
    }

    return {
      totalScenariosEvaluated: count,
      agreementRateWithShortestTimePercent: Math.round((sameAsShortest / count) * 100),
      agreementRateWithCheapestPercent: Math.round((sameAsCheapest / count) * 100),
      agreementRateWithLeastWalkingPercent: Math.round((sameAsLeastWalking / count) * 100),
      agreementRateWithFewestTransfersPercent: Math.round((sameAsFewestTransfers / count) * 100),
      agreementRateWithRandomPercent: Math.round((sameAsRandom / count) * 100),
      transitSwapAverageReliability: Math.round(totalTSScore / count),
      baselineShortestTimeAverageReliability: Math.round(totalBaseScore / count),
      transitSwapAverageWalkingMeters: Math.round(totalTSWalk / count),
      baselineShortestTimeAverageWalkingMeters: Math.round(totalBaseWalk / count),
      transitSwapAverageMissedConnectionRiskPercent: Math.round(totalTSRisk / count),
      baselineShortestTimeMissedConnectionRiskPercent: Math.round(totalBaseRisk / count),
      // BUG 4 FIX: never return a fake percentage for empirical coverage
      confidenceIntervalCoveragePercent: null,
      confidenceIntervalCoverageNote:
        "Not empirically validated — simulated prototype. Calibration requires real journey observation data. " +
        "See historicalReliabilityService.calculateCoverageEvaluation() for the (separate) real-data-aware coverage check.",
      averageComputationLatencyMs: Math.round(totalLatency / count),
      latencyP50Ms: percentile(sortedLatencies, 50),
      latencyP95Ms: percentile(sortedLatencies, 95),
      ablationDecisionChangeRatePercent,
      isSimulatedBenchmark: true,
      benchmarkDisclaimer:
        "SIMULATED PROTOTYPE BENCHMARK — evaluated against 22 scenarios built from real Namma Metro/BMTC " +
        "station and stop names across all 3 metro lines, both interchanges, bus-only and mixed-mode corridors. " +
        "Not a real-world measurement. Does not claim superiority over live navigation systems. Compares the " +
        "TransitSwap multi-criteria engine against 5 baselines (shortest-time, lowest-cost, least-walking, " +
        "fewest-transfers, seeded-random) and reports a 6-feature ablation's per-feature decision-change rate.",
      scenarioDatasetNote:
        "Each scenario's origin/destination is a real named station/stop from transitData.ts, offset by a " +
        "deterministic 180-390m 'nearby address' (see nearbyAddress() in evaluationService.ts) rather than the " +
        "exact station coordinate used before Phase 9 — this was necessary to avoid the 0m-walk degenerate path " +
        "(PROJECT_MASTER_PLAN.md §13) that made every pre-Phase-9 scenario trivial. These are curated, labelled " +
        "demo addresses, not live-geocoded real street addresses.",
      evaluatedAt: new Date().toISOString(),
      scenarios: scenarioResults,
    }
  },

  /**
   * Phase 11 (P1) — cached entry point for the HTTP endpoint. Returns the
   * same benchmark runEvaluation() computes, served from a 5-minute TTL
   * cache when a fresh run already exists, instead of re-running 22
   * scenarios' worth of route generation + enrichment + Monte Carlo on
   * every call.
   */
  async getEvaluation(): Promise<EvaluationMetrics> {
    const cached = evaluationCache.get(EVALUATION_CACHE_KEY)
    if (cached) return cached

    const metrics = await evaluationService.runEvaluation()
    evaluationCache.set(EVALUATION_CACHE_KEY, metrics)
    return metrics
  },
}
