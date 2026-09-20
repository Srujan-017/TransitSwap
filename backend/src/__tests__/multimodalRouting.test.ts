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

const borivali = { name: "Borivali", latitude: 19.2285, longitude: 72.8537 }
const goregaon = { name: "Goregaon", latitude: 19.1624, longitude: 72.8516 }
const ghatkopar = { name: "Ghatkopar", latitude: 19.0863, longitude: 72.9063 }
const dahisar = { name: "Dahisar", latitude: 19.2355, longitude: 72.8597 }
const farEast = { name: "Far East", latitude: 19.0863, longitude: 72.93 }
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
      assert.notEqual(segment.transitDetails!.lineName, "BEST Bus")
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
  console.log("🧪 Running Phase 3 Multimodal Routing Hardening Tests...")

  setMultimodalRoadLegProviderForTesting(offlineProvider)
  try {
    const routes = await multimodalService.generateRoutes({ origin: borivali, destination: goregaon })
    assert.equal(routes.length, 4, "Borivali -> Goregaon should preserve four supported candidate patterns")

    findByModes(routes, "walking>metro>walking")
    findByModes(routes, "walking>bus>walking")
    findByModes(routes, "walking>metro>auto")
    findByModes(routes, "walking>bus>walking>metro>walking")

    routes.forEach(assertCandidateIntegrity)
    assertLabels(routes)
    assert.equal(new Set(signatures(routes)).size, routes.length, "duplicate candidates must be removed")

    const directBus = findByModes(routes, "walking>bus>walking").segments.find((segment) => segment.mode === "bus")!
    assert.equal(directBus.transitDetails?.lineName, "455 — Borivali ↔ Goregaon")
    assert.deepEqual(directBus.transitDetails?.stops, [
      "Borivali Station",
      "Kandivali Station",
      "Malad Station",
      "Goregaon Station",
    ])

    const metro = findByModes(routes, "walking>metro>walking").segments.find((segment) => segment.mode === "metro")!
    assert.equal(metro.transitDetails?.lineName, "Line 2A")
    assert.ok(metro.transitDetails?.stops.includes("Kandivali East Metro"))

    const unrelatedBusRoutes = await multimodalService.generateRoutes({ origin: borivali, destination: ghatkopar })
    assert.ok(
      !unrelatedBusRoutes.some((route) => modes(route) === "walking>bus>walking"),
      "unrelated bus stops must not create a direct generic bus route",
    )
    unrelatedBusRoutes.forEach((route) => {
      route.segments
        .filter((segment) => segment.mode === "bus")
        .forEach((segment) => assert.notEqual(segment.transitDetails?.lineName, "BEST Bus"))
    })

    const interchangeRoutes = await multimodalService.generateRoutes({ origin: dahisar, destination: ghatkopar })
    const interchangeMetro = interchangeRoutes
      .flatMap((route) => route.segments)
      .find((segment) => segment.mode === "metro" && segment.transitDetails?.stops.includes("D.N. Nagar Metro"))
    assert.ok(interchangeMetro, "metro interchange path should be generated")
    assert.equal(interchangeMetro!.transitDetails?.lineName, "Line 2A + Line 1")

    const outside = await multimodalService.generateRoutes({ origin: outsideA, destination: outsideB })
    assert.deepEqual(outside, [], "outside demo network should return no routes")

    const same = await multimodalService.generateRoutes({ origin: borivali, destination: borivali })
    assert.deepEqual(same, [], "same origin/destination should return no routes")

    const autoRoutes = await multimodalService.generateRoutes({ origin: borivali, destination: farEast })
    findByModes(autoRoutes, "walking>metro>auto")
    autoRoutes.forEach(assertCandidateIntegrity)

    setMultimodalRoadLegProviderForTesting(osrmLikeProvider)
    const osrmRoutes = await multimodalService.generateRoutes({ origin: borivali, destination: farEast })
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
    const noRouteFallback = await multimodalService.generateRoutes({ origin: borivali, destination: goregaon })
    assert.ok(noRouteFallback.length > 0, "OSRM NoRoute/empty provider result should fall back to deterministic estimates")
    noRouteFallback.forEach(assertCandidateIntegrity)

    setMultimodalRoadLegProviderForTesting({
      async getRoute() {
        const err = new Error("timeout")
        ;(err as Error & { code?: string }).code = "ECONNABORTED"
        throw err
      },
    })
    const timeoutFallback = await multimodalService.generateRoutes({ origin: borivali, destination: goregaon })
    assert.ok(timeoutFallback.length > 0, "OSRM timeout should fall back to deterministic estimates")
    timeoutFallback.forEach(assertCandidateIntegrity)
  } finally {
    setMultimodalRoadLegProviderForTesting(null)
  }

  console.log("🎉 ALL PHASE 3 MULTIMODAL ROUTING HARDENING TESTS PASSED!")
}

run().catch((err) => {
  setMultimodalRoadLegProviderForTesting(null)
  console.error(err)
  process.exit(1)
})
