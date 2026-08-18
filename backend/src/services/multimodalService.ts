import crypto from "crypto"
import {
  METRO_STATIONS,
  BUS_STOPS,
  BUS_ROUTES,
  METRO_LINES,
  FARE_CONFIG,
  getStation,
  stationsOnPath,
} from "../data/transitData"
import type {
  MultimodalRoute,
  MultimodalRequest,
  RouteSegment,
  RouteLabel,
  MultimodalMode,
  SegmentLocation,
} from "../types/multimodal"

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_WALK_TO_METRO_M = 2000
const MAX_WALK_TO_BUS_M   = 1200
const WALK_SPEED_MPS      = 1.4          // 5 km/h
const METRO_MIN_PER_STOP  = 2.5          // minutes between stations
const METRO_WAIT_SEC      = 300          // 5 min average wait
const BUS_WAIT_SEC        = 480          // 8 min average wait
const BUS_SPEED_MPS       = 6.0          // 21.6 km/h in city traffic
const AUTO_SPEED_MPS      = 4.2          // 15 km/h city auto

// ── Haversine distance (meters) ───────────────────────────────────────────────

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

// ── Find nearest transit infrastructure ──────────────────────────────────────

function nearestMetro(lat: number, lng: number, maxM: number) {
  let best: (typeof METRO_STATIONS)[0] | null = null
  let bestDist = Infinity
  for (const s of METRO_STATIONS) {
    const d = haversine(lat, lng, s.latitude, s.longitude)
    if (d < bestDist && d <= maxM) { best = s; bestDist = d }
  }
  return best ? { station: best, distM: bestDist } : null
}

function nearestBusStop(lat: number, lng: number, maxM: number) {
  let best: (typeof BUS_STOPS)[0] | null = null
  let bestDist = Infinity
  for (const s of BUS_STOPS) {
    const d = haversine(lat, lng, s.latitude, s.longitude)
    if (d < bestDist && d <= maxM) { best = s; bestDist = d }
  }
  return best ? { stop: best, distM: bestDist } : null
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function line(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): RouteSegment["geometry"] {
  return { type: "LineString", coordinates: [[lng1, lat1], [lng2, lat2]] }
}

function metroGeometry(stationIds: string[]): RouteSegment["geometry"] {
  const coords: [number, number][] = stationIds.map((id) => {
    const s = getStation(id)!
    return [s.longitude, s.latitude]
  })
  return { type: "LineString", coordinates: coords }
}

// ── Segment factories ─────────────────────────────────────────────────────────

function walkSegment(
  fromName: string, fromLat: number, fromLng: number,
  toName: string,   toLat: number,   toLng: number,
): RouteSegment {
  const dist = Math.round(haversine(fromLat, fromLng, toLat, toLng))
  const dur  = Math.round(dist / WALK_SPEED_MPS)
  return {
    id: crypto.randomUUID(),
    mode: "walking",
    from: { name: fromName, latitude: fromLat, longitude: fromLng },
    to:   { name: toName,   latitude: toLat,   longitude: toLng   },
    distanceMeters: dist,
    durationSeconds: dur,
    estimatedFare: FARE_CONFIG.walking,
    instruction: `Walk ${dist < 1000 ? dist + " m" : (dist / 1000).toFixed(1) + " km"} to ${toName}`,
    geometry: line(fromLat, fromLng, toLat, toLng),
  }
}

function metroSegment(
  fromId: string, toId: string, stationPath: string[],
): RouteSegment | null {
  const from = getStation(fromId)
  const to   = getStation(toId)
  if (!from || !to) return null

  const stopCount  = stationPath.length - 1
  const dist       = Math.round(haversine(from.latitude, from.longitude, to.latitude, to.longitude) * 1.15)
  const dur        = Math.round(METRO_WAIT_SEC + stopCount * METRO_MIN_PER_STOP * 60)
  const fare       = FARE_CONFIG.metro.basefare + stopCount * FARE_CONFIG.metro.perStation

  // Determine which line(s) are used
  const line1 = METRO_LINES.find((l) => l.stations.includes(fromId) && l.stations.includes(toId))
  const lineName  = line1?.name ?? "Mumbai Metro"
  const lineColor = line1?.color ?? "#2563eb"

  const stopNames = stationPath.map((id) => getStation(id)?.name ?? id)

  return {
    id: crypto.randomUUID(),
    mode: "metro",
    from: { name: from.name, latitude: from.latitude, longitude: from.longitude },
    to:   { name: to.name,   latitude: to.latitude,   longitude: to.longitude   },
    distanceMeters: dist,
    durationSeconds: dur,
    estimatedFare: fare,
    instruction: `Take Metro from ${from.name} to ${to.name} (${stopCount} stop${stopCount === 1 ? "" : "s"})`,
    geometry: metroGeometry(stationPath),
    transitDetails: { lineName, lineColor, stopCount, stops: stopNames },
  }
}

function busSegment(
  fromStop: (typeof BUS_STOPS)[0],
  toStop:   (typeof BUS_STOPS)[0],
): RouteSegment {
  const dist    = Math.round(haversine(fromStop.latitude, fromStop.longitude, toStop.latitude, toStop.longitude) * 1.35)
  const dur     = Math.round(BUS_WAIT_SEC + dist / BUS_SPEED_MPS)
  const distKm  = dist / 1000
  const fare    = Math.round(FARE_CONFIG.bus.basefare + distKm * FARE_CONFIG.bus.perKm)

  // Find a shared bus route
  const sharedRoute = BUS_ROUTES.find(
    (r) => fromStop.routes.includes(r.id) && toStop.routes.includes(r.id),
  )
  const routeName = sharedRoute?.name ?? "BEST Bus"

  return {
    id: crypto.randomUUID(),
    mode: "bus",
    from: { name: fromStop.name, latitude: fromStop.latitude, longitude: fromStop.longitude },
    to:   { name: toStop.name,   latitude: toStop.latitude,   longitude: toStop.longitude   },
    distanceMeters: dist,
    durationSeconds: dur,
    estimatedFare: fare,
    instruction: `Take ${routeName} from ${fromStop.name} to ${toStop.name}`,
    geometry: line(fromStop.latitude, fromStop.longitude, toStop.latitude, toStop.longitude),
    transitDetails: { lineName: routeName, lineColor: "#16a34a", stopCount: 1, stops: [fromStop.name, toStop.name] },
  }
}

function autoSegment(
  fromName: string, fromLat: number, fromLng: number,
  toName: string,   toLat: number,   toLng: number,
): RouteSegment {
  const dist  = Math.round(haversine(fromLat, fromLng, toLat, toLng) * 1.25)
  const dur   = Math.round(dist / AUTO_SPEED_MPS)
  const distKm = dist / 1000
  const fare  = Math.round(FARE_CONFIG.auto.basefare + distKm * FARE_CONFIG.auto.perKm)
  return {
    id: crypto.randomUUID(),
    mode: "auto",
    from: { name: fromName, latitude: fromLat, longitude: fromLng },
    to:   { name: toName,   latitude: toLat,   longitude: toLng   },
    distanceMeters: dist,
    durationSeconds: dur,
    estimatedFare: fare,
    instruction: `Take Auto from ${fromName} to ${toName}`,
    geometry: line(fromLat, fromLng, toLat, toLng),
  }
}

// ── Build a MultimodalRoute from segments ─────────────────────────────────────

function buildRoute(segments: RouteSegment[], label: RouteLabel): MultimodalRoute {
  const totalDistanceMeters = segments.reduce((s, seg) => s + seg.distanceMeters, 0)
  const totalDurationSeconds = segments.reduce((s, seg) => s + seg.durationSeconds, 0)
  const totalWalkingMeters = segments
    .filter((seg) => seg.mode === "walking")
    .reduce((s, seg) => s + seg.distanceMeters, 0)
  const totalFare = segments.reduce((s, seg) => s + seg.estimatedFare, 0)
  const modes: MultimodalMode[] = [...new Set(segments.map((s) => s.mode))]
  const transferCount = segments.filter((s) => s.mode !== "walking").length - 1 < 0
    ? 0
    : segments.filter((s) => s.mode !== "walking").length - 1

  const modeEmojis: Record<MultimodalMode, string> = {
    walking: "🚶", metro: "🚇", bus: "🚌", auto: "🛺",
  }
  const modeLabels: Record<MultimodalMode, string> = {
    walking: "Walk", metro: "Metro", bus: "Bus", auto: "Auto",
  }
  const modeSummary = segments.map((s) => `${modeEmojis[s.mode]} ${modeLabels[s.mode]}`).join(" → ")

  const labelMap: Record<RouteLabel, { display: string; color: string }> = {
    FASTEST:     { display: "Fastest",      color: "#0ea5e9" },
    CHEAPEST:    { display: "Lowest Cost",  color: "#16a34a" },
    MIN_WALKING: { display: "Least Walking", color: "#9333ea" },
    BALANCED:    { display: "Balanced",     color: "#ea580c" },
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

// ── Route pattern generators ──────────────────────────────────────────────────

function tryWalkMetroWalk(
  origLat: number, origLng: number,
  destLat: number, destLng: number,
): RouteSegment[] | null {
  const nearO = nearestMetro(origLat, origLng, MAX_WALK_TO_METRO_M)
  const nearD = nearestMetro(destLat, destLng, MAX_WALK_TO_METRO_M)
  if (!nearO || !nearD || nearO.station.id === nearD.station.id) return null

  const path = stationsOnPath(nearO.station.id, nearD.station.id)
  if (!path) return null

  const metro = metroSegment(nearO.station.id, nearD.station.id, path)
  if (!metro) return null

  return [
    walkSegment("Origin", origLat, origLng, nearO.station.name, nearO.station.latitude, nearO.station.longitude),
    metro,
    walkSegment(nearD.station.name, nearD.station.latitude, nearD.station.longitude, "Destination", destLat, destLng),
  ]
}

function tryWalkBusWalk(
  origLat: number, origLng: number,
  destLat: number, destLng: number,
): RouteSegment[] | null {
  const nearO = nearestBusStop(origLat, origLng, MAX_WALK_TO_BUS_M)
  const nearD = nearestBusStop(destLat, destLng, MAX_WALK_TO_BUS_M)
  if (!nearO || !nearD || nearO.stop.id === nearD.stop.id) return null

  return [
    walkSegment("Origin", origLat, origLng, nearO.stop.name, nearO.stop.latitude, nearO.stop.longitude),
    busSegment(nearO.stop, nearD.stop),
    walkSegment(nearD.stop.name, nearD.stop.latitude, nearD.stop.longitude, "Destination", destLat, destLng),
  ]
}

function tryWalkMetroAuto(
  origLat: number, origLng: number,
  destLat: number, destLng: number,
): RouteSegment[] | null {
  const nearO = nearestMetro(origLat, origLng, MAX_WALK_TO_METRO_M)
  if (!nearO) return null

  // Use nearest metro to destination even if beyond normal walk range
  const nearD = nearestMetro(destLat, destLng, 5000)
  if (!nearD || nearO.station.id === nearD.station.id) return null

  // Only useful if auto leg replaces long walk at destination
  const walkFromMetroDist = haversine(nearD.station.latitude, nearD.station.longitude, destLat, destLng)
  if (walkFromMetroDist < 500) return null // walk fine, no need for auto

  const path = stationsOnPath(nearO.station.id, nearD.station.id)
  if (!path) return null

  const metro = metroSegment(nearO.station.id, nearD.station.id, path)
  if (!metro) return null

  // Auto hub availability
  if (!nearD.station.hasAutoHub) return null

  return [
    walkSegment("Origin", origLat, origLng, nearO.station.name, nearO.station.latitude, nearO.station.longitude),
    metro,
    autoSegment(nearD.station.name, nearD.station.latitude, nearD.station.longitude, "Destination", destLat, destLng),
  ]
}

function tryWalkBusMetroWalk(
  origLat: number, origLng: number,
  destLat: number, destLng: number,
): RouteSegment[] | null {
  // Bus from origin stop → stop near a metro station → metro → walk
  const nearD = nearestMetro(destLat, destLng, MAX_WALK_TO_METRO_M)
  if (!nearD) return null

  const nearO = nearestBusStop(origLat, origLng, MAX_WALK_TO_BUS_M)
  if (!nearO) return null

  // Find a bus stop within 500m of any metro station
  let connectingBusStop: (typeof BUS_STOPS)[0] | null = null
  let connectingMetro: typeof METRO_STATIONS[0] | null = null

  for (const metro of METRO_STATIONS) {
    for (const stop of BUS_STOPS) {
      if (stop.id === nearO.stop.id) continue
      const d = haversine(metro.latitude, metro.longitude, stop.latitude, stop.longitude)
      if (d < 600 && nearO.stop.routes.some((r) => stop.routes.includes(r))) {
        connectingBusStop = stop
        connectingMetro   = metro
        break
      }
    }
    if (connectingBusStop) break
  }

  if (!connectingBusStop || !connectingMetro) return null
  if (connectingMetro.id === nearD.station.id) return null

  const path = stationsOnPath(connectingMetro.id, nearD.station.id)
  if (!path) return null

  const metro = metroSegment(connectingMetro.id, nearD.station.id, path)
  if (!metro) return null

  return [
    walkSegment("Origin", origLat, origLng, nearO.stop.name, nearO.stop.latitude, nearO.stop.longitude),
    busSegment(nearO.stop, connectingBusStop),
    walkSegment(connectingBusStop.name, connectingBusStop.latitude, connectingBusStop.longitude,
                connectingMetro.name, connectingMetro.latitude, connectingMetro.longitude),
    metro,
    walkSegment(nearD.station.name, nearD.station.latitude, nearD.station.longitude, "Destination", destLat, destLng),
  ]
}

// ── Label assignment ──────────────────────────────────────────────────────────

function assignLabels(candidates: RouteSegment[][]): { segments: RouteSegment[]; label: RouteLabel }[] {
  if (candidates.length === 0) return []

  const scored = candidates.map((segs) => ({
    segs,
    dur:     segs.reduce((s, seg) => s + seg.durationSeconds, 0),
    fare:    segs.reduce((s, seg) => s + seg.estimatedFare, 0),
    walking: segs.filter((s) => s.mode === "walking").reduce((s, seg) => s + seg.distanceMeters, 0),
  }))

  scored.sort((a, b) => a.dur - b.dur)

  const labels: RouteLabel[] = ["FASTEST", "CHEAPEST", "MIN_WALKING", "BALANCED"]
  const used = new Set<number>()
  const result: { segments: RouteSegment[]; label: RouteLabel }[] = []

  // Fastest = lowest duration
  const fastestIdx = scored.findIndex((_, i) => !used.has(i))
  if (fastestIdx !== -1) { result.push({ segments: scored[fastestIdx].segs, label: "FASTEST" }); used.add(fastestIdx) }

  // Cheapest = lowest fare (among unused)
  let cheapestIdx = -1; let minFare = Infinity
  scored.forEach((s, i) => { if (!used.has(i) && s.fare < minFare) { minFare = s.fare; cheapestIdx = i } })
  if (cheapestIdx !== -1) { result.push({ segments: scored[cheapestIdx].segs, label: "CHEAPEST" }); used.add(cheapestIdx) }

  // Min walking = lowest walking (among unused)
  let minWalkIdx = -1; let minWalk = Infinity
  scored.forEach((s, i) => { if (!used.has(i) && s.walking < minWalk) { minWalk = s.walking; minWalkIdx = i } })
  if (minWalkIdx !== -1) { result.push({ segments: scored[minWalkIdx].segs, label: "MIN_WALKING" }); used.add(minWalkIdx) }

  // Balanced = remaining
  scored.forEach((s, i) => {
    if (!used.has(i) && result.length < labels.length) {
      result.push({ segments: s.segs, label: "BALANCED" })
    }
  })

  // If only one route, always label it BALANCED for honest presentation
  if (result.length === 1 && result[0].label === "FASTEST") {
    result[0].label = "BALANCED"
  }

  return result
}

// ── Main export ───────────────────────────────────────────────────────────────

// Problem 11 — Nearby Transit search radius. Distinct from the routing-specific
// MAX_WALK_TO_METRO_M / MAX_WALK_TO_BUS_M constants above (those bound what's
// "walkable enough" to include in a generated route); this is a larger discovery
// radius for "what's near me" lookups.
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
  generateRoutes(request: MultimodalRequest): MultimodalRoute[] {
    const { origin: o, destination: d } = request
    const candidates: RouteSegment[][] = []

    const wmw = tryWalkMetroWalk(o.latitude, o.longitude, d.latitude, d.longitude)
    if (wmw) candidates.push(wmw)

    const wbw = tryWalkBusWalk(o.latitude, o.longitude, d.latitude, d.longitude)
    if (wbw) candidates.push(wbw)

    const wma = tryWalkMetroAuto(o.latitude, o.longitude, d.latitude, d.longitude)
    if (wma) candidates.push(wma)

    const wbmw = tryWalkBusMetroWalk(o.latitude, o.longitude, d.latitude, d.longitude)
    if (wbmw) candidates.push(wbmw)

    if (candidates.length === 0) return []

    const labelled = assignLabels(candidates)
    return labelled.map(({ segments, label }) => buildRoute(segments, label))
  },

  /**
   * Problem 11 — Nearby Transit. Reuses the existing nearestMetro()/nearestBusStop()/
   * haversine() helpers already defined in this module rather than duplicating them.
   * Returns the nearest metro station and nearest bus stop within the discovery
   * radius, each with an honest estimated walking time using the existing
   * WALK_SPEED_MPS constant (no second walking-speed constant introduced).
   */
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

// Exported type for other modules
export type { MultimodalRoute, RouteSegment, SegmentLocation }
