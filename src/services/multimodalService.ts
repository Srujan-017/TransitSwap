import api from "./api"
import type { GeoLocation } from "../types/map"
import type { ExcludedRoute, MultimodalRoute, NearbyTransitResponse, WeatherMode, WeatherReport } from "../types/multimodal"

export const multimodalService = {
  async getRoutes(
    origin: GeoLocation,
    destination: GeoLocation,
    profile?: string,
    departureTime?: string,
    weather?: WeatherMode,
  ): Promise<{ routes: MultimodalRoute[]; busAlternativeNote?: string; excludedRoutes?: ExcludedRoute[]; weather?: WeatherReport }> {
    const { data } = await api.post<{
      success: boolean
      data: MultimodalRoute[]
      busAlternativeNote?: string
      excludedRoutes?: ExcludedRoute[]
      weather?: WeatherReport
    }>(
      "/routes/multimodal",
      {
        origin:      { name: origin.name,      latitude: origin.latitude,      longitude: origin.longitude      },
        destination: { name: destination.name, latitude: destination.latitude, longitude: destination.longitude },
        profile,
        departureTime,
        // Only the demo conditions are sent; "live" (the default) is what the server does anyway.
        ...(weather && weather !== "live" ? { weather } : {}),
      },
      { timeout: 15000 },
    )
    return { routes: data.data, busAlternativeNote: data.busAlternativeNote, excludedRoutes: data.excludedRoutes, weather: data.weather }
  },

  // Problem 11 — Nearby Transit
  async getNearbyTransit(latitude: number, longitude: number): Promise<NearbyTransitResponse> {
    const { data } = await api.get<{ success: boolean; data: NearbyTransitResponse }>(
      "/routes/nearby",
      { params: { latitude, longitude } },
    )
    return data.data
  },
}
