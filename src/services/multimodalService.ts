import api from "./api"
import type { GeoLocation } from "../types/map"
import type { MultimodalRoute, NearbyTransitResponse } from "../types/multimodal"

export const multimodalService = {
  async getRoutes(
    origin: GeoLocation,
    destination: GeoLocation,
    profile?: string,
    departureTime?: string,
  ): Promise<{ routes: MultimodalRoute[]; busAlternativeNote?: string }> {
    const { data } = await api.post<{ success: boolean; data: MultimodalRoute[]; busAlternativeNote?: string }>(
      "/routes/multimodal",
      {
        origin:      { name: origin.name,      latitude: origin.latitude,      longitude: origin.longitude      },
        destination: { name: destination.name, latitude: destination.latitude, longitude: destination.longitude },
        profile,
        departureTime,
      },
      { timeout: 15000 },
    )
    return { routes: data.data, busAlternativeNote: data.busAlternativeNote }
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
