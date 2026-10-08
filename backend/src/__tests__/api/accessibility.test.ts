import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"

/**
 * Phase 10 — API integration tests for /api/accessibility/* (4 of 50
 * endpoints): GET /stations, GET /stations/:id, GET /stations/:id/reports,
 * POST /report.
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
  console.log("🧪 Running Phase 10 API Integration Tests — /api/accessibility/*...\n")

  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured (needed to register a test user). This is an honest skip, not a pass.\n")
    return
  }

  const user = await registerTestUser()
  const stationId = "pl-01" // Whitefield Metro, from transitData.ts

  console.log("1️⃣ Testing GET /api/accessibility/stations (happy path)...")
  const listRes = await request(app).get("/api/accessibility/stations").set(...authHeader(user.token))
  if (assert(listRes.status === 200 && Array.isArray(listRes.body?.data), `Expected 200 with an array, got ${listRes.status}`)) {
    console.log(`   ✅ ${listRes.body.data.length} station(s) returned.\n`)
  }

  console.log("2️⃣ Testing GET /api/accessibility/stations with no token (auth failure)...")
  const listNoAuthRes = await request(app).get("/api/accessibility/stations")
  if (assert(listNoAuthRes.status === 401, `Expected 401, got ${listNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("3️⃣ Testing GET /api/accessibility/stations/:stationId (happy path)...")
  const stationRes = await request(app).get(`/api/accessibility/stations/${stationId}`).set(...authHeader(user.token))
  if (assert(stationRes.status === 200, `Expected 200, got ${stationRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("4️⃣ Testing GET /api/accessibility/stations/:stationId with no token (auth failure)...")
  const stationNoAuthRes = await request(app).get(`/api/accessibility/stations/${stationId}`)
  if (assert(stationNoAuthRes.status === 401, `Expected 401, got ${stationNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("5️⃣ Testing GET /api/accessibility/stations/:stationId/reports (happy path)...")
  const reportsRes = await request(app).get(`/api/accessibility/stations/${stationId}/reports`).set(...authHeader(user.token))
  if (assert(reportsRes.status === 200, `Expected 200, got ${reportsRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("6️⃣ Testing GET /api/accessibility/stations/:stationId/reports with no token (auth failure)...")
  const reportsNoAuthRes = await request(app).get(`/api/accessibility/stations/${stationId}/reports`)
  if (assert(reportsNoAuthRes.status === 401, `Expected 401, got ${reportsNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("7️⃣ Testing POST /api/accessibility/report (happy path)...")
  const submitRes = await request(app).post("/api/accessibility/report").set(...authHeader(user.token)).send({
    stationId,
    stationName: "Whitefield Metro",
    issueType: "lift_unavailable",
    description: "Phase 10 integration test — lift reported unavailable.",
  })
  if (assert(submitRes.status === 201 || submitRes.status === 200, `Expected 200/201, got ${submitRes.status}`)) {
    console.log("   ✅ Report submitted.\n")
  }

  console.log("8️⃣ Testing POST /api/accessibility/report with no token (auth failure)...")
  const submitNoAuthRes = await request(app).post("/api/accessibility/report").send({
    stationId,
    stationName: "Whitefield Metro",
    issueType: "lift_unavailable",
    description: "Should be rejected — no token.",
  })
  if (assert(submitNoAuthRes.status === 401, `Expected 401, got ${submitNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("9️⃣ Testing POST /api/accessibility/report validation failure (invalid issueType)...")
  const badSubmitRes = await request(app).post("/api/accessibility/report").set(...authHeader(user.token)).send({
    stationId,
    stationName: "Whitefield Metro",
    issueType: "not_a_real_issue_type",
    description: "Should be rejected by express-validator.",
  })
  if (assert(badSubmitRes.status === 400, `Expected 400, got ${badSubmitRes.status}`)) console.log("   ✅ 400 on invalid issueType.\n")

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/accessibility/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
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
  console.error("❌ /api/accessibility/* test failure:", err)
  process.exit(1)
})
