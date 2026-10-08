import { useEffect, useState } from "react"
import { multimodalService } from "../../services/multimodalService"
import type { GeoLocation } from "../../types/map"
import type { NearbyTransitResponse } from "../../types/multimodal"

interface Props {
  origin: GeoLocation
  destination: GeoLocation
}

// Mirrors backend/src/services/multimodalService.ts's ROUTING_CONSTANTS
// (MAX_WALK_TO_METRO_M / MAX_WALK_TO_BUS_M) — the actual walking-access
// thresholds route generation enforces. GET /routes/nearby (used below) uses
// a deliberately WIDER 3 km "what's around here" radius for both modes, for
// NearbyTransit.tsx's own display purpose — found live, in production, that
// using THAT radius here made this component call a station "near" (e.g.
// 2.9 km away) when it was actually outside the 2 km range route generation
// requires, producing a factually wrong "reachable" claim for the one thing
// this component exists to answer honestly.
const METRO_ACCESS_M = 2000
const BUS_ACCESS_M = 1200

function isWithinAccessRange(nearby: NearbyTransitResponse | null): boolean {
  if (!nearby) return false
  if (nearby.metro && nearby.metro.distanceMeters <= METRO_ACCESS_M) return true
  if (nearby.bus && nearby.bus.distanceMeters <= BUS_ACCESS_M) return true
  return false
}

/**
 * Phase 12 — "why no route?" (PROJECT_MASTER_PLAN.md §39 Phase 12 / §32
 * "a 'why no route?' empty state that shows the reachable area"). Replaces
 * the old generic "try Road Routing instead" hint with a real answer, reusing
 * the same GET /routes/nearby endpoint NearbyTransit.tsx already calls for
 * the origin — never a fabricated explanation, just what the demo network
 * actually has near each point.
 */
export default function WhyNoRoute({ origin, destination }: Props) {
  const [originNearby, setOriginNearby] = useState<NearbyTransitResponse | null>(null)
  const [destinationNearby, setDestinationNearby] = useState<NearbyTransitResponse | null>(null)
  const [status, setStatus] = useState<"loading" | "done">("loading")

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    Promise.all([
      multimodalService.getNearbyTransit(origin.latitude, origin.longitude).catch(() => null),
      multimodalService.getNearbyTransit(destination.latitude, destination.longitude).catch(() => null),
    ]).then(([originResult, destinationResult]) => {
      if (cancelled) return
      setOriginNearby(originResult)
      setDestinationNearby(destinationResult)
      setStatus("done")
    })
    return () => {
      cancelled = true
    }
  }, [origin.latitude, origin.longitude, destination.latitude, destination.longitude])

  if (status === "loading") {
    return <p className="text-xs text-navy-400 px-1">Checking which part of your trip is outside the demo network…</p>
  }

  const originReachable = isWithinAccessRange(originNearby)
  const destinationReachable = isWithinAccessRange(destinationNearby)
  // Only offer a station as a positive "this works" example when it's
  // actually within ITS OWN mode's real access range — otherwise this
  // message would repeat the exact same inaccuracy it exists to fix.
  const exampleStation =
    [originNearby, destinationNearby].flatMap((nearby) => [
      nearby?.metro && nearby.metro.distanceMeters <= METRO_ACCESS_M ? nearby.metro : null,
      nearby?.bus && nearby.bus.distanceMeters <= BUS_ACCESS_M ? nearby.bus : null,
    ])
    .find((station): station is NonNullable<typeof station> => station !== null)

  if (originReachable && destinationReachable) {
    return (
      <p className="text-xs text-navy-500 px-1">
        Both your origin and destination are near demo transit stations, but no metro/bus/walking/auto
        combination connects them in the current demo network — the dataset covers one transit corridor, not
        the full city. Try the Road Routing mode instead.
      </p>
    )
  }

  const unreachableSides = [!originReachable && "origin", !destinationReachable && "destination"].filter(
    (side): side is string => Boolean(side),
  )

  return (
    <p className="text-xs text-navy-500 px-1">
      Your {unreachableSides.join(" and ")} {unreachableSides.length > 1 ? "are" : "is"} outside the demo transit
      network's reach (no metro station within 2 km or bus stop within 1.2 km of{" "}
      {unreachableSides.length > 1 ? "either point" : `the ${unreachableSides[0]}`}).
      {exampleStation
        ? ` ${exampleStation.stationName} is an example of a location the demo network does cover.`
        : " Try the Road Routing mode instead."}
    </p>
  )
}
