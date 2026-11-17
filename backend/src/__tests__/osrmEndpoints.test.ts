import axios from "axios"
import { osrmBaseFor, routingService, OSRM_MAX_CONCURRENT, resetOsrmHealthForTesting } from "../services/routingService"
import { multimodalService, setMultimodalRoadLegProviderForTesting, setRoadBudgetForTesting } from "../services/multimodalService"
import { BUS_STOPS, getStop } from "../data/transitData"

/**
 * Walking legs were drawn as straight lines through buildings on the live site. Cause: the public OSRM demo server
 * (router.project-osrm.org) only carries the CAR network and answers a "foot" request with a driving route (1.5 km in 190 s,
 * 8 m/s). multimodalService rightly rejects a walking route that fast, and fell back to a straight line. The fix is to ask a
 * server that really routes on foot (the FOSSGIS community servers: routed-car, routed-foot, routed-bike). These tests pin
 * which server each mode asks, and that real walking geometry then reaches the route, with no network involved.
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

type Call = { url: string; userAgent?: string }
const calls: Call[] = []
const realGet = axios.get

/** Stands in for the OSRM servers: answers by URL, with a dog-leg road (east, then north) at the speed of that server's network. */
function installFakeOsrm(speedFor: (url: string) => number) {
  ;(axios as unknown as { get: unknown }).get = async (url: string, config?: { headers?: Record<string, string> }) => {
    calls.push({ url, userAgent: config?.headers?.["User-Agent"] })
    const m = url.match(/\/route\/v1\/\w+\/([-\d.]+),([-\d.]+);([-\d.]+),([-\d.]+)/)!
    const [oLng, oLat, dLng, dLat] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
    const d1 = haversine(oLat, oLng, oLat, dLng), d2 = haversine(oLat, dLng, dLat, dLng)
    const distance = d1 + d2
    const duration = distance / speedFor(url)
    return {
      data: {
        code: "Ok",
        routes: [{
          distance, duration,
          geometry: { type: "LineString", coordinates: [[oLng, oLat], [dLng, oLat], [dLng, dLat]] },
          legs: [{ distance, duration, steps: [{ distance, duration, name: "Test Road", maneuver: { type: "depart", location: [oLng, oLat] } }] }],
        }],
      },
    }
  }
}
function restoreAxios() {
  ;(axios as unknown as { get: unknown }).get = realGet
}

const near = (id: string, dLat = 0.0009, dLng = 0.0006) => {
  const s = getStop(id)!
  return { latitude: s.latitude + dLat, longitude: s.longitude + dLng }
}

async function run() {
  console.log("🧪 Running OSRM Endpoint Tests...\n")

  console.log("1️⃣ Each mode asks the OSRM server that carries its network...")
  assert(osrmBaseFor("walking", "") === "https://routing.openstreetmap.de/routed-foot", "walking → the foot server")
  assert(osrmBaseFor("cycling", "") === "https://routing.openstreetmap.de/routed-bike", "cycling → the bike server")
  assert(osrmBaseFor("driving", "") === "https://routing.openstreetmap.de/routed-car", "driving → the car server")
  assert(osrmBaseFor("walking", "http://router.project-osrm.org") === "https://routing.openstreetmap.de/routed-foot", "the public demo server (car only) is treated as not set")
  assert(osrmBaseFor("walking", "https://router.project-osrm.org/") === "https://routing.openstreetmap.de/routed-foot", "also with https and a trailing slash")
  assert(osrmBaseFor("walking", "https://osrm.example.org/") === "https://osrm.example.org", "a custom server is used as given, without the trailing slash")
  assert(osrmBaseFor("driving", "  ") === "https://routing.openstreetmap.de/routed-car", "blank means not set")
  console.log("   ✅ endpoints\n")

  console.log("2️⃣ The request goes to that server and identifies the client...")
  installFakeOsrm(() => 1.3)
  try {
    await routingService.getRoute({ origin: { latitude: 12.9767, longitude: 77.5713 }, destination: { latitude: 12.97, longitude: 77.58 }, mode: "walking" })
    await routingService.getRoute({ origin: { latitude: 12.9767, longitude: 77.5713 }, destination: { latitude: 12.97, longitude: 77.58 }, mode: "cycling" })
    await routingService.getRoute({ origin: { latitude: 12.9767, longitude: 77.5713 }, destination: { latitude: 12.97, longitude: 77.58 }, mode: "driving" })
  } finally {
    restoreAxios()
  }
  assert(calls[0].url.startsWith("https://routing.openstreetmap.de/routed-foot/route/v1/foot/"), `walking request URL (${calls[0].url})`)
  assert(calls[1].url.startsWith("https://routing.openstreetmap.de/routed-bike/route/v1/bike/"), "cycling request URL")
  assert(calls[2].url.startsWith("https://routing.openstreetmap.de/routed-car/route/v1/driving/"), "driving request URL")
  assert(calls.every((c) => /^TransitSwap\/1\.0/.test(c.userAgent ?? "")), "every request sends a User-Agent that names the project")
  console.log("   ✅ requests\n")

  console.log("3️⃣ Walking legs follow the real road, at walking speed...")
  calls.length = 0
  installFakeOsrm((url) => (url.includes("routed-foot") ? 1.3 : 8)) // the foot server walks, the car server drives
  setMultimodalRoadLegProviderForTesting(null) // use the real routingService (talking to the fake servers)
  try {
    const routes = await multimodalService.generateRoutes({
      origin: { name: "Start", ...near("b-21") }, destination: { name: "End", ...near("b-20") }, profile: "standard", departureTime: "2026-11-16T08:30",
    })
    const walks = routes.flatMap((r) => r.segments).filter((s) => s.mode === "walking" && s.distanceMeters > 30)
    assert(walks.length > 0, "the routes include walking legs")
    assert(walks.every((s) => s.geometry.coordinates.length >= 3), "every walking leg keeps the road's own geometry, not a 2-point straight line")
    assert(walks.every((s) => s.distanceMeters / s.durationSeconds <= 2.5), "and a walking speed")
    assert(calls.some((c) => c.url.includes("routed-foot")), "the foot server was asked")
    assert(calls.filter((c) => c.url.includes("routed-foot")).every((c) => c.url.includes("/route/v1/foot/")), "with the foot profile")
  } finally {
    restoreAxios()
    setMultimodalRoadLegProviderForTesting(null)
  }
  console.log("   ✅ real walking geometry\n")

  console.log("4️⃣ If a server answered a walking request at car speed (the old demo-server behaviour), the safeguard still holds...")
  installFakeOsrm(() => 8)
  try {
    const routes = await multimodalService.generateRoutes({
      origin: { name: "Start", ...near("b-21", 0.0011, 0.0004) }, destination: { name: "End", ...near("b-20", 0.0011, 0.0004) }, profile: "standard", departureTime: "2026-11-16T08:30",
    })
    const walks = routes.flatMap((r) => r.segments).filter((s) => s.mode === "walking" && s.distanceMeters > 30)
    assert(walks.length > 0, "the routes still include walking legs")
    assert(walks.every((s) => s.distanceMeters / s.durationSeconds <= 2.5), "a car-speed answer is never shown as a walking time")
  } finally {
    restoreAxios()
  }
  console.log("   ✅ safeguard\n")

  console.log("5️⃣ A busy server (429) is retried, not given up on...")
  let attempts = 0
  ;(axios as unknown as { get: unknown }).get = async (url: string) => {
    attempts++
    if (attempts < 3) {
      throw new axios.AxiosError("Too many requests", "ERR_BAD_RESPONSE", undefined, undefined, { status: 429, statusText: "Too Many Requests", headers: { "retry-after": "0" }, data: {}, config: {} } as never)
    }
    return { data: { code: "Ok", routes: [{ distance: 100, duration: 80, geometry: { type: "LineString", coordinates: [[77.5, 12.9], [77.501, 12.9]] }, legs: [{ distance: 100, duration: 80, steps: [] }] }] } }
  }
  try {
    const routes = await routingService.getRoute({ origin: { latitude: 12.9, longitude: 77.5 }, destination: { latitude: 12.9, longitude: 77.501 }, mode: "walking" })
    assert(routes.length === 1 && attempts === 3, `answered after two 429s (attempts: ${attempts})`)
    attempts = -100 // every attempt from now on fails
    let message = ""
    try {
      await routingService.getRoute({ origin: { latitude: 12.9, longitude: 77.5 }, destination: { latitude: 12.9, longitude: 77.501 }, mode: "walking" })
    } catch (e) { message = (e as Error).message }
    assert(/rate-limited/.test(message), "after the last attempt the honest 'rate-limited' error is still raised")
  } finally {
    restoreAxios()
  }
  console.log("   ✅ retry\n")

  console.log("6️⃣ Requests go out a few at a time, never all at once...")
  let inFlight = 0
  let peak = 0
  ;(axios as unknown as { get: unknown }).get = async () => {
    inFlight++
    peak = Math.max(peak, inFlight)
    await new Promise((r) => setTimeout(r, 15))
    inFlight--
    return { data: { code: "Ok", routes: [{ distance: 100, duration: 80, geometry: { type: "LineString", coordinates: [[77.5, 12.9], [77.501, 12.9]] }, legs: [{ distance: 100, duration: 80, steps: [] }] }] } }
  }
  try {
    const all = await Promise.all(Array.from({ length: 12 }, (_, i) => routingService.getRoute({ origin: { latitude: 12.9, longitude: 77.5 + i / 1000 }, destination: { latitude: 12.91, longitude: 77.5 }, mode: "walking" })))
    assert(all.length === 12 && all.every((r) => r.length === 1), "all twelve answered")
    assert(peak <= OSRM_MAX_CONCURRENT && peak >= 2, `at most ${OSRM_MAX_CONCURRENT} at once, and still in parallel (peak: ${peak})`)
  } finally {
    restoreAxios()
  }
  console.log("   ✅ pacing\n")

  console.log("7️⃣ A leg that starts where it ends does not ask the router at all...")
  let asked = 0
  let zeroLength = 0
  setMultimodalRoadLegProviderForTesting({
    async getRoute({ origin, destination }) {
      asked++
      if (haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) < 2) zeroLength++
      throw new Error("offline")
    },
  })
  try {
    await multimodalService.generateRoutes({
      origin: { name: "Start", latitude: 12.9172, longitude: 77.6232 }, destination: { name: "End", latitude: 12.9767, longitude: 77.5713 }, profile: "standard", departureTime: "2026-11-16T10:30",
    })
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }
  assert(asked > 0, "(sanity) the router is asked for real legs")
  assert(zeroLength === 0, `the router is never asked about a leg of zero length (asked ${zeroLength} times)`)
  console.log("   ✅ no wasted requests\n")

  console.log("8️⃣ If the walking server is down, the street geometry of the other server is used, with a walking time...")
  resetOsrmHealthForTesting()
  const downCalls: string[] = []
  ;(axios as unknown as { get: unknown }).get = async (url: string) => {
    downCalls.push(url)
    if (url.includes("routing.openstreetmap.de")) throw new axios.AxiosError("timeout of 6000ms exceeded", "ECONNABORTED")
    // the demo server: a car answer (190 s for 1.5 km) with real street geometry
    return {
      data: {
        code: "Ok",
        routes: [{
          distance: 1500, duration: 190,
          geometry: { type: "LineString", coordinates: [[77.57, 12.97], [77.575, 12.97], [77.575, 12.975], [77.58, 12.975]] },
          legs: [{ distance: 1500, duration: 190, steps: [{ distance: 1500, duration: 190, name: "Street", maneuver: { type: "depart", location: [77.57, 12.97] } }] }],
        }],
      },
    }
  }
  try {
    const routes = await routingService.getRoute({ origin: { latitude: 12.97, longitude: 77.57 }, destination: { latitude: 12.975, longitude: 77.58 }, mode: "walking" })
    assert(routes.length === 1, "an answer still arrives")
    assert(routes[0].geometry.coordinates.length === 4, "with the street shape, not a straight line")
    assert(routes[0].distanceMeters / routes[0].durationSeconds <= 1.3, `and a walking time (${routes[0].durationSeconds} s for ${routes[0].distanceMeters} m)`)
    assert(routes[0].legs[0].steps[0].durationSeconds > 190, "the steps are slowed to walking pace as well")
    assert(downCalls.length === 2 && downCalls[1].startsWith("https://router.project-osrm.org/route/v1/foot/"), "the demo server was the second choice")
    const before = downCalls.length
    await routingService.getRoute({ origin: { latitude: 12.98, longitude: 77.57 }, destination: { latitude: 12.975, longitude: 77.58 }, mode: "walking" })
    assert(downCalls.length === before + 1 && downCalls[downCalls.length - 1].includes("router.project-osrm.org"), "the server that failed is skipped for a while, so searches do not wait for it again")
    const drive = await routingService.getRoute({ origin: { latitude: 12.97, longitude: 77.57 }, destination: { latitude: 12.975, longitude: 77.58 }, mode: "driving" })
    assert(drive[0].durationSeconds === 190, "driving keeps the car server's own times (no walking-speed rescale)")
  } finally {
    restoreAxios()
  }
  console.log("   ✅ fallback\n")

  console.log("9️⃣ If every server is down, the error is honest and quick...")
  resetOsrmHealthForTesting()
  let allDownCalls = 0
  ;(axios as unknown as { get: unknown }).get = async () => {
    allDownCalls++
    throw new axios.AxiosError("timeout of 6000ms exceeded", "ECONNABORTED")
  }
  try {
    let message = ""
    try { await routingService.getRoute({ origin: { latitude: 12.97, longitude: 77.57 }, destination: { latitude: 12.975, longitude: 77.58 }, mode: "walking" }) } catch (e) { message = (e as Error).message }
    assert(/timed out/.test(message), `the caller learns it timed out ("${message}")`)
    const before = allDownCalls
    let again = ""
    try { await routingService.getRoute({ origin: { latitude: 12.97, longitude: 77.57 }, destination: { latitude: 12.975, longitude: 77.58 }, mode: "walking" }) } catch (e) { again = (e as Error).message }
    assert(allDownCalls === before && /unavailable/.test(again), "and the next request fails at once, without waiting for the servers again")
    // multimodal search: no waiting, straight-line legs (the documented last resort), still a result
    setMultimodalRoadLegProviderForTesting(null)
    const t0 = Date.now()
    const found = await multimodalService.generateRoutes({
      origin: { name: "Start", ...near("b-21") }, destination: { name: "End", ...near("b-20") }, profile: "standard", departureTime: "2026-11-16T08:30",
    })
    assert(found.length > 0 && Date.now() - t0 < 3000, `a journey search still answers quickly with every road server down (${Date.now() - t0} ms)`)
  } finally {
    restoreAxios()
    resetOsrmHealthForTesting()
  }
  console.log("   ✅ all down\n")

  console.log("🔟 A search never waits longer than its road budget, however slow the router is...")
  setRoadBudgetForTesting(400)
  setMultimodalRoadLegProviderForTesting({ getRoute: () => new Promise(() => {}) }) // a router that never answers
  try {
    const t0 = Date.now()
    const found = await multimodalService.generateRoutes({
      origin: { name: "Start", ...near("b-21") }, destination: { name: "End", ...near("b-20") }, profile: "standard", departureTime: "2026-11-16T08:30",
    })
    const took = Date.now() - t0
    assert(found.length > 0, "the search still returns routes (with straight-line legs)")
    assert(took < 4000, `and returns within a few seconds instead of waiting for the router (took ${took} ms)`)
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
    setRoadBudgetForTesting(null)
  }
  console.log("   ✅ budget\n")

  assert(BUS_STOPS.length > 0, "(sanity) data loaded")

  console.log("═══════════════════════════════════════════════════════")
  if (failed === 0) console.log(`🎉 ALL ${passed} OSRM ENDPOINT TESTS PASSED!`)
  else console.log(`⚠️  ${passed} PASSED, ${failed} FAILED`)
  console.log("═══════════════════════════════════════════════════════\n")
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => { console.error("❌ OSRM endpoint test failure:", err); process.exit(1) })
