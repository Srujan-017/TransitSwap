import { bearing, pointAtAlong, projectOnPath, turnAngle, type Path } from "./geo"
import type { TurnStep } from "../types/multimodal"

/**
 * Turns for a walking or auto leg. When the road router supplied turn-by-turn steps they are used (with
 * street names). Otherwise — offline, or the router was busy — the turns are worked out from the shape of
 * the path itself, so the screen can still say "turn right in 150 m", just without a street name.
 */

export type Direction = "left" | "right" | "slight left" | "slight right" | "sharp left" | "sharp right" | "straight" | "uturn"

export interface Maneuver {
  /** Metres from the start of the leg. */
  along: number
  kind: "turn" | "roundabout" | "fork" | "arrive"
  direction?: Direction
  street?: string
  /** "Turn right onto 80 Feet Road" */
  text: string
}

export interface StreetSpan {
  along: number
  street: string
}

export function directionFromAngle(angle: number): Direction {
  const a = Math.abs(angle)
  const side = angle >= 0 ? "right" : "left"
  if (a >= 160) return "uturn"
  if (a >= 120) return `sharp ${side}`
  if (a >= 60) return side
  return `slight ${side}`
}

function normalizeModifier(modifier?: string): Direction | undefined {
  switch (modifier) {
    case "left": case "right": case "slight left": case "slight right": case "sharp left": case "sharp right": case "straight": case "uturn":
      return modifier
    default:
      return undefined
  }
}

export function turnText(direction: Direction | undefined, street?: string): string {
  const onto = street ? ` onto ${street}` : ""
  switch (direction) {
    case "uturn": return "Make a U-turn" + (street ? ` onto ${street}` : "")
    case "straight": return street ? `Continue straight onto ${street}` : "Continue straight"
    case "slight left": return `Bear left${onto}`
    case "slight right": return `Bear right${onto}`
    case "sharp left": return `Turn sharply left${onto}`
    case "sharp right": return `Turn sharply right${onto}`
    case "left": return `Turn left${onto}`
    case "right": return `Turn right${onto}`
    default: return street ? `Continue onto ${street}` : "Continue"
  }
}

const TURN_THRESHOLD_DEG = 32
const WINDOW_M = 25
const MIN_GAP_M = 35

/** Turns found from the shape of the path alone. */
export function deriveManeuvers(path: Path, destinationName: string): Maneuver[] {
  const maneuvers: Maneuver[] = []
  let lastAlong = -Infinity
  for (let i = 1; i < path.points.length - 1; i++) {
    const s = path.cum[i]
    if (s < 10 || s > path.length - 10 || s - lastAlong < MIN_GAP_M) continue
    const before = pointAtAlong(path, Math.max(0, s - WINDOW_M))
    const after = pointAtAlong(path, Math.min(path.length, s + WINDOW_M))
    const here = path.points[i]
    const angle = turnAngle(bearing(before, here), bearing(here, after))
    if (Math.abs(angle) < TURN_THRESHOLD_DEG) continue
    const direction = directionFromAngle(angle)
    maneuvers.push({ along: s, kind: "turn", direction, text: turnText(direction) })
    lastAlong = s
  }
  maneuvers.push({ along: path.length, kind: "arrive", text: `Arrive at ${destinationName}` })
  return maneuvers
}

/** Turns (and the street the rider is on) from the road router's steps. */
export function maneuversFromSteps(path: Path, steps: TurnStep[], destinationName: string): { maneuvers: Maneuver[]; streets: StreetSpan[] } {
  const maneuvers: Maneuver[] = []
  const streets: StreetSpan[] = []
  let minAlong = 0
  for (const step of steps) {
    const [longitude, latitude] = step.location
    const along = projectOnPath(path, { latitude, longitude }, Math.max(0, minAlong - 5)).along
    minAlong = Math.max(minAlong, along)
    if (step.street) streets.push({ along, street: step.street })
    const direction = normalizeModifier(step.modifier)
    switch (step.type) {
      case "depart":
      case "arrive":
        break
      case "turn":
      case "end of road":
      case "ramp":
      case "on ramp":
      case "off ramp":
      case "merge":
        if (direction && direction !== "straight") maneuvers.push({ along, kind: "turn", direction, street: step.street, text: turnText(direction, step.street) })
        break
      case "fork":
        if (direction && direction !== "straight") {
          maneuvers.push({ along, kind: "fork", direction, street: step.street, text: `Keep ${direction.includes("left") ? "left" : "right"} at the fork${step.street ? ` onto ${step.street}` : ""}` })
        }
        break
      case "roundabout":
      case "rotary":
      case "roundabout turn":
        maneuvers.push({ along, kind: "roundabout", direction, street: step.street, text: step.street ? `Take the roundabout onto ${step.street}` : "Take the roundabout" })
        break
      default:
        // "new name", "continue", "notification" ...: no announcement, but the street name is kept above.
        break
    }
  }
  maneuvers.sort((a, b) => a.along - b.along)
  maneuvers.push({ along: path.length, kind: "arrive", text: `Arrive at ${destinationName}` })
  return { maneuvers, streets }
}

/** The name of the street at a distance along the leg, from the router's steps, if any. */
export function streetAt(streets: StreetSpan[], along: number): string | undefined {
  let current: string | undefined
  for (const span of streets) {
    if (span.along <= along + 1) current = span.street
    else break
  }
  return current
}
