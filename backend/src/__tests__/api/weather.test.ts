import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"

/**
 * Phase 10 — API integration tests for /api/weather/* (2 of 50 endpoints):
 * GET / and GET /current (both resolve to the same controller). Always
 * returns 200 — weatherService falls back to a clearly-labelled demo value
 * with no API key configured, by design (see weatherService.ts).
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

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/weather/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error("❌ /api/weather/* test failure:", err)
  process.exit(1)
})
