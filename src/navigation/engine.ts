import { buildPath, haversine, headingAtAlong, pointAtAlong, projectOnPath, type LatLng, type Path } from "./geo"
import { deriveManeuvers, maneuversFromSteps, streetAt, type Maneuver, type StreetSpan } from "./maneuvers"
import type { MultimodalMode, MultimodalRoute, RouteSegment } from "../types/multimodal"

/**
 * The navigation engine: given a route and where the rider is, work out where they are on it, what
 * happens next, how far there is to go and when they will arrive. Pure functions — no browser APIs — so
 * it is tested directly and driven the same way by the real GPS and by the simulated journey.
 */

export interface TransitStop {
  name: string
  /** Metres from the start of the leg. */
  along: number
}

export interface NavLeg {
  index: number
  segment: RouteSegment
  mode: MultimodalMode
  path: Path
  maneuvers: Maneuver[]
  streets: StreetSpan[]
  /** Stops of a bus or metro leg, in order, with where they are along the leg. */
  stops: TransitStop[]
  /** Metro: where the rider changes to another line. */
  lineChanges: Array<{ station: string; toLine: string; along: number }>
}

export interface Fix extends LatLng {
  /** GPS accuracy in metres. */
  accuracy?: number
  /** Direction of travel in degrees, when the device reports it. */
  heading?: number | null
  speed?: number | null
}

export interface Progress {
  legIndex: number
  /** Metres along the current leg. */
  along: number
}

export interface NavState {
  done: boolean
  legIndex: number
  legCount: number
  leg: NavLeg | null
  along: number
  /** Where to draw the rider: on the route when close to it, otherwise where the GPS says. */
  position: LatLng
  heading: number | null
  /** How far the rider is from the current leg's path, in metres. */
  offRouteMeters: number
  remainingMeters: number
  remainingSeconds: number
  arrivalAt: Date
  /** Walking and auto legs: the next manoeuvre and how far away it is. */
  next: { maneuver: Maneuver; distanceMeters: number } | null
  street?: string
  /** Bus and metro legs. */
  transit?: {
    phase: "waiting" | "riding"
    /** Seconds until the bus is due, when its time is known (negative once due). */
    boardingInSeconds: number | null
    stopsLeft: number | null
    nextStop: string | null
    /** Metres to the stop where the rider gets off. */
    distanceToAlight: number
    nextLineChange: { station: string; toLine: string; distanceMeters: number } | null
  }
}

/** Close enough to the end of a leg to count it as done, by mode (buses and metro: the stop is a big place). */
export const ARRIVAL_RADIUS_M: Record<MultimodalMode, number> = { walking: 25, auto: 40, bus: 60, metro: 60 }
/** Further than this from the route (or more than the GPS accuracy allows) counts as off route. */
export const OFF_ROUTE_M = 50
/** Within this distance of a bus/metro leg's start the rider is still waiting at the stop. */
const WAITING_ALONG_M = 40

export function offRouteThreshold(accuracy?: number): number {
  return Math.max(OFF_ROUTE_M, accuracy ? accuracy * 1.5 : 0)
}

export function buildNavLegs(route: MultimodalRoute): NavLeg[] {
  return route.segments.map((segment, index) => {
    const path = buildPath(segment.geometry.coordinates)
    const isTransit = segment.mode === "bus" || segment.mode === "metro"
    let maneuvers: Maneuver[] = []
    let streets: StreetSpan[] = []
    if (!isTransit) {
      if (segment.steps && segment.steps.length > 0) {
        const fromSteps = maneuversFromSteps(path, segment.steps, segment.to.name)
        maneuvers = fromSteps.maneuvers
        streets = fromSteps.streets
      } else {
        maneuvers = deriveManeuvers(path, segment.to.name)
      }
    } else {
      maneuvers = [{ along: path.length, kind: "arrive", text: `Get off at ${segment.to.name}` }]
    }

    const stops: TransitStop[] = []
    const lineChanges: NavLeg["lineChanges"] = []
    const details = segment.transitDetails
    if (isTransit && details) {
      if (details.stopPoints && details.stopPoints.length > 0) {
        let minAlong = 0
        for (const point of details.stopPoints) {
          const along = projectOnPath(path, point, Math.max(0, minAlong - 1)).along
          minAlong = Math.max(minAlong, along)
          stops.push({ name: point.name, along })
        }
      } else if (details.stops.length > 0) {
        // No coordinates for the stops: spread them evenly along the leg.
        details.stops.forEach((name, k) => stops.push({ name, along: details.stops.length === 1 ? path.length : (path.length * k) / (details.stops.length - 1) }))
      }
      if (stops.length > 0) stops[stops.length - 1].along = Math.max(stops[stops.length - 1].along, path.length - 1)
      for (const change of details.lineChanges ?? []) {
        const stop = stops.find((s) => s.name === change.station)
        if (stop) lineChanges.push({ station: change.station, toLine: change.toLine, along: stop.along })
      }
    }
    return { index, segment, mode: segment.mode, path, maneuvers, streets, stops, lineChanges }
  })
}

export function initialProgress(): Progress {
  return { legIndex: 0, along: 0 }
}

function endOf(leg: NavLeg): LatLng {
  return leg.path.points[leg.path.points.length - 1]
}

/**
 * Where the rider is on the route, given a position fix and where they were. Moves on to the next leg when
 * the end of the current one is reached, and jumps ahead if the rider is plainly further along (for example
 * they took an auto instead of the walk).
 */
export function navigate(legs: NavLeg[], fix: Fix, prev: Progress, now: Date): NavState {
  let legIndex = Math.min(prev.legIndex, legs.length)
  let along = prev.along

  if (legIndex < legs.length) {
    let leg = legs[legIndex]
    let proj = projectOnPath(leg.path, fix, Math.max(0, along - 25))

    // Far from the current leg but right on a later one: the rider has moved on.
    if (proj.distance > 80) {
      for (let k = legIndex + 1; k < Math.min(legs.length, legIndex + 3); k++) {
        const candidate = projectOnPath(legs[k].path, fix)
        if (candidate.distance < 30 && candidate.distance < proj.distance - 40) {
          legIndex = k
          leg = legs[k]
          proj = candidate
          along = 0
          break
        }
      }
    }
    along = proj.along > along - 25 ? Math.max(along, proj.along) : along

    // Reached the end of the leg (or the last few metres of it): on to the next.
    while (legIndex < legs.length) {
      const current = legs[legIndex]
      const closeToEnd = haversine(fix, endOf(current)) <= ARRIVAL_RADIUS_M[current.mode]
      const remaining = current.path.length - along
      const wholeLegIsTiny = current.path.length <= ARRIVAL_RADIUS_M[current.mode] && along > 0
      if (closeToEnd && (current.mode === "walking" || current.mode === "auto" || along > WAITING_ALONG_M || wholeLegIsTiny) || remaining <= 8) {
        legIndex += 1
        along = 0
      } else {
        break
      }
    }
  }

  if (legIndex >= legs.length) {
    return {
      done: true, legIndex: legs.length, legCount: legs.length, leg: null, along: 0, position: { latitude: fix.latitude, longitude: fix.longitude },
      heading: null, offRouteMeters: 0, remainingMeters: 0, remainingSeconds: 0, arrivalAt: now, next: null,
    }
  }

  const leg = legs[legIndex]
  const proj = projectOnPath(leg.path, fix, Math.max(0, along - 25))
  // A rider who has only just moved on to this leg (the previous one ends up to 60 m before its last point) is
  // still on the previous leg's path: that is not "off route".
  const previousDistance = legIndex > 0 ? projectOnPath(legs[legIndex - 1].path, fix).distance : Infinity
  const offRouteMeters = Math.min(proj.distance, previousDistance)
  const onRoute = proj.distance <= offRouteThreshold(fix.accuracy)
  const position = onRoute ? pointAtAlong(leg.path, along) : { latitude: fix.latitude, longitude: fix.longitude }
  const reportedHeading = fix.heading !== null && fix.heading !== undefined && Number.isFinite(fix.heading) && (fix.speed ?? 1) > 0.5 ? fix.heading : null
  const heading = reportedHeading ?? headingAtAlong(leg.path, along)

  const legRemaining = Math.max(0, leg.path.length - along)
  let remainingMeters = legRemaining
  let remainingSeconds = leg.path.length > 0 ? leg.segment.durationSeconds * (legRemaining / leg.path.length) : 0
  // A bus or train leg's duration includes a standing allowance for the wait. Once the rider is waiting for a
  // vehicle with a known time, what is left is the time until it is due plus the ride; once riding, only the
  // ride. This keeps the arrival time steady instead of drifting while waiting and then jumping while riding.
  if (leg.mode === "bus" || leg.mode === "metro") {
    const waitSeconds = (leg.segment.transitDetails?.waitMinutes ?? 0) * 60
    const rideSeconds = Math.max(30, leg.segment.durationSeconds - waitSeconds)
    const boardingIso = leg.segment.transitDetails?.boardingAtIso
    if (along >= WAITING_ALONG_M) {
      remainingSeconds = leg.path.length > 0 ? rideSeconds * (legRemaining / leg.path.length) : 0
    } else if (boardingIso) {
      remainingSeconds = Math.max(0, (new Date(boardingIso).getTime() - now.getTime()) / 1000) + rideSeconds
    }
  }
  for (let k = legIndex + 1; k < legs.length; k++) {
    remainingMeters += legs[k].path.length
    remainingSeconds += legs[k].segment.durationSeconds
  }

  const isTransit = leg.mode === "bus" || leg.mode === "metro"
  let next: NavState["next"] = null
  let transit: NavState["transit"]
  if (!isTransit) {
    const upcoming = leg.maneuvers.find((m) => m.along > along + 2) ?? leg.maneuvers[leg.maneuvers.length - 1]
    next = upcoming ? { maneuver: upcoming, distanceMeters: Math.max(0, upcoming.along - along) } : null
  } else {
    const boardingIso = leg.segment.transitDetails?.boardingAtIso
    const phase = along < WAITING_ALONG_M ? "waiting" : "riding"
    const ahead = leg.stops.filter((s) => s.along > along + 8)
    const change = leg.lineChanges.find((c) => c.along > along + 8)
    transit = {
      phase,
      boardingInSeconds: boardingIso ? Math.round((new Date(boardingIso).getTime() - now.getTime()) / 1000) : null,
      stopsLeft: leg.stops.length > 0 ? ahead.length : null,
      nextStop: ahead[0]?.name ?? null,
      distanceToAlight: legRemaining,
      nextLineChange: change ? { station: change.station, toLine: change.toLine, distanceMeters: change.along - along } : null,
    }
  }

  return {
    done: false, legIndex, legCount: legs.length, leg, along, position, heading,
    offRouteMeters,
    remainingMeters, remainingSeconds, arrivalAt: new Date(now.getTime() + remainingSeconds * 1000),
    next, street: streetAt(leg.streets, along), transit,
  }
}

/** Skips to the start of the next leg (the manual "Next step" button, for when GPS is not helping). */
export function skipLeg(legs: NavLeg[], prev: Progress): Progress {
  return { legIndex: Math.min(prev.legIndex + 1, legs.length), along: 0 }
}
