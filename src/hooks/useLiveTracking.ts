import { useCallback, useRef, useState } from "react"
import { GEO_ERROR_MESSAGES } from "./useGeolocation"

interface LivePosition {
  latitude: number
  longitude: number
}

/**
 * Continuous counterpart to useGeolocation.ts's one-shot
 * getCurrentPosition() — built for active navigation (ActiveNavigationView),
 * which needs to keep tracking the rider's own position as they walk.
 * useGeolocation.ts itself is left untouched; its one-shot contract is
 * relied on by the existing "locate me" search button.
 */
export function useLiveTracking() {
  const [position, setPosition] = useState<LivePosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.geolocation)

  const start = useCallback(() => {
    if (!isSupported || watchIdRef.current !== null) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null)
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      },
      (err) => {
        setError(GEO_ERROR_MESSAGES[err.code] ?? "Unable to retrieve your location.")
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
  }, [isSupported])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  return { position, error, isSupported, start, stop }
}
