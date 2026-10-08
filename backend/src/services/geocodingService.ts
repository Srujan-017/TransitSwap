import axios from "axios"
import type { GeoLocation, NominatimResult } from "../types/routing"
import { AppError } from "../middleware/errorHandler"
import { createTtlCache } from "../utils/ttlCache"

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
const USER_AGENT = "TransitSwap/2.0 (final-year-engineering-project)"

// Phase 11 (P9) — every keystroke past the frontend's debounce previously
// reached Nominatim with no server-side cache at all (PROJECT_MASTER_PLAN.md
// §26 P9). A short TTL is enough to absorb retyping/backspacing the same
// query within one search session, without serving stale geocodes for long.
// Bounded size so distinct queries across many users/sessions can't grow
// this without limit.
const searchCache = createTtlCache<GeoLocation[]>({ ttlMs: 5 * 60 * 1000, maxEntries: 500 })

function normalizeQueryKey(query: string): string {
  return query.trim().toLowerCase()
}

export const geocodingService = {
  async search(query: string): Promise<GeoLocation[]> {
    const cacheKey = normalizeQueryKey(query)
    const cached = searchCache.get(cacheKey)
    if (cached) return cached

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

    const results = response.data.map((result) => ({
      name: extractShortName(result),
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    }))

    // Only cache a genuine result set — never cache a transient failure (see
    // the catch block above, which throws before reaching here).
    searchCache.set(cacheKey, results)
    return results
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
