import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"

/**
 * Phase 10 — API integration tests for /api/trips/* (12 of 50 endpoints):
 * POST /save, GET /history, POST /destinations, GET /destinations,
 * DELETE /destinations/:id, POST /saved-routes, GET /saved-routes,
 * GET /saved-routes/:id, DELETE /saved-routes/:id, POST /:id/feedback,
 * GET /:id, DELETE /:id. The whole router requires auth (router.use(requireAuth)).
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

function makeSelectedRoute(id: string) {
  return {
    id,
    labelDisplay: "Fastest",
    summary: "Phase 10 integration test route",
    segments: [
      {
        id: `${id}-seg-1`,
        mode: "metro",
        from: { name: "Whitefield Metro", latitude: 12.9698, longitude: 77.75 },
        to: { name: "Baiyappanahalli Metro", latitude: 12.9906, longitude: 77.653 },
        distanceMeters: 8000,
        durationSeconds: 900,
        estimatedFare: 25,
        instruction: "Take Metro from Whitefield to Baiyappanahalli",
        geometry: { type: "LineString", coordinates: [[77.75, 12.9698], [77.653, 12.9906]] },
      },
    ],
    totalDistanceMeters: 8000,
    totalDurationSeconds: 900,
    totalFare: 25,
    totalWalkingMeters: 100,
    transferCount: 0,
  }
}

async function run() {
  console.log("🧪 Running Phase 10 API Integration Tests — /api/trips/*...\n")

  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured. This is an honest skip, not a pass.\n")
    return
  }

  const user = await registerTestUser()
  const origin = { name: "Whitefield Metro", latitude: 12.9698, longitude: 77.75 }
  const destination = { name: "Baiyappanahalli Metro", latitude: 12.9906, longitude: 77.653 }

  // ── POST /save ─────────────────────────────────────────────────────────

  console.log("1️⃣ Testing POST /api/trips/save (happy path)...")
  const saveRes = await request(app).post("/api/trips/save").set(...authHeader(user.token)).send({
    origin,
    destination,
    selectedRoute: makeSelectedRoute("journey-route-1"),
  })
  if (assert(saveRes.status === 201 || saveRes.status === 200, `Expected 200/201, got ${saveRes.status}: ${JSON.stringify(saveRes.body)}`)) {
    console.log("   ✅ Journey saved.\n")
  }
  const journeyId = saveRes.body?.data?.id ?? saveRes.body?.data?._id

  console.log("2️⃣ Testing POST /api/trips/save with no token (auth failure)...")
  const saveNoAuthRes = await request(app).post("/api/trips/save").send({ origin, destination, selectedRoute: makeSelectedRoute("x") })
  if (assert(saveNoAuthRes.status === 401, `Expected 401, got ${saveNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  // ── GET /history ───────────────────────────────────────────────────────

  console.log("3️⃣ Testing GET /api/trips/history (happy path)...")
  const historyRes = await request(app).get("/api/trips/history").set(...authHeader(user.token))
  if (assert(historyRes.status === 200 && Array.isArray(historyRes.body?.data), `Expected 200 with an array, got ${historyRes.status}`)) {
    console.log(`   ✅ ${historyRes.body.data.length} journey(s) returned.\n`)
  }

  console.log("4️⃣ Testing GET /api/trips/history with no token (auth failure)...")
  const historyNoAuthRes = await request(app).get("/api/trips/history")
  if (assert(historyNoAuthRes.status === 401, `Expected 401, got ${historyNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  // ── GET /:id ───────────────────────────────────────────────────────────

  if (journeyId) {
    console.log("5️⃣ Testing GET /api/trips/:id (happy path)...")
    const getRes = await request(app).get(`/api/trips/${journeyId}`).set(...authHeader(user.token))
    if (assert(getRes.status === 200, `Expected 200, got ${getRes.status}`)) console.log("   ✅ 200 OK.\n")
  } else {
    assert(false, "journeyId was not returned from POST /save — cannot test GET /:id")
  }

  // ── POST /:id/feedback ───────────────────────────────────────────────────

  if (journeyId) {
    console.log("6️⃣ Testing POST /api/trips/:id/feedback (happy path)...")
    const feedbackRes = await request(app).post(`/api/trips/${journeyId}/feedback`).set(...authHeader(user.token)).send({
      rating: 4,
      comment: "Phase 10 integration test feedback",
      issues: ["too_much_walking"],
    })
    if (assert(feedbackRes.status === 200, `Expected 200, got ${feedbackRes.status}: ${JSON.stringify(feedbackRes.body)}`)) {
      console.log("   ✅ Feedback submitted.\n")
    }

    console.log("7️⃣ Testing POST /api/trips/:id/feedback validation failure (rating out of range)...")
    const badFeedbackRes = await request(app).post(`/api/trips/${journeyId}/feedback`).set(...authHeader(user.token)).send({ rating: 10 })
    if (assert(badFeedbackRes.status === 400, `Expected 400, got ${badFeedbackRes.status}`)) console.log("   ✅ 400 on invalid rating.\n")
  }

  // ── Destinations ─────────────────────────────────────────────────────────

  console.log("8️⃣ Testing POST /api/trips/destinations (happy path)...")
  const destRes = await request(app).post("/api/trips/destinations").set(...authHeader(user.token)).send({
    name: "Home",
    address: "123 Phase 10 Test Street, Bengaluru",
    latitude: 12.97,
    longitude: 77.75,
  })
  if (assert(destRes.status === 201 || destRes.status === 200, `Expected 200/201, got ${destRes.status}`)) console.log("   ✅ Destination saved.\n")

  console.log("9️⃣ Testing GET /api/trips/destinations (happy path)...")
  const destListRes = await request(app).get("/api/trips/destinations").set(...authHeader(user.token))
  if (assert(destListRes.status === 200 && Array.isArray(destListRes.body?.data), `Expected 200 with an array, got ${destListRes.status}`)) {
    console.log(`   ✅ ${destListRes.body.data.length} destination(s) returned.\n`)
  }
  const destinationId = destListRes.body?.data?.[0]?.id ?? destListRes.body?.data?.[0]?._id

  console.log("🔟 Testing GET /api/trips/destinations with no token (auth failure)...")
  const destListNoAuthRes = await request(app).get("/api/trips/destinations")
  if (assert(destListNoAuthRes.status === 401, `Expected 401, got ${destListNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  if (destinationId) {
    console.log("1️⃣1️⃣ Testing DELETE /api/trips/destinations/:id (happy path)...")
    const destDeleteRes = await request(app).delete(`/api/trips/destinations/${destinationId}`).set(...authHeader(user.token))
    if (assert(destDeleteRes.status === 200, `Expected 200, got ${destDeleteRes.status}`)) console.log("   ✅ Destination deleted.\n")
  }

  // ── Saved Routes ───────────────────────────────────────────────────────

  console.log("1️⃣2️⃣ Testing POST /api/trips/saved-routes (happy path)...")
  const savedRouteRes = await request(app).post("/api/trips/saved-routes").set(...authHeader(user.token)).send({
    name: "My Commute",
    origin,
    destination,
    selectedRoute: makeSelectedRoute("saved-route-1"),
  })
  if (assert(savedRouteRes.status === 201 || savedRouteRes.status === 200, `Expected 200/201, got ${savedRouteRes.status}: ${JSON.stringify(savedRouteRes.body)}`)) {
    console.log("   ✅ Route saved.\n")
  }
  const savedRouteId = savedRouteRes.body?.data?.id ?? savedRouteRes.body?.data?._id

  console.log("1️⃣3️⃣ Testing GET /api/trips/saved-routes (happy path)...")
  const savedRoutesListRes = await request(app).get("/api/trips/saved-routes").set(...authHeader(user.token))
  if (assert(savedRoutesListRes.status === 200 && Array.isArray(savedRoutesListRes.body?.data), `Expected 200 with an array, got ${savedRoutesListRes.status}`)) {
    console.log(`   ✅ ${savedRoutesListRes.body.data.length} saved route(s) returned.\n`)
  }

  console.log("1️⃣4️⃣ Testing GET /api/trips/saved-routes with no token (auth failure)...")
  const savedRoutesNoAuthRes = await request(app).get("/api/trips/saved-routes")
  if (assert(savedRoutesNoAuthRes.status === 401, `Expected 401, got ${savedRoutesNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  if (savedRouteId) {
    console.log("1️⃣5️⃣ Testing GET /api/trips/saved-routes/:id (happy path)...")
    const savedRouteGetRes = await request(app).get(`/api/trips/saved-routes/${savedRouteId}`).set(...authHeader(user.token))
    if (assert(savedRouteGetRes.status === 200, `Expected 200, got ${savedRouteGetRes.status}`)) console.log("   ✅ 200 OK.\n")

    console.log("1️⃣6️⃣ Testing DELETE /api/trips/saved-routes/:id (happy path)...")
    const savedRouteDeleteRes = await request(app).delete(`/api/trips/saved-routes/${savedRouteId}`).set(...authHeader(user.token))
    if (assert(savedRouteDeleteRes.status === 200, `Expected 200, got ${savedRouteDeleteRes.status}`)) console.log("   ✅ Saved route deleted.\n")
  }

  // ── DELETE /:id (journey) — last, since earlier tests depend on it existing

  if (journeyId) {
    console.log("1️⃣7️⃣ Testing DELETE /api/trips/:id (happy path)...")
    const deleteRes = await request(app).delete(`/api/trips/${journeyId}`).set(...authHeader(user.token))
    if (assert(deleteRes.status === 200, `Expected 200, got ${deleteRes.status}`)) console.log("   ✅ Journey deleted.\n")

    console.log("1️⃣8️⃣ Testing DELETE /api/trips/:id with no token (auth failure)...")
    const deleteNoAuthRes = await request(app).delete(`/api/trips/${journeyId}`)
    if (assert(deleteNoAuthRes.status === 401, `Expected 401, got ${deleteNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")
  }

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/trips/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error("❌ /api/trips/* test failure:", err)
  process.exit(1)
})
