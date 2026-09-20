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
import type { NormalizedRoute, TransportMode } from "../types/routing"
import type {
  MultimodalRoute,
  MultimodalRequest,
  RouteSegment,
  RouteLabel,
  MultimodalMode,
  SegmentLocation,
} from "../types/multimodal"

const MAX_WALK_TO_METRO_M = 2000
const MAX_WALK_TO_BUS_M = 1200
const WALK_SPEED_MPS = 1.4
const METRO_MIN_PER_STOP = 2.5
const METRO_WAIT_SEC = 300
const BUS_WAIT_SEC = 480
const BUS_SPEED_MPS = 6.0
const AUTO_SPEED_MPS = 4.2
const CONTINUITY_TOLERANCE_M = 50
const SAME_POINT_TOLERANCE_M = 25

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

function nearestMetro(lat: number, lng: number, maxM: number) {
  let best: (typeof METRO_STATIONS)[0] | null = null
  let bestDist = Infinity
  for (const s of METRO_STATIONS) {
    const d = haversine(lat, lng, s.latitude, s.longitude)
    if (d < bestDist && d <= maxM) {
      best = s
      bestDist = d
    }
  }
  return best ? { station: best, distM: bestDist } : null
}

function nearestBusStop(lat: number, lng: number, maxM: number) {
  let best: (typeof BUS_STOPS)[0] | null = null
  let bestDist = Infinity
  for (const s of BUS_STOPS) {
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
}

let roadLegProviderOverride: RoadLegProvider | null = null

export function setMultimodalRoadLegProviderForTesting(provider: RoadLegProvider | null): void {
  roadLegProviderOverride = provider
}

function createRoadContext(): RoadContext {
  return { provider: roadLegProviderOverride ?? routingService, cache: new Map() }
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

  const request = (async () => {
    try {
      const routes = await ctx.provider.getRoute({
        origin: { latitude: fromLat, longitude: fromLng },
        destination: { latitude: toLat, longitude: toLng },
        mode,
      })
      const route = routes.find((candidate) => isUsableRoadRoute(candidate, mode))
      if (!route) return null
      return {
        distanceMeters: Math.round(route.distanceMeters),
        durationSeconds: Math.round(route.durationSeconds),
        geometry: route.geometry,
      }
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
  return Math.round(distance * 1.35)
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
  const leg = await bestEffortRoadLeg(ctx, "walking", fromLat, fromLng, toLat, toLng, 1, WALK_SPEED_MPS)
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
    }, 0) * 1.15,
  )
  const durationSeconds = Math.round(METRO_WAIT_SEC + stopCount * METRO_MIN_PER_STOP * 60)
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
    transitDetails: { ...lineDetails, stopCount, stops: stopNames },
  }
}

function busSegment(fromStop: (typeof BUS_STOPS)[0], toStop: (typeof BUS_STOPS)[0]): RouteSegment | null {
  const selected = selectBusRoute(fromStop, toStop)
  if (!selected) return null

  const distanceMeters = selected.distanceMeters
  const durationSeconds = Math.round(BUS_WAIT_SEC + distanceMeters / BUS_SPEED_MPS)
  const fare = Math.round(FARE_CONFIG.bus.basefare + (distanceMeters / 1000) * FARE_CONFIG.bus.perKm)
  const stopNames = selected.stopPath.map((id) => getStop(id)?.name ?? id)

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
  const leg = await bestEffortRoadLeg(ctx, "driving", fromLat, fromLng, toLat, toLng, 1.25, AUTO_SPEED_MPS)
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

async function tryWalkMetroWalk(
  ctx: RoadContext,
  origin: SegmentLocation,
  destination: SegmentLocation,
): Promise<RouteSegment[] | null> {
  const nearO = nearestMetro(origin.latitude, origin.longitude, MAX_WALK_TO_METRO_M)
  const nearD = nearestMetro(destination.latitude, destination.longitude, MAX_WALK_TO_METRO_M)
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
  const nearO = nearestBusStop(origin.latitude, origin.longitude, MAX_WALK_TO_BUS_M)
  const nearD = nearestBusStop(destination.latitude, destination.longitude, MAX_WALK_TO_BUS_M)
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
  const nearO = nearestMetro(origin.latitude, origin.longitude, MAX_WALK_TO_METRO_M)
  if (!nearO) return null

  const nearD = nearestMetro(destination.latitude, destination.longitude, 5000)
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
  const nearD = nearestMetro(destination.latitude, destination.longitude, MAX_WALK_TO_METRO_M)
  const nearO = nearestBusStop(origin.latitude, origin.longitude, MAX_WALK_TO_BUS_M)
  if (!nearD || !nearO) return null

  const connectorCandidates: Array<{
    stop: (typeof BUS_STOPS)[0]
    metro: (typeof METRO_STATIONS)[0]
    bus: RouteSegment
    walkDistanceMeters: number
  }> = []

  for (const metro of METRO_STATIONS) {
    for (const stop of BUS_STOPS) {
      if (stop.id === nearO.stop.id) continue
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

    const ctx = createRoadContext()
    const generated = await Promise.all([
      tryWalkMetroWalk(ctx, origin, destination),
      tryWalkBusWalk(ctx, origin, destination),
      tryWalkMetroAuto(ctx, origin, destination),
      tryWalkBusMetroWalk(ctx, origin, destination),
    ])

    const validCandidates = generated.filter((segments): segments is RouteSegment[] => (
      validateCandidate(segments, origin, destination)
    ))
    const uniqueCandidates = removeDuplicateCandidates(validCandidates)

    if (uniqueCandidates.length === 0) return []

    return assignLabels(uniqueCandidates).map(({ segments, label }) => buildRoute(segments, label))
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
          estimatedWalkingMinutes: Math.max(1, Math.round(nearMetro.distM / WALK_SPEED_MPS / 60)),
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
          estimatedWalkingMinutes: Math.max(1, Math.round(nearBus.distM / WALK_SPEED_MPS / 60)),
        }
      : null

    return { metro, bus }
  },
}

export type { MultimodalRoute, RouteSegment, SegmentLocation }
