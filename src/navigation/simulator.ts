import { destinationPoint, headingAtAlong, pointAtAlong } from "./geo"
import type { Fix, NavLeg } from "./engine"

/**
 * A simulated journey: a rider who follows the route exactly, at a realistic speed for each leg, and waits at
 * a bus or metro stop until the vehicle is due. It lets the whole navigation — turns, voice, bus countdown,
 * arrival — be demonstrated indoors, where a laptop's GPS never moves. Shown as a demo wherever it is used.
 */

export interface SimPoint {
  fix: Fix
  /** The simulated time of day. */
  clock: Date
  waiting: boolean
  finished: boolean
}

export interface Simulation {
  /** Simulated seconds from the start to the end of the journey. */
  totalSeconds: number
  at(simSeconds: number): SimPoint
}

const WALK_SPEED_MPS = 1.4
const MAX_BOARDING_WAIT_S = 20 * 60

interface Phase {
  legIndex: number
  startS: number
  waitS: number
  travelS: number
}

export function buildSimulation(legs: NavLeg[], startAt: Date): Simulation {
  const phases: Phase[] = []
  let t = 0
  for (const leg of legs) {
    const segment = leg.segment
    const isTransit = leg.mode === "bus" || leg.mode === "metro"
    let waitS = 0
    if (isTransit && segment.transitDetails?.boardingAtIso) {
      const untilBoarding = (new Date(segment.transitDetails.boardingAtIso).getTime() - (startAt.getTime() + t * 1000)) / 1000
      waitS = Math.max(0, Math.min(MAX_BOARDING_WAIT_S, untilBoarding))
    }
    let travelS: number
    if (leg.mode === "walking") travelS = leg.path.length / WALK_SPEED_MPS
    else if (isTransit) travelS = Math.max(60, segment.durationSeconds - (segment.transitDetails?.waitMinutes ?? 0) * 60)
    else travelS = segment.durationSeconds > 0 ? segment.durationSeconds : leg.path.length / 8
    travelS = Math.max(1, travelS)
    phases.push({ legIndex: leg.index, startS: t, waitS, travelS })
    t += waitS + travelS
  }
  const totalSeconds = t

  return {
    totalSeconds,
    at(simSeconds: number): SimPoint {
      const clock = new Date(startAt.getTime() + simSeconds * 1000)
      if (legs.length === 0) {
        return { fix: { latitude: 0, longitude: 0 }, clock, waiting: false, finished: true }
      }
      if (simSeconds >= totalSeconds) {
        const last = legs[legs.length - 1]
        const end = last.path.points[last.path.points.length - 1]
        return { fix: { latitude: end.latitude, longitude: end.longitude, accuracy: 8, heading: headingAtAlong(last.path, last.path.length), speed: 0 }, clock, waiting: false, finished: true }
      }
      let phase = phases[0]
      for (const p of phases) if (simSeconds >= p.startS) phase = p
      const leg = legs[phase.legIndex]
      const inLeg = simSeconds - phase.startS
      const waiting = inLeg < phase.waitS
      const progress = waiting ? 0 : Math.min(1, (inLeg - phase.waitS) / phase.travelS)
      const along = leg.path.length * progress
      const point = pointAtAlong(leg.path, along)
      return {
        fix: { latitude: point.latitude, longitude: point.longitude, accuracy: 8, heading: headingAtAlong(leg.path, along), speed: waiting ? 0 : leg.path.length / phase.travelS },
        clock,
        waiting,
        finished: false,
      }
    },
  }
}

/** A fix moved sideways off the route by `meters` (to demonstrate going off route). */
export function displaceFix(fix: Fix, meters: number): Fix {
  const heading = fix.heading ?? 0
  const moved = destinationPoint(fix, (heading + 90) % 360, meters)
  return { ...fix, latitude: moved.latitude, longitude: moved.longitude }
}
