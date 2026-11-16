import { BUS_ROUTES, BUS_STOPS, METRO_STATIONS, getStop } from "../data/transitData"
import { DEMO_ACCESSIBILITY_DATA } from "../data/accessibilityData"
import { DEMO_CROWD_DATA, busRouteCrowdLevel } from "../data/crowdData"
import {
  headwayAt, nextBuses, minutesFromFirstStop, peakHeadway, offPeakHeadway, serviceWindow, routeByNumber,
} from "../services/busTimetable"
import { setMultimodalRoadLegProviderForTesting, multimodalService, type RoadLegProvider } from "../services/multimodalService"
import type { NormalizedRoute } from "../types/routing"

/**
 * Feature-upgrade phase 4 — the larger bus network and its timetable.
 * Part A: the data is internally consistent (every stop reachable, every stop has accessibility and
 * crowd data, unique route numbers). Part B: the timetable behaves (first/last bus, peak headways,
 * next buses, arrival at the stop where the rider gets off). Part C: real route generation puts the
 * timetable on bus legs and drops buses that have stopped running.
 */

let passed = 0
let failed = 0
function assert(condition: boolean, msg: string): boolean {
  if (condition) { passed++; return true }
  failed++
  console.error(`   ❌ FAILED: ${msg}`)
  return false
}

// 16 Nov 2026 is a Monday; 14 Nov a Saturday.
const weekday = (h: number, m = 0) => new Date(2026, 10, 16, h, m)
const weekend = (h: number, m = 0) => new Date(2026, 10, 14, h, m)
const clock = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

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

async function run() {
  console.log("🧪 Running Bus Network Tests...\n")

  console.log("1️⃣ The network is bigger and consistent...")
  assert(BUS_STOPS.length >= 45, `at least 45 bus stops (got ${BUS_STOPS.length})`)
  assert(BUS_ROUTES.length >= 18, `at least 18 bus routes (got ${BUS_ROUTES.length})`)
  assert(new Set(BUS_STOPS.map((s) => s.id)).size === BUS_STOPS.length, "stop ids are unique")
  assert(new Set(BUS_STOPS.map((s) => s.name)).size === BUS_STOPS.length, "stop names are unique (routes are matched by name)")
  assert(new Set(BUS_ROUTES.map((r) => r.id)).size === BUS_ROUTES.length, "route ids are unique")
  assert(new Set(BUS_ROUTES.map((r) => r.number)).size === BUS_ROUTES.length, "route numbers are unique")
  assert(BUS_ROUTES.every((r) => /^[A-Z]{0,4}-?\d{1,3}[A-Z]?$/.test(r.number)), "route numbers look like BMTC numbers (e.g. 500D, 335E, G-9, KIA-5)")
  assert(BUS_ROUTES.every((r) => r.stops.length >= 2 && r.stops.every((id) => getStop(id))), "every route has at least 2 stops and every stop exists")
  assert(BUS_ROUTES.every((r) => new Set(r.stops).size === r.stops.length), "no route visits a stop twice")
  assert(BUS_STOPS.every((s) => s.routes.length >= 1), "every stop is served by at least one route")
  assert(BUS_STOPS.every((s) => s.routes.every((id) => BUS_ROUTES.find((r) => r.id === id)?.stops.includes(s.id))), "each stop's route list matches the routes")
  for (const r of BUS_ROUTES) {
    for (let i = 0; i < r.stops.length - 1; i++) {
      const a = getStop(r.stops[i])!, b = getStop(r.stops[i + 1])!
      assert(haversine(a.latitude, a.longitude, b.latitude, b.longitude) < 13000, `${r.number}: ${a.name} -> ${b.name} is under 13 km`)
    }
  }
  const named = (n: string) => BUS_ROUTES.some((r) => r.number === n)
  assert(["500D", "335E", "356", "KIA-5"].every(named), "the example numbers 500D, 335E, 356 and KIA-5 exist")
  assert(BUS_STOPS.every((s) => DEMO_ACCESSIBILITY_DATA.some((a) => a.stationId === s.id)), "every bus stop has an accessibility record")
  assert(DEMO_ACCESSIBILITY_DATA.length === METRO_STATIONS.length + BUS_STOPS.length, "one accessibility record per station and stop")
  assert(BUS_STOPS.every((s) => DEMO_CROWD_DATA.filter((c) => c.stationId === s.id).length === 48), "every bus stop has 48 crowd readings (2 day types x 24 h)")
  assert(BUS_ROUTES.every((r) => busRouteCrowdLevel(r.id, "weekday", 8) !== undefined), "every route has a modelled crowd")
  // The network reaches the airport, the ring road and the south.
  assert(BUS_STOPS.some((s) => s.name.includes("Airport")) && BUS_STOPS.some((s) => s.name === "Electronic City Bus Stop") && BUS_STOPS.some((s) => s.name === "Kadugodi Bus Stand"), "airport, Electronic City and Kadugodi are connected")
  console.log("   ✅ network\n")

  console.log("2️⃣ Headways and service hours...")
  const r500d = routeByNumber("500D")!
  assert(peakHeadway(r500d) < offPeakHeadway(r500d), "500D runs more often in the peak than off-peak")
  assert(headwayAt(r500d, weekday(8, 30)) === peakHeadway(r500d), "weekday 08:30 is peak")
  assert(headwayAt(r500d, weekday(18, 0)) === peakHeadway(r500d), "weekday 18:00 is peak")
  assert(headwayAt(r500d, weekday(13, 0)) === offPeakHeadway(r500d), "weekday 13:00 is off-peak")
  assert(headwayAt(r500d, weekend(8, 30)) === offPeakHeadway(r500d), "Saturday 08:30 is off-peak (no weekend peak)")
  assert(BUS_ROUTES.every((r) => peakHeadway(r) <= offPeakHeadway(r)), "the peak headway is never longer than the off-peak headway")
  const kia = routeByNumber("KIA-5")!
  assert(serviceWindow(kia).first === "04:30" && serviceWindow(kia).last === "23:30", "the airport bus has early and late service")
  assert(serviceWindow(r500d).first === "05:30" && serviceWindow(r500d).last === "22:30", "other routes default to 05:30-22:30")
  console.log("   ✅ headways\n")

  console.log("3️⃣ nextBuses: the next three buses and when they arrive...")
  const r356 = routeByNumber("356")!
  const from = r356.stops[0], to = r356.stops[r356.stops.length - 1]
  const three = nextBuses(r356.id, from, to, weekday(8, 30), 3)
  assert(three.length === 3, "three buses are returned")
  assert(three.every((b) => b.board.getTime() >= weekday(8, 30).getTime()), "none leaves before the rider is there")
  assert(three.every((b) => b.arrive.getTime() > b.board.getTime()), "each arrives after it boards")
  assert(three[0].board < three[1].board && three[1].board < three[2].board, "in order")
  const gaps = [three[1].board.getTime() - three[0].board.getTime(), three[2].board.getTime() - three[1].board.getTime()].map((ms) => ms / 60000)
  assert(gaps.every((g) => g === peakHeadway(r356)), `consecutive buses are one peak headway apart (${gaps.join(", ")} min vs ${peakHeadway(r356)})`)
  const rideMin = (three[0].arrive.getTime() - three[0].board.getTime()) / 60000
  assert(Math.abs(rideMin - minutesFromFirstStop(r356, r356.stops.length - 1)) < 0.01, `end-to-end ride time matches the stop timings (${rideMin.toFixed(1)} min)`)
  assert(rideMin > 30 && rideMin < 120, `Majestic to Electronic City takes a plausible ${rideMin.toFixed(0)} min`)
  const off = nextBuses(r356.id, from, to, weekday(13, 0), 3)
  assert((off[1].board.getTime() - off[0].board.getTime()) / 60000 === offPeakHeadway(r356), "off-peak buses are one off-peak headway apart")
  // reverse direction: leaves from the other end, rides the same time
  const back = nextBuses(r356.id, to, from, weekday(8, 30), 1)
  assert(back.length === 1 && Math.abs((back[0].arrive.getTime() - back[0].board.getTime()) / 60000 - rideMin) < 0.01, "the return trip takes the same time")
  // a mid-route boarding: the bus passes it later than the terminus departure
  const mid = r356.stops[3]
  const midBus = nextBuses(r356.id, mid, to, weekday(8, 30), 1)[0]
  assert(midBus.arrive.getTime() === nextBuses(r356.id, mid, to, midBus.board, 1)[0].arrive.getTime(), "asking again from the boarding time gives the same bus")
  assert(midBus.arrive.getTime() - midBus.board.getTime() < three[0].arrive.getTime() - three[0].board.getTime(), "a shorter ride from a mid-route stop takes less time")
  console.log("   ✅ next buses\n")

  console.log("4️⃣ Before the first bus and after the last bus...")
  const early = nextBuses(r356.id, from, to, weekday(3, 0), 1)
  assert(clock(early[0].board) === "05:30", `at 03:00 the next bus is the first one, 05:30 (got ${clock(early[0].board)})`)
  assert(nextBuses(r356.id, from, to, weekday(23, 0), 3).length === 0, "after the last bus (22:30 from the first stop) there are none")
  const lastBoard = nextBuses(r356.id, from, to, weekday(22, 20), 3)
  assert(lastBoard.length >= 1 && lastBoard.every((b) => clock(b.board) <= "22:30"), "the last bus leaves the first stop at 22:30 or before")
  assert(nextBuses(kia.id, kia.stops[0], kia.stops[kia.stops.length - 1], weekday(23, 0), 1).length === 1, "the airport bus still runs at 23:00")
  assert(nextBuses("nope", from, to, weekday(8, 0)).length === 0, "unknown route -> none")
  assert(nextBuses(r356.id, from, "b-01", weekday(8, 0)).length === 0, "a stop not on the route -> none")
  assert(nextBuses(r356.id, from, from, weekday(8, 0)).length === 0, "same stop -> none")
  console.log("   ✅ service hours\n")

  console.log("5️⃣ Route generation puts the timetable on bus legs...")
  setMultimodalRoadLegProviderForTesting(offline)
  try {
    const kbs = getStop("b-03")!, ec = getStop("b-20")!
    const routes = await multimodalService.generateRoutes({
      origin: { name: "Origin", latitude: kbs.latitude + 0.0008, longitude: kbs.longitude },
      destination: { name: "Destination", latitude: ec.latitude + 0.0008, longitude: ec.longitude },
      profile: "standard",
      departureTime: "2026-11-16T08:30",
    })
    const withBus = routes.filter((r) => r.segments.some((s) => s.mode === "bus"))
    assert(withBus.length >= 1, "a trip along the Hosur Road corridor is offered a bus")
    for (const route of withBus) {
      for (const seg of route.segments.filter((s) => s.mode === "bus")) {
        const d = seg.transitDetails!
        assert(Boolean(d.routeId) && Boolean(d.routeNumber) && Boolean(d.towards), "a bus leg carries its route id, number and direction")
        assert(Boolean(d.estimatedBoardingTime) && Boolean(d.estimatedArrivalTime) && (d.upcomingBoardingTimes?.length ?? 0) === 2, "boarding time, two further buses and the arrival time are set")
        assert(d.headwayMinutes === peakHeadway(BUS_ROUTES.find((r) => r.id === d.routeId)!), "08:30 uses the peak headway")
        assert(d.stopCount >= 1 && d.stops.length === d.stopCount + 1, "get-off stop count matches the stop list")
      }
    }
    const best = withBus[0].segments.find((s) => s.mode === "bus")!.transitDetails!
    assert(best.estimatedBoardingTime !== best.estimatedArrivalTime, "arrival is after boarding")

    // Without a departure time nothing is invented.
    const undated = await multimodalService.generateRoutes({
      origin: { name: "Origin", latitude: kbs.latitude + 0.0008, longitude: kbs.longitude },
      destination: { name: "Destination", latitude: ec.latitude + 0.0008, longitude: ec.longitude },
      profile: "standard",
    })
    const undatedBus = undated.flatMap((r) => r.segments).find((s) => s.mode === "bus")
    assert(Boolean(undatedBus) && undatedBus!.transitDetails!.estimatedBoardingTime === undefined, "no departure time -> no boarding estimate (and buses are still offered)")

    // After the last bus no bus option is offered when a departure time is given.
    const lateNight = await multimodalService.generateRoutes({
      origin: { name: "Origin", latitude: kbs.latitude + 0.0008, longitude: kbs.longitude },
      destination: { name: "Destination", latitude: ec.latitude + 0.0008, longitude: ec.longitude },
      profile: "standard",
      departureTime: "2026-11-16T23:10",
    })
    assert(!lateNight.some((r) => r.segments.some((s) => s.mode === "bus" && s.transitDetails?.routeNumber !== "KIA-5")), "at 23:10 no ordinary bus route is offered (the last bus has gone)")
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }
  console.log("   ✅ generation\n")

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) console.log(`🎉 ALL ${passed} BUS NETWORK TESTS PASSED!`)
  else console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => { console.error("❌ Bus network test failure:", err); process.exit(1) })
