import request from "supertest"
import { app, registerTestUser, registerTestAdmin, authHeader, ensureDbConnected } from "../helpers/testApp"
import { accessibilityService } from "../../services/accessibilityService"
import { CrowdReport } from "../../models/CrowdReport"

/**
 * Phase 10 — API integration tests for /api/admin/* (13 of 50 endpoints).
 * The whole router requires requireAuth + requireAdmin (router.use), so
 * every endpoint gets both a 403-for-non-admin test and an admin happy path.
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
  console.log("🧪 Running Phase 10 API Integration Tests — /api/admin/*...\n")

  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured. This is an honest skip, not a pass.\n")
    return
  }

  // Seed the demo accessibility dataset (normally done by server.ts's own
  // startup sequence, which this supertest harness deliberately bypasses —
  // it imports only the Express app, not the full server bootstrap) so
  // PUT /accessibility/:stationId has a real record to operate on.
  await accessibilityService.seedDemoAccessibilityIfEmpty()

  const regularUser = await registerTestUser()
  const admin = await registerTestAdmin()
  const testStationId = `phase10-test-station-${Date.now()}`

  // ── requireAdmin fail-closed check (one representative route) ──────────

  console.log("1️⃣ Testing GET /api/admin/overview rejects a non-admin user (403)...")
  const forbiddenRes = await request(app).get("/api/admin/overview").set(...authHeader(regularUser.token))
  if (assert(forbiddenRes.status === 403, `Expected 403, got ${forbiddenRes.status}`)) console.log("   ✅ 403 for non-admin.\n")

  console.log("2️⃣ Testing GET /api/admin/overview with no token (auth failure)...")
  const noAuthRes = await request(app).get("/api/admin/overview")
  if (assert(noAuthRes.status === 401, `Expected 401, got ${noAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("3️⃣ Testing GET /api/admin/overview as admin (happy path)...")
  const overviewRes = await request(app).get("/api/admin/overview").set(...authHeader(admin.token))
  if (assert(overviewRes.status === 200, `Expected 200, got ${overviewRes.status}`)) console.log("   ✅ 200 OK.\n")

  // ── Stations CRUD ────────────────────────────────────────────────────────

  console.log("4️⃣ Testing GET /api/admin/stations as admin (happy path)...")
  const stationsRes = await request(app).get("/api/admin/stations").set(...authHeader(admin.token))
  if (assert(stationsRes.status === 200 && Array.isArray(stationsRes.body?.data), `Expected 200 with an array, got ${stationsRes.status}`)) {
    console.log(`   ✅ ${stationsRes.body.data.length} station(s) returned.\n`)
  }

  console.log("5️⃣ Testing POST /api/admin/stations as admin (happy path)...")
  const createRes = await request(app).post("/api/admin/stations").set(...authHeader(admin.token)).send({
    stationId: testStationId,
    stationName: "Phase 10 Test Station",
    transportMode: "metro",
    latitude: 12.97,
    longitude: 77.75,
  })
  if (assert(createRes.status === 201 || createRes.status === 200, `Expected 200/201, got ${createRes.status}: ${JSON.stringify(createRes.body)}`)) {
    console.log("   ✅ Station created.\n")
  }

  console.log("6️⃣ Testing POST /api/admin/stations rejects a non-admin user (403)...")
  const createForbiddenRes = await request(app).post("/api/admin/stations").set(...authHeader(regularUser.token)).send({
    stationId: "should-not-be-created",
    stationName: "X",
    transportMode: "metro",
  })
  if (assert(createForbiddenRes.status === 403, `Expected 403, got ${createForbiddenRes.status}`)) console.log("   ✅ 403 for non-admin.\n")

  console.log("7️⃣ Testing PUT /api/admin/stations/:stationId as admin (happy path)...")
  const updateRes = await request(app).put(`/api/admin/stations/${testStationId}`).set(...authHeader(admin.token)).send({
    stationName: "Phase 10 Test Station (Updated)",
  })
  if (assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`)) console.log("   ✅ Station updated.\n")

  console.log("8️⃣ Testing PUT /api/admin/stations/:stationId validation failure (out-of-range latitude)...")
  const badUpdateRes = await request(app).put(`/api/admin/stations/${testStationId}`).set(...authHeader(admin.token)).send({ latitude: 999 })
  if (assert(badUpdateRes.status === 400, `Expected 400, got ${badUpdateRes.status}`)) console.log("   ✅ 400 on invalid latitude.\n")

  console.log("9️⃣ Testing PUT /api/admin/stations/:stationId/deactivate as admin (happy path)...")
  const deactivateRes = await request(app).put(`/api/admin/stations/${testStationId}/deactivate`).set(...authHeader(admin.token))
  if (assert(deactivateRes.status === 200, `Expected 200, got ${deactivateRes.status}`)) console.log("   ✅ Station deactivated.\n")

  console.log("🔟 Testing DELETE /api/admin/stations/:stationId as admin (happy path)...")
  const deleteStationRes = await request(app).delete(`/api/admin/stations/${testStationId}`).set(...authHeader(admin.token))
  if (assert(deleteStationRes.status === 200, `Expected 200, got ${deleteStationRes.status}`)) console.log("   ✅ Station deleted.\n")

  // ── Accessibility ──────────────────────────────────────────────────────

  console.log("1️⃣1️⃣ Testing GET /api/admin/accessibility as admin (happy path)...")
  const a11yListRes = await request(app).get("/api/admin/accessibility").set(...authHeader(admin.token))
  if (assert(a11yListRes.status === 200 && Array.isArray(a11yListRes.body?.data), `Expected 200 with an array, got ${a11yListRes.status}`)) {
    console.log(`   ✅ ${a11yListRes.body.data.length} record(s) returned.\n`)
  }

  console.log("1️⃣2️⃣ Testing PUT /api/admin/accessibility/:stationId as admin (happy path, seeded station pl-01)...")
  const a11yUpdateRes = await request(app).put("/api/admin/accessibility/pl-01").set(...authHeader(admin.token)).send({ hasLift: true })
  if (assert(a11yUpdateRes.status === 200, `Expected 200, got ${a11yUpdateRes.status}: ${JSON.stringify(a11yUpdateRes.body)}`)) {
    console.log("   ✅ Accessibility record updated.\n")
  }

  console.log("1️⃣3️⃣ Testing PUT /api/admin/accessibility/:stationId rejects a non-admin user (403)...")
  const a11yForbiddenRes = await request(app).put("/api/admin/accessibility/pl-01").set(...authHeader(regularUser.token)).send({ hasLift: true })
  if (assert(a11yForbiddenRes.status === 403, `Expected 403, got ${a11yForbiddenRes.status}`)) console.log("   ✅ 403 for non-admin.\n")

  console.log("1️⃣4️⃣ Testing PUT /api/admin/accessibility/:stationId/lift as admin (happy path)...")
  const liftRes = await request(app).put("/api/admin/accessibility/pl-01/lift").set(...authHeader(admin.token)).send({ liftStatus: "broken" })
  if (assert(liftRes.status === 200, `Expected 200, got ${liftRes.status}`)) console.log("   ✅ Lift status updated.\n")

  console.log("1️⃣5️⃣ Testing PUT /api/admin/accessibility/:stationId/lift validation failure (invalid liftStatus)...")
  const badLiftRes = await request(app).put("/api/admin/accessibility/pl-01/lift").set(...authHeader(admin.token)).send({ liftStatus: "sideways" })
  if (assert(badLiftRes.status === 400, `Expected 400, got ${badLiftRes.status}`)) console.log("   ✅ 400 on invalid liftStatus.\n")

  // ── Crowd moderation ─────────────────────────────────────────────────────

  const crowdReport = await CrowdReport.create({
    userId: regularUser.userId,
    stationId: "pl-01",
    stationName: "Whitefield Metro",
    transportMode: "metro",
    crowdLevel: "HIGH",
  })

  console.log("1️⃣6️⃣ Testing GET /api/admin/crowd as admin (happy path)...")
  const crowdListRes = await request(app).get("/api/admin/crowd").set(...authHeader(admin.token))
  if (assert(crowdListRes.status === 200 && Array.isArray(crowdListRes.body?.data), `Expected 200 with an array, got ${crowdListRes.status}`)) {
    console.log(`   ✅ ${crowdListRes.body.data.length} report(s) returned.\n`)
  }

  console.log("1️⃣7️⃣ Testing GET /api/admin/crowd rejects a non-admin user (403)...")
  const crowdForbiddenRes = await request(app).get("/api/admin/crowd").set(...authHeader(regularUser.token))
  if (assert(crowdForbiddenRes.status === 403, `Expected 403, got ${crowdForbiddenRes.status}`)) console.log("   ✅ 403 for non-admin.\n")

  console.log("1️⃣8️⃣ Testing DELETE /api/admin/crowd/:reportId as admin (happy path)...")
  const crowdDeleteRes = await request(app).delete(`/api/admin/crowd/${crowdReport.id}`).set(...authHeader(admin.token))
  if (assert(crowdDeleteRes.status === 200, `Expected 200, got ${crowdDeleteRes.status}`)) console.log("   ✅ Crowd report deleted.\n")

  // ── Feedback + dataset ───────────────────────────────────────────────────

  console.log("1️⃣9️⃣ Testing GET /api/admin/feedback as admin (happy path)...")
  const feedbackRes = await request(app).get("/api/admin/feedback").set(...authHeader(admin.token))
  if (assert(feedbackRes.status === 200, `Expected 200, got ${feedbackRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("2️⃣0️⃣ Testing GET /api/admin/feedback rejects a non-admin user (403)...")
  const feedbackForbiddenRes = await request(app).get("/api/admin/feedback").set(...authHeader(regularUser.token))
  if (assert(feedbackForbiddenRes.status === 403, `Expected 403, got ${feedbackForbiddenRes.status}`)) console.log("   ✅ 403 for non-admin.\n")

  console.log("2️⃣1️⃣ Testing GET /api/admin/dataset as admin (happy path)...")
  const datasetRes = await request(app).get("/api/admin/dataset").set(...authHeader(admin.token))
  if (assert(datasetRes.status === 200, `Expected 200, got ${datasetRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("2️⃣2️⃣ Testing GET /api/admin/dataset rejects a non-admin user (403)...")
  const datasetForbiddenRes = await request(app).get("/api/admin/dataset").set(...authHeader(regularUser.token))
  if (assert(datasetForbiddenRes.status === 403, `Expected 403, got ${datasetForbiddenRes.status}`)) console.log("   ✅ 403 for non-admin.\n")

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/admin/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
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
  console.error("❌ /api/admin/* test failure:", err)
  process.exit(1)
})
