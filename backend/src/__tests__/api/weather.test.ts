import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"
import { setMultimodalRoadLegProviderForTesting } from "../../services/multimodalService"

/**
 * Phase 10 — API integration tests for /api/weather/* (2 of 50 endpoints):
 * GET / and GET /current (both resolve to the same controller). Always
 * returns 200. The test runner sets WEATHER_SOURCE=clear (fixed clear weather, no network).
 *
 * Feature-upgrade phase 5 adds: the weather assessment in the response, and the `weather` field of
 * POST /api/routes/multimodal (validated; "rain" must come back as bad weather with no walk over 300 m).
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
  console.log("🧪 Running Phase 10 API Integration Tests — /api/weather/*...\n")

  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured (needed to register a test user). This is an honest skip, not a pass.\n")
    return
  }

  const user = await registerTestUser()
  const query = { latitude: 12.9698, longitude: 77.75 }

  console.log("1️⃣ Testing GET /api/weather (happy path)...")
  const res1 = await request(app).get("/api/weather").set(...authHeader(user.token)).query(query)
  if (assert(res1.status === 200, `Expected 200, got ${res1.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("2️⃣ Testing GET /api/weather/current (happy path)...")
  const res2 = await request(app).get("/api/weather/current").set(...authHeader(user.token)).query(query)
  if (assert(res2.status === 200, `Expected 200, got ${res2.status}`)) console.log("   ✅ 200 OK.\n")

  console.log("3️⃣ Testing GET /api/weather with no token (auth failure)...")
  const res3 = await request(app).get("/api/weather").query(query)
  if (assert(res3.status === 401, `Expected 401, got ${res3.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("4️⃣ Testing GET /api/weather/current with no token (auth failure)...")
  const res4 = await request(app).get("/api/weather/current").query(query)
  if (assert(res4.status === 401, `Expected 401, got ${res4.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("5️⃣ Testing GET /api/weather validation failure (out-of-range longitude)...")
  const res5 = await request(app).get("/api/weather").set(...authHeader(user.token)).query({ latitude: 12.9698, longitude: 999 })
  if (assert(res5.status === 400, `Expected 400, got ${res5.status}`)) console.log("   ✅ 400 on invalid longitude.\n")

  console.log("6️⃣ GET /api/weather reports the conditions and whether they are bad for walking...")
  const w = res1.body?.data
  assert(w?.weather?.condition === "Clear sky" && w?.weather?.isDemoData === true, "fixed clear weather under the test runner")
  assert(w?.assessment?.bad === false && w?.impact?.available === true, "assessment says not bad, impact is available")
  console.log("   ✅ weather payload\n")

  console.log("7️⃣ POST /api/routes/multimodal validates and uses the weather field...")
  setMultimodalRoadLegProviderForTesting({ async getRoute() { throw new Error("offline test provider") } })
  try {
    const trip = { origin: { latitude: 12.9419, longitude: 77.509 }, destination: { latitude: 12.9767, longitude: 77.5713 }, profile: "standard", departureTime: "2026-11-16T14:30" }
    const bad = await request(app).post("/api/routes/multimodal").set(...authHeader(user.token)).send({ ...trip, weather: "snow" })
    assert(bad.status === 400, `an unknown weather mode is a 400 (got ${bad.status})`)
    const clear = await request(app).post("/api/routes/multimodal").set(...authHeader(user.token)).send({ ...trip, weather: "clear" })
    assert(clear.status === 200 && clear.body.weather?.bad === false && clear.body.weather?.isDemo === true, "clear: 200, not bad, marked as a demo")
    const rain = await request(app).post("/api/routes/multimodal").set(...authHeader(user.token)).send({ ...trip, weather: "rain" })
    assert(rain.status === 200 && rain.body.weather?.bad === true && rain.body.weather?.kind === "rain", "rain: 200 and reported as bad weather")
    assert(/300 m/.test(rain.body.weather?.rule ?? ""), "the rule is stated in the response")
    const longest = Math.max(0, ...(rain.body.data as Array<{ segments: Array<{ mode: string; distanceMeters: number }> }>).flatMap((r) => r.segments.filter((x) => x.mode === "walking").map((x) => x.distanceMeters)))
    assert(longest <= 300, `no route has a walk over 300 m in rain (longest ${Math.round(longest)} m)`)
    const live = await request(app).post("/api/routes/multimodal").set(...authHeader(user.token)).send(trip)
    assert(live.status === 200 && live.body.weather?.available === true && live.body.weather?.bad === false, "no weather field: the (fixed clear) default weather is used")
    console.log("   ✅ multimodal weather field\n")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/weather/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
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
  console.error("❌ /api/weather/* test failure:", err)
  process.exit(1)
})
