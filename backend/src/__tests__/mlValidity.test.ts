import { mlEvaluationService, stratifiedSplit } from "../services/ml/mlEvaluationService"
import { buildPairwiseDocs } from "../services/ml/mlPreferenceService"
import { PairwiseLogisticRegression } from "../services/ml/logisticRegression"
import type { EnrichedRoute } from "../types/intelligence"
import type { RouteFeatureVector } from "../services/ml/featureExtractor"

/**
 * Phase 8 — ML Validity Tests
 *
 * Verifies the master plan's explicit Phase 8 testing requirements: both
 * pairwise labels are actually produced, a constant classifier can't fake a
 * perfect score on the (now-balanced) data, trained weights recover a known
 * planted preference direction, log-loss decreases with more training, and
 * the synthetic benchmark's stratified test split covers every archetype.
 */

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string): boolean {
  if (condition) {
    passed++
    return true
  } else {
    failed++
    console.error(`   ❌ FAILED: ${msg}`)
    return false
  }
}

function makeFeatureVector(routeId: string, featureArray: number[]): RouteFeatureVector {
  const [time, cost, walking, reliability, accessibility, crowd, weather, connectionRisk, transfers] = featureArray
  return {
    routeId,
    features: { time, cost, walking, reliability, accessibility, crowd, weather, connectionRisk, transfers },
    featureArray,
  }
}

function makeMinimalRoute(id: string): EnrichedRoute {
  return {
    id,
    label: "FASTEST",
    labelDisplay: "Fastest",
    labelColor: "#2563eb",
    segments: [
      {
        id: `${id}-seg`,
        mode: "bus",
        from: { name: "A", latitude: 19.1, longitude: 72.8 },
        to: { name: "B", latitude: 19.1, longitude: 72.9 },
        distanceMeters: 1000,
        durationSeconds: 600,
        estimatedFare: 20,
        instruction: "bus segment",
        geometry: { type: "LineString", coordinates: [] },
      },
    ],
    totalDistanceMeters: 1000,
    totalDurationSeconds: 600,
    totalWalkingMeters: 200,
    totalFare: 20,
    transferCount: 0,
    modes: ["bus"],
    summary: `Route ${id}`,
    isDemoData: true,
  }
}

async function runValidityTests() {
  console.log("🧪 Running Phase 8 ML Validity Tests...\n")

  // ── Test 1: buildPairwiseDocs stores BOTH labels ──────────────────────────

  console.log("1️⃣ Testing buildPairwiseDocs produces both label:1 and label:0...")
  const chosenRoute = makeMinimalRoute("route-chosen")
  const chosenVector = makeFeatureVector("route-chosen", [0.8, 0.5, 0.6, 0.9, 0.6, 0.6, 1.0, 0.95, 1.0])
  const rejectedVector = makeFeatureVector("route-rejected", [0.3, 0.2, 0.4, 0.5, 0.6, 0.6, 1.0, 0.6, 0.75])
  const docs = buildPairwiseDocs("user-1", chosenRoute, chosenVector, [rejectedVector], "USER_CHOICE")

  if (assert(docs.length === 2, `buildPairwiseDocs returns 2 documents per alternative (got ${docs.length})`)) {
    console.log("   ✅ Document count correct.")
  }
  const labels = docs.map((d) => d.label).sort()
  if (assert(JSON.stringify(labels) === JSON.stringify([0, 1]), `Both label:0 and label:1 are present (got ${JSON.stringify(labels)})`)) {
    console.log("   ✅ Both labels present.\n")
  }
  const posDoc = docs.find((d) => d.label === 1)!
  const negDoc = docs.find((d) => d.label === 0)!
  if (assert(
    posDoc.deltaX.every((v, i) => Math.abs(v + negDoc.deltaX[i]) < 1e-9),
    "label:0 document's deltaX is the exact negation of label:1's deltaX (a true mirror)",
  )) {
    console.log("   ✅ Mirror relationship verified.\n")
  }
  if (assert(
    posDoc.chosenRouteId === negDoc.chosenRouteId && posDoc.rejectedRouteId === negDoc.rejectedRouteId,
    "Both documents describe the same ground-truth chosen/rejected route IDs (only deltaX/label differ)",
  )) {
    console.log("   ✅ Ground truth preserved across the mirror.\n")
  }

  // ── Test 2: synthetic benchmark dataset is genuinely balanced ────────────

  console.log("2️⃣ Testing synthetic dataset has balanced (50/50) labels...")
  const dataset = mlEvaluationService.generateSyntheticPreferenceDataset()
  const label1Count = dataset.filter((s) => s.label === 1).length
  const label0Count = dataset.filter((s) => s.label === 0).length
  if (assert(label1Count === label0Count && label1Count > 0, `Labels are balanced (label=1: ${label1Count}, label=0: ${label0Count})`)) {
    console.log("   ✅ Balanced labels confirmed.\n")
  }

  // ── Test 3: a constant classifier cannot fake 100% anymore ───────────────

  console.log("3️⃣ Testing a constant classifier does NOT achieve 100% on the balanced dataset...")
  const constantAccuracy = (label1Count / dataset.length) * 100
  if (assert(constantAccuracy < 100, `Constant "always predict 1" classifier accuracy is ${constantAccuracy.toFixed(1)}%, not 100%`)) {
    console.log("   ✅ Constant-classifier ceiling broken.\n")
  }

  // ── Test 4: stratified split covers every archetype in the test set ─────

  console.log("4️⃣ Testing stratified split's test set contains every archetype...")
  const { train, test } = stratifiedSplit(dataset, 0.8, 7)
  const archetypesInTest = new Set(test.map((s) => s.archetype))
  const archetypesInDataset = new Set(dataset.map((s) => s.archetype))
  if (assert(
    archetypesInTest.size === archetypesInDataset.size,
    `Test split contains all ${archetypesInDataset.size} archetypes (got ${archetypesInTest.size}: ${[...archetypesInTest].join(", ")})`,
  )) {
    console.log("   ✅ Full archetype coverage in test split.\n")
  }
  if (assert(train.length + test.length === dataset.length, "Stratified split partitions every sample exactly once (no loss, no duplication)")) {
    console.log("   ✅ Split is a true partition.\n")
  }

  // ── Test 5: held-out benchmark accuracy is strictly between 50% and 100% ─

  console.log("5️⃣ Testing the benchmark's held-out accuracy is strictly between 50% and 100%...")
  const report = await mlEvaluationService.runMLEvaluation()
  if (assert(
    report.mlPairwiseAccuracyPercent > 50 && report.mlPairwiseAccuracyPercent < 100,
    `Held-out ML accuracy (${report.mlPairwiseAccuracyPercent}%) is strictly between 50% and 100% — not the old fake 100%, not degenerate`,
  )) {
    console.log("   ✅ Honest, non-degenerate held-out accuracy.\n")
  }

  // ── Test 6: trained weights recover a known, planted preference direction

  console.log("6️⃣ Testing trained weights recover a known planted preference (cost-sensitive archetype)...")
  const costOnlySamples = dataset
    .filter((s) => s.archetype === "cost_sensitive")
    .map((s) => ({ deltaX: s.deltaX, label: s.label }))
  const costModel = new PairwiseLogisticRegression()
  const costResult = costModel.train(costOnlySamples)
  const weightEntries = Object.entries(costResult.weights) as Array<[string, number]>
  const [topFeature] = weightEntries.sort((a, b) => b[1] - a[1])[0]
  if (assert(topFeature === "cost", `The single highest-weighted feature after training on cost-sensitive-only data is "cost" (got "${topFeature}")`)) {
    console.log("   ✅ Planted preference direction recovered.\n")
  }

  // ── Test 7: log-loss decreases with more training iterations ────────────

  console.log("7️⃣ Testing log-loss decreases over training iterations...")
  const trainingSet = dataset.map((s) => ({ deltaX: s.deltaX, label: s.label }))
  const fewIterModel = new PairwiseLogisticRegression(undefined, 0.05, 2, 0.01)
  const manyIterModel = new PairwiseLogisticRegression(undefined, 0.05, 200, 0.01)
  const fewIterResult = fewIterModel.train(trainingSet)
  const manyIterResult = manyIterModel.train(trainingSet)
  if (assert(
    manyIterResult.finalLoss < fewIterResult.finalLoss,
    `Loss after 200 iterations (${manyIterResult.finalLoss}) is lower than after 2 iterations (${fewIterResult.finalLoss})`,
  )) {
    console.log("   ✅ Log-loss decreases with training.\n")
  }

  // ── Summary ────────────────────────────────────────────────────────────

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} PHASE 8 ML VALIDITY TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

runValidityTests().catch((err) => {
  console.error("❌ ML validity test failure:", err)
  process.exit(1)
})
