import { crowdService } from "../services/crowdService"
import { calculateMultimodalRoute } from "../controllers/multimodalController"
import type { Request, Response } from "express"
import type { RouteCrowdSummary } from "../types/intelligence"

/**
 * Crowd Hard-Constraint Tests
 *
 * Confirms the fix described in multimodalController.ts: a route through a
 * known HIGH-crowd station must be excluded (not just warned about) for
 * pregnant/senior/stroller/luggage/wheelchair profiles, while remaining
 * available (with only the pre-existing soft warning) for standard and
 * reduced_mobility.
 *
 * crowdService.routeSummary is monkey-patched for the duration of this file
 * (restored at the end) so the result is deterministic regardless of the
 * demo dataset's time-of-day/day-of-week crowd values.
 */

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`   ❌ FAILED: ${msg}`)
  }
}

// Same seeded corridor pair used by multimodalRouting.test.ts — confirmed to
// produce real, connected candidate routes.
const origin = { latitude: 12.9770, longitude: 77.5705 } // Kempegowda Bus Station
const destination = { latitude: 12.9868, longitude: 77.6047 } // Shivajinagar Bus Stand

function mockReqRes(profile: string) {
  const req = { body: { origin, destination, profile } } as unknown as Request
  let jsonBody: unknown
  let statusCode = 0
  const res = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(body: unknown) {
      jsonBody = body
      return this
    },
  } as unknown as Response
  let capturedError: unknown
  const next = (err?: unknown) => {
    capturedError = err
  }
  return {
    req,
    res,
    next,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    getError: () => capturedError,
  }
}

async function runCrowdBlockTests() {
  console.log("🧪 Running Crowd Hard-Constraint Tests...\n")

  const originalRouteSummary = crowdService.routeSummary
  const highCrowd: RouteCrowdSummary = {
    level: "HIGH",
    source: "DEMO_DATA",
    summary: "HIGH crowd estimate (test stub).",
    stations: [],
  }
  crowdService.routeSummary = async () => highCrowd

  try {
    console.log("1️⃣  Testing HIGH-crowd route is excluded for pregnant/senior/stroller/luggage/wheelchair...")
    for (const profile of ["pregnant", "senior", "stroller", "luggage", "wheelchair"]) {
      const { req, res, next, getError } = mockReqRes(profile)
      await calculateMultimodalRoute(req, res, next)
      const err = getError() as { statusCode?: number; message?: string } | undefined
      assert(err !== undefined, `${profile}: a HIGH-crowd-only result set is rejected (no route survives)`)
      assert(err?.statusCode === 404, `${profile}: rejection is a 404 ("no accessible route" path)`)
    }
    console.log("   ✅ Crowd-sensitive profiles correctly blocked.\n")

    console.log("2️⃣  Testing HIGH-crowd route is NOT excluded for standard/reduced_mobility...")
    for (const profile of ["standard", "reduced_mobility"]) {
      const { req, res, next, getJson } = mockReqRes(profile)
      await calculateMultimodalRoute(req, res, next)
      const body = getJson() as { success?: boolean; data?: unknown[] } | undefined
      assert(body?.success === true, `${profile}: request succeeds despite HIGH crowd`)
      assert(Array.isArray(body?.data) && body!.data!.length > 0, `${profile}: at least one route is returned`)
    }
    console.log("   ✅ Unaffected profiles correctly unblocked.\n")
  } finally {
    crowdService.routeSummary = originalRouteSummary
  }

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} CROWD HARD-CONSTRAINT TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════")
  if (failed > 0) process.exit(1)
}

runCrowdBlockTests().catch((err) => {
  console.error("💥 Crowd hard-constraint test suite crashed:", err)
  process.exit(1)
})
