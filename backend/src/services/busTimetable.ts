import { BUS_ROUTES, getStop, type BusRoute } from "../data/transitData"

/**
 * A synthetic bus timetable, generated from each route's own schedule fields (transitData.ts).
 * Nothing here is BMTC data — it exists so the app can say "bus 500D leaves Hebbal at 08:42, 08:48
 * and 08:54, and reaches Silk Board at 09:31" instead of only "runs every ~10 min".
 *
 * Model:
 *  - buses leave a route's first stop from `firstBus` to `lastBus` (default 05:30-22:30), spaced by
 *    the peak headway on weekday mornings and evenings (07:00-10:00, 17:00-20:00) and the off-peak
 *    headway otherwise; the other direction leaves the last stop at the same times;
 *  - a bus reaches each later stop after the travel time along the stops (distance x the bus
 *    distance factor at BUS_SPEED_MPS, plus half a minute of dwell per intermediate stop).
 * All times are local (the server and the rider are assumed to share the demonstration city's clock).
 */

export const BUS_SPEED_MPS = 6
export const BUS_DISTANCE_FACTOR = 1.35
const DWELL_MINUTES_PER_STOP = 0.5
const DEFAULT_FIRST = "05:30"
const DEFAULT_LAST = "22:30"
const PEAK_RANGES: Array<[number, number]> = [[7 * 60, 10 * 60], [17 * 60, 20 * 60]]

export interface BusDeparture {
  /** When the bus is at the boarding stop. */
  board: Date
  /** When the same bus reaches the stop where the rider gets off. */
  arrive: Date
}

function toMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number)
  return h * 60 + (m || 0)
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const rad = (d: number) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6
}

function isPeak(date: Date): boolean {
  if (isWeekend(date)) return false
  const minute = date.getHours() * 60 + date.getMinutes()
  return PEAK_RANGES.some(([from, to]) => minute >= from && minute < to)
}

export function offPeakHeadway(route: BusRoute): number {
  return route.frequencyMinutes
}

export function peakHeadway(route: BusRoute): number {
  return route.peakFrequencyMinutes ?? Math.max(4, Math.round(route.frequencyMinutes * 0.6))
}

/** Minutes between buses at a moment (peak on weekday mornings/evenings, off-peak otherwise). */
export function headwayAt(route: BusRoute, when: Date): number {
  return isPeak(when) ? peakHeadway(route) : offPeakHeadway(route)
}

export function serviceWindow(route: BusRoute): { first: string; last: string } {
  return { first: route.firstBus ?? DEFAULT_FIRST, last: route.lastBus ?? DEFAULT_LAST }
}

/** Minutes a bus takes from the route's first stop to the stop at `index`. */
export function minutesFromFirstStop(route: BusRoute, index: number): number {
  let meters = 0
  for (let i = 0; i < index; i++) {
    const from = getStop(route.stops[i])
    const to = getStop(route.stops[i + 1])
    if (!from || !to) return Infinity
    meters += haversine(from.latitude, from.longitude, to.latitude, to.longitude)
  }
  return (meters * BUS_DISTANCE_FACTOR) / BUS_SPEED_MPS / 60 + Math.max(0, index - 1) * DWELL_MINUTES_PER_STOP
}

/** Departure times (minutes after midnight) from a terminus on the day of `day`. */
function terminusDepartures(route: BusRoute, day: Date): Date[] {
  const { first, last } = serviceWindow(route)
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const out: Date[] = []
  let t = new Date(start.getTime() + toMinutes(first) * 60_000)
  const end = new Date(start.getTime() + toMinutes(last) * 60_000)
  while (t.getTime() <= end.getTime()) {
    out.push(t)
    t = new Date(t.getTime() + headwayAt(route, t) * 60_000)
  }
  return out
}

/**
 * The next `count` buses of `route` from `fromStopId` towards `toStopId` that leave at or after
 * `notBefore`, each with when it reaches `toStopId`. Empty when the last bus has gone (for that
 * day). `routeId` and both stops must belong together; otherwise returns [].
 */
export function nextBuses(routeId: string, fromStopId: string, toStopId: string, notBefore: Date, count = 3): BusDeparture[] {
  const route = BUS_ROUTES.find((r) => r.id === routeId)
  if (!route) return []
  const fromIndex = route.stops.indexOf(fromStopId)
  const toIndex = route.stops.indexOf(toStopId)
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return []

  // Minutes from the terminus the bus starts at (in this direction) to a stop.
  const forward = fromIndex < toIndex
  const total = minutesFromFirstStop(route, route.stops.length - 1)
  const fromStart = (index: number) => (forward ? minutesFromFirstStop(route, index) : total - minutesFromFirstStop(route, index))
  const boardOffset = fromStart(fromIndex)
  const alightOffset = fromStart(toIndex)
  if (!Number.isFinite(boardOffset) || !Number.isFinite(alightOffset)) return []

  // Only the buses of the day `notBefore` falls on: once the last one has gone the service has ended
  // (a rider planning for tomorrow morning passes tomorrow's date).
  const result: BusDeparture[] = []
  for (const departure of terminusDepartures(route, notBefore)) {
    const board = new Date(departure.getTime() + boardOffset * 60_000)
    if (board.getTime() < notBefore.getTime()) continue
    result.push({ board, arrive: new Date(departure.getTime() + alightOffset * 60_000) })
    if (result.length === count) break
  }
  return result
}

export function routeByNumber(number: string): BusRoute | undefined {
  return BUS_ROUTES.find((r) => r.number === number)
}
