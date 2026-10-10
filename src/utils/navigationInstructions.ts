import type { MultimodalRoute, RouteSegment } from "../types/multimodal"

/**
 * Builds natural spoken/display text for one step of active, voice-guided
 * navigation (see ActiveNavigationView.tsx), from fields the route already
 * carries — never fabricates a fact the backend didn't already compute.
 *
 * The wheelchair "Walk" -> "Wheel" rewording duplicates the one-line regex
 * SegmentTimeline.tsx's displayInstruction() already does, rather than
 * refactoring that already-shipped function, so this addition can never
 * change that file's existing behavior.
 */
export function buildStepInstruction(
  segment: RouteSegment,
  opts: { profile?: string; isLast?: boolean } = {},
): string {
  const { profile, isLast = false } = opts
  const isWheelchairWalk = segment.mode === "walking" && profile === "wheelchair"
  const verb = isWheelchairWalk ? "Wheel" : "Walk"

  let text: string
  switch (segment.mode) {
    case "walking": {
      const distance = segment.distanceMeters < 1000
        ? `${Math.round(segment.distanceMeters)} m`
        : `${(segment.distanceMeters / 1000).toFixed(1)} km`
      text = `${verb} ${distance} toward ${segment.to.name}.`
      break
    }
    case "metro": {
      const stops = segment.transitDetails?.stopCount
      const line = segment.transitDetails?.lineName
      text = `Take the metro from ${segment.from.name} to ${segment.to.name}` +
        (typeof stops === "number" ? ` — ${stops} stop${stops === 1 ? "" : "s"}` : "") +
        (line ? ` on the ${line}.` : ".")
      break
    }
    case "bus": {
      const { routeNumber, towards } = segment.transitDetails ?? {}
      text = routeNumber
        ? `Take bus ${routeNumber}${towards ? ` toward ${towards}` : ""} from ${segment.from.name}.`
        : segment.instruction
      break
    }
    case "auto": {
      text = `Take an auto toward ${segment.to.name}.`
      break
    }
    default: {
      text = segment.instruction
    }
  }

  if (isLast) {
    text += ` You have arrived at ${segment.to.name}.`
  }

  return text
}

export function buildArrivalAnnouncement(route: MultimodalRoute): string {
  const last = route.segments[route.segments.length - 1]
  const destination = last?.to.name ?? "your destination"
  return `You've arrived at ${destination}.`
}
