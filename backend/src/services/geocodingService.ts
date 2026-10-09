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
// Same reasoning as searchCache — a map click near the same spot (or the
// same spot clicked twice) shouldn't re-hit Nominatim within a short window.
const reverseCache = createTtlCache<GeoLocation>({ ttlMs: 5 * 60 * 1000, maxEntries: 500 })

function normalizeQueryKey(query: string): string {
  return query.trim().toLowerCase()
}

// Rounds to ~11m precision — enough to dedupe repeat clicks near the same
// spot without needing exact floating-point equality for a cache hit.
function reverseCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

export const geocodingService = {
  // "What's here?" — resolves a clicked map coordinate to a real place name,
  // the same way Google Maps' click-for-address popup works. Reuses the
  // same Nominatim provider, User-Agent and error-handling pattern as
  // search() above rather than introducing a second geocoding path.
  async reverse(lat: number, lng: number): Promise<GeoLocation> {
    const cacheKey = reverseCacheKey(lat, lng)
    const cached = reverseCache.get(cacheKey)
    if (cached) return cached

    let response
    try {
      response = await axios.get<NominatimResult>(`${NOMINATIM_BASE}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: "json",
          addressdetails: 1,
          zoom: 18,
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
          throw new AppError("Reverse geocoding timed out. Please try again.", 504)
        }
        throw new AppError("Reverse geocoding service unavailable. Please try again.", 502)
      }
      throw err
    }

    if (!response.data || !response.data.display_name) {
      throw new AppError("No address found for this location.", 404)
    }

    const result: GeoLocation = {
      name: extractShortName(response.data),
      address: response.data.display_name,
      latitude: lat,
      longitude: lng,
    }

    reverseCache.set(cacheKey, result)
    return result
  },

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
