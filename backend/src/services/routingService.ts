import axios from "axios"
import type {
  NormalizedRoute,
  RouteRequest,
  TransportMode,
  OsrmResponse,
  OsrmRoute,
  OsrmStep,
  RouteLeg,
  RouteStep,
} from "../types/routing"
import { AppError } from "../middleware/errorHandler"
import { env } from "../config/env"

const OSRM_PROFILE: Record<TransportMode, string> = {
  driving: "driving",
  walking: "foot",
  cycling: "bike",
}

// The public demo server (router.project-osrm.org) only carries the CAR network: whatever profile is asked for, it answers
// with a driving route. A "walking" request therefore came back at car speed (1.5 km in 3 minutes), the walking-speed check
// in multimodalService rejected it as implausible, and every walking leg fell back to a straight line drawn through
// buildings. The FOSSGIS community servers run one OSRM per network (car, foot, bike), so each mode asks the right one.
const DEMO_SERVER_HOST = "router.project-osrm.org"
const DEMO_SERVER = "https://router.project-osrm.org"
const DEFAULT_OSRM_BASE: Record<TransportMode, string> = {
  driving: "https://routing.openstreetmap.de/routed-car",
  walking: "https://routing.openstreetmap.de/routed-foot",
  cycling: "https://routing.openstreetmap.de/routed-bike",
}

/**
 * Which OSRM server answers a request for this mode. A custom OSRM_API_URL (for example a self-hosted server with all three
 * profiles) is used as given; the public demo server is treated as "not set", because it cannot route on foot or by bike.
 */
export function osrmBaseFor(mode: TransportMode, configured: string = env.OSRM_API_URL): string {
  const custom = configured.trim()
  if (custom && !custom.includes(DEMO_SERVER_HOST)) return custom.replace(/\/+$/, "")
  return DEFAULT_OSRM_BASE[mode]
}

// The community servers ask clients to identify themselves.
const OSRM_USER_AGENT = "TransitSwap/1.0 (student project; https://github.com/Srujan-017/TransitSwap)"

export interface OsrmCandidate {
  base: string
  /** True for the car-only demo server asked about walking or cycling: its street geometry is usable, its times are not. */
  carNetworkOnly: boolean
}

/**
 * The servers to try, best first. The right network for the mode; then, if that one is down, the public demo server, whose car
 * network still follows real streets. A walk drawn along the streets (with its time worked out at walking speed) is far better
 * than a straight line through buildings. A custom OSRM_API_URL is trusted on its own.
 */
export function osrmCandidatesFor(mode: TransportMode, configured: string = env.OSRM_API_URL): OsrmCandidate[] {
  const primary = osrmBaseFor(mode, configured)
  if (primary !== DEFAULT_OSRM_BASE[mode]) return [{ base: primary, carNetworkOnly: false }]
  return [
    { base: primary, carNetworkOnly: false },
    { base: DEMO_SERVER, carNetworkOnly: mode !== "driving" },
  ]
}

// One journey search asks for 7 to 15 road legs at once. Sent all together, the community server answered some of them
// with 429 (too many requests), and those legs fell back to straight lines. So requests go out a few at a time, and a 429 or
// a busy-server answer is retried after a short wait (honouring Retry-After) before giving up.
export const OSRM_MAX_CONCURRENT = 2
const OSRM_MAX_ATTEMPTS = 3
const OSRM_TIMEOUT_MS = 6000
let osrmInFlight = 0
const osrmQueue: Array<() => void> = []

async function withOsrmSlot<T>(task: () => Promise<T>): Promise<T> {
  if (osrmInFlight >= OSRM_MAX_CONCURRENT) await new Promise<void>((resolve) => osrmQueue.push(resolve))
  osrmInFlight++
  try {
    return await task()
  } finally {
    osrmInFlight--
    osrmQueue.shift()?.()
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** How long to wait before the next attempt: the server's Retry-After if it sent one (capped), else a growing pause. */
function retryDelayMs(retryAfter: unknown, attempt: number): number {
  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 3000)
  return 500 * attempt
}

// A server that does not answer is skipped for a minute instead of making every leg of every search wait for its timeout
// (a search asks for up to 15 legs: all of them waiting 6 s each would make a journey search take a minute).
const OSRM_DOWN_FOR_MS = 60_000
const osrmDownUntil = new Map<string, number>()
export function resetOsrmHealthForTesting(): void {
  osrmDownUntil.clear()
}

/** A server that timed out, refused the connection or failed on its side (not a "no route here" answer, and not a 429). */
function isServerDown(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false
  const status = err.response?.status
  if (status === undefined) return true // timeout, DNS, refused, reset
  return status >= 500
}

/** The demo server's street geometry, with times worked out at the speed of the mode actually asked for. */
const SPEED_MPS: Partial<Record<TransportMode, number>> = { walking: 1.25, cycling: 4.2 }
function atTravelSpeed(routes: OsrmRoute[], mode: TransportMode): OsrmRoute[] {
  const speed = SPEED_MPS[mode]
  if (!speed) return routes
  return routes.map((route) => {
    const factor = route.duration > 0 ? route.distance / speed / route.duration : 1
    return {
      ...route,
      duration: route.distance / speed,
      legs: route.legs.map((leg) => ({
        ...leg,
        duration: leg.distance / speed,
        steps: leg.steps.map((step) => ({ ...step, duration: step.duration * factor })),
      })),
    }
  })
}

export const routingService = {
  async getRoute(request: RouteRequest): Promise<NormalizedRoute[]> {
    const { origin, destination, mode = "driving" } = request
    const profile = OSRM_PROFILE[mode]
    const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`

    let response: { data: OsrmResponse } | undefined
    let carNetworkOnly = false
    let lastError: unknown
    for (const candidate of osrmCandidatesFor(mode)) {
      if ((osrmDownUntil.get(candidate.base) ?? 0) > Date.now()) continue
      const url = `${candidate.base}/route/v1/${profile}/${coords}`
      try {
        response = await requestWithRetry(url)
        carNetworkOnly = candidate.carNetworkOnly
        break
      } catch (err: unknown) {
        lastError = err
        if (isServerDown(err)) osrmDownUntil.set(candidate.base, Date.now() + OSRM_DOWN_FOR_MS)
        else if (!axios.isAxiosError(err)) throw err
        else break // a definite answer (such as a persistent 429 or a 4xx): another server would not change it
      }
    }

    if (!response) {
      if (lastError && axios.isAxiosError(lastError)) {
        if (lastError.code === "ECONNABORTED" || lastError.code === "ETIMEDOUT") throw new AppError("Routing service timed out. Please try again.", 504)
        if (lastError.response?.status === 429) throw new AppError("Routing service is temporarily rate-limited. Please try again shortly.", 429)
      }
      throw new AppError("Routing service unavailable. Please try again later.", 502)
    }

    const data = response.data

    if (data.code !== "Ok") {
      const msg =
        data.code === "NoRoute"
          ? "No route could be found between the two locations."
          : data.message || "Routing service returned an error."
      throw new AppError(msg, 422)
    }

    if (!data.routes || data.routes.length === 0) {
      throw new AppError("No route found between the specified locations.", 404)
    }

    const routes = carNetworkOnly ? atTravelSpeed(data.routes, mode) : data.routes
    return routes.map((r) => normalizeOsrmRoute(r, mode))
  },
}

/** One request to one server, a few at a time, retrying a 429 or a busy-server answer after a short wait. Throws the last axios error. */
async function requestWithRetry(url: string): Promise<{ data: OsrmResponse }> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await withOsrmSlot(() =>
        axios.get<OsrmResponse>(url, {
          params: { overview: "full", geometries: "geojson", steps: "true", alternatives: 3 },
          timeout: OSRM_TIMEOUT_MS,
          headers: { "User-Agent": OSRM_USER_AGENT },
        }),
      )
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined
      const retryable = status === 429 || status === 502 || status === 503 || status === 504
      if (!(axios.isAxiosError(err) && retryable && attempt < OSRM_MAX_ATTEMPTS)) throw err
      await sleep(retryDelayMs(err.response?.headers?.["retry-after"], attempt))
    }
  }
}

function normalizeOsrmRoute(route: OsrmRoute, mode: TransportMode): NormalizedRoute {
  return {
    id: crypto.randomUUID(),
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    geometry: {
      type: "LineString",
      coordinates: route.geometry.coordinates,
    },
    legs: route.legs.map((leg): RouteLeg => ({
      distanceMeters: Math.round(leg.distance),
      durationSeconds: Math.round(leg.duration),
      steps: leg.steps.map((step): RouteStep => ({
        instruction: buildInstruction(step),
        distanceMeters: Math.round(step.distance),
        durationSeconds: Math.round(step.duration),
        mode,
        ...(step.maneuver.location
          ? { maneuver: { type: step.maneuver.type, modifier: step.maneuver.modifier, location: step.maneuver.location } }
          : {}),
        ...(step.name ? { name: step.name } : {}),
      })),
    })),
    provider: "osrm",
    mode,
  }
}

const MANEUVER_ACTIONS: Record<string, string> = {
  depart: "Head",
  arrive: "You have arrived",
  turn: "Turn",
  "new name": "Continue",
  merge: "Merge",
  "on ramp": "Take the on-ramp",
  "off ramp": "Take the off-ramp",
  fork: "Take the fork",
  "end of road": "At the end of the road, turn",
  "use lane": "Use the lane",
  roundabout: "Enter the roundabout",
  rotary: "Enter the rotary",
  "exit roundabout": "Exit the roundabout",
  "exit rotary": "Exit the rotary",
  continue: "Continue",
  notification: "Continue",
}

function buildInstruction(step: OsrmStep): string {
  const type = step.maneuver.type
  const modifier = step.maneuver.modifier
  const name = step.name

  if (type === "arrive") return "Arrive at your destination"

  let action = MANEUVER_ACTIONS[type] ?? "Continue"
  if ((type === "turn" || type === "fork" || type === "end of road") && modifier) {
    action = `Turn ${modifier}`
  }
  if (type === "depart" && modifier) {
    action = `Head ${modifier}`
  }

  return name ? `${action} onto ${name}` : action
}
