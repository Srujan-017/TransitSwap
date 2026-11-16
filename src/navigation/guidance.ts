import type { NavState } from "./engine"

/**
 * What the banner at the top of the navigation screen says right now: an icon, the instruction, how far
 * away it is, and a second line of detail. Pure, so every situation (a turn, the end of a walk, waiting for a
 * bus, riding, the last stop, arrival) is tested without drawing anything.
 */

export type GuidanceIcon =
  | "straight" | "left" | "right" | "slight-left" | "slight-right" | "sharp-left" | "sharp-right" | "uturn" | "roundabout"
  | "flag" | "bus" | "metro" | "auto" | "walk" | "check"

export interface Guidance {
  icon: GuidanceIcon
  primary: string
  secondary?: string
  /** Metres to whatever the primary line is about; null when a distance makes no sense (waiting, arrived). */
  distanceMeters: number | null
}

function iconForDirection(direction?: string): GuidanceIcon {
  switch (direction) {
    case "left": return "left"
    case "right": return "right"
    case "slight left": return "slight-left"
    case "slight right": return "slight-right"
    case "sharp left": return "sharp-left"
    case "sharp right": return "sharp-right"
    case "uturn": return "uturn"
    default: return "straight"
  }
}

function minutesText(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60))
  return `${m} min`
}

export function describeGuidance(state: NavState, opts: { destinationName: string; rerouting?: boolean; profile?: string }): Guidance {
  if (state.done || !state.leg) {
    return { icon: "check", primary: "You have arrived", secondary: opts.destinationName, distanceMeters: null }
  }
  if (opts.rerouting) {
    return { icon: "straight", primary: "Rerouting…", secondary: "You left the route. Finding a new one.", distanceMeters: null }
  }

  const leg = state.leg
  const segment = leg.segment

  if (leg.mode === "walking" || leg.mode === "auto") {
    const next = state.next
    // A wheelchair rider rolls, not walks (the rest of the app says "Wheel" for the same reason).
    const verb = leg.mode === "walking" ? (opts.profile === "wheelchair" ? "Wheel" : "Walk") : "Ride"
    if (!next || next.maneuver.kind === "arrive") {
      return {
        icon: leg.mode === "walking" ? "flag" : "auto",
        primary: `${verb} to ${segment.to.name}`,
        secondary: state.street ? `Continue on ${state.street}` : undefined,
        distanceMeters: Math.round(next?.distanceMeters ?? state.remainingMeters),
      }
    }
    return {
      icon: next.maneuver.kind === "roundabout" ? "roundabout" : iconForDirection(next.maneuver.direction),
      primary: next.maneuver.text,
      secondary: state.street ? `Now on ${state.street}` : `Then ${verb.toLowerCase()} to ${segment.to.name}`,
      distanceMeters: Math.round(next.distanceMeters),
    }
  }

  // Bus or metro.
  const t = state.transit
  const details = segment.transitDetails
  const isBus = leg.mode === "bus"
  const icon: GuidanceIcon = isBus ? "bus" : "metro"
  const vehicle = isBus ? `bus ${details?.routeNumber ?? ""}`.trim() : "the metro"
  const direction = isBus && details?.towards ? ` towards ${details.towards}` : ""

  if (!t || t.phase === "waiting") {
    let secondary: string | undefined
    if (t && t.boardingInSeconds !== null && Math.abs(t.boardingInSeconds) < 3 * 3600) {
      secondary = t.boardingInSeconds > 30
        ? `${isBus ? "Bus" : "Train"} due in ${minutesText(t.boardingInSeconds)}${details?.estimatedBoardingTime ? ` (~${details.estimatedBoardingTime})` : ""}`
        : `${isBus ? "Bus" : "Train"} is due now`
      if (details?.upcomingBoardingTimes && details.upcomingBoardingTimes.length > 0) secondary += ` · next ~${details.upcomingBoardingTimes[0]}`
    } else if (details?.estimatedBoardingTime) {
      secondary = `Board at ~${details.estimatedBoardingTime}`
    } else if (details) {
      secondary = `${isBus ? "A bus" : "A train"} every ~${details.headwayMinutes ?? details.waitMinutes} min`
    }
    return { icon, primary: `Board ${vehicle}${direction} at ${segment.from.name}`, secondary, distanceMeters: null }
  }

  // Riding.
  const parts: string[] = []
  if (t.nextLineChange && t.nextLineChange.distanceMeters < 2000) parts.push(`Change to the ${t.nextLineChange.toLine} at ${t.nextLineChange.station}`)
  if (t.stopsLeft !== null) {
    parts.push(t.stopsLeft <= 1 ? "Get off at the next stop" : `${t.stopsLeft} stops left${t.nextStop ? ` · next ${t.nextStop}` : ""}`)
  }
  if (details?.estimatedArrivalTime && !parts.length) parts.push(`Arrives ~${details.estimatedArrivalTime}`)
  return {
    icon,
    primary: `Get off at ${segment.to.name}`,
    secondary: parts.join(" · ") || undefined,
    distanceMeters: Math.round(t.distanceToAlight),
  }
}

