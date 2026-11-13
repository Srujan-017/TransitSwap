import { crowdService } from "../services/crowdService"
import { calculateMultimodalRoute } from "../controllers/multimodalController"
import { setMultimodalRoadLegProviderForTesting } from "../services/multimodalService"
import type { Request, Response } from "express"
import type { CrowdLevel, LegCrowd, RouteCrowdSummary } from "../types/intelligence"
import type { MultimodalRoute } from "../types/multimodal"

/**
 * Crowd rules for accessibility profiles.
 *
 * A HIGH-crowd metro leg is never suggested for wheelchair, senior, pregnant, stroller, luggage or
 * reduced-mobility riders; a bus is never suggested for wheelchair / pregnant / stroller riders, and
 * for the others only when the bus is LOW crowd. Since the feature-upgrade (phase 3) a door-to-door
 * auto always exists inside Bengaluru, so excluding the crowded options leaves an answer instead of a
 * 404. Standard riders are not filtered by crowd.
 *
 * crowdService.routeSummary is stubbed for this file (restored at the end) so the result does not
 * depend on the demo crowd data's time of day. Road legs are offline so no network is needed.
 */

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) passed++
  else {
    failed++
    console.error(`   ❌ FAILED: ${msg}`)
  }
}

// Kempegowda Bus Station -> Shivajinagar Bus Stand: metro and bus candidates both exist.
const origin = { latitude: 12.9770, longitude: 77.5705 }
const destination = { latitude: 12.9868, longitude: 77.6047 }
const DEPARTURE = "2026-11-16T14:30"

function mockReqRes(profile: string) {
  const req = { body: { origin, destination, profile, departureTime: DEPARTURE } } as unknown as Request
  let jsonBody: unknown
  const res = {
    status() { return this },
    json(body: unknown) { jsonBody = body; return this },
  } as unknown as Response
  let capturedError: unknown
  return { req, res, next: (err?: unknown) => { capturedError = err }, getJson: () => jsonBody, getError: () => capturedError }
}

// A crowd summary that puts every metro leg at `metro` and every bus leg at `bus`.
function stubCrowd(metro: CrowdLevel, bus: CrowdLevel) {
  return async (route: MultimodalRoute): Promise<RouteCrowdSummary> => {
    const legs: LegCrowd[] = route.segments
      .filter((s) => s.mode === "metro" || s.mode === "bus")
      .map((s) => ({
        segmentId: s.id,
        mode: s.mode as "metro" | "bus",
        label: s.mode === "bus" ? `Bus ${s.transitDetails?.routeNumber ?? ""}`.trim() : "Metro",
        from: s.from.name,
        to: s.to.name,
        level: s.mode === "metro" ? metro : bus,
        source: "DEMO_DATA" as const,
      }))
    if (legs.length === 0) return { level: "LOW", source: "NOT_APPLICABLE", summary: "No transit leg.", stations: [], legs }
    const order: CrowdLevel[] = ["LOW", "MEDIUM", "HIGH"]
    const level = legs.reduce<CrowdLevel>((m, l) => (order.indexOf(l.level!) > order.indexOf(m) ? l.level! : m), "LOW")
    return { level, source: "DEMO_DATA", summary: `${level} (test stub).`, stations: [], legs }
  }
}

async function plan(profile: string) {
  const { req, res, next, getJson, getError } = mockReqRes(profile)
  await calculateMultimodalRoute(req, res, next)
  const body = getJson() as { success?: boolean; data?: Array<MultimodalRoute & { crowd?: RouteCrowdSummary; profileFit?: { isBest: boolean } }>; excludedRoutes?: Array<{ reasonType: string }> } | undefined
  return { body, error: getError() as { statusCode?: number } | undefined }
}

const hasMode = (route: MultimodalRoute, ...modes: string[]) => route.segments.some((s) => modes.includes(s.mode))
const PROFILES = ["pregnant", "senior", "stroller", "luggage", "wheelchair", "reduced_mobility"]

async function run() {
  console.log("🧪 Running Crowd Rules Tests...\n")

  setMultimodalRoadLegProviderForTesting({
    async getRoute() { throw new Error("offline test provider") },
  })
  const originalRouteSummary = crowdService.routeSummary

  try {
    console.log("1️⃣  Every metro and bus leg is HIGH crowd: no accessibility profile is sent on one...")
    crowdService.routeSummary = stubCrowd("HIGH", "HIGH")
    for (const profile of PROFILES) {
      const { body, error } = await plan(profile)
      assert(error === undefined && body?.success === true, `${profile}: still gets an answer (an auto), not an error`)
      const routes = body?.data ?? []
      assert(routes.length >= 1, `${profile}: at least one route is returned`)
      assert(routes.every((r) => !hasMode(r, "metro", "bus")), `${profile}: no returned route uses a HIGH-crowd metro or bus`)
      assert(routes[0]?.profileFit?.isBest === true, `${profile}: the first route is marked best`)
      assert((body?.excludedRoutes ?? []).some((e) => e.reasonType === "crowd"), `${profile}: the crowded routes are listed as excluded for crowd`)
    }
    console.log("   ✅ crowded options removed, an answer remains.\n")

    console.log("2️⃣  Standard riders are not filtered by crowd...")
    {
      const { body } = await plan("standard")
      assert(body?.success === true && (body.data?.length ?? 0) > 0, "standard: routes are returned despite HIGH crowd")
      assert((body?.data ?? []).some((r) => hasMode(r, "metro", "bus")), "standard: metro/bus routes are still offered")
    }
    console.log("   ✅ standard unaffected.\n")

    console.log("3️⃣  Buses: never for wheelchair / pregnant / stroller, even when LOW crowd...")
    crowdService.routeSummary = stubCrowd("LOW", "LOW")
    for (const profile of ["wheelchair", "pregnant", "stroller"]) {
      const { body } = await plan(profile)
      assert((body?.data ?? []).length >= 1, `${profile}: gets routes`)
      assert((body?.data ?? []).every((r) => !hasMode(r, "bus")), `${profile}: no route contains a bus`)
    }
    console.log("   ✅ no buses for those profiles.\n")

    console.log("4️⃣  Buses for senior / luggage / reduced mobility only when LOW crowd...")
    crowdService.routeSummary = stubCrowd("LOW", "HIGH")
    for (const profile of ["senior", "luggage", "reduced_mobility"]) {
      const { body } = await plan(profile)
      assert((body?.data ?? []).every((r) => !hasMode(r, "bus")), `${profile}: a HIGH-crowd bus is never suggested`)
    }
    crowdService.routeSummary = stubCrowd("LOW", "LOW")
    {
      // With every bus LOW, a bus option may appear; whatever is returned must still obey the walking caps.
      const { body } = await plan("senior")
      assert((body?.data ?? []).length >= 1, "senior: gets routes when buses are LOW")
      assert((body?.data ?? []).every((r) => r.segments.filter((s) => s.mode === "walking").every((s) => s.distanceMeters <= 300)), "senior: no walking leg over 300 m")
    }
    console.log("   ✅ bus rule respected.\n")

    console.log("5️⃣  A crowded station only makes the unavailable crowd a non-issue: MEDIUM is allowed...")
    crowdService.routeSummary = stubCrowd("MEDIUM", "MEDIUM")
    {
      const { body } = await plan("pregnant")
      assert((body?.data ?? []).length >= 1, "pregnant: MEDIUM crowd does not exclude everything")
    }
    console.log("   ✅ MEDIUM allowed.\n")
  } finally {
    crowdService.routeSummary = originalRouteSummary
    setMultimodalRoadLegProviderForTesting(null)
  }

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) console.log(`🎉 ALL ${passed} CROWD HARD-CONSTRAINT TESTS PASSED!`)
  else console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════")
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error("💥 Crowd hard-constraint test suite crashed:", err)
  process.exit(1)
})
