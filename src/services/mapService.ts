import api from "./api"
import type { GeoLocation } from "../types/map"

export const mapService = {
  async search(query: string): Promise<GeoLocation[]> {
    const { data } = await api.get<{ success: boolean; data: GeoLocation[] }>(
      "/geocoding/search",
      { params: { q: query }, timeout: 12000 },
    )
    return data.data
  },

  // "What's here?" — resolves a clicked map coordinate to a real place name.
  async reverse(lat: number, lng: number): Promise<GeoLocation> {
    const { data } = await api.get<{ success: boolean; data: GeoLocation }>(
      "/geocoding/reverse",
      { params: { lat, lng }, timeout: 12000 },
    )
    return data.data
  },
}
