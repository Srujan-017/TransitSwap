import { setMultimodalRoadLegProviderForTesting, type RoadLegProvider } from "../services/multimodalService"
import { planTrip } from "../services/tripPlanner"
import { AppError } from "../middleware/errorHandler"
import {
  PROFILE_POLICIES, POLICY_PROFILES, evaluatePolicy, fitKey, compareKeys, coreSignature, suitabilityTier, isPolicyProfile,
} from "../services/profilePolicy"
import type { MultimodalRoute, RouteSegment } from "../types/multimodal"
import type { LegCrowd, RouteCrowdSummary } from "../types/intelligence"
import type { NormalizedRoute } from "../types/routing"

/**
 * Feature-upgrade phase 3 — the travel rules for accessibility profiles.
 *
 * Part A tests the rules themselves on hand-built routes. Part B runs the real planning pipeline
 * (offline road model, no database) over several Bengaluru trips and times for every profile and
 * checks every answer against the rules as the rider stated them — written here independently of
 * profilePolicy.ts. The wider 7 x 12 x 3 matrix is scripts/profile-matrix.ts.
 */

let passed = 0
let failed = 0
function assert(condition: boolean, msg: string): boolean {
  if (condition) { passed++; return true }
  failed++
  console.error(`   ❌ FAILED: ${msg}`)
  return false
}

// ── Part A helpers: hand-built routes ─────────────────────────────────────────
let idCounter = 0
function seg(mode: RouteSegment["mode"], from: string, to: string, meters: number, minutes: number, extra: Partial<RouteSegment> = {}): RouteSegment {
  return {
    id: `s${++idCounter}`, mode, from: { name: from, latitude: 12.97, longitude: 77.6 }, to: { name: to, latitude: 12.98, longitude: 77.61 },
    distanceMeters: meters, durationSeconds: minutes * 60, estimatedFare: mode === "walking" ? 0 : 30, instruction: "", geometry: { type: "LineString", coordinates: [[77.6, 12.97], [77.61, 12.98]] },
    ...(mode === "bus" ? { transitDetails: { lineName: "5", lineColor: "#16a34a", stopCount: 3, stops: [from, to], waitMinutes: 8, routeNumber: "5" } } : {}),
    ...extra,
  } as RouteSegment
}
function routeOf(...segments: RouteSegment[]): MultimodalRoute {
  const walk = segments.filter((s) => s.mode === "walking").reduce((n, s) => n + s.distanceMeters, 0)
  return {
    id: `r${++idCounter}`, label: "BALANCED", labelDisplay: "", labelColor: "", segments, totalDistanceMeters: 0,
    totalDurationSeconds: segments.reduce((n, s) => n + s.durationSeconds, 0), totalWalkingMeters: walk,
    totalFare: segments.reduce((n, s) => n + s.estimatedFare, 0), transferCount: 0, modes: [], summary: "", isDemoData: true,
  } as MultimodalRoute
}
function crowdFor(route: MultimodalRoute, levels: Record<string, "LOW" | "MEDIUM" | "HIGH">): RouteCrowdSummary {
  const legs: LegCrowd[] = route.segments.filter((s) => s.mode === "metro" || s.mode === "bus").map((s) => ({
    segmentId: s.id, mode: s.mode as "metro" | "bus", label: s.mode, from: s.from.name, to: s.to.name, level: levels[s.id], source: "DEMO_DATA" as const,
  }))
  return { level: "LOW", source: "DEMO_DATA", summary: "", stations: [], legs }
}
const WHEN = new Date(2026, 10, 16, 14, 30)
const at = (h: number, m = 0) => new Date(2026, 10, 16, h, m)

// ── Part B helpers: pipeline ─────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
const offline: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const d = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.2
    return [{ distanceMeters: d, durationSeconds: d / (mode === "walking" ? 1.3 : 8), geometry: { type: "LineString", coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] } }] as unknown as NormalizedRoute[]
  },
}
const P = (n: string, lat: number, lng: number) => ({ name: n, latitude: lat, longitude: lng })
const TRIPS = [
  { id: "Hoodi -> MG Road", from: P("Hoodi", 12.987, 77.7089), to: P("MG Road", 12.9763, 77.6079) },
  { id: "Indiranagar -> Cubbon Park", from: P("Indiranagar", 12.9802, 77.6408), to: P("Cubbon Park", 12.9774, 77.5982) },
  { id: "Mysuru Road -> Majestic", from: P("Mysuru Road", 12.9419, 77.509), to: P("Majestic", 12.9767, 77.5713) },
  { id: "Banashankari -> Jayanagar", from: P("Banashankari", 12.9254, 77.5468), to: P("Jayanagar", 12.9293, 77.583) },
]
const TIMES = ["2026-11-16T08:30", "2026-11-16T14:30", "2026-11-16T22:00"]
const LIMITS: Record<string, { leg: number; total: number; bus: "never" | "low" }> = {
  wheelchair: { leg: 150, total: 300, bus: "never" }, senior: { leg: 300, total: 500, bus: "low" }, pregnant: { leg: 300, total: 500, bus: "never" },
  stroller: { leg: 300, total: 500, bus: "never" }, luggage: { leg: 300, total: 400, bus: "low" }, reduced_mobility: { leg: 300, total: 400, bus: "low" },
}

async function run() {
  console.log("🧪 Running Profile Policy Tests...\n")

  console.log("1️⃣ The policy table matches the agreed rules...")
  assert(POLICY_PROFILES.length === 6 && POLICY_PROFILES.every(isPolicyProfile), "six accessibility profiles")
  assert(!isPolicyProfile("standard") && !isPolicyProfile("fastest") && !isPolicyProfile(undefined), "standard / fastest / undefined are not policy profiles")
  assert(PROFILE_POLICIES.wheelchair.bus === "never" && PROFILE_POLICIES.pregnant.bus === "never" && PROFILE_POLICIES.stroller.bus === "never", "no buses for wheelchair, pregnant, stroller")
  assert(PROFILE_POLICIES.senior.bus === "lowCrowdOnly" && PROFILE_POLICIES.luggage.bus === "lowCrowdOnly" && PROFILE_POLICIES.reduced_mobility.bus === "lowCrowdOnly", "buses only when LOW for senior, luggage, reduced mobility")
  assert(PROFILE_POLICIES.wheelchair.maxWalkLegM === 150 && PROFILE_POLICIES.senior.maxWalkTotalM === 500 && PROFILE_POLICIES.luggage.maxWalkTotalM === 400, "walking caps")
  assert(PROFILE_POLICIES.luggage.autoIsFirstChoice && !PROFILE_POLICIES.senior.autoIsFirstChoice, "autos are first choice only for luggage")
  assert(PROFILE_POLICIES.wheelchair.autoLabel.includes("accessible cab"), "wheelchair autos are called accessible cabs")
  console.log("   ✅ table\n")

  console.log("2️⃣ evaluatePolicy — buses...")
  {
    const bus = seg("bus", "A", "B", 3000, 15)
    const r = routeOf(bus)
    for (const p of ["wheelchair", "pregnant", "stroller"] as const) {
      const v = evaluatePolicy(r, crowdFor(r, { [bus.id]: "LOW" }), WHEN, PROFILE_POLICIES[p])
      assert(v.blocked && v.reasonType === "mode", `${p}: a LOW-crowd bus is still blocked (mode)`)
    }
    for (const p of ["senior", "luggage", "reduced_mobility"] as const) {
      assert(!evaluatePolicy(r, crowdFor(r, { [bus.id]: "LOW" }), WHEN, PROFILE_POLICIES[p]).blocked, `${p}: a LOW-crowd bus is allowed`)
      const med = evaluatePolicy(r, crowdFor(r, { [bus.id]: "MEDIUM" }), WHEN, PROFILE_POLICIES[p])
      assert(med.blocked && med.reasonType === "crowd", `${p}: a MEDIUM-crowd bus is blocked (crowd)`)
      assert(evaluatePolicy(r, crowdFor(r, { [bus.id]: "HIGH" }), WHEN, PROFILE_POLICIES[p]).blocked, `${p}: a HIGH-crowd bus is blocked`)
    }
  }
  console.log("   ✅ buses\n")

  console.log("3️⃣ evaluatePolicy — walking caps...")
  {
    const w = (leg: number) => routeOf(seg("walking", "A", "B", leg, 5), seg("metro", "B", "C", 4000, 12))
    const wheel = PROFILE_POLICIES.wheelchair
    assert(!evaluatePolicy(w(150), undefined, WHEN, wheel).blocked, "wheelchair: a 150 m roll is allowed")
    const over = evaluatePolicy(w(151), undefined, WHEN, wheel)
    assert(over.blocked && over.reasonType === "walking_distance", "wheelchair: a 151 m walking leg is blocked")
    assert(!evaluatePolicy(w(300), undefined, WHEN, PROFILE_POLICIES.senior).blocked, "senior: a 300 m walk is allowed")
    assert(evaluatePolicy(w(301), undefined, WHEN, PROFILE_POLICIES.senior).blocked, "senior: a 301 m walk is blocked")
    const two = routeOf(seg("walking", "A", "B", 280, 4), seg("metro", "B", "C", 4000, 12), seg("walking", "C", "D", 280, 4))
    const total = evaluatePolicy(two, undefined, WHEN, PROFILE_POLICIES.luggage)
    assert(total.blocked && /400 m/.test(total.reason ?? ""), "luggage: two 280 m walks (560 m) exceed the 400 m total")
    assert(evaluatePolicy(two, undefined, WHEN, PROFILE_POLICIES.senior).blocked, "senior: two 280 m walks (560 m) exceed the 500 m total")
  }
  console.log("   ✅ walking\n")

  console.log("4️⃣ evaluatePolicy — crowded metro, and metro hours...")
  {
    const metro = seg("metro", "A", "B", 5000, 15)
    const r = routeOf(metro)
    for (const p of POLICY_PROFILES) {
      assert(evaluatePolicy(r, crowdFor(r, { [metro.id]: "HIGH" }), WHEN, PROFILE_POLICIES[p]).blocked, `${p}: a HIGH-crowd metro leg is blocked`)
      assert(!evaluatePolicy(r, crowdFor(r, { [metro.id]: "MEDIUM" }), WHEN, PROFILE_POLICIES[p]).blocked, `${p}: a MEDIUM-crowd metro leg is allowed`)
    }
    const wheel = PROFILE_POLICIES.wheelchair
    const night = evaluatePolicy(r, crowdFor(r, { [metro.id]: "LOW" }), at(23, 30), wheel)
    assert(night.blocked && night.reasonType === "service_hours", "metro at 23:30 is blocked (service hours)")
    assert(evaluatePolicy(r, crowdFor(r, { [metro.id]: "LOW" }), at(3, 0), wheel).blocked, "metro at 03:00 is blocked")
    assert(!evaluatePolicy(r, crowdFor(r, { [metro.id]: "LOW" }), at(5, 0), wheel).blocked, "metro at 05:00 is allowed")
    assert(!evaluatePolicy(r, crowdFor(r, { [metro.id]: "LOW" }), at(22, 59), wheel).blocked, "metro at 22:59 is allowed")
    assert(evaluatePolicy(r, crowdFor(r, { [metro.id]: "LOW" }), at(23, 0), wheel).blocked, "metro at 23:00 is blocked")
    // an auto ride first pushes the metro boarding later: leaving at 22:50 with a 20 min auto boards at 23:10
    const afterAuto = routeOf(seg("auto", "Home", "A", 3000, 20), metro)
    assert(evaluatePolicy(afterAuto, crowdFor(afterAuto, { [metro.id]: "LOW" }), at(22, 50), wheel).reasonType === "service_hours", "metro boarding time includes the earlier auto leg")
    const autoOnly = routeOf(seg("auto", "A", "B", 9000, 30))
    assert(!evaluatePolicy(autoOnly, undefined, at(23, 30), wheel).blocked, "a door-to-door auto is available at any hour")
  }
  console.log("   ✅ crowd and hours\n")

  console.log("5️⃣ Ordering: tier, then crowd, changes, walking, time, fare...")
  {
    const senior = PROFILE_POLICIES.senior
    const metroRoute = routeOf(seg("metro", "A", "B", 5000, 30))
    const autoRoute = routeOf(seg("auto", "A", "B", 5000, 12))
    const busRoute = routeOf(seg("bus", "A", "B", 5000, 20))
    assert(suitabilityTier(metroRoute, senior) < suitabilityTier(autoRoute, senior), "metro ranks above a door-to-door auto")
    assert(suitabilityTier(autoRoute, senior) < suitabilityTier(busRoute, senior), "a door-to-door auto ranks above a bus")
    assert(suitabilityTier(autoRoute, PROFILE_POLICIES.luggage) === suitabilityTier(metroRoute, PROFILE_POLICIES.luggage), "for heavy luggage a door-to-door auto is as good a first choice as metro")
    assert(compareKeys(fitKey(metroRoute, "LOW", senior), fitKey(metroRoute, "MEDIUM", senior)) < 0, "lower crowd ranks first")
    const fast = routeOf(seg("metro", "A", "B", 5000, 20))
    assert(compareKeys(fitKey(fast, "LOW", senior), fitKey(metroRoute, "LOW", senior)) < 0, "faster ranks first when all else is equal")
    const viaAuto = routeOf(seg("auto", "H", "A", 2000, 8), seg("metro", "A", "B", 5000, 20), seg("auto", "B", "D", 2000, 8))
    const viaWalk = routeOf(seg("walking", "H", "A", 280, 4), seg("metro", "A", "B", 5000, 20), seg("walking", "B", "D", 280, 4))
    assert(compareKeys(fitKey(viaAuto, "LOW", senior), fitKey(viaWalk, "LOW", senior)) < 0, "an auto covering the first/last mile beats a 560 m walk")
    const wheel = PROFILE_POLICIES.wheelchair
    assert(compareKeys(fitKey(metroRoute, "LOW", wheel), fitKey(metroRoute, "MEDIUM", wheel)) === 0, "wheelchair: LOW and MEDIUM crowd are not told apart in the ordering (HIGH is excluded anyway)")
    for (const p of ["pregnant", "stroller", "senior"] as const) {
      assert(compareKeys(fitKey(metroRoute, "LOW", PROFILE_POLICIES[p]), fitKey(metroRoute, "MEDIUM", PROFILE_POLICIES[p])) < 0, `${p}: LOW crowd ranks above MEDIUM`)
    }
    // Cost weighs fare and time together: 2 minutes faster is not worth three times the fare.
    const cheapSlow = routeOf(seg("metro", "A", "B", 5000, 18, { estimatedFare: 36 }))
    const dearFast = routeOf(seg("metro", "A", "B", 5000, 16, { estimatedFare: 97 }))
    assert(compareKeys(fitKey(cheapSlow, "LOW", wheel), fitKey(dearFast, "LOW", wheel)) < 0, "a route 2 min slower but Rs 61 cheaper ranks first")
    const lug = PROFILE_POLICIES.luggage
    assert(compareKeys(fitKey(dearFast, "LOW", lug), fitKey(cheapSlow, "LOW", lug)) < 0, "heavy luggage still ranks the quicker route first")
    assert(coreSignature(viaAuto) === coreSignature(viaWalk), "same metro leg = same option")
    assert(coreSignature(autoRoute) === "auto-only", "door-to-door auto is its own option")
  }
  console.log("   ✅ ordering\n")

  console.log("6️⃣ The pipeline: every profile gets an answer, and the answer obeys the rules...")
  setMultimodalRoadLegProviderForTesting(offline)
  try {
    let cases = 0
    for (const profile of POLICY_PROFILES) {
      for (const trip of TRIPS) {
        for (const when of TIMES) {
          cases++
          const tag = `${profile} / ${trip.id} / ${when.slice(11)}`
          let plan
          try {
            plan = await planTrip({ origin: trip.from, destination: trip.to, profile, departureTime: when })
          } catch (err) {
            assert(false, `${tag}: no answer (${err instanceof AppError ? err.message : String(err)})`)
            continue
          }
          const routes = plan.rankedRoutes
          assert(routes.length >= 1 && routes.length <= 3, `${tag}: 1-3 routes (got ${routes.length})`)
          assert(routes[0].profileFit?.isBest === true && routes[0].profileFit?.rank === 1 && routes[0].labelDisplay === "Best for you", `${tag}: first route is the best one`)
          assert(routes.slice(1).every((r, i) => r.profileFit?.rank === i + 2 && !r.profileFit.isBest), `${tag}: the others are ranked 2, 3`)
          assert((routes[0].profileFit?.reasons.length ?? 0) >= 2, `${tag}: the best route is explained`)
          const limit = LIMITS[profile]
          for (const route of routes) {
            const walks = route.segments.filter((s) => s.mode === "walking")
            assert(walks.every((s) => s.distanceMeters <= limit.leg), `${tag}: no walking leg over ${limit.leg} m`)
            assert(walks.reduce((n, s) => n + s.distanceMeters, 0) <= limit.total, `${tag}: walking within ${limit.total} m`)
            const legs = route.crowd?.legs ?? []
            assert(!legs.some((l) => l.mode === "metro" && l.level === "HIGH"), `${tag}: no HIGH-crowd metro leg`)
            for (const s of route.segments.filter((x) => x.mode === "bus")) {
              assert(limit.bus === "low" && legs.find((l) => l.segmentId === s.id)?.level === "LOW", `${tag}: bus only when allowed and LOW`)
            }
          }
          assert(plan.excludedRoutes.every((e) => e.summary && e.reason && ["station", "walking_distance", "crowd", "mode", "service_hours"].includes(e.reasonType)), `${tag}: exclusions are typed and explained`)
        }
      }
    }
    assert(cases === 6 * TRIPS.length * TIMES.length, `${cases} cases ran`)
    console.log(`   ✅ ${cases} cases, all answered and rule-abiding\n`)

    console.log("7️⃣ Specific scenarios...")
    const t1 = TRIPS[1] // Indiranagar -> Cubbon Park: the Indiranagar station is not wheelchair accessible
    const wc = await planTrip({ origin: t1.from, destination: t1.to, profile: "wheelchair", departureTime: "2026-11-16T14:30" })
    assert(wc.rankedRoutes[0].segments.some((s) => s.mode === "auto" && /accessible cab/.test(s.instruction)), "wheelchair: autos are described as accessible cabs")
    assert(wc.excludedRoutes.some((e) => e.reasonType === "station"), "wheelchair: the inaccessible station route is listed as excluded")

    const late = await planTrip({ origin: TRIPS[0].from, destination: TRIPS[0].to, profile: "pregnant", departureTime: "2026-11-16T23:30" })
    assert(late.rankedRoutes.every((r) => !r.segments.some((s) => s.mode === "metro")), "pregnant at 23:30: no metro (it is not running), an auto instead")
    assert(late.excludedRoutes.some((e) => e.reasonType === "service_hours"), "pregnant at 23:30: metro routes are listed as excluded for service hours")

    const luggage = await planTrip({ origin: TRIPS[2].from, destination: TRIPS[2].to, profile: "luggage", departureTime: "2026-11-16T14:30" })
    assert(luggage.rankedRoutes[0].segments.some((s) => s.mode === "auto"), "luggage: the best route uses an auto")

    const standard = await planTrip({ origin: TRIPS[3].from, destination: TRIPS[3].to, profile: "standard", departureTime: "2026-11-16T14:30" })
    assert(standard.rankedRoutes.length >= 1 && !standard.rankedRoutes[0].profileFit, "standard: gets an answer (auto fallback) and no profile explanation")

    let outside: unknown
    try {
      await planTrip({ origin: P("Mumbai", 19.076, 72.8777), destination: P("Bandra", 19.0896, 72.8656), profile: "wheelchair" })
    } catch (err) { outside = err }
    assert(outside instanceof AppError && (outside as AppError).statusCode === 404, "outside Bengaluru: still a 404 (no door-to-door auto across the country)")

    let same: unknown
    try {
      await planTrip({ origin: TRIPS[0].from, destination: TRIPS[0].from, profile: "wheelchair" })
    } catch (err) { same = err }
    assert(same instanceof AppError && (same as AppError).statusCode === 404, "same start and end: 404")

    // a very short trip: walking is allowed for the cap, and an auto exists when it is not
    const near = { from: P("A", 12.9757, 77.6079), to: P("B", 12.9757, 77.6097) } // ~195 m
    const shortWc = await planTrip({ origin: near.from, destination: near.to, profile: "wheelchair", departureTime: "2026-11-16T14:30" })
    assert(shortWc.rankedRoutes.length >= 1, "a 200 m trip still gets an answer for a wheelchair rider")
    assert(shortWc.rankedRoutes[0].segments.every((s) => s.mode !== "walking" || s.distanceMeters <= 150), "...and never a roll over 150 m")
    console.log("   ✅ scenarios\n")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) console.log(`🎉 ALL ${passed} PROFILE POLICY TESTS PASSED!`)
  else console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => { console.error("❌ Profile policy test failure:", err); process.exit(1) })
