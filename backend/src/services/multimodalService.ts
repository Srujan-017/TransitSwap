import crypto from "crypto"
import {
  METRO_STATIONS,
  BUS_STOPS,
  BUS_ROUTES,
  METRO_LINES,
  FARE_CONFIG,
  getStation,
  getStop,
  stationsOnPath,
} from "../data/transitData"
import { routingService } from "./routingService"
import { accessibilityService } from "./accessibilityService"
import { createTtlCache } from "../utils/ttlCache"
import { parseLocalDateTime, formatClockTime } from "../utils/dateTime"
import type { NormalizedRoute, TransportMode } from "../types/routing"
import type {
  MultimodalRoute,
  MultimodalRequest,
  RouteSegment,
  RouteLabel,
  MultimodalMode,
  SegmentLocation,
} from "../types/multimodal"

// Phase 9 — these were previously bare module-level `const`s. Bundled into a
// single exported, mutable object so a sensitivity-sweep script (see
// scripts/sensitivity-sweep.ts) can perturb one at a time and re-run real
// route generation against it, then restore the original — a primitive
// `const` can't be reassigned from outside the module at all, and even an
// exported `let` wouldn't work here (this compiles to CommonJS, where an
// external assignment to an imported binding does not propagate back to the
// internal variable the module's own functions read). Mutating a shared
// object's properties works correctly under either module system, and the
// default values below are byte-identical to the former standalone consts,
// so this is a pure refactor with no behavior change for every existing caller.
export const ROUTING_CONSTANTS = {
  MAX_WALK_TO_METRO_M: 2000,
  MAX_WALK_TO_BUS_M: 1200,
  WALK_SPEED_MPS: 1.4,
  METRO_MIN_PER_STOP: 2.5,
  // Phase 5 — METRO_WAIT_SEC/BUS_WAIT_SEC (previously flat 300s/480s for every
  // train/bus regardless of line or route) were replaced by each line's/
  // route's own frequencyMinutes field (see metroSegment()/busSegment() below).
  BUS_SPEED_MPS: 6.0,
  AUTO_SPEED_MPS: 4.2,
  // Phase 9 — these 3 distance-inflation factors were previously inline
  // literals (1.15, 1.35, 1.25) at their one call site each. Named and moved
  // here so the sensitivity sweep can cover them too, per
  // PROJECT_MASTER_PLAN.md §13's "distance factors" entry.
  METRO_DISTANCE_FACTOR: 1.15,
  BUS_DISTANCE_FACTOR: 1.35,
  AUTO_DISTANCE_FACTOR: 1.25,
}

export type RoutingConstants = typeof ROUTING_CONSTANTS

const CONTINUITY_TOLERANCE_M = 50
const SAME_POINT_TOLERANCE_M = 25
// Phase 4 fix (B12) — a walking segment shorter than this is dropped from
// the final route entirely (see omitNegligibleWalks below), rather than
// surfacing degenerate instructions like "Walk 0 m to Majestic Metro" with a
// two-identical-coordinate geometry. Comfortably under CONTINUITY_TOLERANCE_M
// so dropping one never breaks validateCandidate()'s boundary/continuity
// checks — by construction, a walk below this threshold connects two points
// already within CONTINUITY_TOLERANCE_M of each other.
const MIN_WALK_SEGMENT_M = 20

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Phase 4 fix (B4) — excludeIds lets callers keep an admin-deactivated
// station out of route generation's nearest-station lookups. Defaults to an
// empty set so every existing caller (including getNearbyTransit, which is
// deliberately a pure function with no DB access) is unaffected.
function nearestMetro(lat: number, lng: number, maxM: number, excludeIds: ReadonlySet<string> = new Set()) {
  let best: (typeof METRO_STATIONS)[0] | null = null
  let bestDist = Infinity
  for (const s of METRO_STATIONS) {
    if (excludeIds.has(s.id)) continue
    const d = haversine(lat, lng, s.latitude, s.longitude)
    if (d < bestDist && d <= maxM) {
      best = s
      bestDist = d
    }
  }
  return best ? { station: best, distM: bestDist } : null
}

function nearestBusStop(lat: number, lng: number, maxM: number, excludeIds: ReadonlySet<string> = new Set()) {
  let best: (typeof BUS_STOPS)[0] | null = null
  let bestDist = Infinity
  for (const s of BUS_STOPS) {
    if (excludeIds.has(s.id)) continue
    const d = haversine(lat, lng, s.latitude, s.longitude)
    if (d < bestDist && d <= maxM) {
      best = s
      bestDist = d
    }
  }
  return best ? { stop: best, distM: bestDist } : null
}

function line(lat1: number, lng1: number, lat2: number, lng2: number): RouteSegment["geometry"] {
  return { type: "LineString", coordinates: [[lng1, lat1], [lng2, lat2]] }
}

// Bug fix — confirmed visually: metro/bus segments were drawn as a single
// straight chord between their endpoint coordinates (metroGeometry/
// busGeometry below), so a route could appear to cut diagonally through a
// lake or straight across city blocks instead of following any real
// infrastructure. Reusing the same OSRM-backed roadLeg() the walk/auto legs
// already use — "driving" is the closest available proxy for a rail/road
// corridor since OSRM carries no rail geometry — snaps the final, already-
// selected route's metro/bus segment onto real streets instead. This is
// purely cosmetic: distanceMeters/durationSeconds/estimatedFare for the
// segment are computed independently (see metroSegment()/busSegment()
// below) and are never touched here. Run ONLY on the small final candidate
// set (after Pareto filtering), never during the exploratory search, so it
// adds at most one extra OSRM call per metro/bus leg per returned route —
// not per candidate evaluated. On any OSRM failure it falls back to the
// existing straight-line geometry, exactly like every other roadLeg() use.
async function roadSnapTransitSegment(ctx: RoadContext, segment: RouteSegment): Promise<RouteSegment> {
  if (segment.mode !== "metro" && segment.mode !== "bus") return segment
  const leg = await roadLeg(ctx, "driving", segment.from.latitude, segment.from.longitude, segment.to.latitude, segment.to.longitude)
  if (!leg) return segment
  return { ...segment, geometry: leg.geometry }
}

async function roadSnapCandidateGeometry(ctx: RoadContext, segments: RouteSegment[]): Promise<RouteSegment[]> {
  return Promise.all(segments.map((segment) => roadSnapTransitSegment(ctx, segment)))
}

function metroGeometry(stationIds: string[]): RouteSegment["geometry"] {
  return {
    type: "LineString",
    coordinates: stationIds.map((id) => {
      const s = getStation(id)!
      return [s.longitude, s.latitude]
    }),
  }
}

function busGeometry(stopIds: string[]): RouteSegment["geometry"] {
  return {
    type: "LineString",
    coordinates: stopIds.map((id) => {
      const stop = getStop(id)!
      return [stop.longitude, stop.latitude]
    }),
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function validLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90
}

function validLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180
}

function isValidGeometry(geometry: RouteSegment["geometry"] | undefined): geometry is RouteSegment["geometry"] {
  return Boolean(
    geometry &&
      geometry.type === "LineString" &&
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.length >= 2 &&
      geometry.coordinates.every((coord) => (
        Array.isArray(coord) &&
        coord.length === 2 &&
        validLongitude(coord[0]) &&
        validLatitude(coord[1])
      )),
  )
}

interface RoadLegEstimate {
  distanceMeters: number
  durationSeconds: number
  geometry: RouteSegment["geometry"]
}

export interface RoadLegProvider {
  getRoute(request: {
    origin: { latitude: number; longitude: number }
    destination: { latitude: number; longitude: number }
    mode: TransportMode
  }): Promise<NormalizedRoute[]>
}

interface RoadContext {
  provider: RoadLegProvider
  cache: Map<string, Promise<RoadLegEstimate | null>>
  // Phase 4 fix (B4) — stationIds/stopIds an admin has deactivated, carried
  // through the whole candidate-generation call tree for this one request.
  excludeIds: ReadonlySet<string>
  // Phase 11 (P4) — whether this request may read/populate the cross-request
  // road-leg cache below. False only when a test has installed an override
  // provider (setMultimodalRoadLegProviderForTesting) — tests swap providers
  // mid-file to exercise different OSRM response scenarios for the SAME
  // coordinates, and a shared cache keyed only on mode+coordinates would
  // return a stale result from a previous provider instead of calling the
  // newly-installed one. The real server never sets an override, so
  // production traffic always benefits from the shared cache.
  sharedCacheEnabled: boolean
}

let roadLegProviderOverride: RoadLegProvider | null = null

export function setMultimodalRoadLegProviderForTesting(provider: RoadLegProvider | null): void {
  roadLegProviderOverride = provider
}

// Phase 11 (P4) — the per-request `cache` above was Map()'d fresh on every
// /routes/multimodal call, so the same walk/auto leg between two coordinates
// was refetched from OSRM on every single search (PROJECT_MASTER_PLAN.md §26
// P4 / §15 "Caching: per-request Map keyed on mode + 6-dp coordinates. Not
// shared across requests"). This module-level cache is shared across every
// request this server process handles. Bounded by TTL and size — see
// ttlCache.ts — and only ever populated with a genuine resolved OSRM result,
// never a failure/fallback, so a transient OSRM outage can't poison it.
const sharedRoadLegCache = createTtlCache<RoadLegEstimate>({ ttlMs: 10 * 60 * 1000, maxEntries: 2000 })

function createRoadContext(excludeIds: ReadonlySet<string> = new Set()): RoadContext {
  return {
    provider: roadLegProviderOverride ?? routingService,
    cache: new Map(),
    excludeIds,
    sharedCacheEnabled: roadLegProviderOverride === null,
  }
}

function fallbackRoadLeg(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  factor: number,
  speedMps: number,
): RoadLegEstimate {
  const distanceMeters = Math.round(haversine(fromLat, fromLng, toLat, toLng) * factor)
  return {
    distanceMeters,
    durationSeconds: Math.round(distanceMeters / speedMps),
    geometry: line(fromLat, fromLng, toLat, toLng),
  }
}

function hasPlausibleModeDuration(route: NormalizedRoute, mode: TransportMode): boolean {
  if (route.distanceMeters === 0) return true
  if (route.durationSeconds <= 0) return false
  const metersPerSecond = route.distanceMeters / route.durationSeconds
  if (mode === "walking") return metersPerSecond <= 2.5
  if (mode === "cycling") return metersPerSecond <= 12
  return true
}

function isUsableRoadRoute(route: NormalizedRoute | undefined, mode: TransportMode): route is NormalizedRoute {
  return Boolean(
    route &&
      isFiniteNumber(route.distanceMeters) &&
      route.distanceMeters >= 0 &&
      isFiniteNumber(route.durationSeconds) &&
      route.durationSeconds >= 0 &&
      isValidGeometry(route.geometry) &&
      hasPlausibleModeDuration(route, mode),
  )
}

async function roadLeg(
  ctx: RoadContext,
  mode: TransportMode,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RoadLegEstimate | null> {
  const key = `${mode}:${fromLat.toFixed(6)},${fromLng.toFixed(6)}>${toLat.toFixed(6)},${toLng.toFixed(6)}`
  const cached = ctx.cache.get(key)
  if (cached) return cached

  if (ctx.sharedCacheEnabled) {
    const shared = sharedRoadLegCache.get(key)
    if (shared) {
      const resolved = Promise.resolve(shared)
      ctx.cache.set(key, resolved)
      return resolved
    }
  }

  const request = (async () => {
    try {
      const routes = await ctx.provider.getRoute({
        origin: { latitude: fromLat, longitude: fromLng },
        destination: { latitude: toLat, longitude: toLng },
        mode,
      })
      const route = routes.find((candidate) => isUsableRoadRoute(candidate, mode))
      if (!route) return null
      const estimate: RoadLegEstimate = {
        distanceMeters: Math.round(route.distanceMeters),
        durationSeconds: Math.round(route.durationSeconds),
        geometry: route.geometry,
      }
      if (ctx.sharedCacheEnabled) sharedRoadLegCache.set(key, estimate)
      return estimate
    } catch {
      return null
    }
  })()

  ctx.cache.set(key, request)
  return request
}

async function bestEffortRoadLeg(
  ctx: RoadContext,
  mode: TransportMode,
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fallbackFactor: number,
  fallbackSpeedMps: number,
): Promise<RoadLegEstimate> {
  return (
    (await roadLeg(ctx, mode, fromLat, fromLng, toLat, toLng)) ??
    fallbackRoadLeg(fromLat, fromLng, toLat, toLng, fallbackFactor, fallbackSpeedMps)
  )
}

function metroLineForHop(fromId: string, toId: string) {
  return METRO_LINES.find((lineDef) => {
    const fromIndex = lineDef.stations.indexOf(fromId)
    const toIndex = lineDef.stations.indexOf(toId)
    return fromIndex !== -1 && toIndex !== -1 && Math.abs(fromIndex - toIndex) === 1
  })
}

function validateMetroPath(stationPath: string[]): boolean {
  if (stationPath.length < 2) return false
  if (!stationPath.every((id) => Boolean(getStation(id)))) return false
  for (let i = 0; i < stationPath.length - 1; i++) {
    if (!metroLineForHop(stationPath[i], stationPath[i + 1])) return false
  }
  return true
}

function shortLineName(lineName: string): string {
  return lineName.split("—")[0].trim()
}

function metroLineDetails(stationPath: string[]) {
  const linesUsed: typeof METRO_LINES = []
  for (let i = 0; i < stationPath.length - 1; i++) {
    const lineDef = metroLineForHop(stationPath[i], stationPath[i + 1])
    if (!lineDef) return null
    if (linesUsed[linesUsed.length - 1]?.id !== lineDef.id) linesUsed.push(lineDef)
  }
  if (linesUsed.length === 0) return null
  return {
    lineName: linesUsed.map((lineDef) => shortLineName(lineDef.name)).join(" + "),
    lineColor: linesUsed[0].color,
  }
}

function busPathDistance(stopIds: string[]): number {
  let distance = 0
  for (let i = 0; i < stopIds.length - 1; i++) {
    const from = getStop(stopIds[i])
    const to = getStop(stopIds[i + 1])
    if (!from || !to) return Infinity
    distance += haversine(from.latitude, from.longitude, to.latitude, to.longitude)
  }
  return Math.round(distance * ROUTING_CONSTANTS.BUS_DISTANCE_FACTOR)
}

function busStopPath(routeStops: string[], fromIndex: number, toIndex: number): string[] {
  return fromIndex <= toIndex
    ? routeStops.slice(fromIndex, toIndex + 1)
    : routeStops.slice(toIndex, fromIndex + 1).reverse()
}

function selectBusRoute(fromStop: (typeof BUS_STOPS)[0], toStop: (typeof BUS_STOPS)[0]) {
  const candidates = BUS_ROUTES.map((route) => {
    const originIndex = route.stops.indexOf(fromStop.id)
    const destinationIndex = route.stops.indexOf(toStop.id)
    if (originIndex === -1 || destinationIndex === -1 || originIndex === destinationIndex) return null
    const stopPath = busStopPath(route.stops, originIndex, destinationIndex)
    if (!stopPath.every((stopId) => Boolean(getStop(stopId)))) return null
    return {
      route,
      stopPath,
      stopCount: Math.abs(destinationIndex - originIndex),
      distanceMeters: busPathDistance(stopPath),
      // Which end of the route's own stop list this boarding direction heads
      // toward — real buses display their final terminus on the headboard,
      // not the rider's own alighting stop, so that's what we surface too.
      forward: originIndex <= destinationIndex,
    }
  }).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))

  candidates.sort((a, b) => (
    a.stopCount - b.stopCount ||
    a.distanceMeters - b.distanceMeters ||
    a.route.id.localeCompare(b.route.id)
  ))

  return candidates[0] ?? null
}

function stationByName(name: string) {
  const normalized = name.toLowerCase()
  return METRO_STATIONS.find((station) => station.name.toLowerCase() === normalized)
}

function stopByName(name: string) {
  const normalized = name.toLowerCase()
  return BUS_STOPS.find((stop) => stop.name.toLowerCase() === normalized)
}

async function walkSegment(
  ctx: RoadContext,
  fromName: string,
  fromLat: number,
  fromLng: number,
  toName: string,
  toLat: number,
  toLng: number,
): Promise<RouteSegment> {
  const leg = await bestEffortRoadLeg(ctx, "walking", fromLat, fromLng, toLat, toLng, 1, ROUTING_CONSTANTS.WALK_SPEED_MPS)
  const dist = leg.distanceMeters
  return {
    id: crypto.randomUUID(),
    mode: "walking",
    from: { name: fromName, latitude: fromLat, longitude: fromLng },
    to: { name: toName, latitude: toLat, longitude: toLng },
    distanceMeters: dist,
    durationSeconds: leg.durationSeconds,
    estimatedFare: FARE_CONFIG.walking,
    instruction: `Walk ${dist < 1000 ? dist + " m" : (dist / 1000).toFixed(1) + " km"} to ${toName}`,
    geometry: leg.geometry,
  }
}

function metroSegment(fromId: string, toId: string, stationPath: string[]): RouteSegment | null {
  const from = getStation(fromId)
  const to = getStation(toId)
  if (!from || !to || !validateMetroPath(stationPath)) return null

  const stopCount = stationPath.length - 1
  const distanceMeters = Math.round(
    stationPath.slice(0, -1).reduce((sum, stationId, index) => {
      const a = getStation(stationId)!
      const b = getStation(stationPath[index + 1])!
      return sum + haversine(a.latitude, a.longitude, b.latitude, b.longitude)
    }, 0) * ROUTING_CONSTANTS.METRO_DISTANCE_FACTOR,
  )
  // Phase 5 — boarding wait is the frequency of the line actually boarded
  // (the first hop's line), instead of the previous flat METRO_WAIT_SEC
  // constant. validateMetroPath() above already confirmed every hop in
  // stationPath resolves to a real line, so this lookup cannot be undefined.
  const boardingLine = metroLineForHop(stationPath[0], stationPath[1])!
  const waitSeconds = boardingLine.frequencyMinutes * 60
  const durationSeconds = Math.round(waitSeconds + stopCount * ROUTING_CONSTANTS.METRO_MIN_PER_STOP * 60)
  const fare = FARE_CONFIG.metro.basefare + stopCount * FARE_CONFIG.metro.perStation
  const lineDetails = metroLineDetails(stationPath)
  if (!lineDetails) return null

  const stopNames = stationPath.map((id) => getStation(id)?.name ?? id)

  return {
    id: crypto.randomUUID(),
    mode: "metro",
    from: { name: from.name, latitude: from.latitude, longitude: from.longitude },
    to: { name: to.name, latitude: to.latitude, longitude: to.longitude },
    distanceMeters,
    durationSeconds,
    estimatedFare: fare,
    instruction: `Take Metro from ${from.name} to ${to.name} (${stopCount} stop${stopCount === 1 ? "" : "s"})`,
    geometry: metroGeometry(stationPath),
    transitDetails: { ...lineDetails, stopCount, stops: stopNames, waitMinutes: Math.round(waitSeconds / 60) },
  }
}

function busSegment(fromStop: (typeof BUS_STOPS)[0], toStop: (typeof BUS_STOPS)[0]): RouteSegment | null {
  const selected = selectBusRoute(fromStop, toStop)
  if (!selected) return null

  const distanceMeters = selected.distanceMeters
  // Phase 5 — boarding wait is this specific route's own frequencyMinutes,
  // instead of the previous flat BUS_WAIT_SEC constant applied to every bus.
  const waitSeconds = selected.route.frequencyMinutes * 60
  const durationSeconds = Math.round(waitSeconds + distanceMeters / ROUTING_CONSTANTS.BUS_SPEED_MPS)
  const fare = Math.round(FARE_CONFIG.bus.basefare + (distanceMeters / 1000) * FARE_CONFIG.bus.perKm)
  const stopNames = selected.stopPath.map((id) => getStop(id)?.name ?? id)
  // The terminus a rider should look for on the bus's headboard — the real
  // end of the route in this boarding direction, not just their own stop
  // (the same physical stop serves both directions of a route).
  const terminusStopId = selected.forward
    ? selected.route.stops[selected.route.stops.length - 1]
    : selected.route.stops[0]
  const towards = getStop(terminusStopId)?.name

  return {
    id: crypto.randomUUID(),
    mode: "bus",
    from: { name: fromStop.name, latitude: fromStop.latitude, longitude: fromStop.longitude },
    to: { name: toStop.name, latitude: toStop.latitude, longitude: toStop.longitude },
    distanceMeters,
    durationSeconds,
    estimatedFare: fare,
    instruction: `Take ${selected.route.name} from ${fromStop.name} to ${toStop.name}`,
    geometry: busGeometry(selected.stopPath),
    transitDetails: {
      lineName: selected.route.name,
      lineColor: "#16a34a",
      stopCount: selected.stopCount,
      stops: stopNames,
      waitMinutes: Math.round(waitSeconds / 60),
      towards,
      routeNumber: selected.route.number,
    },
  }
}

async function autoSegment(
  ctx: RoadContext,
  fromName: string,
  fromLat: number,
  fromLng: number,
  toName: string,
  toLat: number,
  toLng: number,
): Promise<RouteSegment> {
  const leg = await bestEffortRoadLeg(ctx, "driving", fromLat, fromLng, toLat, toLng, ROUTING_CONSTANTS.AUTO_DISTANCE_FACTOR, ROUTING_CONSTANTS.AUTO_SPEED_MPS)
  const distKm = leg.distanceMeters / 1000
  const fare = Math.round(FARE_CONFIG.auto.basefare + distKm * FARE_CONFIG.auto.perKm)
  return {
    id: crypto.randomUUID(),
    mode: "auto",
    from: { name: fromName, latitude: fromLat, longitude: fromLng },
    to: { name: toName, latitude: toLat, longitude: toLng },
    distanceMeters: leg.distanceMeters,
    durationSeconds: leg.durationSeconds,
    estimatedFare: fare,
    instruction: `Take Auto from ${fromName} to ${toName}`,
    geometry: leg.geometry,
  }
}

function locationsClose(a: SegmentLocation, b: SegmentLocation, toleranceMeters = CONTINUITY_TOLERANCE_M): boolean {
  return haversine(a.latitude, a.longitude, b.latitude, b.longitude) <= toleranceMeters
}

function validLocation(location: SegmentLocation | undefined): location is SegmentLocation {
  return Boolean(location && location.name && validLatitude(location.latitude) && validLongitude(location.longitude))
}

function transitStopsMatchDataset(segment: RouteSegment): boolean {
  const details = segment.transitDetails
  if (!details || details.stopCount < 1 || !Array.isArray(details.stops) || details.stops.length < 2) return false

  if (segment.mode === "metro") {
    const stations = details.stops.map(stationByName)
    if (stations.some((station) => !station)) return false
    if (stations[0]?.name !== segment.from.name || stations[stations.length - 1]?.name !== segment.to.name) return false
    return validateMetroPath(stations.map((station) => station!.id))
  }

  if (segment.mode === "bus") {
    const stops = details.stops.map(stopByName)
    if (stops.some((stop) => !stop)) return false
    if (stops[0]?.name !== segment.from.name || stops[stops.length - 1]?.name !== segment.to.name) return false
    return BUS_ROUTES.some((route) => {
      const indexes = stops.map((stop) => route.stops.indexOf(stop!.id))
      if (indexes.some((index) => index === -1)) return false
      const increasing = indexes.every((index, i) => i === 0 || index === indexes[i - 1] + 1)
      const decreasing = indexes.every((index, i) => i === 0 || index === indexes[i - 1] - 1)
      return increasing || decreasing
    })
  }

  return false
}

function validSegment(segment: RouteSegment): boolean {
  const validModes: MultimodalMode[] = ["walking", "metro", "bus", "auto"]
  if (!validModes.includes(segment.mode)) return false
  if (!validLocation(segment.from) || !validLocation(segment.to)) return false
  if (!isFiniteNumber(segment.distanceMeters) || segment.distanceMeters < 0) return false
  if (!isFiniteNumber(segment.durationSeconds) || segment.durationSeconds < 0) return false
  if (!isFiniteNumber(segment.estimatedFare) || segment.estimatedFare < 0) return false
  if (!isValidGeometry(segment.geometry)) return false

  if (segment.mode === "metro" || segment.mode === "bus") {
    if (segment.distanceMeters <= 0 || segment.durationSeconds <= 0) return false
    return transitStopsMatchDataset(segment)
  }

  return segment.transitDetails === undefined
}

function validateCandidate(
  segments: RouteSegment[] | null,
  origin: SegmentLocation,
  destination: SegmentLocation,
): segments is RouteSegment[] {
  if (!segments || segments.length === 0) return false
  if (!segments.every(validSegment)) return false
  if (!locationsClose(segments[0].from, origin)) return false
  if (!locationsClose(segments[segments.length - 1].to, destination)) return false
  for (let i = 0; i < segments.length - 1; i++) {
    if (!locationsClose(segments[i].to, segments[i + 1].from)) return false
  }
  return true
}

function locationKey(location: SegmentLocation): string {
  return `${location.name.toLowerCase()}@${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`
}

function routeSignature(segments: RouteSegment[]): string {
  return segments.map((segment) => {
    const transit = segment.transitDetails
      ? `${segment.transitDetails.lineName}:${segment.transitDetails.stops.join(">")}`
      : ""
    return `${segment.mode}:${locationKey(segment.from)}>${locationKey(segment.to)}:${transit}`
  }).join("|")
}

/**
 * Phase 4 fix (B12) — drops any walking segment under MIN_WALK_SEGMENT_M
 * from a candidate's segment list (access walk, egress walk, or an internal
 * connector walk — the same rule applies uniformly to all three). Safe for
 * validateCandidate()'s boundary/continuity checks: whichever two points a
 * dropped walk connected are, by construction, already within
 * CONTINUITY_TOLERANCE_M of each other, so removing it never introduces a
 * gap validateCandidate() would reject. Never drops a metro/bus/auto
 * segment — those are the only segments that can never legitimately be
 * zero-length (validSegment() already requires distanceMeters > 0 for
 * transit segments).
 */
function omitNegligibleWalks(segments: RouteSegment[]): RouteSegment[] {
  return segments.filter((segment) => !(segment.mode === "walking" && segment.distanceMeters < MIN_WALK_SEGMENT_M))
}

function removeDuplicateCandidates(candidates: RouteSegment[][]): RouteSegment[][] {
  const seen = new Set<string>()
  const unique: RouteSegment[][] = []
  for (const candidate of candidates) {
    const signature = routeSignature(candidate)
    if (seen.has(signature)) continue
    seen.add(signature)
    unique.push(candidate)
  }
  return unique
}

function calculateTransferCount(segments: RouteSegment[]): number {
  const rideModes = segments.filter((segment) => segment.mode !== "walking").map((segment) => segment.mode)
  let transfers = 0
  for (let i = 1; i < rideModes.length; i++) {
    if (rideModes[i] !== rideModes[i - 1]) transfers += 1
  }
  return transfers
}

function buildRoute(segments: RouteSegment[], label: RouteLabel): MultimodalRoute {
  const totalDistanceMeters = segments.reduce((s, seg) => s + seg.distanceMeters, 0)
  const totalDurationSeconds = segments.reduce((s, seg) => s + seg.durationSeconds, 0)
  const totalWalkingMeters = segments
    .filter((seg) => seg.mode === "walking")
    .reduce((s, seg) => s + seg.distanceMeters, 0)
  const totalFare = segments.reduce((s, seg) => s + seg.estimatedFare, 0)
  const modes: MultimodalMode[] = [...new Set(segments.map((s) => s.mode))]
  const transferCount = calculateTransferCount(segments)

  const modeEmojis: Record<MultimodalMode, string> = {
    walking: "🚶", metro: "🚇", bus: "🚌", auto: "🛺",
  }
  const modeLabels: Record<MultimodalMode, string> = {
    walking: "Walk", metro: "Metro", bus: "Bus", auto: "Auto",
  }
  const modeSummary = segments.map((s) => `${modeEmojis[s.mode]} ${modeLabels[s.mode]}`).join(" → ")

  const labelMap: Record<RouteLabel, { display: string; color: string }> = {
    FASTEST: { display: "Fastest", color: "#0ea5e9" },
    CHEAPEST: { display: "Lowest Cost", color: "#16a34a" },
    MIN_WALKING: { display: "Least Walking", color: "#9333ea" },
    BALANCED: { display: "Balanced", color: "#ea580c" },
  }

  return {
    id: crypto.randomUUID(),
    label,
    labelDisplay: labelMap[label].display,
    labelColor: labelMap[label].color,
    segments,
    totalDistanceMeters,
    totalDurationSeconds,
    totalWalkingMeters,
    totalFare,
    transferCount,
    modes,
    summary: modeSummary,
    isDemoData: true,
  }
}

const UPCOMING_DEPARTURES_SHOWN = 2

// Fills in each transit segment's estimatedBoardingTime (and the next couple
// of departures after it) by walking the route in order and accumulating
// prior segments' durationSeconds (which already include each segment's own
// boarding wait — see metroSegment()/busSegment() above) plus this segment's
// own waitMinutes. Later departures are spaced by the same waitMinutes
// again, since this dataset models wait as "one full headway" — i.e. a bus
// this frequent is expected roughly every waitMinutes. When no departure
// time was supplied, every segment is left without these fields rather than
// inventing one from "now" — the same honesty rule reliabilityService's
// calculateSmartDeparture already follows for a missing departure time.
function attachBoardingEstimates(route: MultimodalRoute, departureDate: Date | null): MultimodalRoute {
  if (!departureDate) return route

  let cursorMs = departureDate.getTime()
  for (const segment of route.segments) {
    if (segment.transitDetails) {
      const arriveAtStopMs = cursorMs
      const headwayMs = segment.transitDetails.waitMinutes * 60_000
      segment.transitDetails.estimatedBoardingTime = formatClockTime(new Date(arriveAtStopMs + headwayMs))
      // Starts at the SECOND departure — the first is estimatedBoardingTime
      // above, so this is only the ones after it.
      segment.transitDetails.upcomingBoardingTimes = Array.from({ length: UPCOMING_DEPARTURES_SHOWN }, (_, i) =>
        formatClockTime(new Date(arriveAtStopMs + (i + 2) * headwayMs)),
      )
    }
    cursorMs += segment.durationSeconds * 1000
  }
  return route
}

async function tryWalkMetroWalk(
  ctx: RoadContext,
  origin: SegmentLocation,
  destination: SegmentLocation,
): Promise<RouteSegment[] | null> {
  const nearO = nearestMetro(origin.latitude, origin.longitude, ROUTING_CONSTANTS.MAX_WALK_TO_METRO_M, ctx.excludeIds)
  const nearD = nearestMetro(destination.latitude, destination.longitude, ROUTING_CONSTANTS.MAX_WALK_TO_METRO_M, ctx.excludeIds)
  if (!nearO || !nearD || nearO.station.id === nearD.station.id) return null

  const path = stationsOnPath(nearO.station.id, nearD.station.id)
  if (!path || !validateMetroPath(path)) return null

  const metro = metroSegment(nearO.station.id, nearD.station.id, path)
  if (!metro) return null

  const [accessWalk, egressWalk] = await Promise.all([
    walkSegment(ctx, origin.name, origin.latitude, origin.longitude, nearO.station.name, nearO.station.latitude, nearO.station.longitude),
    walkSegment(ctx, nearD.station.name, nearD.station.latitude, nearD.station.longitude, destination.name, destination.latitude, destination.longitude),
  ])

  return [accessWalk, metro, egressWalk]
}

async function tryWalkBusWalk(
  ctx: RoadContext,
  origin: SegmentLocation,
  destination: SegmentLocation,
): Promise<RouteSegment[] | null> {
  const nearO = nearestBusStop(origin.latitude, origin.longitude, ROUTING_CONSTANTS.MAX_WALK_TO_BUS_M, ctx.excludeIds)
  const nearD = nearestBusStop(destination.latitude, destination.longitude, ROUTING_CONSTANTS.MAX_WALK_TO_BUS_M, ctx.excludeIds)
  if (!nearO || !nearD || nearO.stop.id === nearD.stop.id) return null

  const bus = busSegment(nearO.stop, nearD.stop)
  if (!bus) return null

  const [accessWalk, egressWalk] = await Promise.all([
    walkSegment(ctx, origin.name, origin.latitude, origin.longitude, nearO.stop.name, nearO.stop.latitude, nearO.stop.longitude),
    walkSegment(ctx, nearD.stop.name, nearD.stop.latitude, nearD.stop.longitude, destination.name, destination.latitude, destination.longitude),
  ])

  return [accessWalk, bus, egressWalk]
}

async function tryWalkMetroAuto(
  ctx: RoadContext,
  origin: SegmentLocation,
  destination: SegmentLocation,
): Promise<RouteSegment[] | null> {
  const nearO = nearestMetro(origin.latitude, origin.longitude, ROUTING_CONSTANTS.MAX_WALK_TO_METRO_M, ctx.excludeIds)
  if (!nearO) return null

  const nearD = nearestMetro(destination.latitude, destination.longitude, 5000, ctx.excludeIds)
  if (!nearD || nearO.station.id === nearD.station.id) return null

  const walkFromMetroDist = haversine(nearD.station.latitude, nearD.station.longitude, destination.latitude, destination.longitude)
  if (walkFromMetroDist < 500) return null

  const path = stationsOnPath(nearO.station.id, nearD.station.id)
  if (!path || !validateMetroPath(path)) return null

  const metro = metroSegment(nearO.station.id, nearD.station.id, path)
  if (!metro || !nearD.station.hasAutoHub) return null

  const [accessWalk, auto] = await Promise.all([
    walkSegment(ctx, origin.name, origin.latitude, origin.longitude, nearO.station.name, nearO.station.latitude, nearO.station.longitude),
    autoSegment(ctx, nearD.station.name, nearD.station.latitude, nearD.station.longitude, destination.name, destination.latitude, destination.longitude),
  ])

  return [accessWalk, metro, auto]
}

async function tryWalkBusMetroWalk(
  ctx: RoadContext,
  origin: SegmentLocation,
  destination: SegmentLocation,
): Promise<RouteSegment[] | null> {
  const nearD = nearestMetro(destination.latitude, destination.longitude, ROUTING_CONSTANTS.MAX_WALK_TO_METRO_M, ctx.excludeIds)
  const nearO = nearestBusStop(origin.latitude, origin.longitude, ROUTING_CONSTANTS.MAX_WALK_TO_BUS_M, ctx.excludeIds)
  if (!nearD || !nearO) return null

  const connectorCandidates: Array<{
    stop: (typeof BUS_STOPS)[0]
    metro: (typeof METRO_STATIONS)[0]
    bus: RouteSegment
    walkDistanceMeters: number
  }> = []

  for (const metro of METRO_STATIONS) {
    if (ctx.excludeIds.has(metro.id)) continue
    for (const stop of BUS_STOPS) {
      if (stop.id === nearO.stop.id) continue
      if (ctx.excludeIds.has(stop.id)) continue
      const walkDistanceMeters = haversine(metro.latitude, metro.longitude, stop.latitude, stop.longitude)
      if (walkDistanceMeters > 600) continue
      const bus = busSegment(nearO.stop, stop)
      if (!bus) continue
      connectorCandidates.push({ stop, metro, bus, walkDistanceMeters })
    }
  }

  connectorCandidates.sort((a, b) => (
    a.bus.transitDetails!.stopCount - b.bus.transitDetails!.stopCount ||
    a.walkDistanceMeters - b.walkDistanceMeters ||
    a.stop.id.localeCompare(b.stop.id) ||
    a.metro.id.localeCompare(b.metro.id)
  ))

  for (const candidate of connectorCandidates) {
    if (candidate.metro.id === nearD.station.id) continue
    const path = stationsOnPath(candidate.metro.id, nearD.station.id)
    if (!path || !validateMetroPath(path)) continue
    const metro = metroSegment(candidate.metro.id, nearD.station.id, path)
    if (!metro) continue

    const [accessWalk, connectorWalk, egressWalk] = await Promise.all([
      walkSegment(ctx, origin.name, origin.latitude, origin.longitude, nearO.stop.name, nearO.stop.latitude, nearO.stop.longitude),
      walkSegment(ctx, candidate.stop.name, candidate.stop.latitude, candidate.stop.longitude, candidate.metro.name, candidate.metro.latitude, candidate.metro.longitude),
      walkSegment(ctx, nearD.station.name, nearD.station.latitude, nearD.station.longitude, destination.name, destination.latitude, destination.longitude),
    ])

    return [accessWalk, candidate.bus, connectorWalk, metro, egressWalk]
  }

  return null
}

// ── Phase 6 — Graph-based candidate generation engine ───────────────────────
//
// The 4 tryWalk*() pattern functions above are kept completely unchanged
// (per PROJECT_MASTER_PLAN.md Phase 6's explicit risk mitigation: never
// remove them). This section ADDS a second, independent candidate source: a
// bounded multi-criteria search over a small stop graph built from every
// metro station and bus stop, which can find candidates none of the 4 fixed
// patterns can — multi-interchange metro journeys beyond one hop, bus->bus
// transfers, and journeys that simply don't match any of the 4 shapes.
//
// This is NOT an exact k-shortest-paths or RAPTOR implementation — it is a
// bounded label-expanding search (cap the number of times any node is
// expanded, cap total hops/transfers, cap the search queue to the most
// promising labels by duration) that trades search completeness for
// guaranteed termination on this small demo graph. What IS exact is the
// final Pareto-dominance filter (filterParetoOptimalRouteCandidates, below
// removeDuplicateCandidates), applied to every candidate — old patterns and
// new search alike — using the real, materialized route totals. That filter
// is what actually guarantees "no Pareto-dominated route is ever returned,"
// not the search's own pruning, which is a performance heuristic only.

const TRANSFER_WALK_RADIUS_M = 600
const AUTO_EGRESS_MIN_M = 500
const AUTO_EGRESS_MAX_M = 8000
const MAX_SEARCH_HOPS = 6
const MAX_SEARCH_TRANSFERS = 3
const MAX_NODE_EXPANSIONS = 3
const MAX_SEARCH_ITERATIONS = 1500
const SEARCH_QUEUE_CAP = 300
const MAX_GRAPH_CANDIDATES = 8

type GraphNodeType = "metro" | "bus"

interface GraphNode {
  key: string
  type: GraphNodeType
  id: string
  name: string
  latitude: number
  longitude: number
  hasAutoHub: boolean
}

type GraphHop =
  | { mode: "metro"; fromId: string; toId: string; stationPath: string[]; durationSeconds: number; distanceMeters: number; fareEstimate: number }
  | { mode: "bus"; fromStop: (typeof BUS_STOPS)[0]; toStop: (typeof BUS_STOPS)[0]; durationSeconds: number; distanceMeters: number; fareEstimate: number }
  | { mode: "walking"; durationSeconds: number; distanceMeters: number }
  | { mode: "auto"; durationSeconds: number; distanceMeters: number; fareEstimate: number }

interface GraphEdge {
  toNodeKey: string
  hop: GraphHop
}

interface TransitGraph {
  nodes: Map<string, GraphNode>
  edges: Map<string, GraphEdge[]>
}

let cachedGraph: TransitGraph | null = null

function nodeKey(type: GraphNodeType, id: string): string {
  return `${type}:${id}`
}

/**
 * Builds the stop graph once (cached for the process lifetime — the
 * underlying transitData.ts arrays are static, so this never needs
 * rebuilding). Three edge types:
 *   - metro ride edges: every pair of stations sharing a line (not just
 *     adjacent ones — each edge IS a complete ride, built via the existing
 *     metroSegment(), exactly as the old patterns already build one), both
 *     directions.
 *   - bus ride edges: every pair of stops connected by some direct route
 *     (selectBusRoute() already picks the best one if several exist), via
 *     the existing busSegment(), both directions.
 *   - transfer walk edges: any two distinct nodes (cross-mode included —
 *     this is what makes bus<->metro and bus<->bus transfers possible
 *     anywhere they're geographically close, not just at designated
 *     interchange stations) within TRANSFER_WALK_RADIUS_M.
 */
function buildTransitGraph(): TransitGraph {
  const nodes = new Map<string, GraphNode>()
  for (const s of METRO_STATIONS) {
    nodes.set(nodeKey("metro", s.id), { key: nodeKey("metro", s.id), type: "metro", id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude, hasAutoHub: s.hasAutoHub })
  }
  for (const s of BUS_STOPS) {
    nodes.set(nodeKey("bus", s.id), { key: nodeKey("bus", s.id), type: "bus", id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude, hasAutoHub: false })
  }

  const edges = new Map<string, GraphEdge[]>()
  function addEdge(fromKey: string, toKey: string, hop: GraphHop) {
    const list = edges.get(fromKey)
    if (list) list.push({ toNodeKey: toKey, hop })
    else edges.set(fromKey, [{ toNodeKey: toKey, hop }])
  }

  for (const lineDef of METRO_LINES) {
    for (let i = 0; i < lineDef.stations.length; i++) {
      for (let j = i + 1; j < lineDef.stations.length; j++) {
        const fromId = lineDef.stations[i]
        const toId = lineDef.stations[j]
        const forwardPath = lineDef.stations.slice(i, j + 1)
        const forwardSegment = metroSegment(fromId, toId, forwardPath)
        if (forwardSegment) {
          addEdge(nodeKey("metro", fromId), nodeKey("metro", toId), {
            mode: "metro", fromId, toId, stationPath: forwardPath,
            durationSeconds: forwardSegment.durationSeconds, distanceMeters: forwardSegment.distanceMeters, fareEstimate: forwardSegment.estimatedFare,
          })
        }
        const backwardPath = [...forwardPath].reverse()
        const backwardSegment = metroSegment(toId, fromId, backwardPath)
        if (backwardSegment) {
          addEdge(nodeKey("metro", toId), nodeKey("metro", fromId), {
            mode: "metro", fromId: toId, toId: fromId, stationPath: backwardPath,
            durationSeconds: backwardSegment.durationSeconds, distanceMeters: backwardSegment.distanceMeters, fareEstimate: backwardSegment.estimatedFare,
          })
        }
      }
    }
  }

  const busStopIds = BUS_STOPS.map((s) => s.id)
  for (let i = 0; i < busStopIds.length; i++) {
    for (let j = i + 1; j < busStopIds.length; j++) {
      const fromStop = getStop(busStopIds[i])!
      const toStop = getStop(busStopIds[j])!
      const forward = busSegment(fromStop, toStop)
      if (forward) {
        addEdge(nodeKey("bus", fromStop.id), nodeKey("bus", toStop.id), {
          mode: "bus", fromStop, toStop, durationSeconds: forward.durationSeconds, distanceMeters: forward.distanceMeters, fareEstimate: forward.estimatedFare,
        })
      }
      const backward = busSegment(toStop, fromStop)
      if (backward) {
        addEdge(nodeKey("bus", toStop.id), nodeKey("bus", fromStop.id), {
          mode: "bus", fromStop: toStop, toStop: fromStop, durationSeconds: backward.durationSeconds, distanceMeters: backward.distanceMeters, fareEstimate: backward.estimatedFare,
        })
      }
    }
  }

  const allNodes = [...nodes.values()]
  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const a = allNodes[i]
      const b = allNodes[j]
      const d = haversine(a.latitude, a.longitude, b.latitude, b.longitude)
      if (d <= 0 || d > TRANSFER_WALK_RADIUS_M) continue
      addEdge(a.key, b.key, { mode: "walking", durationSeconds: Math.round(d / ROUTING_CONSTANTS.WALK_SPEED_MPS), distanceMeters: Math.round(d) })
      addEdge(b.key, a.key, { mode: "walking", durationSeconds: Math.round(d / ROUTING_CONSTANTS.WALK_SPEED_MPS), distanceMeters: Math.round(d) })
    }
  }

  return { nodes, edges }
}

function getTransitGraph(): TransitGraph {
  if (!cachedGraph) cachedGraph = buildTransitGraph()
  return cachedGraph
}

function isRideMode(mode: MultimodalMode): boolean {
  return mode === "metro" || mode === "bus" || mode === "auto"
}

interface SearchPathStep {
  mode: MultimodalMode
  hop: GraphHop
  fromNodeKey: string
  toNodeKey: string
}

interface SearchLabel {
  nodeKey: string
  durationSeconds: number
  fareEstimate: number
  walkingMeters: number
  transferCount: number
  lastRideMode: MultimodalMode | null
  path: SearchPathStep[]
  visited: Set<string>
}

function labelSignature(label: SearchLabel): string {
  return label.path.map((step) => `${step.mode}:${step.fromNodeKey}>${step.toNodeKey}`).join("|")
}

function dedupeLabelsBySignature(labels: SearchLabel[]): SearchLabel[] {
  const seen = new Set<string>()
  const result: SearchLabel[] = []
  for (const label of labels) {
    const signature = labelSignature(label)
    if (seen.has(signature)) continue
    seen.add(signature)
    result.push(label)
  }
  return result
}

function labelMetricsDominate(a: SearchLabel, b: SearchLabel): boolean {
  const leOrEq = a.durationSeconds <= b.durationSeconds && a.fareEstimate <= b.fareEstimate &&
    a.walkingMeters <= b.walkingMeters && a.transferCount <= b.transferCount
  const strictlyBetter = a.durationSeconds < b.durationSeconds || a.fareEstimate < b.fareEstimate ||
    a.walkingMeters < b.walkingMeters || a.transferCount < b.transferCount
  return leOrEq && strictlyBetter
}

function paretoFilterLabels(labels: SearchLabel[]): SearchLabel[] {
  return labels.filter((candidate) => !labels.some((other) => other !== candidate && labelMetricsDominate(other, candidate)))
}

function nodeLocation(key: string): { name: string; latitude: number; longitude: number } | null {
  const node = getTransitGraph().nodes.get(key)
  return node ? { name: node.name, latitude: node.latitude, longitude: node.longitude } : null
}

/**
 * Converts a label's abstract hop sequence into real RouteSegment objects —
 * calling the SAME segment builders (walkSegment/metroSegment/busSegment/
 * autoSegment) the 4 fixed patterns already use, so a graph-search
 * candidate is built identically to a pattern-search one. Walking/auto hops
 * go through the real async builder (which tries OSRM, then falls back),
 * not the search's own synchronous estimate — the estimate is only ever
 * used to decide which paths are worth materializing.
 */
async function materializeLabel(
  ctx: RoadContext,
  origin: SegmentLocation,
  destination: SegmentLocation,
  label: SearchLabel,
): Promise<RouteSegment[] | null> {
  const segments: RouteSegment[] = []
  for (const step of label.path) {
    const fromLoc = step.fromNodeKey === "ORIGIN" ? origin : nodeLocation(step.fromNodeKey)
    const toLoc = step.toNodeKey === "DESTINATION" ? destination : nodeLocation(step.toNodeKey)
    if (!fromLoc || !toLoc) return null

    if (step.mode === "walking") {
      segments.push(await walkSegment(ctx, fromLoc.name, fromLoc.latitude, fromLoc.longitude, toLoc.name, toLoc.latitude, toLoc.longitude))
    } else if (step.mode === "auto") {
      segments.push(await autoSegment(ctx, fromLoc.name, fromLoc.latitude, fromLoc.longitude, toLoc.name, toLoc.latitude, toLoc.longitude))
    } else if (step.mode === "metro") {
      const hop = step.hop as Extract<GraphHop, { mode: "metro" }>
      const segment = metroSegment(hop.fromId, hop.toId, hop.stationPath)
      if (!segment) return null
      segments.push(segment)
    } else if (step.mode === "bus") {
      const hop = step.hop as Extract<GraphHop, { mode: "bus" }>
      const segment = busSegment(hop.fromStop, hop.toStop)
      if (!segment) return null
      segments.push(segment)
    }
  }
  return segments
}

/**
 * Bounded multi-criteria label-expanding search from origin to destination
 * over the stop graph. See the section comment above for exactly what
 * "bounded" means and why the real correctness guarantee is the separate
 * filterParetoOptimalRouteCandidates() step, not this search's pruning.
 */
async function searchGraphCandidates(
  ctx: RoadContext,
  origin: SegmentLocation,
  destination: SegmentLocation,
): Promise<RouteSegment[][]> {
  const graph = getTransitGraph()

  const startEdges: Array<{ toNodeKey: string; durationSeconds: number; distanceMeters: number }> = []
  const endEdges: Array<{ fromNodeKey: string; mode: "walking" | "auto"; durationSeconds: number; distanceMeters: number; fareEstimate: number }> = []

  for (const node of graph.nodes.values()) {
    if (ctx.excludeIds.has(node.id)) continue
    const maxAccessM = node.type === "metro" ? ROUTING_CONSTANTS.MAX_WALK_TO_METRO_M : ROUTING_CONSTANTS.MAX_WALK_TO_BUS_M

    const dOrigin = haversine(origin.latitude, origin.longitude, node.latitude, node.longitude)
    if (dOrigin > 0 && dOrigin <= maxAccessM) {
      startEdges.push({ toNodeKey: node.key, durationSeconds: Math.round(dOrigin / ROUTING_CONSTANTS.WALK_SPEED_MPS), distanceMeters: Math.round(dOrigin) })
    }

    const dDest = haversine(node.latitude, node.longitude, destination.latitude, destination.longitude)
    if (dDest > 0 && dDest <= maxAccessM) {
      endEdges.push({ fromNodeKey: node.key, mode: "walking", durationSeconds: Math.round(dDest / ROUTING_CONSTANTS.WALK_SPEED_MPS), distanceMeters: Math.round(dDest), fareEstimate: 0 })
    }
    if (node.hasAutoHub && dDest > AUTO_EGRESS_MIN_M && dDest <= AUTO_EGRESS_MAX_M) {
      const autoDistance = Math.round(dDest * ROUTING_CONSTANTS.AUTO_DISTANCE_FACTOR)
      endEdges.push({
        fromNodeKey: node.key, mode: "auto",
        durationSeconds: Math.round(autoDistance / ROUTING_CONSTANTS.AUTO_SPEED_MPS), distanceMeters: autoDistance,
        fareEstimate: Math.round(FARE_CONFIG.auto.basefare + (autoDistance / 1000) * FARE_CONFIG.auto.perKm),
      })
    }
  }

  if (startEdges.length === 0 || endEdges.length === 0) return []

  const endEdgesByNode = new Map<string, typeof endEdges>()
  for (const e of endEdges) {
    const list = endEdgesByNode.get(e.fromNodeKey)
    if (list) list.push(e); else endEdgesByNode.set(e.fromNodeKey, [e])
  }

  const finalLabels: SearchLabel[] = []
  const expansionsAtNode = new Map<string, number>()

  let queue: SearchLabel[] = startEdges.map((e) => ({
    nodeKey: e.toNodeKey,
    durationSeconds: e.durationSeconds,
    fareEstimate: 0,
    walkingMeters: e.distanceMeters,
    transferCount: 0,
    lastRideMode: null,
    path: [{ mode: "walking" as MultimodalMode, hop: { mode: "walking", durationSeconds: e.durationSeconds, distanceMeters: e.distanceMeters }, fromNodeKey: "ORIGIN", toNodeKey: e.toNodeKey }],
    visited: new Set([e.toNodeKey]),
  }))

  let iterations = 0
  while (queue.length > 0 && iterations < MAX_SEARCH_ITERATIONS) {
    iterations++
    queue.sort((a, b) => a.durationSeconds - b.durationSeconds)
    const current = queue.shift()!

    const endsHere = endEdgesByNode.get(current.nodeKey)
    if (endsHere) {
      for (const endEdge of endsHere) {
        finalLabels.push({
          nodeKey: "DESTINATION",
          durationSeconds: current.durationSeconds + endEdge.durationSeconds,
          fareEstimate: current.fareEstimate + endEdge.fareEstimate,
          walkingMeters: current.walkingMeters + (endEdge.mode === "walking" ? endEdge.distanceMeters : 0),
          transferCount: current.transferCount,
          lastRideMode: current.lastRideMode,
          path: [...current.path, {
            mode: endEdge.mode,
            hop: endEdge.mode === "walking"
              ? { mode: "walking", durationSeconds: endEdge.durationSeconds, distanceMeters: endEdge.distanceMeters }
              : { mode: "auto", durationSeconds: endEdge.durationSeconds, distanceMeters: endEdge.distanceMeters, fareEstimate: endEdge.fareEstimate },
            fromNodeKey: current.nodeKey, toNodeKey: "DESTINATION",
          }],
          visited: current.visited,
        })
      }
    }

    if (current.path.length < MAX_SEARCH_HOPS) {
      const expansions = expansionsAtNode.get(current.nodeKey) ?? 0
      if (expansions < MAX_NODE_EXPANSIONS) {
        expansionsAtNode.set(current.nodeKey, expansions + 1)
        const outgoing = graph.edges.get(current.nodeKey)
        const lastStep = current.path[current.path.length - 1]

        if (outgoing) {
          for (const edge of outgoing) {
            // No two consecutive walking hops — a direct walk already covers
            // whatever an intermediate walk-then-walk would, and this keeps
            // the search from wasting its bounded budget on redundant paths.
            if (edge.hop.mode === "walking" && lastStep.mode === "walking") continue

            const targetNode = graph.nodes.get(edge.toNodeKey)
            if (targetNode && ctx.excludeIds.has(targetNode.id)) continue
            if (current.visited.has(edge.toNodeKey)) continue

            const isNewRide = isRideMode(edge.hop.mode) && edge.hop.mode !== current.lastRideMode
            const newTransferCount = current.transferCount + (isNewRide && current.lastRideMode !== null ? 1 : 0)
            if (newTransferCount > MAX_SEARCH_TRANSFERS) continue

            const fare = edge.hop.mode === "walking" ? 0 : (edge.hop as { fareEstimate: number }).fareEstimate
            const walking = edge.hop.mode === "walking" ? edge.hop.distanceMeters : 0

            queue.push({
              nodeKey: edge.toNodeKey,
              durationSeconds: current.durationSeconds + edge.hop.durationSeconds,
              fareEstimate: current.fareEstimate + fare,
              walkingMeters: current.walkingMeters + walking,
              transferCount: newTransferCount,
              lastRideMode: isRideMode(edge.hop.mode) ? edge.hop.mode : current.lastRideMode,
              path: [...current.path, { mode: edge.hop.mode, hop: edge.hop, fromNodeKey: current.nodeKey, toNodeKey: edge.toNodeKey }],
              visited: new Set([...current.visited, edge.toNodeKey]),
            })
          }
        }
      }
    }

    if (queue.length > SEARCH_QUEUE_CAP) {
      queue.sort((a, b) => a.durationSeconds - b.durationSeconds)
      queue = queue.slice(0, SEARCH_QUEUE_CAP)
    }
  }

  const dedupedLabels = dedupeLabelsBySignature(finalLabels)
  const paretoLabels = paretoFilterLabels(dedupedLabels).slice(0, MAX_GRAPH_CANDIDATES)

  const materialized = await Promise.all(paretoLabels.map((label) => materializeLabel(ctx, origin, destination, label)))
  return materialized.filter((segments): segments is RouteSegment[] => segments !== null)
}

/**
 * Phase 6 — the actual correctness guarantee behind "no Pareto-dominated
 * route is ever returned." Applied to the FULL combined candidate set (the
 * 4 fixed patterns + the graph search), using the real materialized route
 * totals rather than the search's own estimates.
 */
function routeMetricsFor(segments: RouteSegment[]) {
  return {
    dur: segments.reduce((s, seg) => s + seg.durationSeconds, 0),
    fare: segments.reduce((s, seg) => s + seg.estimatedFare, 0),
    walking: segments.filter((s) => s.mode === "walking").reduce((s, seg) => s + seg.distanceMeters, 0),
    transfers: calculateTransferCount(segments),
  }
}

function routeMetricsDominate(a: ReturnType<typeof routeMetricsFor>, b: ReturnType<typeof routeMetricsFor>): boolean {
  const leOrEq = a.dur <= b.dur && a.fare <= b.fare && a.walking <= b.walking && a.transfers <= b.transfers
  const strictlyBetter = a.dur < b.dur || a.fare < b.fare || a.walking < b.walking || a.transfers < b.transfers
  return leOrEq && strictlyBetter
}

function filterParetoOptimalRouteCandidates(candidates: RouteSegment[][]): RouteSegment[][] {
  const metrics = candidates.map(routeMetricsFor)
  return candidates.filter((_, index) => (
    !metrics.some((other, otherIndex) => otherIndex !== index && routeMetricsDominate(other, metrics[index]))
  ))
}

interface CandidateMetrics {
  segs: RouteSegment[]
  signature: string
  dur: number
  fare: number
  walking: number
}

function compareCandidates(a: CandidateMetrics, b: CandidateMetrics): number {
  return a.dur - b.dur || a.fare - b.fare || a.walking - b.walking || a.signature.localeCompare(b.signature)
}

function assignLabels(candidates: RouteSegment[][]): { segments: RouteSegment[]; label: RouteLabel }[] {
  if (candidates.length === 0) return []

  const scored = candidates.map<CandidateMetrics>((segs) => ({
    segs,
    signature: routeSignature(segs),
    dur: segs.reduce((s, seg) => s + seg.durationSeconds, 0),
    fare: segs.reduce((s, seg) => s + seg.estimatedFare, 0),
    walking: segs.filter((s) => s.mode === "walking").reduce((s, seg) => s + seg.distanceMeters, 0),
  })).sort(compareCandidates)

  if (scored.length === 1) return [{ segments: scored[0].segs, label: "BALANCED" }]

  const minDur = Math.min(...scored.map((s) => s.dur))
  const minFare = Math.min(...scored.map((s) => s.fare))
  const minWalking = Math.min(...scored.map((s) => s.walking))
  const used = new Set<number>()
  const result: { segments: RouteSegment[]; label: RouteLabel }[] = []

  function pick(label: RouteLabel, predicate: (candidate: CandidateMetrics) => boolean) {
    const index = scored.findIndex((candidate, i) => !used.has(i) && predicate(candidate))
    if (index === -1) return
    used.add(index)
    result.push({ segments: scored[index].segs, label })
  }

  pick("FASTEST", (candidate) => candidate.dur === minDur)
  pick("CHEAPEST", (candidate) => candidate.fare === minFare)
  pick("MIN_WALKING", (candidate) => candidate.walking === minWalking)

  scored.forEach((candidate, index) => {
    if (!used.has(index)) result.push({ segments: candidate.segs, label: "BALANCED" })
  })

  return result
}

function normalizeRequestLocation(location: MultimodalRequest["origin"], fallbackName: string): SegmentLocation {
  return {
    name: location.name?.trim() || fallbackName,
    latitude: location.latitude,
    longitude: location.longitude,
  }
}

const NEARBY_SEARCH_RADIUS_M = 3000

export interface NearbyTransitResult {
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  latitude: number
  longitude: number
  distanceMeters: number
  estimatedWalkingMinutes: number
}

export const multimodalService = {
  async generateRoutes(request: MultimodalRequest): Promise<MultimodalRoute[]> {
    const origin = normalizeRequestLocation(request.origin, "Origin")
    const destination = normalizeRequestLocation(request.destination, "Destination")

    if (!validLocation(origin) || !validLocation(destination)) return []
    if (haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude) <= SAME_POINT_TOLERANCE_M) {
      return []
    }

    // Phase 4 fix (B4) — stations/stops an admin has deactivated are kept out
    // of every candidate pattern generated below (see RoadContext.excludeIds).
    const inactiveIds = await accessibilityService.getInactiveStationIds()
    const ctx = createRoadContext(inactiveIds)

    // Phase 6 — the 4 fixed patterns (unchanged) run alongside the new
    // bounded graph search, not instead of it. Every candidate from both
    // sources goes through the exact same validation/dedup/Pareto pipeline
    // below, so neither source gets preferential treatment.
    const [patternResults, graphResults] = await Promise.all([
      Promise.all([
        tryWalkMetroWalk(ctx, origin, destination),
        tryWalkBusWalk(ctx, origin, destination),
        tryWalkMetroAuto(ctx, origin, destination),
        tryWalkBusMetroWalk(ctx, origin, destination),
      ]),
      searchGraphCandidates(ctx, origin, destination),
    ])
    const generated: Array<RouteSegment[] | null> = [...patternResults, ...graphResults]

    // Phase 4 fix (B12) — drop degenerate near-zero walking segments (e.g. an
    // access walk of 0m when the origin IS the station) before validation,
    // instead of surfacing "Walk 0 m to X" with a two-identical-coordinate
    // geometry in the final route.
    const cleaned = generated.map((segments) => (segments ? omitNegligibleWalks(segments) : segments))

    const validCandidates = cleaned.filter((segments): segments is RouteSegment[] => (
      validateCandidate(segments, origin, destination)
    ))
    const uniqueCandidates = removeDuplicateCandidates(validCandidates)

    // Phase 6 — strip any candidate that is strictly worse than another on
    // every one of (duration, fare, walking, transfers), from either
    // source. This is the guarantee, not the search's own pruning.
    const paretoOptimalCandidates = filterParetoOptimalRouteCandidates(uniqueCandidates)

    if (paretoOptimalCandidates.length === 0) return []

    // Road-snap metro/bus geometry only for this small final set (not the
    // candidates discarded above) — see roadSnapCandidateGeometry().
    const geometrySnappedCandidates = await Promise.all(
      paretoOptimalCandidates.map((segments) => roadSnapCandidateGeometry(ctx, segments)),
    )

    const departureDate = parseLocalDateTime(request.departureTime)
    return assignLabels(geometrySnappedCandidates).map(({ segments, label }) =>
      attachBoardingEstimates(buildRoute(segments, label), departureDate),
    )
  },

  getNearbyTransit(latitude: number, longitude: number): { metro: NearbyTransitResult | null; bus: NearbyTransitResult | null } {
    const nearMetro = nearestMetro(latitude, longitude, NEARBY_SEARCH_RADIUS_M)
    const nearBus = nearestBusStop(latitude, longitude, NEARBY_SEARCH_RADIUS_M)

    const metro: NearbyTransitResult | null = nearMetro
      ? {
          stationId: nearMetro.station.id,
          stationName: nearMetro.station.name,
          transportMode: "metro",
          latitude: nearMetro.station.latitude,
          longitude: nearMetro.station.longitude,
          distanceMeters: Math.round(nearMetro.distM),
          estimatedWalkingMinutes: Math.max(1, Math.round(nearMetro.distM / ROUTING_CONSTANTS.WALK_SPEED_MPS / 60)),
        }
      : null

    const bus: NearbyTransitResult | null = nearBus
      ? {
          stationId: nearBus.stop.id,
          stationName: nearBus.stop.name,
          transportMode: "bus",
          latitude: nearBus.stop.latitude,
          longitude: nearBus.stop.longitude,
          distanceMeters: Math.round(nearBus.distM),
          estimatedWalkingMinutes: Math.max(1, Math.round(nearBus.distM / ROUTING_CONSTANTS.WALK_SPEED_MPS / 60)),
        }
      : null

    return { metro, bus }
  },
}

export type { MultimodalRoute, RouteSegment, SegmentLocation }
