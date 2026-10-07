import {
  evaluationService,
  EVALUATION_SCENARIOS,
} from "../services/evaluationService"
import {
  setMultimodalRoadLegProviderForTesting,
  type RoadLegProvider,
} from "../services/multimodalService"

/**
 * Phase 9 — Evaluation Harness Tests
 *
 * Verifies the master plan's explicit Phase 9 testing requirement: "the
 * harness must be deterministic given a seed; assert baseline disagreement
 * > 0." Also checks the new ablation/baseline/latency fields are well-formed.
 *
 * Forces the offline road-leg provider (same pattern as
 * multimodalRouting.test.ts) so determinism is actually guaranteed by the
 * test, not merely assumed from "OSRM happens to be unreachable here."
 */
const offlineProvider: RoadLegProvider = {
  async getRoute() {
    throw new Error("offline test provider")
  },
}

let passed = 0
let failed = 0

function check(condition: boolean, msg: string): boolean {
  if (condition) {
    passed++
    return true
  } else {
    failed++
    console.error(`   ❌ FAILED: ${msg}`)
    return false
  }
}

async function runEvaluationHarnessTests() {
  console.log("🧪 Running Phase 9 Evaluation Harness Tests...\n")

  setMultimodalRoadLegProviderForTesting(offlineProvider)

  try {
    // ── Test 1: scenario set meets the master plan's >=20 requirement ──────

    console.log("1️⃣ Testing the scenario set has >= 20 scenarios...")
    if (check(EVALUATION_SCENARIOS.length >= 20, `Scenario count is ${EVALUATION_SCENARIOS.length}, expected >= 20`)) {
      console.log(`   ✅ ${EVALUATION_SCENARIOS.length} scenarios confirmed.\n`)
    }

    // ── Test 2: no scenario uses a 0m-degenerate exact-station coordinate ──

    console.log("2️⃣ Testing no scenario's origin/destination sits exactly on a station/stop (the §13 degenerate case)...")
    const allOffset = EVALUATION_SCENARIOS.every((s) => s.origin.name.startsWith("Near ") && s.destination.name.startsWith("Near "))
    if (check(allOffset, "Every scenario's origin/destination is a 'Near <place>' offset address, not an exact coordinate")) {
      console.log("   ✅ No exact-coordinate degenerate scenarios.\n")
    }

    // ── Test 3: determinism — running twice produces identical results ─────

    console.log("3️⃣ Testing the harness is deterministic given the offline provider (run twice, compare)...")
    const run1 = await evaluationService.runEvaluation()
    const run2 = await evaluationService.runEvaluation()

    // evaluatedAt and the 3 latency fields are real wall-clock measurements —
    // expected to vary run to run even with identical inputs (GC, JIT
    // warmup, OS scheduling). Determinism here means every DECISION (which
    // route wins, which baselines agree, which ablation changes the pick) is
    // reproducible — not that two runs take exactly the same milliseconds.
    const strip = (report: typeof run1) => {
      const { evaluatedAt: _t, averageComputationLatencyMs: _a, latencyP50Ms: _p50, latencyP95Ms: _p95, ...rest } = report
      return rest
    }
    if (check(
      JSON.stringify(strip(run1)) === JSON.stringify(strip(run2)),
      "Two consecutive runEvaluation() calls produce identical decisions (excluding timestamp/latency fields)",
    )) {
      console.log("   ✅ Deterministic across repeated runs.\n")
    }

    // ── Test 4: baseline disagreement > 0 ───────────────────────────────────

    console.log("4️⃣ Testing at least one baseline shows disagreement (< 100% agreement)...")
    const agreementRates = [
      run1.agreementRateWithShortestTimePercent,
      run1.agreementRateWithCheapestPercent,
      run1.agreementRateWithLeastWalkingPercent,
      run1.agreementRateWithFewestTransfersPercent,
      run1.agreementRateWithRandomPercent,
    ]
    if (check(agreementRates.some((rate) => rate < 100), `At least one baseline agreement rate is < 100% (got ${JSON.stringify(agreementRates)})`)) {
      console.log("   ✅ Genuine baseline disagreement confirmed — the engine is not just reproducing a baseline.\n")
    }

    // ── Test 5: ablation reports a decision-change rate for all 6 features ─

    console.log("5️⃣ Testing the ablation study reports a decision-change rate for every feature...")
    const expectedFeatures = ["reliability", "accessibility", "crowd", "weather", "connectionRisk", "transfers"]
    const ablationKeys = Object.keys(run1.ablationDecisionChangeRatePercent).sort()
    if (check(
      JSON.stringify(ablationKeys) === JSON.stringify([...expectedFeatures].sort()),
      `Ablation report covers exactly the 6 expected features (got ${JSON.stringify(ablationKeys)})`,
    )) {
      console.log("   ✅ All 6 ablation features present.\n")
    }
    const allRatesValid = Object.values(run1.ablationDecisionChangeRatePercent).every((v) => typeof v === "number" && v >= 0 && v <= 100)
    if (check(allRatesValid, "Every ablation decision-change rate is a number in [0, 100]")) {
      console.log("   ✅ Ablation rates well-formed.\n")
    }
    const atLeastOneFeatureMatters = Object.values(run1.ablationDecisionChangeRatePercent).some((v) => v > 0)
    if (check(atLeastOneFeatureMatters, "At least one feature's removal measurably changes the top pick on at least one scenario")) {
      console.log("   ✅ Ablation study shows real sensitivity, not all-zero.\n")
    }

    // ── Test 6: latency fields are well-formed ──────────────────────────────

    console.log("6️⃣ Testing latency percentile fields are well-formed (p95 >= p50 >= 0)...")
    if (check(
      run1.latencyP95Ms >= run1.latencyP50Ms && run1.latencyP50Ms >= 0,
      `p95 (${run1.latencyP95Ms}ms) >= p50 (${run1.latencyP50Ms}ms) >= 0`,
    )) {
      console.log("   ✅ Latency percentiles well-formed.\n")
    }

    // ── Test 7: every scenario that ran reports its candidate count ────────

    console.log("7️⃣ Testing every evaluated scenario reports a candidate count > 0...")
    const allHaveCandidates = run1.scenarios.every((s) => s.candidateCount > 0)
    if (check(allHaveCandidates, "Every scenario in the report generated at least 1 candidate route")) {
      console.log("   ✅ All reported scenarios have candidates.\n")
    }
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} PHASE 9 EVALUATION HARNESS TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

runEvaluationHarnessTests().catch((err) => {
  console.error("❌ Evaluation harness test failure:", err)
  setMultimodalRoadLegProviderForTesting(null)
  process.exit(1)
})
