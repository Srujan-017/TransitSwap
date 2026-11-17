/**
 * A walking or auto leg whose path is just two points was not routed along streets: the road service could not be reached, so the
 * engine drew a straight line between the ends and estimated its length. The numbers are still sensible, but the drawn path is
 * not a path anyone can walk, so the interface says so instead of presenting it as a route.
 */
export function isStraightLineEstimate(segment: { mode: string; distanceMeters: number; geometry?: { coordinates?: unknown[] } }): boolean {
  return (segment.mode === "walking" || segment.mode === "auto") && segment.distanceMeters > 150 && (segment.geometry?.coordinates?.length ?? 0) <= 2
}
