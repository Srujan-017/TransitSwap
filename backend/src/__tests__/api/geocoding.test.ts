import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"

/**
 * Phase 10 — API integration test for /api/geocoding/search (1 of 50
 * endpoints). Proxies live Nominatim with no fallback (geocodingService.ts),
 * so — same honest reasoning as plain POST /routes in routing.test.ts — the
 * happy-path assertion allows either a real 200 or a documented
 * service-unavailable error, rather than asserting a hard 200 that would
 * make this test flaky depending on real network conditions / Nominatim's
 * own rate limiting.
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
  console.log("🧪 Running Phase 10 API Integration Tests — /api/geocoding/search...\n")

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
