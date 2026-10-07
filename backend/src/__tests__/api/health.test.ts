import request from "supertest"
import { app } from "../helpers/testApp"

/**
 * Phase 10 — API integration test: GET /api/health (1 of 50 endpoints).
 * Unauthenticated by design (health checks must work before/without a token).
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
  console.log("🧪 Running Phase 10 API Integration Tests — /api/health...\n")

  console.log("1️⃣ Testing GET /api/health returns 200 with a success envelope...")
  const res = await request(app).get("/api/health")
  if (assert(res.status === 200, `Expected 200, got ${res.status}`)) {
    console.log("   ✅ Status 200.\n")
  }
  if (assert(res.body?.success === true, "Response envelope has success: true")) {
    console.log("   ✅ Success envelope correct.\n")
  }

  console.log("═══════════════════════════════════════════════════════")
  console.log(failed === 0 ? `🎉 ALL ${passed} /api/health TESTS PASSED!` : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error("❌ /api/health test failure:", err)
  process.exit(1)
})
