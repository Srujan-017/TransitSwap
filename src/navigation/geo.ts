/**
 * Small geometry helpers for live navigation: distances, bearings, and snapping a position onto a
 * polyline. Everything works in metres on a local flat approximation, which is exact enough over the
 * few kilometres of one journey.
 */

export interface LatLng {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_M = 6371000
const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Compass bearing from a to b, in degrees 0-360 (0 = north, 90 = east). */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude))
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

/** Signed turn from heading `from` to heading `to`, in degrees: positive = clockwise (a right turn), range -180..180. */
export function turnAngle(from: number, to: number): number {
  let d = (to - from) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

/** The point `meters` away from `p` along `headingDeg`. */
export function destinationPoint(p: LatLng, headingDeg: number, meters: number): LatLng {
  const delta = meters / EARTH_RADIUS_M
  const theta = toRad(headingDeg)
  const phi1 = toRad(p.latitude)
  const lambda1 = toRad(p.longitude)
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta))
  const lambda2 = lambda1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2))
  return { latitude: toDeg(phi2), longitude: ((toDeg(lambda2) + 540) % 360) - 180 }
}

export interface Path {
  points: LatLng[]
  /** Metres from the start to each point (cum[0] = 0). */
  cum: number[]
  length: number
}

/** Builds a path from GeoJSON-style [longitude, latitude] coordinates, dropping repeated points. */
export function buildPath(coordinates: ReadonlyArray<readonly [number, number]>): Path {
  const points: LatLng[] = []
  for (const [longitude, latitude] of coordinates) {
    const p = { latitude, longitude }
    if (points.length === 0 || haversine(points[points.length - 1], p) >= 0.5) points.push(p)
  }
  if (points.length === 1) points.push({ ...points[0] })
  if (points.length === 0) points.push({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })
  const cum = [0]
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + haversine(points[i - 1], points[i]))
  return { points, cum, length: cum[cum.length - 1] }
}

export interface Projection {
  /** Metres from the path's start to the nearest point on it. */
  along: number
  /** Metres from the position to that point. */
  distance: number
  point: LatLng
  segmentIndex: number
}

/**
 * The nearest point on the path to `pos`. With `minAlong`, segments that end before that distance are
 * ignored, so a path that doubles back on itself cannot snap the rider backwards.
 */
export function projectOnPath(path: Path, pos: LatLng, minAlong = 0): Projection {
  let best: Projection | null = null
  for (let i = 0; i < path.points.length - 1; i++) {
    if (path.cum[i + 1] < minAlong) continue
    const a = path.points[i]
    const b = path.points[i + 1]
    const cosLat = Math.cos(toRad(a.latitude))
    const bx = toRad(b.longitude - a.longitude) * cosLat * EARTH_RADIUS_M
    const by = toRad(b.latitude - a.latitude) * EARTH_RADIUS_M
    const px = toRad(pos.longitude - a.longitude) * cosLat * EARTH_RADIUS_M
    const py = toRad(pos.latitude - a.latitude) * EARTH_RADIUS_M
    const len2 = bx * bx + by * by
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2))
    const dx = px - t * bx
    const dy = py - t * by
    const distance = Math.hypot(dx, dy)
    if (!best || distance < best.distance) {
      best = {
        along: path.cum[i] + t * (path.cum[i + 1] - path.cum[i]),
        distance,
        point: { latitude: a.latitude + t * (b.latitude - a.latitude), longitude: a.longitude + t * (b.longitude - a.longitude) },
        segmentIndex: i,
      }
    }
  }
  return best ?? { along: 0, distance: haversine(path.points[0], pos), point: path.points[0], segmentIndex: 0 }
}

export function pointAtAlong(path: Path, along: number): LatLng {
  const s = Math.max(0, Math.min(path.length, along))
  for (let i = 0; i < path.points.length - 1; i++) {
    if (s <= path.cum[i + 1] || i === path.points.length - 2) {
      const span = path.cum[i + 1] - path.cum[i]
      const t = span === 0 ? 0 : (s - path.cum[i]) / span
      const a = path.points[i]
      const b = path.points[i + 1]
      return { latitude: a.latitude + t * (b.latitude - a.latitude), longitude: a.longitude + t * (b.longitude - a.longitude) }
    }
  }
  return path.points[0]
}

/** Direction of travel on the path at a distance along it (looks a few metres ahead so it is stable). */
export function headingAtAlong(path: Path, along: number): number {
  const a = pointAtAlong(path, Math.max(0, along - 3))
  const b = pointAtAlong(path, Math.min(path.length, along + 8))
  return haversine(a, b) < 0.5 ? bearing(path.points[0], path.points[path.points.length - 1]) : bearing(a, b)
}

/** The path's points from `fromAlong` to `toAlong`, including the exact end points, as [lat, lng] pairs. */
export function slicePath(path: Path, fromAlong: number, toAlong: number): Array<[number, number]> {
  const from = Math.max(0, Math.min(path.length, fromAlong))
  const to = Math.max(from, Math.min(path.length, toAlong))
  const out: Array<[number, number]> = []
  const start = pointAtAlong(path, from)
  out.push([start.latitude, start.longitude])
  for (let i = 1; i < path.points.length - 1; i++) {
    if (path.cum[i] > from && path.cum[i] < to) out.push([path.points[i].latitude, path.points[i].longitude])
  }
  const end = pointAtAlong(path, to)
  out.push([end.latitude, end.longitude])
  return out
}
