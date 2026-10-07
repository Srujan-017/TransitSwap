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

const OSRM_BASE = env.OSRM_API_URL || "http://router.project-osrm.org"

const OSRM_PROFILE: Record<TransportMode, string> = {
  driving: "driving",
  walking: "foot",
  cycling: "bike",
}

export const routingService = {
  async getRoute(request: RouteRequest): Promise<NormalizedRoute[]> {
    const { origin, destination, mode = "driving" } = request
    const profile = OSRM_PROFILE[mode]
    const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
    const url = `${OSRM_BASE}/route/v1/${profile}/${coords}`

    let response
    try {
      response = await axios.get<OsrmResponse>(url, {
        params: { overview: "full", geometries: "geojson", steps: "true", alternatives: 3 },
        timeout: 10000,
      })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") {
          throw new AppError("Routing service timed out. Please try again.", 504)
        }
        if (err.response?.status === 429) {
          throw new AppError("Routing service is temporarily rate-limited. Please try again shortly.", 429)
        }
        throw new AppError("Routing service unavailable. Please try again later.", 502)
      }
      throw err
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

    return data.routes.map((r) => normalizeOsrmRoute(r, mode))
  },
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
