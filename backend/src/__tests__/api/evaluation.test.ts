import request from "supertest"
import { app } from "../helpers/testApp"

/**
 * Phase 10 — API integration tests for /api/evaluation/* (5 of 50
 * endpoints): GET /, GET /ml, GET /ml/status, GET /reliability/evaluation,
 * GET /reliability/stats. All 5 are DELIBERATELY unauthenticated (see
 * README.md §Evaluation and PROJECT_MASTER_PLAN.md S4/S23) — there is no
 * "no token -> 401" case to test here, so each gets a happy-path +
 * response-shape test instead, which is the honest equivalent for this
 * group. No DB required — all 5 gracefully degrade to demo/synthetic data.
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

async function run() {
  console.log("🧪 Running Phase 10 API Integration Tests — /api/evaluation/*...\n")

  console.log("1️⃣ Testing GET /api/evaluation (happy path — 22-scenario benchmark)...")
  const mainRes = await request(app).get("/api/evaluation")
  if (assert(mainRes.status === 200 && mainRes.body?.data?.isSimulatedBenchmark === true, `Expected 200 with isSimulatedBenchmark:true, got ${mainRes.status}`)) {
    console.log(`   ✅ ${mainRes.body.data.totalScenariosEvaluated} scenarios evaluated.\n`)
  }

  console.log("2️⃣ Testing GET /api/evaluation/ml (happy path)...")
  const mlRes = await request(app).get("/api/evaluation/ml")
  if (assert(mlRes.status === 200 && mlRes.body?.data?.isSimulatedBenchmark === true, `Expected 200 with isSimulatedBenchmark:true, got ${mlRes.status}`)) {
    console.log("   ✅ ML benchmark report returned.\n")
  }

  console.log("3️⃣ Testing GET /api/evaluation/ml/status (happy path)...")
  const mlStatusRes = await request(app).get("/api/evaluation/ml/status")
  if (assert(mlStatusRes.status === 200 && typeof mlStatusRes.body?.data?.isPersonalized === "boolean", `Expected 200 with isPersonalized boolean, got ${mlStatusRes.status}`)) {
    console.log("   ✅ ML status returned.\n")
  }

  console.log("4️⃣ Testing GET /api/evaluation/reliability/evaluation (happy path)...")
  const coverageRes = await request(app).get("/api/evaluation/reliability/evaluation")
  if (assert(coverageRes.status === 200 && typeof coverageRes.body?.data?.dataSource === "string", `Expected 200 with a dataSource field, got ${coverageRes.status}`)) {
    console.log(`   ✅ Coverage evaluation returned (dataSource: ${coverageRes.body.data.dataSource}).\n`)
  }

  console.log("5️⃣ Testing GET /api/evaluation/reliability/stats (happy path)...")
  const statsRes = await request(app).get("/api/evaluation/reliability/stats")
  if (assert(statsRes.status === 200, `Expected 200, got ${statsRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/evaluation/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error("❌ /api/evaluation/* test failure:", err)
  process.exit(1)
})
