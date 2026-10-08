import { useEffect, useState } from "react"
import { multimodalService } from "../../services/multimodalService"
import type { GeoLocation } from "../../types/map"
import type { NearbyTransitResponse } from "../../types/multimodal"

interface Props {
  origin: GeoLocation
  destination: GeoLocation
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

  const originReachable = Boolean(originNearby?.metro || originNearby?.bus)
  const destinationReachable = Boolean(destinationNearby?.metro || destinationNearby?.bus)
  const exampleStation = originNearby?.metro ?? originNearby?.bus ?? destinationNearby?.metro ?? destinationNearby?.bus

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
