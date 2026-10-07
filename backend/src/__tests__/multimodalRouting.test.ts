import assert from "assert/strict"
import {
  multimodalService,
  setMultimodalRoadLegProviderForTesting,
  type RoadLegProvider,
} from "../services/multimodalService"
import type { MultimodalRoute, RouteSegment } from "../types/multimodal"

const offlineProvider: RoadLegProvider = {
  async getRoute() {
    throw new Error("offline test provider")
  },
}

const osrmLikeProvider: RoadLegProvider = {
  async getRoute(request) {
    const distance = request.mode === "driving" ? 777 : 333
    const duration = request.mode === "driving" ? 111 : 222
    return [
      {
        id: `stub-${request.mode}`,
        distanceMeters: distance,
        durationSeconds: duration,
        geometry: {
          type: "LineString",
          coordinates: [
            [request.origin.longitude, request.origin.latitude],
            [request.destination.longitude, request.destination.latitude],
          ],
        },
        legs: [{ distanceMeters: distance, durationSeconds: duration, steps: [] }],
        provider: "osrm",
        mode: request.mode,
      },
    ]
  },
}

// Phase 5 — migrated from the original Mumbai seed (Borivali/Goregaon bus
// stops) to Bengaluru. Kempegowda Bus Station <-> Shivajinagar Bus Stand is
// connected by exactly one bus route (R1) end-to-end AND both endpoints are
// within walking distance of Purple Line metro stations, so — like the
// original Borivali/Goregaon pair — it generates all 4 candidate patterns.
// Verified by direct probe against the compiled dataset before writing
// these assertions (see PHASE_5_VERIFICATION.md).
const kempegowdaBusStation = { name: "Kempegowda Bus Station", latitude: 12.9770, longitude: 77.5705 }
const shivajinagarBusStand = { name: "Shivajinagar Bus Stand", latitude: 12.9868, longitude: 77.6047 }
const hebbalBusStop = { name: "Hebbal Bus Stop", latitude: 13.0355, longitude: 77.5971 }
// Madavara (Green Line's northern end) <-> Whitefield (Purple Line's eastern
// end): no single line connects them, so this exercises the Phase 5
// generalized stationsOnPath() interchange (via Majestic, Green<->Purple).
const madavara = { name: "Madavara Metro", latitude: 13.0505, longitude: 77.4908 }
const whitefieldMetro = { name: "Whitefield Metro", latitude: 12.9698, longitude: 77.7500 }
const farEast = { name: "Far East", latitude: 12.9758, longitude: 77.7560 }
const outsideA = { name: "Outside A", latitude: 18.0, longitude: 72.0 }
const outsideB = { name: "Outside B", latitude: 18.1, longitude: 72.1 }

function modes(route: MultimodalRoute): string {
  return route.segments.map((segment) => segment.mode).join(">")
}

function findByModes(routes: MultimodalRoute[], pattern: string): MultimodalRoute {
  const match = routes.find((route) => modes(route) === pattern)
  assert.ok(match, `Expected route pattern ${pattern}`)
  return match
}

function assertGeoJson(segment: RouteSegment) {
  assert.equal(segment.geometry.type, "LineString")
  assert.ok(segment.geometry.coordinates.length >= 2)
  for (const [lng, lat] of segment.geometry.coordinates) {
    assert.ok(Number.isFinite(lng), "longitude must be finite")
    assert.ok(Number.isFinite(lat), "latitude must be finite")
    assert.ok(lng >= -180 && lng <= 180, "GeoJSON coordinate[0] must be longitude")
    assert.ok(lat >= -90 && lat <= 90, "GeoJSON coordinate[1] must be latitude")
  }
}

function assertCandidateIntegrity(route: MultimodalRoute) {
  assert.ok(route.segments.length > 0, "route must contain segments")
  assert.ok(route.totalDistanceMeters >= 0)
  assert.ok(route.totalWalkingMeters >= 0)
  assert.ok(route.totalDurationSeconds >= 0)
  assert.ok(route.totalFare >= 0)
  assert.equal(route.isDemoData, true)

  for (const segment of route.segments) {
    assert.ok(["walking", "metro", "bus", "auto"].includes(segment.mode))
    assert.ok(Number.isFinite(segment.from.latitude))
    assert.ok(Number.isFinite(segment.from.longitude))
    assert.ok(Number.isFinite(segment.to.latitude))
    assert.ok(Number.isFinite(segment.to.longitude))
    assert.ok(segment.distanceMeters >= 0)
    assert.ok(segment.durationSeconds >= 0)
    assert.ok(segment.estimatedFare >= 0)
    assertGeoJson(segment)

    if (segment.mode === "metro" || segment.mode === "bus") {
      assert.ok(segment.transitDetails, `${segment.mode} segment requires transitDetails`)
      assert.ok(segment.transitDetails!.stops.length >= 2)
      assert.notEqual(segment.transitDetails!.lineName, "BMTC Bus")
    } else {
      assert.equal(segment.transitDetails, undefined)
    }
  }

  assert.equal(route.totalDistanceMeters, route.segments.reduce((sum, segment) => sum + segment.distanceMeters, 0))
  assert.equal(
    route.totalWalkingMeters,
    route.segments.filter((segment) => segment.mode === "walking").reduce((sum, segment) => sum + segment.distanceMeters, 0),
  )
  assert.equal(route.totalFare, route.segments.reduce((sum, segment) => sum + segment.estimatedFare, 0))
  assert.equal(route.totalDurationSeconds, route.segments.reduce((sum, segment) => sum + segment.durationSeconds, 0))
}

function assertLabels(routes: MultimodalRoute[]) {
  const fastest = routes.find((route) => route.label === "FASTEST")
  const cheapest = routes.find((route) => route.label === "CHEAPEST")
  const minWalking = routes.find((route) => route.label === "MIN_WALKING")

  if (routes.length > 1) {
    assert.ok(fastest)
    assert.equal(fastest!.totalDurationSeconds, Math.min(...routes.map((route) => route.totalDurationSeconds)))
  }
  if (cheapest) {
    assert.equal(cheapest.totalFare, Math.min(...routes.map((route) => route.totalFare)))
  }
  if (minWalking) {
    assert.equal(minWalking.totalWalkingMeters, Math.min(...routes.map((route) => route.totalWalkingMeters)))
  }
}

function signatures(routes: MultimodalRoute[]) {
  return routes.map((route) =>
    route.segments.map((segment) => (
      `${segment.mode}:${segment.from.name}>${segment.to.name}:${segment.transitDetails?.lineName ?? ""}:${segment.transitDetails?.stops.join(">") ?? ""}`
    )).join("|"),
  )
}

async function run() {
  console.log("🧪 Running Phase 3/5 Multimodal Routing Hardening Tests...")

  setMultimodalRoadLegProviderForTesting(offlineProvider)
  try {
    const routes = await multimodalService.generateRoutes({ origin: kempegowdaBusStation, destination: shivajinagarBusStand })
    assert.equal(routes.length, 4, "Kempegowda Bus Station -> Shivajinagar Bus Stand should preserve four supported candidate patterns")

    // Phase 4 fix (B12) — both endpoints are, in the demo dataset, the EXACT
    // coordinates of bus stops b-03/b-01, so the walk-bus-walk pattern's
    // access/egress walks are both 0m and are correctly omitted (see
    // omitNegligibleWalks() in multimodalService.ts) instead of surfacing a
    // degenerate "Walk 0 m to X" instruction. Same reasoning for the
    // walk-bus-metro-walk pattern's leading walk.
    findByModes(routes, "walking>metro>walking")
    findByModes(routes, "bus")
    findByModes(routes, "walking>metro>auto")
    findByModes(routes, "bus>walking>metro>walking")

    routes.forEach(assertCandidateIntegrity)
    assertLabels(routes)
    assert.equal(new Set(signatures(routes)).size, routes.length, "duplicate candidates must be removed")

    const directBus = findByModes(routes, "bus").segments.find((segment) => segment.mode === "bus")!
    assert.equal(directBus.transitDetails?.lineName, "1 — Kempegowda Bus Station ↔ Shivajinagar (via MG Road)")
    assert.deepEqual(directBus.transitDetails?.stops, [
      "Kempegowda Bus Station",
      "Cubbon Park Bus Stop",
      "Shivajinagar Bus Stand",
    ])

    const metro = findByModes(routes, "walking>metro>walking").segments.find((segment) => segment.mode === "metro")!
    assert.equal(metro.transitDetails?.lineName, "Purple Line")
    assert.ok(metro.transitDetails?.stops.includes("Cubbon Park Metro"))

    const unrelatedBusRoutes = await multimodalService.generateRoutes({ origin: kempegowdaBusStation, destination: hebbalBusStop })
    assert.ok(
      !unrelatedBusRoutes.some((route) => modes(route) === "bus"),
      "unrelated bus stops must not create a direct generic bus route",
    )
    unrelatedBusRoutes.forEach((route) => {
      route.segments
        .filter((segment) => segment.mode === "bus")
        .forEach((segment) => assert.notEqual(segment.transitDetails?.lineName, "BMTC Bus"))
    })

    // Phase 5 — exercises the generalized stationsOnPath() interchange
    // (Madavara is Green-Line-only, Whitefield is Purple-Line-only; no
    // single line connects them, so this must route through the real
    // Green<->Purple interchange at Majestic).
    const interchangeRoutes = await multimodalService.generateRoutes({ origin: madavara, destination: whitefieldMetro })
    const interchangeMetro = interchangeRoutes
      .flatMap((route) => route.segments)
      .find((segment) => segment.mode === "metro" && segment.transitDetails?.stops.includes("Majestic Metro"))
    assert.ok(interchangeMetro, "metro interchange path should be generated")
    assert.equal(interchangeMetro!.transitDetails?.lineName, "Green Line + Purple Line")

    const outside = await multimodalService.generateRoutes({ origin: outsideA, destination: outsideB })
    assert.deepEqual(outside, [], "outside demo network should return no routes")

    const same = await multimodalService.generateRoutes({ origin: kempegowdaBusStation, destination: kempegowdaBusStation })
    assert.deepEqual(same, [], "same origin/destination should return no routes")

    const autoRoutes = await multimodalService.generateRoutes({ origin: kempegowdaBusStation, destination: farEast })
    findByModes(autoRoutes, "walking>metro>auto")
    autoRoutes.forEach(assertCandidateIntegrity)

    setMultimodalRoadLegProviderForTesting(osrmLikeProvider)
    const osrmRoutes = await multimodalService.generateRoutes({ origin: kempegowdaBusStation, destination: farEast })
    const osrmAuto = findByModes(osrmRoutes, "walking>metro>auto").segments.find((segment) => segment.mode === "auto")!
    assert.equal(osrmAuto.distanceMeters, 777, "auto road leg should use OSRM-derived driving metrics when available")
    assert.equal(osrmAuto.durationSeconds, 111)

    const osrmWalk = osrmRoutes[0].segments.find((segment) => segment.mode === "walking")!
    assert.equal(osrmWalk.distanceMeters, 333, "walking road leg should use provider metrics when available")
    assert.equal(osrmWalk.durationSeconds, 222)

    setMultimodalRoadLegProviderForTesting({
      async getRoute() {
        return []
      },
    })
    const noRouteFallback = await multimodalService.generateRoutes({ origin: kempegowdaBusStation, destination: shivajinagarBusStand })
    assert.ok(noRouteFallback.length > 0, "OSRM NoRoute/empty provider result should fall back to deterministic estimates")
    noRouteFallback.forEach(assertCandidateIntegrity)

    setMultimodalRoadLegProviderForTesting({
      async getRoute() {
        const err = new Error("timeout")
        ;(err as Error & { code?: string }).code = "ECONNABORTED"
        throw err
      },
    })
    const timeoutFallback = await multimodalService.generateRoutes({ origin: kempegowdaBusStation, destination: shivajinagarBusStand })
    assert.ok(timeoutFallback.length > 0, "OSRM timeout should fall back to deterministic estimates")
    timeoutFallback.forEach(assertCandidateIntegrity)
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }

  console.log("🎉 ALL PHASE 3/5 MULTIMODAL ROUTING HARDENING TESTS PASSED!")
}

run().catch((err) => {
  setMultimodalRoadLegProviderForTesting(null)
  console.error(err)
  process.exit(1)
})
