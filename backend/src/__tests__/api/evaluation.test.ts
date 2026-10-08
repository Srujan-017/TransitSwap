import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"

/**
 * Phase 10 — API integration tests for /api/evaluation/* (5 of 50
 * endpoints): GET /, GET /ml, GET /ml/status, GET /reliability/evaluation,
 * GET /reliability/stats.
 *
 * Phase 11 fix (S4) — these 5 were previously documented as "deliberately
 * unauthenticated" (see PROJECT_MASTER_PLAN.md S4/S23: unauthenticated +
 * computationally heavy = a cheap DoS / cost amplification vector). They now
 * require a valid JWT like every other non-public endpoint
 * (evaluation.routes.ts), so this file adds the "no token -> 401" case for
 * each endpoint alongside the existing happy-path + response-shape checks.
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
  console.log("🧪 Running Phase 10/11 API Integration Tests — /api/evaluation/*...\n")

  // Phase 11 fix — authenticating these routes (see the comment above) means
  // every assertion below now needs a registered test user, which needs a
  // DB connection. Without this guard, registerTestUser() throws instead of
  // honestly skipping when MONGODB_URI isn't available — unlike every other
  // DB-dependent api/*.test.ts file, which already follows this pattern.
  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured (needed to register a test user). This is an honest skip, not a pass.\n")
    return
  }

  const user = await registerTestUser()
  const auth = authHeader(user.token)

  console.log("0️⃣ Testing auth is required on every /api/evaluation/* route...")
  const unauthEndpoints = ["/api/evaluation", "/api/evaluation/ml", "/api/evaluation/ml/status", "/api/evaluation/reliability/evaluation", "/api/evaluation/reliability/stats"]
  for (const endpoint of unauthEndpoints) {
    const res = await request(app).get(endpoint)
    assert(res.status === 401, `Expected 401 without a token for ${endpoint}, got ${res.status}`)
  }
  console.log("   ✅ All 5 routes reject an unauthenticated request.\n")

  console.log("1️⃣ Testing GET /api/evaluation (happy path — 22-scenario benchmark)...")
  const mainRes = await request(app).get("/api/evaluation").set(...auth)
  if (assert(mainRes.status === 200 && mainRes.body?.data?.isSimulatedBenchmark === true, `Expected 200 with isSimulatedBenchmark:true, got ${mainRes.status}`)) {
    console.log(`   ✅ ${mainRes.body.data.totalScenariosEvaluated} scenarios evaluated.\n`)
  }

  console.log("2️⃣ Testing GET /api/evaluation/ml (happy path)...")
  const mlRes = await request(app).get("/api/evaluation/ml").set(...auth)
  if (assert(mlRes.status === 200 && mlRes.body?.data?.isSimulatedBenchmark === true, `Expected 200 with isSimulatedBenchmark:true, got ${mlRes.status}`)) {
    console.log("   ✅ ML benchmark report returned.\n")
  }

  console.log("3️⃣ Testing GET /api/evaluation/ml/status (happy path)...")
  const mlStatusRes = await request(app).get("/api/evaluation/ml/status").set(...auth)
  if (assert(mlStatusRes.status === 200 && typeof mlStatusRes.body?.data?.isPersonalized === "boolean", `Expected 200 with isPersonalized boolean, got ${mlStatusRes.status}`)) {
    console.log("   ✅ ML status returned.\n")
  }

  console.log("4️⃣ Testing GET /api/evaluation/reliability/evaluation (happy path)...")
  const coverageRes = await request(app).get("/api/evaluation/reliability/evaluation").set(...auth)
  if (assert(coverageRes.status === 200 && typeof coverageRes.body?.data?.dataSource === "string", `Expected 200 with a dataSource field, got ${coverageRes.status}`)) {
    console.log(`   ✅ Coverage evaluation returned (dataSource: ${coverageRes.body.data.dataSource}).\n`)
  }

  console.log("5️⃣ Testing GET /api/evaluation/reliability/stats (happy path)...")
  const statsRes = await request(app).get("/api/evaluation/reliability/stats").set(...auth)
  if (assert(statsRes.status === 200, `Expected 200, got ${statsRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/evaluation/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  // Phase 11 fix — this file connects to MongoDB via registerTestUser()/
  // ensureDbConnected() but never disconnected, so an open mongoose
  // connection's keep-alive handles blocked Node's natural process exit —
  // spawnSync had to wait out the full per-entry timeout every single run
  // (see run-tests.js), even though every assertion above already passed.
  // Exiting explicitly, on both the success and failure path, fixes that.
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error("❌ /api/evaluation/* test failure:", err)
  process.exit(1)
})
