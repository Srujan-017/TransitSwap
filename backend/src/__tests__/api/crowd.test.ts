import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"

/**
 * Phase 10 — API integration tests for /api/crowd/* (3 of 50 endpoints):
 * POST /report, GET /station/:id, GET /history/:id.
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
  console.log("🧪 Running Phase 10 API Integration Tests — /api/crowd/*...\n")

  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured (needed to register a test user). This is an honest skip, not a pass.\n")
    return
  }

  const user = await registerTestUser()
  const stationId = "pl-01"

  console.log("1️⃣ Testing POST /api/crowd/report (happy path)...")
  const reportRes = await request(app).post("/api/crowd/report").set(...authHeader(user.token)).send({
    stationId,
    stationName: "Whitefield Metro",
    transportMode: "metro",
    crowdLevel: "MEDIUM",
  })
  if (assert(reportRes.status === 200 || reportRes.status === 201, `Expected 200/201, got ${reportRes.status}`)) {
    console.log("   ✅ Crowd report submitted.\n")
  }

  console.log("2️⃣ Testing POST /api/crowd/report with no token (auth failure)...")
  const reportNoAuthRes = await request(app).post("/api/crowd/report").send({
    stationId,
    stationName: "Whitefield Metro",
    transportMode: "metro",
    crowdLevel: "MEDIUM",
  })
  if (assert(reportNoAuthRes.status === 401, `Expected 401, got ${reportNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("3️⃣ Testing POST /api/crowd/report validation failure (invalid crowdLevel)...")
  const badReportRes = await request(app).post("/api/crowd/report").set(...authHeader(user.token)).send({
    stationId,
    stationName: "Whitefield Metro",
    transportMode: "metro",
    crowdLevel: "EXTREME",
  })
  if (assert(badReportRes.status === 400, `Expected 400, got ${badReportRes.status}`)) console.log("   ✅ 400 on invalid crowdLevel.\n")

  console.log("4️⃣ Testing GET /api/crowd/station/:stationId (happy path)...")
  const stationRes = await request(app).get(`/api/crowd/station/${stationId}`).set(...authHeader(user.token))
  if (assert(stationRes.status === 200, `Expected 200, got ${stationRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("5️⃣ Testing GET /api/crowd/station/:stationId with no token (auth failure)...")
  const stationNoAuthRes = await request(app).get(`/api/crowd/station/${stationId}`)
  if (assert(stationNoAuthRes.status === 401, `Expected 401, got ${stationNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("6️⃣ Testing GET /api/crowd/history/:stationId (happy path)...")
  const historyRes = await request(app).get(`/api/crowd/history/${stationId}`).set(...authHeader(user.token))
  if (assert(historyRes.status === 200, `Expected 200, got ${historyRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("7️⃣ Testing GET /api/crowd/history/:stationId with no token (auth failure)...")
  const historyNoAuthRes = await request(app).get(`/api/crowd/history/${stationId}`)
  if (assert(historyNoAuthRes.status === 401, `Expected 401, got ${historyNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/crowd/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
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
  console.error("❌ /api/crowd/* test failure:", err)
  process.exit(1)
})
