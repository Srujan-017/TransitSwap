import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"

/**
 * Phase 10 — API integration test for /api/geocoding/search and
 * /api/geocoding/reverse (2 of 50 endpoints). Both proxy live Nominatim with
 * no fallback (geocodingService.ts), so — same honest reasoning as plain
 * POST /routes in routing.test.ts — the happy-path assertions allow either a
 * real 200 or a documented service-unavailable error, rather than asserting
 * a hard 200 that would make this test flaky depending on real network
 * conditions / Nominatim's own rate limiting.
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
  console.log("🧪 Running Phase 10 API Integration Tests — /api/geocoding/search and /reverse...\n")

  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured (needed to register a test user). This is an honest skip, not a pass.\n")
    return
  }

  const user = await registerTestUser()

  console.log("1️⃣ Testing GET /api/geocoding/search (happy path — real Nominatim or a documented error)...")
  const res = await request(app).get("/api/geocoding/search").set(...authHeader(user.token)).query({ q: "Whitefield, Bengaluru" })
  const acceptableStatuses = [200, 429, 502, 504]
  if (assert(acceptableStatuses.includes(res.status), `Expected one of ${acceptableStatuses.join(",")}, got ${res.status}`)) {
    console.log(`   ✅ Status ${res.status} (${res.status === 200 ? "live Nominatim succeeded" : "documented service-unavailable error"}).\n`)
  }

  console.log("2️⃣ Testing GET /api/geocoding/search with no token (auth failure)...")
  const noAuthRes = await request(app).get("/api/geocoding/search").query({ q: "Whitefield" })
  if (assert(noAuthRes.status === 401, `Expected 401, got ${noAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("3️⃣ Testing GET /api/geocoding/reverse (happy path — real Nominatim or a documented error)...")
  const reverseRes = await request(app).get("/api/geocoding/reverse").set(...authHeader(user.token)).query({ lat: 12.9767, lng: 77.5713 })
  if (assert(acceptableStatuses.includes(reverseRes.status), `Expected one of ${acceptableStatuses.join(",")}, got ${reverseRes.status}`)) {
    console.log(`   ✅ Status ${reverseRes.status} (${reverseRes.status === 200 ? "live Nominatim succeeded" : "documented service-unavailable error"}).\n`)
  }
  if (reverseRes.status === 200) {
    const body = reverseRes.body.data
    if (assert(body.latitude === 12.9767 && body.longitude === 77.5713, "Reverse result should echo back the requested coordinates")) {
      console.log("   ✅ Result coordinates match the request.\n")
    }
  }

  console.log("4️⃣ Testing GET /api/geocoding/reverse with no token (auth failure)...")
  const reverseNoAuthRes = await request(app).get("/api/geocoding/reverse").query({ lat: 12.9767, lng: 77.5713 })
  if (assert(reverseNoAuthRes.status === 401, `Expected 401, got ${reverseNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("5️⃣ Testing GET /api/geocoding/reverse with an out-of-range latitude (validation failure)...")
  const badLatRes = await request(app).get("/api/geocoding/reverse").set(...authHeader(user.token)).query({ lat: 200, lng: 77.5713 })
  if (assert(badLatRes.status === 400, `Expected 400, got ${badLatRes.status}`)) console.log("   ✅ 400 on out-of-range latitude.\n")

  console.log("6️⃣ Testing GET /api/geocoding/reverse with a missing longitude (validation failure)...")
  const missingLngRes = await request(app).get("/api/geocoding/reverse").set(...authHeader(user.token)).query({ lat: 12.9767 })
  if (assert(missingLngRes.status === 400, `Expected 400, got ${missingLngRes.status}`)) console.log("   ✅ 400 on missing longitude.\n")

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/geocoding/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
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
  console.error("❌ /api/geocoding/* test failure:", err)
  process.exit(1)
})
