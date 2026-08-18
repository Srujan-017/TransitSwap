import axios from "axios"
import type { GeoLocation, NominatimResult } from "../types/routing"
import { AppError } from "../middleware/errorHandler"

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
const USER_AGENT = "TransitSwap/2.0 (final-year-engineering-project)"

export const geocodingService = {
  async search(query: string): Promise<GeoLocation[]> {
    let response
    try {
      response = await axios.get<NominatimResult[]>(`${NOMINATIM_BASE}/search`, {
        params: {
          q: query,
          format: "json",
          limit: 5,
          addressdetails: 1,
        },
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        timeout: 8000,
      })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") {
          throw new AppError("Location search timed out. Please try again.", 504)
        }
        throw new AppError("Location search service unavailable. Please try again.", 502)
      }
      throw err
    }

    return response.data.map((result) => ({
      name: extractShortName(result),
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    }))
  },
}

function extractShortName(result: NominatimResult): string {
  const addr = result.address
  if (!addr) return result.display_name.split(",")[0].trim()
  const name =
    addr.road ??
    addr.suburb ??
    addr.city ??
    addr.town ??
    addr.village ??
    result.display_name.split(",")[0]
  return name.trim()
}
