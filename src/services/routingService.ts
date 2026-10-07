import api from "./api"
import type { GeoLocation, RouteResult, TransportMode } from "../types/map"
import { getDemoRoutes } from "./demoData"

export const routingService = {
  async getRoute(
    origin: GeoLocation,
    destination: GeoLocation,
    mode: TransportMode = "driving",
  ): Promise<RouteResult[]> {
    const { data } = await api.post<{ success: boolean; data: RouteResult[] }>(
      "/routes",
      {
        origin: { latitude: origin.latitude, longitude: origin.longitude },
        destination: { latitude: destination.latitude, longitude: destination.longitude },
        mode,
      },
      { timeout: 15000 },
    )
    return data.data
  },

  getDemoRoutes,
}
