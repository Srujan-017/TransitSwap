import { multimodalService } from "./multimodalService"
import { reliabilityService } from "./reliabilityService"
import { transitDnaService } from "./transitDnaService"
import type { EnrichedRoute } from "../types/intelligence"

// ── BUG 4 FIX: Remove the fake 92% hardcoded confidence coverage ─────────────
// confidenceIntervalCoveragePercent is now null with an honest label.
// ── BUG 3 FIX: All scenarios use Mumbai Metro Line 1 corridor coordinates ─────
// (Versova ↔ Ghatkopar, matching transitData.ts)
// ── BUG 6: Clearly marked as SIMULATED PROTOTYPE BENCHMARK ───────────────────

export interface EvaluationMetrics {
  totalScenariosEvaluated: number
  agreementRateWithShortestTimePercent: number
  agreementRateWithCheapestPercent: number
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
  isSimulatedBenchmark: true
  benchmarkDisclaimer: string
  evaluatedAt: string
  scenarios: Array<{
    originName: string
    destinationName: string
    transitSwapChosenLabel: string
    shortestTimeChosenLabel: string
    cheapestChosenLabel: string
    durationDifferenceVsShortestMin: number
    walkingSavingsVsShortestTimeMeters: number
    reliabilityDifferenceVsShortestPercent: number
  }>
}

// BUG 3 FIX: All scenarios now use Mumbai Metro Line 1 corridor (Versova ↔ Ghatkopar)
// matching the existing transitData.ts demo dataset.
const MUMBAI_TEST_SCENARIOS = [
  {
    origin: { name: "Versova Metro Station", latitude: 19.1300, longitude: 72.8161 },
    destination: { name: "Ghatkopar Metro Station", latitude: 19.0863, longitude: 72.9082 },
  },
  {
    origin: { name: "Andheri Metro Station", latitude: 19.1197, longitude: 72.8461 },
    destination: { name: "Marol Naka Metro Station", latitude: 19.1083, longitude: 72.8812 },
  },
  {
    origin: { name: "Chakala Metro Station", latitude: 19.1019, longitude: 72.8672 },
    destination: { name: "Saki Naka Metro Station", latitude: 19.0961, longitude: 72.8882 },
  },
  {
    origin: { name: "D.N. Nagar Metro Station", latitude: 19.1247, longitude: 72.8256 },
    destination: { name: "Asalpha Metro Station", latitude: 19.0903, longitude: 72.8961 },
  },
  {
    origin: { name: "WEH Metro Station", latitude: 19.1147, longitude: 72.8562 },
    destination: { name: "Jagruti Nagar Metro Station", latitude: 19.0838, longitude: 72.9030 },
  },
]

export const evaluationService = {
  async runEvaluation(): Promise<EvaluationMetrics> {
    const startTime = Date.now()
    const scenarioResults = []

    let sameAsShortest = 0
    let sameAsCheapest = 0

    let totalTSScore = 0
    let totalBaseScore = 0

    let totalTSWalk = 0
    let totalBaseWalk = 0

    let totalTSRisk = 0
    let totalBaseRisk = 0

    for (const scenario of MUMBAI_TEST_SCENARIOS) {
      const rawRoutes = multimodalService.generateRoutes({
        origin: scenario.origin,
        destination: scenario.destination,
      })

      if (rawRoutes.length === 0) continue

      const enriched: EnrichedRoute[] = await Promise.all(
        rawRoutes.map(async (r) => {
          const route: EnrichedRoute = { ...r }
          route.reliability = reliabilityService.calculateReliability(route)
          route.confidenceInterval = await reliabilityService.calculateConfidenceInterval(route)
          route.missedConnectionRisk = await reliabilityService.calculateMissedConnectionRisk(route)
          route.transitDnaScore = transitDnaService.scoreRoute(route)
          return route
        }),
      )

      // TransitSwap: highest composite TransitDNA score
      const tsRecommended = [...enriched].sort((a, b) => (b.transitDnaScore ?? 0) - (a.transitDnaScore ?? 0))[0]

      // Baseline A: Shortest travel time
      const shortestTime = [...enriched].sort((a, b) => a.totalDurationSeconds - b.totalDurationSeconds)[0]

      // Baseline B: Lowest cost
      const cheapest = [...enriched].sort((a, b) => a.totalFare - b.totalFare)[0]

      if (tsRecommended.id === shortestTime.id) sameAsShortest++
      if (tsRecommended.id === cheapest.id) sameAsCheapest++

      totalTSScore += tsRecommended.reliability?.score ?? 0
      totalBaseScore += shortestTime.reliability?.score ?? 0

      totalTSWalk += tsRecommended.totalWalkingMeters
      totalBaseWalk += shortestTime.totalWalkingMeters

      totalTSRisk += tsRecommended.missedConnectionRisk?.overallRiskPercent ?? 0
      totalBaseRisk += shortestTime.missedConnectionRisk?.overallRiskPercent ?? 0

      scenarioResults.push({
        originName: scenario.origin.name,
        destinationName: scenario.destination.name,
        transitSwapChosenLabel: tsRecommended.labelDisplay,
        shortestTimeChosenLabel: shortestTime.labelDisplay,
        cheapestChosenLabel: cheapest.labelDisplay,
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

    const latency = Date.now() - startTime
    const count = scenarioResults.length || 1

    return {
      totalScenariosEvaluated: count,
      agreementRateWithShortestTimePercent: Math.round((sameAsShortest / count) * 100),
      agreementRateWithCheapestPercent: Math.round((sameAsCheapest / count) * 100),
      transitSwapAverageReliability: Math.round(totalTSScore / count),
      baselineShortestTimeAverageReliability: Math.round(totalBaseScore / count),
      transitSwapAverageWalkingMeters: Math.round(totalTSWalk / count),
      baselineShortestTimeAverageWalkingMeters: Math.round(totalBaseWalk / count),
      transitSwapAverageMissedConnectionRiskPercent: Math.round(totalTSRisk / count),
      baselineShortestTimeMissedConnectionRiskPercent: Math.round(totalBaseRisk / count),
      // BUG 4 FIX: never return a fake percentage for empirical coverage
      confidenceIntervalCoveragePercent: null,
      confidenceIntervalCoverageNote:
        "Not empirically validated — simulated prototype. Calibration requires real journey observation data.",
      averageComputationLatencyMs: latency,
      isSimulatedBenchmark: true,
      benchmarkDisclaimer:
        "SIMULATED PROTOTYPE BENCHMARK — evaluated against 5 Mumbai Metro Line 1 demo scenarios. " +
        "Not a real-world measurement. Does not claim superiority over live navigation systems. " +
        "Compares TransitSwap multi-criteria engine against shortest-time and lowest-cost baselines only.",
      evaluatedAt: new Date().toISOString(),
      scenarios: scenarioResults,
    }
  },
}
