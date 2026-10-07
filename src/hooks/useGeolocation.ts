import { useState, useCallback } from "react"
import type { GeoLocation } from "../types/map"

interface GeolocationState {
  location: GeoLocation | null
  error: string | null
  isLoading: boolean
}

const GEO_ERROR_MESSAGES: Record<number, string> = {
  1: "Location permission denied. Please allow location access in your browser settings.",
  2: "Your location is currently unavailable. Please try again.",
  3: "Location request timed out. Please try again.",
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: false,
  })

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocation is not supported by your browser." }))
      return
    }

    setState({ location: null, error: null, isLoading: true })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            name: "Current Location",
            address: "Your current location",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          error: null,
          isLoading: false,
        })
      },
      (err) => {
        setState({
          location: null,
          error: GEO_ERROR_MESSAGES[err.code] ?? "Unable to retrieve your location.",
          isLoading: false,
        })
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
    )
  }, [])

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), [])

  return { ...state, requestLocation, clearError }
}
