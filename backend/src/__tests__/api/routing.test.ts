import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"

/**
 * Phase 10 — API integration tests for /api/routes/* (3 of 50 endpoints):
 * POST /routes (road-only, via OSRM), POST /routes/multimodal, GET /routes/nearby.
 *
 * All 3 require auth. POST /routes/multimodal and GET /routes/nearby never
 * depend on live OSRM reachability (multimodalService falls back to a
 * haversine estimate — see PHASE_6/9 docs), so their happy-path assertion is
 * a hard 200. Plain POST /routes has NO such fallback (routingService.getRoute
 * calls OSRM directly and throws on failure), so its assertion honestly
 * allows either a real 200 or one of the documented OSRM-unavailable error
 * codes — asserting a hard 200 there would make this test flaky depending on
 * real network conditions, which is exactly the kind of test flake this
 * project's design already anticipates (see routingService.ts's typed error
 * mapping for 502/504/429/422/404).
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

// Real Bengaluru coordinates near Whitefield/Baiyappanahalli Metro (transitData.ts)
const ORIGIN = { latitude: 12.9698, longitude: 77.75 }
const DESTINATION = { latitude: 12.9906, longitude: 77.653 }

async function run() {
  console.log("🧪 Running Phase 10 API Integration Tests — /api/routes/*...\n")

  // Registration requires a DB; without one, auth would always fail with 503
  // rather than a clean 401, which would make the auth-failure tests
  // meaningless. Honestly skip the whole file in that case.
  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured. This is an honest skip, not a pass.\n")
    return
  }

  const user = await registerTestUser()

  // ── POST /routes ───────────────────────────────────────────────────────

  console.log("1️⃣ Testing POST /api/routes (happy path — real OSRM or a documented error)...")
  const routeRes = await request(app).post("/api/routes").set(...authHeader(user.token)).send({
    origin: ORIGIN,
    destination: DESTINATION,
    mode: "driving",
  })
  const acceptableRouteStatuses = [200, 404, 422, 429, 502, 504]
  if (assert(acceptableRouteStatuses.includes(routeRes.status), `Expected one of ${acceptableRouteStatuses.join(",")}, got ${routeRes.status}`)) {
    console.log(`   ✅ Status ${routeRes.status} (${routeRes.status === 200 ? "live OSRM succeeded" : "documented OSRM-unavailable error"}).\n`)
  }

  console.log("2️⃣ Testing POST /api/routes with no token (auth failure)...")
  const routeNoAuthRes = await request(app).post("/api/routes").send({ origin: ORIGIN, destination: DESTINATION })
  if (assert(routeNoAuthRes.status === 401, `Expected 401, got ${routeNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("3️⃣ Testing POST /api/routes validation failure (out-of-range latitude)...")
  const badRouteRes = await request(app).post("/api/routes").set(...authHeader(user.token)).send({
    origin: { latitude: 999, longitude: 77.75 },
    destination: DESTINATION,
  })
  if (assert(badRouteRes.status === 400, `Expected 400, got ${badRouteRes.status}`)) console.log("   ✅ 400 on invalid latitude.\n")

  // ── POST /routes/multimodal ──────────────────────────────────────────────

  console.log("4️⃣ Testing POST /api/routes/multimodal (happy path — haversine fallback guarantees success)...")
  const multiRes = await request(app).post("/api/routes/multimodal").set(...authHeader(user.token)).send({
    origin: ORIGIN,
    destination: DESTINATION,
  })
  if (assert(multiRes.status === 200 && Array.isArray(multiRes.body?.data), `Expected 200 with an array of routes, got ${multiRes.status}`)) {
    console.log(`   ✅ ${multiRes.body.data.length} candidate route(s) returned.\n`)
  }

  console.log("5️⃣ Testing POST /api/routes/multimodal with no token (auth failure)...")
  const multiNoAuthRes = await request(app).post("/api/routes/multimodal").send({ origin: ORIGIN, destination: DESTINATION })
  if (assert(multiNoAuthRes.status === 401, `Expected 401, got ${multiNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  // ── GET /routes/nearby ───────────────────────────────────────────────────

  console.log("6️⃣ Testing GET /api/routes/nearby (happy path)...")
  const nearbyRes = await request(app)
    .get("/api/routes/nearby")
    .set(...authHeader(user.token))
    .query({ latitude: ORIGIN.latitude, longitude: ORIGIN.longitude })
  if (assert(nearbyRes.status === 200, `Expected 200, got ${nearbyRes.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("7️⃣ Testing GET /api/routes/nearby with no token (auth failure)...")
  const nearbyNoAuthRes = await request(app).get("/api/routes/nearby").query({ latitude: ORIGIN.latitude, longitude: ORIGIN.longitude })
  if (assert(nearbyNoAuthRes.status === 401, `Expected 401, got ${nearbyNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/routes/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
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
  console.error("❌ /api/routes/* test failure:", err)
  process.exit(1)
})
