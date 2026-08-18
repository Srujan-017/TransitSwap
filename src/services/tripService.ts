import api from "./api"
import type { GeoLocation } from "../types/map"
import type { MultimodalRoute } from "../types/multimodal"

export interface JourneyFeedback {
  rating: number
  comment?: string
  issues?: string[]
  // Problem 21 — optional user-entered actual journey duration (minutes).
  actualDurationMinutes?: number
  createdAt?: string
}

export interface JourneyRecord {
  _id: string
  origin: GeoLocation
  destination: GeoLocation
  selectedRoute: MultimodalRoute
  routeSegments: MultimodalRoute["segments"]
  transportModes: string[]
  totalDistanceMeters: number
  totalDurationSeconds: number
  estimatedFare: number
  walkingDistanceMeters: number
  transferCount: number
  routeSummary: string
  status: "planned" | "completed" | "cancelled"
  // Problem 13 — the actual local departure date/time the user selected when
  // searching, when they selected one. Absent means "unknown", not "now".
  departureTime?: string
  // Problem 15 — present once the user has submitted feedback for this journey.
  userFeedback?: JourneyFeedback
  createdAt: string
  updatedAt: string
}

export interface SavedDestinationRecord {
  _id: string
  name: string
  address: string
  latitude: number
  longitude: number
  createdAt: string
}

export interface SaveDestinationInput {
  name: string
  address: string
  latitude: number
  longitude: number
}

// Problem 10 — Saved Routes (distinct from Journey/"Save Journey" above: a
// reusable route snapshot the user can revisit, not a record of a trip taken).
export interface SavedRouteRecord {
  _id: string
  name: string
  origin: GeoLocation
  destination: GeoLocation
  selectedRouteSnapshot: MultimodalRoute
  routeSegments: MultimodalRoute["segments"]
  transportModes: string[]
  totalDistanceMeters: number
  totalDurationSeconds: number
  totalFare: number
  walkingDistanceMeters: number
  transferCount: number
  sustainabilityScore?: number
  accessibilityProfile?: string
  createdAt: string
  updatedAt: string
}

export interface SaveRouteInput {
  name: string
  origin: GeoLocation
  destination: GeoLocation
  selectedRoute: MultimodalRoute
  accessibilityProfile?: string
}

export const tripService = {
  async saveJourney(
    origin: GeoLocation,
    destination: GeoLocation,
    selectedRoute: MultimodalRoute,
    alternativeRoutes?: MultimodalRoute[],
    // Problem 21 — the real departure date/time the user picked while planning
    // (if any), so feedback given later can honestly compute a journey
    // observation. Never fabricated on the frontend either.
    departureTime?: string,
  ): Promise<JourneyRecord> {
    const { data } = await api.post<{ success: boolean; data: JourneyRecord }>("/trips/save", {
      origin,
      destination,
      selectedRoute,
      alternativeRoutes,
      departureTime,
    })
    return data.data
  },

  async getHistory(): Promise<JourneyRecord[]> {
    const { data } = await api.get<{ success: boolean; data: JourneyRecord[] }>("/trips/history")
    return data.data
  },

  async getJourney(id: string): Promise<JourneyRecord> {
    const { data } = await api.get<{ success: boolean; data: JourneyRecord }>(`/trips/${id}`)
    return data.data
  },

  async deleteJourney(id: string): Promise<void> {
    await api.delete(`/trips/${id}`)
  },

  async saveDestination(input: SaveDestinationInput): Promise<SavedDestinationRecord> {
    const { data } = await api.post<{ success: boolean; data: SavedDestinationRecord }>("/trips/destinations", input)
    return data.data
  },

  async getDestinations(): Promise<SavedDestinationRecord[]> {
    const { data } = await api.get<{ success: boolean; data: SavedDestinationRecord[] }>("/trips/destinations")
    return data.data
  },

  async deleteDestination(id: string): Promise<void> {
    await api.delete(`/trips/destinations/${id}`)
  },

  // Problem 10 — Saved Routes
  async saveRoute(input: SaveRouteInput): Promise<SavedRouteRecord> {
    const { data } = await api.post<{ success: boolean; data: SavedRouteRecord }>("/trips/saved-routes", input)
    return data.data
  },

  async getSavedRoutes(): Promise<SavedRouteRecord[]> {
    const { data } = await api.get<{ success: boolean; data: SavedRouteRecord[] }>("/trips/saved-routes")
    return data.data
  },

  async getSavedRoute(id: string): Promise<SavedRouteRecord> {
    const { data } = await api.get<{ success: boolean; data: SavedRouteRecord }>(`/trips/saved-routes/${id}`)
    return data.data
  },

  async deleteSavedRoute(id: string): Promise<void> {
    await api.delete(`/trips/saved-routes/${id}`)
  },
}
