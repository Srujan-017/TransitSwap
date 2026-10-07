import request from "supertest"
import { app, ensureDbConnected, registerTestUser, authHeader } from "../helpers/testApp"

/**
 * Phase 10 — API integration tests for /api/auth/* (6 of 50 endpoints):
 * POST /register, POST /login, GET /me, PUT /profile, PUT /preferences,
 * POST /transitdna/reset. Each gets a happy-path test; every auth-gated one
 * also gets a "no token -> 401" test, per the master plan's requirement.
 *
 * Honestly skips (not a false pass) when no MongoDB is available — these
 * endpoints all go through authService.ensureDb(), same pattern as the
 * existing authPreferencePersistence.test.ts etc.
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
  console.log("🧪 Running Phase 10 API Integration Tests — /api/auth/*...\n")

  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured (or the in-memory server failed to start). This is an honest skip, not a pass.\n")
    return
  }

  // ── POST /register ────────────────────────────────────────────────────

  console.log("1️⃣ Testing POST /api/auth/register (happy path)...")
  const email = `phase10.auth.${Date.now()}@example.com`
  const registerRes = await request(app).post("/api/auth/register").send({
    name: "Auth Test User",
    email,
    password: "TestPassword123",
  })
  if (assert(registerRes.status === 201, `Expected 201, got ${registerRes.status}`)) console.log("   ✅ 201 Created.\n")
  if (assert(Boolean(registerRes.body?.data?.token), "Response includes a token")) console.log("   ✅ Token present.\n")

  console.log("2️⃣ Testing POST /api/auth/register validation failure (invalid email)...")
  const badRegisterRes = await request(app).post("/api/auth/register").send({ name: "X", email: "not-an-email", password: "TestPassword123" })
  if (assert(badRegisterRes.status === 400, `Expected 400, got ${badRegisterRes.status}`)) console.log("   ✅ 400 on invalid email.\n")

  // ── POST /login ────────────────────────────────────────────────────────

  console.log("3️⃣ Testing POST /api/auth/login (happy path)...")
  const loginRes = await request(app).post("/api/auth/login").send({ email, password: "TestPassword123" })
  if (assert(loginRes.status === 200, `Expected 200, got ${loginRes.status}`)) console.log("   ✅ 200 OK.\n")
  const token = loginRes.body?.data?.token as string

  console.log("4️⃣ Testing POST /api/auth/login with wrong password (auth failure)...")
  const wrongPasswordRes = await request(app).post("/api/auth/login").send({ email, password: "WrongPassword999" })
  if (assert(wrongPasswordRes.status === 401, `Expected 401, got ${wrongPasswordRes.status}`)) console.log("   ✅ 401 on wrong password.\n")

  // ── GET /me ────────────────────────────────────────────────────────────

  console.log("5️⃣ Testing GET /api/auth/me (happy path)...")
  const meRes = await request(app).get("/api/auth/me").set(...authHeader(token))
  if (assert(meRes.status === 200 && meRes.body?.data?.email === email, `Expected 200 with matching email, got ${meRes.status}`)) {
    console.log("   ✅ Returns the authenticated user.\n")
  }

  console.log("6️⃣ Testing GET /api/auth/me with no token (auth failure)...")
  const meNoAuthRes = await request(app).get("/api/auth/me")
  if (assert(meNoAuthRes.status === 401, `Expected 401, got ${meNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  // ── PUT /profile ───────────────────────────────────────────────────────

  console.log("7️⃣ Testing PUT /api/auth/profile (happy path)...")
  const profileRes = await request(app).put("/api/auth/profile").set(...authHeader(token)).send({ name: "Updated Name" })
  if (assert(profileRes.status === 200 && profileRes.body?.data?.name === "Updated Name", `Expected 200 with updated name, got ${profileRes.status}`)) {
    console.log("   ✅ Profile updated.\n")
  }

  console.log("8️⃣ Testing PUT /api/auth/profile with no token (auth failure)...")
  const profileNoAuthRes = await request(app).put("/api/auth/profile").send({ name: "Nobody" })
  if (assert(profileNoAuthRes.status === 401, `Expected 401, got ${profileNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  // ── PUT /preferences ───────────────────────────────────────────────────

  console.log("9️⃣ Testing PUT /api/auth/preferences (happy path)...")
  const prefsRes = await request(app).put("/api/auth/preferences").set(...authHeader(token)).send({ prioritize: "speed" })
  if (assert(prefsRes.status === 200, `Expected 200, got ${prefsRes.status}`)) console.log("   ✅ Preferences updated.\n")

  console.log("🔟 Testing PUT /api/auth/preferences with no token (auth failure)...")
  const prefsNoAuthRes = await request(app).put("/api/auth/preferences").send({ prioritize: "speed" })
  if (assert(prefsNoAuthRes.status === 401, `Expected 401, got ${prefsNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("1️⃣1️⃣ Testing PUT /api/auth/preferences validation failure (invalid enum)...")
  const badPrefsRes = await request(app).put("/api/auth/preferences").set(...authHeader(token)).send({ prioritize: "not-a-real-priority" })
  if (assert(badPrefsRes.status === 400, `Expected 400, got ${badPrefsRes.status}`)) console.log("   ✅ 400 on invalid enum value.\n")

  // ── POST /transitdna/reset ─────────────────────────────────────────────

  console.log("1️⃣2️⃣ Testing POST /api/auth/transitdna/reset (happy path)...")
  const resetRes = await request(app).post("/api/auth/transitdna/reset").set(...authHeader(token))
  if (assert(resetRes.status === 200, `Expected 200, got ${resetRes.status}`)) console.log("   ✅ TransitDNA reset.\n")

  console.log("1️⃣3️⃣ Testing POST /api/auth/transitdna/reset with no token (auth failure)...")
  const resetNoAuthRes = await request(app).post("/api/auth/transitdna/reset")
  if (assert(resetNoAuthRes.status === 401, `Expected 401, got ${resetNoAuthRes.status}`)) console.log("   ✅ 401 with no token.\n")

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/auth/* TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error("❌ /api/auth/* test failure:", err)
  process.exit(1)
})
