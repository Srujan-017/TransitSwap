import { useCallback, useEffect, useMemo, useState } from "react"
import { useLiveTracking } from "./useLiveTracking"
import type { MultimodalRoute } from "../types/multimodal"

// Tight enough to avoid auto-advancing before the rider actually reaches the
// next point, loose enough to tolerate normal consumer-GPS drift.
const ARRIVAL_RADIUS_METERS = 40

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Orchestrates ActiveNavigationView.tsx's step-by-step state. Live
 * geolocation (via useLiveTracking) only ever auto-advances a WALKING step —
 * there's no real bus/metro position feed in this demo dataset, so transit
 * and auto segments always wait for the rider to tap "Next step" themselves.
 * advance() works regardless of geolocation state, which is what keeps this
 * usable for anyone testing from outside the seeded Bengaluru corridor.
 */
export function useActiveNavigation(route: MultimodalRoute) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const live = useLiveTracking()

  useEffect(() => {
    live.start()
    return () => live.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isComplete = currentStepIndex >= route.segments.length
  const currentSegment = route.segments[currentStepIndex] ?? route.segments[route.segments.length - 1]

  const advance = useCallback(() => {
    setCurrentStepIndex((i) => Math.min(i + 1, route.segments.length))
  }, [route.segments.length])

  useEffect(() => {
    if (isComplete) {
      live.stop()
      return
    }
    if (currentSegment.mode !== "walking" || !live.position) return
    const distance = haversineMeters(
      live.position.latitude,
      live.position.longitude,
      currentSegment.to.latitude,
      currentSegment.to.longitude,
    )
    if (distance <= ARRIVAL_RADIUS_METERS) advance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.position, currentStepIndex, isComplete])

  const distanceToNextMeters = useMemo(() => {
    if (!live.position || isComplete) return null
    return Math.round(
      haversineMeters(live.position.latitude, live.position.longitude, currentSegment.to.latitude, currentSegment.to.longitude),
    )
  }, [live.position, currentSegment, isComplete])

  return {
    currentStepIndex,
    currentSegment,
    totalSteps: route.segments.length,
    distanceToNextMeters,
    position: live.position,
    isTrackingLive: Boolean(live.position),
    geoError: live.error,
    isGeoSupported: live.isSupported,
    advance,
    isComplete,
  }
}
