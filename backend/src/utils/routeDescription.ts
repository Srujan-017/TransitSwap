import type { MultimodalRoute } from "../types/multimodal"

/**
 * Short, human-readable description of a route's transit legs, e.g.
 * "Hoodi Metro → Trinity Metro (metro), then auto". Used to tell a rider WHICH
 * candidate route was excluded — the generic mode summary on the route itself
 * ("🚶 Walk → 🚇 Metro → 🚶 Walk") names no stations, so two excluded routes
 * through different stations would be indistinguishable.
 */
export function describeRoute(route: MultimodalRoute): string {
  const legs = route.segments.filter((segment) => segment.mode !== "walking")
  if (legs.length === 0) return "Walking only"

  return legs
    .map((segment) => {
      if (segment.mode === "auto") return "auto"
      const mode =
        segment.mode === "bus" && segment.transitDetails?.routeNumber
          ? `bus ${segment.transitDetails.routeNumber}`
          : segment.mode
      return `${segment.from.name} → ${segment.to.name} (${mode})`
    })
    .join(", then ")
}
