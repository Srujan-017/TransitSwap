import request from "supertest"
import { app, registerTestUser, authHeader, ensureDbConnected } from "../helpers/testApp"
import { setMultimodalRoadLegProviderForTesting } from "../../services/multimodalService"
import { describeRoute } from "../../utils/routeDescription"
import { Accessibility } from "../../models/Accessibility"
import type { MultimodalRoute } from "../../types/multimodal"

/**
 * Completion-phase 2 — through the real HTTP API:
 *
 * B3: when every candidate route is excluded for the rider's profile, the 404 used
 *     to carry only a message — the reasons were thrown away, and the page then
 *     claimed "no combination connects them", which is false (routes existed, they
 *     just were not usable). The reasons are now returned in `data.excludedRoutes`,
 *     and also on a successful response when only SOME routes were excluded.
 * B5: GET /evaluation/ml/status ignored the rider's profile and always reported the
 *     "standard" weights, while route ranking uses the profile's own preset.
 *
 * Offline road legs and a 03:00 departure keep this independent of the live OSRM
 * service and of the real time of day (no station has crowd data at 03:00, so the
 * crowd rule cannot add exclusions and only infrastructure/walking rules apply).
 */

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string): boolean {
  if (condition) {
    passed++
    return true
  }
  failed++
  console.error(`   ❌ FAILED: ${msg}`)
  return false
}

const DEPARTURE = "2026-11-12T03:00"
// Found by exhaustive search of station pairs under the offline provider (wheelchair profile).
// Indiranagar → Cubbon Park: all 4 candidates excluded (station + walking-distance reasons).
const ALL_EXCLUDED = {
  origin: { latitude: 12.9802, longitude: 77.6408 },
  destination: { latitude: 12.9774, longitude: 77.5982 },
}
// Whitefield → Indiranagar: 4 candidates, 2 feasible and 2 excluded.
const SOME_EXCLUDED = {
  origin: { latitude: 12.9716, longitude: 77.75 },
  destination: { latitude: 12.9784, longitude: 77.6423 },
}
// Mumbai: outside the Bengaluru demo network — no candidate route exists at all.
const OUTSIDE_NETWORK = {
  origin: { latitude: 19.076, longitude: 72.8777 },
  destination: { latitude: 19.0896, longitude: 72.8656 },
}

const REASON_TYPES = ["station", "walking_distance", "crowd"]

async function search(token: string, pair: typeof ALL_EXCLUDED, profile: string) {
  return request(app)
    .post("/api/routes/multimodal")
    .set(...authHeader(token))
    .send({ ...pair, profile, departureTime: DEPARTURE })
}

async function run() {
  console.log("🧪 Running Completion-phase 2 API Tests — exclusion reasons (B3) and ML status profile (B5)...\n")

  const dbAvailable = await ensureDbConnected()
  if (!dbAvailable) {
    console.log("⚠️  SKIPPED — MONGODB_URI is not configured (needed to register a test user). This is an honest skip, not a pass.\n")
    return
  }

  setMultimodalRoadLegProviderForTesting({
    async getRoute() {
      throw new Error("offline test provider")
    },
  })

  // The runner shares one database across files, and earlier files (admin.test.ts) edit station
  // accessibility records. With no stored records the service falls back to the seeded demo
  // dataset, which is what the station pairs below were chosen against.
  await Accessibility.deleteMany({})

  try {
    const wheelchair = await registerTestUser({ accessibilityProfile: "wheelchair" })
    const standard = await registerTestUser({ accessibilityProfile: "standard" })

    console.log("1️⃣ B3 — every route excluded: the 404 explains each exclusion...")
    const none = await search(wheelchair.token, ALL_EXCLUDED, "wheelchair")
    assert(none.status === 404, `404 when no route is usable (got ${none.status})`)
    assert(/No accessible multimodal route/.test(none.body.message ?? ""), "the message is unchanged")
    const excluded = none.body.data?.excludedRoutes as Array<Record<string, unknown>> | undefined
    assert(Array.isArray(excluded) && excluded.length >= 2, `excludedRoutes lists every ruled-out candidate (got ${excluded?.length})`)
    assert(
      (excluded ?? []).every(
        (e) =>
          typeof e.summary === "string" && (e.summary as string).length > 0 &&
          typeof e.reason === "string" && (e.reason as string).length > 0 &&
          REASON_TYPES.includes(e.reasonType as string) &&
          typeof e.durationMinutes === "number" && typeof e.walkingMeters === "number",
      ),
      "every excluded route has a summary, a typed reason, a reason text, a duration and a walking distance",
    )
    assert((excluded ?? []).some((e) => e.reasonType === "station"), "at least one is a station exclusion")
    assert((excluded ?? []).some((e) => e.reasonType === "walking_distance"), "at least one is a walking-distance exclusion")
    assert(
      (excluded ?? []).filter((e) => e.reasonType === "walking_distance").every((e) => /exceeding the 1200m limit/.test(e.reason as string)),
      "walking exclusions state the 1200 m limit",
    )
    console.log("   ✅ reasons returned with the 404\n")

    console.log("2️⃣ B3 — some routes excluded: the 200 lists them alongside the recommendations...")
    const some = await search(wheelchair.token, SOME_EXCLUDED, "wheelchair")
    assert(some.status === 200, `200 when a usable route exists (got ${some.status})`)
    const recommended = (some.body.data ?? []) as MultimodalRoute[]
    const alsoExcluded = (some.body.excludedRoutes ?? []) as Array<{ summary: string; reason: string }>
    assert(recommended.length >= 1, "at least one route is recommended")
    assert(alsoExcluded.length >= 1, `excludedRoutes is present on the success response (got ${alsoExcluded.length})`)
    const recommendedSummaries = new Set(recommended.map(describeRoute))
    assert(alsoExcluded.every((e) => !recommendedSummaries.has(e.summary)), "no route is both recommended and excluded")
    assert(recommended.every((r) => (r as unknown as { accessibility: { blocked: boolean } }).accessibility.blocked === false), "every recommended route is unblocked")
    console.log("   ✅ exclusions reported next to the recommendations\n")

    console.log("3️⃣ B3 — nothing excluded: no excludedRoutes field is added...")
    const standardSearch = await search(standard.token, ALL_EXCLUDED, "standard")
    assert(standardSearch.status === 200, `standard profile finds routes on the same trip (got ${standardSearch.status})`)
    assert(!("excludedRoutes" in standardSearch.body), "no excludedRoutes key when nothing was excluded (response unchanged for existing clients)")
    console.log("   ✅ response unchanged when nothing is excluded\n")

    console.log("4️⃣ B3 — no candidate route at all: still a plain 404, with no exclusion list...")
    const outside = await search(wheelchair.token, OUTSIDE_NETWORK, "wheelchair")
    assert(outside.status === 404, `404 outside the network (got ${outside.status})`)
    assert(!outside.body.data, "no data payload — there was nothing to exclude")
    console.log("   ✅ outside-network behaviour unchanged\n")

    console.log("5️⃣ B5 — the ML status follows the rider's profile...")
    const wheelchairStatus = await request(app).get("/api/evaluation/ml/status").set(...authHeader(wheelchair.token))
    const standardStatus = await request(app).get("/api/evaluation/ml/status").set(...authHeader(standard.token))
    assert(wheelchairStatus.status === 200 && standardStatus.status === 200, "both status requests succeed")
    assert(/wheelchair/.test(wheelchairStatus.body.data?.statusMessage ?? ""), `wheelchair user's status names the wheelchair profile (got: ${wheelchairStatus.body.data?.statusMessage})`)
    assert(/standard/.test(standardStatus.body.data?.statusMessage ?? ""), "standard user's status names the standard profile")
    assert(
      wheelchairStatus.body.data?.weights?.accessibility > standardStatus.body.data?.weights?.accessibility,
      `wheelchair accessibility weight (${wheelchairStatus.body.data?.weights?.accessibility}) exceeds standard (${standardStatus.body.data?.weights?.accessibility})`,
    )
    console.log("   ✅ status reflects the profile used for ranking\n")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} EXCLUSION-REASON API TESTS PASSED!`)
  } else {
    console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  }
  console.log("═══════════════════════════════════════════════════════\n")

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error("❌ Exclusion-reason API test failure:", err)
  process.exit(1)
})
