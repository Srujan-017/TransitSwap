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
}
