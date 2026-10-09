#!/usr/bin/env ts-node
// ── Phase 14 — real, computed data for the research paper's figures ──────────
//
// PROJECT_MASTER_PLAN.md §39 Phase 14 success criterion: "every number in the
// paper traceable to a command." This script IS that command — every figure
// in PAPER.md that shows a number comes from the JSON this produces, which in
// turn comes from calling the real production services (multimodalService,
// accessibilityService, transitDnaService, mlEvaluationService,
// historicalReliabilityService, the real PairwiseLogisticRegression class),
// never hand-typed or estimated. No network dependency — the offline road-leg
// provider is installed so results are reproducible without live OSRM/Nominatim.
//
// Run with: npx ts-node --transpile-only scripts/generate-paper-data.ts
// Output: scripts/paper-data.json (git-ignored scratch output — committed
// separately as docs/paper/data.json once reviewed, see PHASE_14_VERIFICATION.md)

import fs from "fs"
import path from "path"
import {
  multimodalService,
  setMultimodalRoadLegProviderForTesting,
  ROUTING_CONSTANTS,
  type RoadLegProvider,
} from "../src/services/multimodalService"
import { accessibilityService } from "../src/services/accessibilityService"
import { reliabilityService } from "../src/services/reliabilityService"
import { transitDnaService } from "../src/services/transitDnaService"
import { evaluationService, EVALUATION_SCENARIOS, enrichScenarioRoutes } from "../src/services/evaluationService"
import { mlEvaluationService, stratifiedSplit } from "../src/services/ml/mlEvaluationService"
import { PairwiseLogisticRegression } from "../src/services/ml/logisticRegression"
import { historicalReliabilityService } from "../src/services/reliability/historicalReliabilityService"
import { METRO_STATIONS, BUS_STOPS } from "../src/data/transitData"
import type { EnrichedRoute } from "../src/types/intelligence"

// Offline road-leg provider — same principle as multimodalRouting.test.ts /
// evaluationHarness.test.ts: deterministic haversine-based estimates instead
// of live OSRM, so every number here is reproducible run to run.
const offlineProvider: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const R = 6371000
    const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180
    const dLng = ((destination.longitude - origin.longitude) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((origin.latitude * Math.PI) / 180) *
        Math.cos((destination.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    const distanceMeters = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.2
    const speedMps = mode === "walking" ? 1.3 : mode === "cycling" ? 4 : 8
    return [
      {
        distanceMeters,
        durationSeconds: distanceMeters / speedMps,
        geometry: {
          type: "LineString",
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
          ],
        },
      },
    ]
  },
}
setMultimodalRoadLegProviderForTesting(offlineProvider)

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Figure 3: coverage grid ───────────────────────────────────────────────
function computeCoverageGrid() {
  const allPoints = [...METRO_STATIONS, ...BUS_STOPS]
  const lats = allPoints.map((p) => p.latitude)
  const lngs = allPoints.map((p) => p.longitude)
  const padDeg = 0.03 // ~3.3km padding around the real network extent
  const bounds = {
    minLat: Math.min(...lats) - padDeg,
    maxLat: Math.max(...lats) + padDeg,
    minLng: Math.min(...lngs) - padDeg,
    maxLng: Math.max(...lngs) + padDeg,
  }

  const GRID_N = 40
  const METRO_ACCESS_M = ROUTING_CONSTANTS.MAX_WALK_TO_METRO_M
  const BUS_ACCESS_M = ROUTING_CONSTANTS.MAX_WALK_TO_BUS_M

  const points: Array<{ lat: number; lng: number; reachable: boolean }> = []
  let metroReachable = 0
  let busReachable = 0
  let eitherReachable = 0

  for (let i = 0; i < GRID_N; i++) {
    for (let j = 0; j < GRID_N; j++) {
      const lat = bounds.minLat + ((bounds.maxLat - bounds.minLat) * i) / (GRID_N - 1)
      const lng = bounds.minLng + ((bounds.maxLng - bounds.minLng) * j) / (GRID_N - 1)

      const nearestMetroM = Math.min(...METRO_STATIONS.map((s) => haversine(lat, lng, s.latitude, s.longitude)))
      const nearestBusM = Math.min(...BUS_STOPS.map((s) => haversine(lat, lng, s.latitude, s.longitude)))

      const metroOk = nearestMetroM <= METRO_ACCESS_M
      const busOk = nearestBusM <= BUS_ACCESS_M
      if (metroOk) metroReachable++
      if (busOk) busReachable++
      if (metroOk || busOk) eitherReachable++

      points.push({ lat, lng, reachable: metroOk || busOk })
    }
  }

  const total = GRID_N * GRID_N
  return {
    methodology: `${GRID_N}x${GRID_N} grid (${total} points) over the real network's lat/lng extent padded by ${padDeg} degrees (~3.3km); reachable = within ${METRO_ACCESS_M}m of a metro station or ${BUS_ACCESS_M}m of a bus stop (ROUTING_CONSTANTS.MAX_WALK_TO_METRO_M / MAX_WALK_TO_BUS_M, the exact thresholds route generation enforces).`,
    bounds,
    gridN: GRID_N,
    metroReachablePercent: Number(((metroReachable / total) * 100).toFixed(1)),
    busReachablePercent: Number(((busReachable / total) * 100).toFixed(1)),
    eitherReachablePercent: Number(((eitherReachable / total) * 100).toFixed(1)),
    points,
  }
}

// ── Figure 2: pipeline latency breakdown (one real scenario) ────────────────
async function computePipelineLatency() {
  const scenario = EVALUATION_SCENARIOS[8] // a cross-line interchange scenario — exercises every stage
  const t0 = performance.now()

  const t1a = performance.now()
  const rawRoutes = await multimodalService.generateRoutes({ origin: scenario.origin, destination: scenario.destination })
  const t1b = performance.now()

  const t2a = performance.now()
  const accessibilityFiltered = await accessibilityService.filterRoutes(rawRoutes, "standard")
  const t2b = performance.now()

  const t3a = performance.now()
  const enriched: EnrichedRoute[] = []
  for (const r of accessibilityFiltered) {
    const route: EnrichedRoute = { ...r }
    route.reliability = reliabilityService.calculateReliability(route)
    route.confidenceInterval = await reliabilityService.calculateConfidenceInterval(route)
    route.missedConnectionRisk = await reliabilityService.calculateMissedConnectionRisk(route)
    enriched.push(route)
  }
  const t3b = performance.now()

  const t4a = performance.now()
  for (const route of enriched) {
    route.transitDnaScore = transitDnaService.scoreRoute(route)
  }
  const top = [...enriched].sort((a, b) => (b.transitDnaScore ?? 0) - (a.transitDnaScore ?? 0))[0]
  if (top) {
    top.whyRecommended = transitDnaService.generateWhyRecommended(top, enriched, "standard", undefined, false)
  }
  const t4b = performance.now()

  const t5 = performance.now()

  return {
    scenario: { origin: scenario.origin.name, destination: scenario.destination.name },
    candidateCount: rawRoutes.length,
    stages: [
      { name: "Candidate generation (graph search)", ms: Number((t1b - t1a).toFixed(2)) },
      { name: "Accessibility filtering", ms: Number((t2b - t2a).toFixed(2)) },
      { name: "Reliability + confidence interval + Monte Carlo risk (all candidates)", ms: Number((t3b - t3a).toFixed(2)) },
      { name: "Ranking + explanation generation", ms: Number((t4b - t4a).toFixed(2)) },
    ],
    totalMs: Number((t5 - t0).toFixed(2)),
  }
}

// ── Figure 4: Pareto scatter for one real corridor ───────────────────────────
async function computeParetoScatter() {
  // Pick whichever scenario produces the richest candidate set, so the
  // figure shows a genuine multi-way trade-off rather than just 2 points.
  let best: { scenario: (typeof EVALUATION_SCENARIOS)[number]; enriched: EnrichedRoute[] } | null = null
  for (const scenario of EVALUATION_SCENARIOS) {
    const enriched = await enrichScenarioRoutes(scenario)
    if (!best || enriched.length > best.enriched.length) {
      best = { scenario, enriched }
    }
    if (best.enriched.length >= 4) break // good enough for a readable scatter
  }
  const { scenario, enriched } = best!
  return {
    scenario: { origin: scenario.origin.name, destination: scenario.destination.name },
    candidates: enriched.map((r) => ({
      label: r.labelDisplay,
      durationMinutes: Math.round(r.totalDurationSeconds / 60),
      fare: r.totalFare,
      walkingMeters: r.totalWalkingMeters,
      transfers: r.transferCount,
    })),
  }
}

// ── Figure 5: ablation study (already computed by the real evaluation harness) ──
async function computeAblation() {
  const result = await evaluationService.runEvaluation()
  return {
    totalScenarios: result.totalScenariosEvaluated,
    ablationDecisionChangeRatePercent: result.ablationDecisionChangeRatePercent,
    baselineAgreement: {
      shortestTime: result.agreementRateWithShortestTimePercent,
      cheapest: result.agreementRateWithCheapestPercent,
      leastWalking: result.agreementRateWithLeastWalkingPercent,
      fewestTransfers: result.agreementRateWithFewestTransfersPercent,
      random: result.agreementRateWithRandomPercent,
    },
    latencyP50Ms: result.latencyP50Ms,
    latencyP95Ms: result.latencyP95Ms,
  }
}

// ── Figure 6: calibration curve (real synthetic observations, standard z-values) ──
function computeCalibrationCurve() {
  const dataset = historicalReliabilityService.generateSyntheticJourneyObservations()
  const splitIdx = Math.floor(dataset.length * 0.8)
  const trainSet = dataset.slice(0, splitIdx)
  const testSet = dataset.slice(splitIdx)

  const trainErrors = trainSet.map((d) => d.errorMinutes)
  const N = trainErrors.length
  const meanError = trainErrors.reduce((a, b) => a + b, 0) / N
  const ss = trainErrors.reduce((sum, e) => sum + Math.pow(e - meanError, 2), 0)
  const stdDev = Math.sqrt(ss / (N - 1))

  // Standard normal two-tailed critical values (textbook values, not fitted).
  const levels: Array<{ nominalPercent: number; z: number }> = [
    { nominalPercent: 50, z: 0.674 },
    { nominalPercent: 60, z: 0.842 },
    { nominalPercent: 70, z: 1.036 },
    { nominalPercent: 80, z: 1.282 },
    { nominalPercent: 90, z: 1.645 },
    { nominalPercent: 95, z: 1.96 },
    { nominalPercent: 99, z: 2.576 },
  ]

  const curve = levels.map(({ nominalPercent, z }) => {
    const margin = z * stdDev
    let covered = 0
    for (const obs of testSet) {
      const expectedMean = obs.predictedDurationMinutes + meanError
      const lower = expectedMean - margin
      const upper = expectedMean + margin
      if (obs.actualDurationMinutes >= lower && obs.actualDurationMinutes <= upper) covered++
    }
    return {
      nominalPercent,
      empiricalPercent: Number(((covered / testSet.length) * 100).toFixed(1)),
    }
  })

  return {
    note: "Synthetic demo observations (historicalReliabilityService.generateSyntheticJourneyObservations, seeded) — not real user data. 80/20 chronological split, mean/stddev from the training half, standard normal z critical values (textbook, not fitted).",
    trainSize: trainSet.length,
    testSize: testSet.length,
    meanErrorMinutes: Number(meanError.toFixed(2)),
    stdDevMinutes: Number(stdDev.toFixed(2)),
    curve,
  }
}

// ── Figure 7: learning curve (real PairwiseLogisticRegression, increasing training size) ──
function computeLearningCurve() {
  const allSamples = mlEvaluationService.generateSyntheticPreferenceDataset()
  const { train, test } = stratifiedSplit(allSamples, 0.8, 7)

  const sizes = [10, 20, 30, 40, 50, 60, 70, 80, train.length]
  const curve = sizes
    .filter((n, i) => sizes.indexOf(n) === i && n <= train.length)
    .map((n) => {
      const subset = train.slice(0, n)
      const model = new PairwiseLogisticRegression()
      model.train(subset)
      const testAccuracy = model.evaluateAccuracy(test)
      return { trainingSamples: n, testAccuracyPercent: testAccuracy }
    })

  return {
    note: "Synthetic, noisy, balanced two-class pairwise dataset (mlEvaluationService.generateSyntheticPreferenceDataset, seeded) — not real user choices. Same held-out test set (the stratified 20%) evaluated at each training-set size.",
    testSize: test.length,
    curve,
  }
}

// ── Figure 9: one real explanation card, data source per claim ──────────────
async function computeExplanationCard() {
  let best: { scenario: (typeof EVALUATION_SCENARIOS)[number]; enriched: EnrichedRoute[] } | null = null
  for (const s of EVALUATION_SCENARIOS) {
    const e = await enrichScenarioRoutes(s)
    if (!best || e.length > best.enriched.length) best = { scenario: s, enriched: e }
    if (best.enriched.length >= 4) break
  }
  const { scenario, enriched } = best!
  const accessibilityFiltered = await accessibilityService.filterRoutes(enriched, "standard")
  for (const route of accessibilityFiltered) {
    route.transitDnaScore = transitDnaService.scoreRoute(route)
  }
  const ranked = [...accessibilityFiltered].sort((a, b) => (b.transitDnaScore ?? 0) - (a.transitDnaScore ?? 0))
  const top = ranked[0] as EnrichedRoute
  const reasons = transitDnaService.generateWhyRecommended(top, ranked, "standard", undefined, false)

  return {
    scenario: { origin: scenario.origin.name, destination: scenario.destination.name },
    route: {
      label: top.labelDisplay,
      durationMinutes: Math.round(top.totalDurationSeconds / 60),
      fare: top.totalFare,
      walkingMeters: top.totalWalkingMeters,
      transfers: top.transferCount,
      transitDnaScore: top.transitDnaScore,
      reliabilityScore: top.reliability?.score,
      missedConnectionRiskPercent: top.missedConnectionRisk?.overallRiskPercent,
    },
    explanationTags: reasons,
  }
}

async function main() {
  console.log("Computing Figure 3 (coverage grid)...")
  const coverageGrid = computeCoverageGrid()

  console.log("Computing Figure 2 (pipeline latency)...")
  const pipelineLatency = await computePipelineLatency()

  console.log("Computing Figure 4 (Pareto scatter)...")
  const paretoScatter = await computeParetoScatter()

  console.log("Computing Figure 5 (ablation study, full 22-scenario benchmark)...")
  const ablation = await computeAblation()

  console.log("Computing Figure 6 (calibration curve)...")
  const calibrationCurve = computeCalibrationCurve()

  console.log("Computing Figure 7 (learning curve)...")
  const learningCurve = computeLearningCurve()

  console.log("Computing Figure 9 (explanation card)...")
  const explanationCard = await computeExplanationCard()

  const output = {
    generatedAt: new Date().toISOString(),
    coverageGrid,
    pipelineLatency,
    paretoScatter,
    ablation,
    calibrationCurve,
    learningCurve,
    explanationCard,
  }

  const outPath = path.join(__dirname, "paper-data.json")
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2))
  console.log(`\nWrote ${outPath}`)
}

main().catch((err) => {
  console.error("generate-paper-data.ts failed:", err)
  process.exit(1)
})
