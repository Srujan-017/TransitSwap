import type { NavState } from "./engine"
import { buildStepInstruction } from "../utils/navigationInstructions"
import type { MultimodalRoute } from "../types/multimodal"

/**
 * What to say, and when. A prompt with empty text is not spoken: it only marks an earlier stage as done when the
 * rider first appears close to a manoeuvre, so a stale "in 200 metres" is never said after "in 50 metres".
 * Each prompt has a key and is spoken once per journey: "In 200 metres, turn right",
 * "In 50 metres, turn right", "Turn right now", "3 stops left", "Get off at the next stop" ... Pure, so the
 * timing is tested without a speaker.
 */

export interface Prompt {
  key: string
  text: string
}

export function spokenDistance(meters: number): string {
  if (meters >= 950) {
    const km = Math.round(meters / 100) / 10
    return `${km} kilometre${km === 1 ? "" : "s"}`
  }
  const rounded = meters >= 100 ? Math.round(meters / 50) * 50 : Math.round(meters / 10) * 10
  return `${rounded} metres`
}

const FAR_M = 200
const NEAR_M = 60
const NOW_M = 20

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export function promptsFor(state: NavState, ctx: { route: MultimodalRoute; profile?: string; spoken: ReadonlySet<string>; destinationName: string }): Prompt[] {
  const out: Prompt[] = []
  const add = (key: string, text: string) => {
    if (!ctx.spoken.has(key)) out.push({ key, text })
  }

  if (state.done || !state.leg) {
    add("arrived", `You have arrived at ${ctx.destinationName}.`)
    return out
  }

  const leg = state.leg
  const segment = leg.segment
  const isLast = state.legIndex === state.legCount - 1

  // Start of each leg: what to do.
  add(`leg:${leg.index}:start`, buildStepInstruction(segment, { profile: ctx.profile, isLast: false }))

  if (leg.mode === "walking" || leg.mode === "auto") {
    const next = state.next
    // Skip the "arrive" manoeuvre: the next leg's start prompt (or "arrived") covers it.
    if (next && next.maneuver.kind !== "arrive") {
      const k = leg.maneuvers.indexOf(next.maneuver)
      const base = `m:${leg.index}:${k}`
      const d = next.distanceMeters
      const text = lowerFirst(next.maneuver.text)
      if (d <= NOW_M) {
        add(`${base}:now`, `${next.maneuver.text} now.`)
        add(`${base}:near`, "")
        add(`${base}:far`, "")
      } else if (d <= NEAR_M) {
        add(`${base}:near`, `In ${spokenDistance(d)}, ${text}.`)
        add(`${base}:far`, "")
      } else if (d <= FAR_M) {
        add(`${base}:far`, `In ${spokenDistance(d)}, ${text}.`)
      }
    }
    if (isLast && state.remainingMeters <= NEAR_M && state.remainingMeters > NOW_M) add(`dest:${leg.index}:near`, `Your destination, ${ctx.destinationName}, is just ahead.`)
    return out
  }

  // Bus and metro.
  const t = state.transit
  const lineName = segment.transitDetails?.routeNumber ? `bus ${segment.transitDetails.routeNumber}` : "the metro"
  if (t) {
    if (t.phase === "waiting") {
      if (t.boardingInSeconds !== null && t.boardingInSeconds <= 60 && t.boardingInSeconds > -600) {
        add(`board:${leg.index}`, segment.mode === "bus" ? `Your bus is due. Board ${lineName}${segment.transitDetails?.towards ? ` toward ${segment.transitDetails.towards}` : ""}.` : "Your train is due. Board the metro.")
      }
    } else {
      if (t.nextLineChange && t.stopsLeft !== null && t.nextLineChange.distanceMeters < 1500) {
        add(`change:${leg.index}:${t.nextLineChange.station}`, `Next, change to the ${t.nextLineChange.toLine} at ${t.nextLineChange.station}.`)
      }
      if (t.stopsLeft !== null && t.nextStop) {
        if (t.stopsLeft === 1) add(`stops:${leg.index}:1`, `Get off at the next stop, ${segment.to.name}.`)
        else if (t.stopsLeft === 2) add(`stops:${leg.index}:2`, `2 stops left. Get off at ${segment.to.name}.`)
        else if (t.stopsLeft === 3) add(`stops:${leg.index}:3`, `3 stops left. Get off at ${segment.to.name}.`)
      }
      if (t.distanceToAlight <= 80) add(`alight:${leg.index}`, `Get off here, at ${segment.to.name}.`)
    }
  }
  return out
}
