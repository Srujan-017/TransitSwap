import mongoose from "mongoose"
import { env } from "../config/env"
import { requireAdmin } from "../middleware/auth"
import type { AuthenticatedRequest } from "../types"
import { accessibilityService } from "../services/accessibilityService"
import type { MultimodalRoute } from "../types/multimodal"

/**
 * Problem 23 — Admin Dashboard test coverage.
 *
 * Part A tests requireAdmin authorization logic directly (401/403/200 paths) and
 * confirms the public registration path cannot set role, without needing a
 * running HTTP server or MongoDB.
 *
 * Part B (station/lift CRUD, lift-routing regression) needs a persistent store —
 * adminService's mutation methods explicitly require MongoDB and return 503
 * without it, so those are honestly skipped rather than faked when unavailable.
 */

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
    console.log(`   ✅ ${msg}`)
  } else {
    failed++
    console.log(`   ❌ FAILED: ${msg}`)
  }
}

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res
}

async function run() {
  console.log("🧪 Running Problem 23 Admin Dashboard Tests...\n")

  // ── Part A: requireAdmin authorization logic ────────────────────────────────

  console.log("1️⃣ Testing unauthenticated request to admin middleware...")
  const res401 = mockRes()
  let nextCalled = false
  requireAdmin({ user: undefined } as AuthenticatedRequest, res401, () => { nextCalled = true })
  assert(res401.statusCode === 401 && !nextCalled, "No req.user (unauthenticated) → 401, next() not called")

  console.log("\n2️⃣ Testing normal (non-admin) user against admin middleware...")
  const res403 = mockRes()
  nextCalled = false
  requireAdmin({ user: { userId: "u1", email: "user@test.com", role: "user" } } as AuthenticatedRequest, res403, () => { nextCalled = true })
  assert(res403.statusCode === 403 && !nextCalled, "Authenticated non-admin user → 403, next() not called")

  console.log("\n3️⃣ Testing admin user against admin middleware...")
  const resOk = mockRes()
  nextCalled = false
  requireAdmin({ user: { userId: "u2", email: "admin@test.com", role: "admin" } } as AuthenticatedRequest, resOk, () => { nextCalled = true })
  assert(nextCalled && resOk.body === undefined, "Authenticated admin user → next() called, no error response")

  console.log("\n4️⃣ Testing a token payload with no role field (pre-Problem-23 token)...")
  const resLegacy = mockRes()
  nextCalled = false
  requireAdmin({ user: { userId: "u3", email: "old@test.com" } as any } as AuthenticatedRequest, resLegacy, () => { nextCalled = true })
  assert(resLegacy.statusCode === 403 && !nextCalled, "Token issued before Problem 23 (no role claim) fails closed with 403, not granted admin access")

  // ── Part A continued: role safety ───────────────────────────────────────────

  console.log("\n5️⃣ Testing public registration cannot set role...")
  const authControllerSource = require("fs").readFileSync(require.resolve("../controllers/authController"), "utf-8")
  const registerFn = authControllerSource.slice(authControllerSource.indexOf("export async function register"), authControllerSource.indexOf("export async function login"))
  assert(!registerFn.includes("role") && !registerFn.includes("req.body.role"), "authController.register never reads `role` from the request body")

  console.log("\n6️⃣ Testing profile/preferences update cannot set role...")
  const authServiceSource = require("fs").readFileSync(require.resolve("../services/authService"), "utf-8")
  const updateProfileFn = authServiceSource.slice(authServiceSource.indexOf("async updateProfile"), authServiceSource.indexOf("async updatePreferences"))
  assert(!updateProfileFn.includes("data.role") && !updateProfileFn.includes("user.role ="), "authService.updateProfile never assigns role from client-supplied data")

  console.log(`\n${"═".repeat(59)}`)
  console.log(failed === 0 ? "🎉 ALL PART A ADMIN AUTHORIZATION TESTS PASSED!" : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═".repeat(59))

  // ── Part B: persistent admin CRUD + lift-routing regression (needs MongoDB) ──

  if (mongoose.connection.readyState !== 1 && env.MONGODB_URI) {
    try {
      await mongoose.connect(env.MONGODB_URI)
    } catch {
      // fall through to skip
    }
  }

  if (mongoose.connection.readyState !== 1) {
    console.log("\n⚠️  Part B (station/lift CRUD, lift-routing regression) SKIPPED — MONGODB_URI is not configured.")
    console.log("    This is an honest skip, not a pass: adminService's mutation methods require a persistent")
    console.log("    store and return 503 without one. Run with a MongoDB connection for full coverage.")
    if (failed > 0) process.exit(1)
    return
  }

  console.log("\n🧪 Running Part B — Lift-Status Routing Regression (mandatory per Problem 23)...\n")
  const { adminService } = require("../services/adminService")
  const testStationId = "test-admin-lift-station"
  const testStationName = "Test Admin Station"

  // A minimal single-segment metro route passing through the test station, used
  // to exercise the REAL routing pipeline (accessibilityService.filterRoutes) —
  // not just a station-record lookup — for TEST STEP 5/7 below.
  function makeTestRoute(): MultimodalRoute {
    return {
      id: "test-admin-lift-route",
      label: "FASTEST",
      labelDisplay: "Fastest",
      labelColor: "#2563eb",
      segments: [
        {
          id: "test-admin-lift-route-seg-1",
          mode: "metro",
          from: { name: testStationName, latitude: 19.1, longitude: 72.9 },
          to: { name: "Some Other Station", latitude: 19.12, longitude: 72.92 },
          distanceMeters: 2000,
          durationSeconds: 600,
          estimatedFare: 20,
          instruction: "Take the metro",
          geometry: { type: "LineString", coordinates: [[72.9, 19.1], [72.92, 19.12]] },
        },
      ],
      totalDistanceMeters: 2000,
      totalDurationSeconds: 600,
      totalWalkingMeters: 0,
      totalFare: 20,
      transferCount: 0,
      modes: ["metro"],
      summary: "Test route through the admin test station",
      isDemoData: true,
    }
  }

  try {
    await adminService.createStation({
      stationId: testStationId,
      stationName: testStationName,
      transportMode: "metro",
      latitude: 19.1,
      longitude: 72.9,
    })
    await adminService.updateAccessibility(testStationId, {
      hasLift: true,
      hasRamp: true,
      wheelchairAccessible: true,
      stepFreeEntrance: true,
      stepFreePlatform: true,
    })

    console.log("7️⃣ Testing station with working lift is accessible...")
    const workingRecord = await accessibilityService.getStation(testStationId)
    assert(workingRecord?.status === "accessible", "Station with working lift reports accessible status")

    console.log("\n7️⃣.5 Testing wheelchair route through this station is NOT filtered out while lift works...")
    const routesWhileWorking = await accessibilityService.filterRoutes([makeTestRoute()], "wheelchair")
    assert(
      routesWhileWorking.length === 1,
      "Real routing pipeline (filterRoutes) keeps the wheelchair route while the lift is working",
    )

    console.log("\n8️⃣ Testing admin marking lift broken immediately downgrades status...")
    await adminService.setLiftStatus(testStationId, "broken")
    const brokenRecord = await accessibilityService.getStation(testStationId)
    assert(brokenRecord?.hasLift === false && brokenRecord?.status === "not_accessible", "After marking lift broken, station is immediately not_accessible")

    console.log("\n8️⃣.5 Testing wheelchair route through this station IS filtered out once the lift is broken...")
    const routesWhileBroken = await accessibilityService.filterRoutes([makeTestRoute()], "wheelchair")
    assert(
      routesWhileBroken.length === 0,
      "Real routing pipeline (filterRoutes) rejects the wheelchair route once the lift is broken — not just the station record",
    )

    console.log("\n9️⃣ Testing admin restoring lift makes station accessible again...")
    await adminService.setLiftStatus(testStationId, "working")
    const restoredRecord = await accessibilityService.getStation(testStationId)
    assert(restoredRecord?.hasLift === true && restoredRecord?.status === "accessible", "After restoring lift, station is accessible again")

    console.log("\n9️⃣.5 Testing wheelchair route through this station is accepted again after lift is restored...")
    const routesAfterRestore = await accessibilityService.filterRoutes([makeTestRoute()], "wheelchair")
    assert(
      routesAfterRestore.length === 1,
      "Real routing pipeline (filterRoutes) accepts the wheelchair route again once the lift is restored",
    )
  } finally {
    const { Accessibility } = require("../models/Accessibility")
    await Accessibility.deleteOne({ stationId: testStationId })
  }

  console.log(`\n${"═".repeat(59)}`)
  console.log(failed === 0 ? "🎉 ALL PROBLEM 23 ADMIN TESTS PASSED!" : `⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═".repeat(59))

  await mongoose.disconnect()
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error("Admin test run crashed:", err)
  process.exit(1)
})
