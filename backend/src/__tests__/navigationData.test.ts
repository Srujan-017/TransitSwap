import { setMultimodalRoadLegProviderForTesting, multimodalService, type RoadLegProvider } from "../services/multimodalService"
import { BUS_STOPS, METRO_STATIONS, getStop } from "../data/transitData"
import type { NormalizedRoute } from "../types/routing"
import type { MultimodalRoute, RouteSegment } from "../types/multimodal"

/**
 * Feature-upgrade phase 6 — the data a live navigation screen needs, carried on the route:
 *   - turn-by-turn steps for walking and auto legs (kept from the road router, with where each turn happens);
 *   - where each stop of a bus or metro leg is, so "N stops left" can be worked out from a position;
 *   - ISO boarding/arrival times and the departure time, so the screen can count down to the bus;
 *   - where a metro journey changes line.
 */

let passed = 0
let failed = 0
function assert(condition: boolean, msg: string): boolean {
  if (condition) { passed++; return true }
  failed++
  console.error(`   ❌ FAILED: ${msg}`)
  return false
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// A road router that answers with a real-looking set of turn-by-turn steps (a dog-leg: east then north).
const withSteps: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const corner = { latitude: origin.latitude, longitude: destination.longitude }
    const d1 = haversine(origin.latitude, origin.longitude, corner.latitude, corner.longitude)
    const d2 = haversine(corner.latitude, corner.longitude, destination.latitude, destination.longitude)
    const speed = mode === "walking" ? 1.3 : 8
    return [{
      id: "x", provider: "test", mode,
      distanceMeters: d1 + d2, durationSeconds: (d1 + d2) / speed,
      geometry: { type: "LineString", coordinates: [[origin.longitude, origin.latitude], [corner.longitude, corner.latitude], [destination.longitude, destination.latitude]] },
      legs: [{
        distanceMeters: d1 + d2, durationSeconds: (d1 + d2) / speed,
        steps: [
          { instruction: "Head east onto Church Street", distanceMeters: d1, durationSeconds: d1 / speed, mode, name: "Church Street", maneuver: { type: "depart", location: [origin.longitude, origin.latitude] } },
          { instruction: "Turn left onto 80 Feet Road", distanceMeters: d2, durationSeconds: d2 / speed, mode, name: "80 Feet Road", maneuver: { type: "turn", modifier: "left", location: [corner.longitude, corner.latitude] } },
          { instruction: "Arrive at your destination", distanceMeters: 0, durationSeconds: 0, mode, maneuver: { type: "arrive", location: [destination.longitude, destination.latitude] } },
        ],
      }],
    }] as unknown as NormalizedRoute[]
  },
}

const noSteps: RoadLegProvider = {
  async getRoute({ origin, destination, mode }) {
    const d = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) * 1.2
    return [{ id: "x", provider: "test", mode, distanceMeters: d, durationSeconds: d / 8, legs: [], geometry: { type: "LineString", coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] } }] as unknown as NormalizedRoute[]
  },
}

const near = (id: string, dLat = 0.0009, dLng = 0.0006) => {
  const s = getStop(id) ?? METRO_STATIONS.find((m) => m.id === id)!
  return { latitude: s.latitude + dLat, longitude: s.longitude + dLng }
}

async function run() {
  console.log("🧪 Running Navigation Data Tests...\n")

  console.log("1️⃣ Walking and auto legs carry the road router's turn-by-turn steps...")
  setMultimodalRoadLegProviderForTesting(withSteps)
  try {
    // Hosur Road corridor: a bus is offered, with walking at both ends.
    const routes = await multimodalService.generateRoutes({
      origin: { name: "Start", ...near("b-21") }, destination: { name: "End", ...near("b-20") }, profile: "standard", departureTime: "2026-11-16T08:30",
    })
    const walks = routes.flatMap((r) => r.segments).filter((s) => s.mode === "walking")
    assert(walks.length > 0, "the routes include walking legs")
    const stepped = walks.filter((s) => s.steps && s.steps.length > 0)
    assert(stepped.length === walks.length, "every walking leg has steps")
    const first = stepped[0].steps!
    assert(first.some((st) => st.type === "turn" && st.modifier === "left" && st.street === "80 Feet Road"), "a turn keeps its direction and street name")
    assert(first.every((st) => Array.isArray(st.location) && st.location.length === 2 && Number.isFinite(st.location[0])), "each step says where it happens")
    assert(first[0].type === "depart" && first[first.length - 1].type === "arrive", "from departing to arriving")
    assert(first[0].instruction.length > 0 && typeof first[0].distanceMeters === "number", "instruction and distance are kept")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }

  console.log("   ✅ steps\n")

  console.log("2️⃣ Without router steps (offline / busy router), legs simply have none...")
  setMultimodalRoadLegProviderForTesting(noSteps)
  let routes: MultimodalRoute[] = []
  try {
    routes = await multimodalService.generateRoutes({
      origin: { name: "Start", ...near("b-21") }, destination: { name: "End", ...near("b-20") }, profile: "standard", departureTime: "2026-11-16T08:30",
    })
    assert(routes.length > 0 && routes.flatMap((r) => r.segments).filter((s) => s.mode === "walking").every((s) => s.steps === undefined), "no steps are invented")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }
  console.log("   ✅ graceful\n")

  console.log("3️⃣ Bus legs say where their stops are, and when the bus is due (ISO)...")
  const busSegs: RouteSegment[] = routes.flatMap((r) => r.segments).filter((s) => s.mode === "bus")
  assert(busSegs.length > 0, "a bus leg exists on the Hosur Road corridor")
  for (const s of busSegs) {
    const d = s.transitDetails!
    assert(d.stopPoints?.length === d.stops.length, "one point per stop")
    assert(d.stopPoints!.every((p, i) => p.name === d.stops[i]), "points are in stop order and named like the stops")
    const first = d.stopPoints![0], last = d.stopPoints![d.stopPoints!.length - 1]
    assert(haversine(first.latitude, first.longitude, s.from.latitude, s.from.longitude) < 5 && haversine(last.latitude, last.longitude, s.to.latitude, s.to.longitude) < 5, "the first and last stops are the leg's ends")
    assert(Boolean(d.boardingAtIso) && Boolean(d.arrivalAtIso) && new Date(d.arrivalAtIso!) > new Date(d.boardingAtIso!), "boarding and arrival are ISO times, arrival after boarding")
    assert(new Date(d.boardingAtIso!).getTime() >= new Date("2026-11-16T08:30:00").getTime(), "the bus is not before the departure time")
  }
  assert(routes.every((r) => r.departureAt === new Date("2026-11-16T08:30:00").toISOString()), "every route knows when the journey starts")

  console.log("   ✅ bus data\n")

  console.log("4️⃣ Metro legs carry stop points and where the line changes...")
  setMultimodalRoadLegProviderForTesting(noSteps)
  try {
    // Silk Board (Yellow line) -> Majestic: changes from the Yellow Line to the Green Line at RV Road, then Green to Purple at Majestic.
    const trip = await multimodalService.generateRoutes({
      origin: { name: "Start", ...near("yl-02") }, destination: { name: "End", ...near("pl-12") }, profile: "standard", departureTime: "2026-11-16T14:30",
    })
    const metros = trip.flatMap((r) => r.segments).filter((s) => s.mode === "metro")
    assert(metros.length > 0, "a metro leg exists")
    const multi = metros.find((s) => (s.transitDetails?.lineChanges?.length ?? 0) > 0)
    assert(Boolean(multi), "a metro journey across lines lists where it changes")
    if (multi) {
      const d = multi.transitDetails!
      assert(d.stopPoints!.length === d.stops.length, "stop points match the stops")
      assert(d.lineChanges!.every((c) => d.stops.includes(c.station) && c.toLine.length > 0), "each change is at one of the journey's stations, to a named line")
      assert(d.lineChanges!.some((c) => c.station === "RV Road Metro" && /Green/.test(c.toLine)), "the change at RV Road is to the Green Line")
    }
    const single = metros.find((s) => (s.transitDetails?.lineChanges?.length ?? 0) === 0)
    if (single) assert(single.transitDetails!.lineChanges!.length === 0, "a single-line journey has no changes")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }
  console.log("   ✅ metro data\n")

  console.log("5️⃣ Without a departure time nothing about timing is invented...")
  setMultimodalRoadLegProviderForTesting(noSteps)
  try {
    const undated = await multimodalService.generateRoutes({ origin: { name: "Start", ...near("b-21") }, destination: { name: "End", ...near("b-20") }, profile: "standard" })
    assert(undated.every((r) => r.departureAt === undefined), "no departureAt")
    assert(undated.flatMap((r) => r.segments).every((s) => s.transitDetails?.boardingAtIso === undefined), "no boarding times")
    assert(undated.flatMap((r) => r.segments).filter((s) => s.mode === "bus").every((s) => (s.transitDetails?.stopPoints?.length ?? 0) > 1), "stop points are still there (they do not depend on a time)")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }
  assert(BUS_STOPS.length > 0, "(sanity) data loaded")
  console.log("   ✅ honest\n")

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) console.log(`🎉 ALL ${passed} NAVIGATION DATA TESTS PASSED!`)
  else console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => { console.error("❌ Navigation data test failure:", err); process.exit(1) })
