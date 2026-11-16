// Shared routing types for Phase 2 — Maps & Routing Foundation.
// Designed to be extended by future phases (accessibility, crowd, weather, reliability).

export interface GeoLocation {
  name: string
  address: string
  latitude: number
  longitude: number
}

export interface RouteStep {
  instruction: string
  distanceMeters: number
  durationSeconds: number
  mode: "walking" | "driving" | "cycling" | "transit"
  // The manoeuvre that starts this step, from the road router (OSRM): its type ("turn", "depart",
  // "arrive", "roundabout" ...), direction ("left", "slight right" ...) and where it happens
  // ([longitude, latitude]). Used for turn-by-turn navigation.
  maneuver?: { type: string; modifier?: string; location: [number, number] }
  // Street the step travels along, when the router names it.
  name?: string
}

export interface RouteLeg {
  distanceMeters: number
  durationSeconds: number
  steps: RouteStep[]
}

export interface RouteGeometry {
  type: "LineString"
  coordinates: [number, number][] // [longitude, latitude] — GeoJSON standard
}

export interface NormalizedRoute {
  id: string
  distanceMeters: number
  durationSeconds: number
  geometry: RouteGeometry
  legs: RouteLeg[]
  provider: string
  mode: TransportMode
  // Future phases will attach:
  //   accessibilityScore?: number
  //   crowdLevel?: "low" | "medium" | "high"
  //   weatherImpact?: "low" | "medium" | "high"
  //   reliabilityScore?: number
}

export type TransportMode = "driving" | "walking" | "cycling"

export interface RouteRequest {
  origin: { latitude: number; longitude: number }
  destination: { latitude: number; longitude: number }
  mode?: TransportMode
}

// ── OSRM provider types ──────────────────────────────────────────────────────

export interface OsrmManeuver {
  type: string
  modifier?: string
  location?: [number, number]
}

export interface OsrmStep {
  distance: number
  duration: number
  maneuver: OsrmManeuver
  name: string
  mode: string
}

export interface OsrmLeg {
  distance: number
  duration: number
  steps: OsrmStep[]
}

export interface OsrmRoute {
  distance: number
  duration: number
  geometry: {
    type: string
    coordinates: [number, number][]
  }
  legs: OsrmLeg[]
}

export interface OsrmResponse {
  code: string
  message?: string
  routes?: OsrmRoute[]
  waypoints?: Array<{
    name: string
    location: [number, number]
  }>
}

// ── Nominatim geocoding provider types ────────────────────────────────────────

export interface NominatimAddress {
  road?: string
  suburb?: string
  city?: string
  town?: string
  village?: string
  state?: string
  country?: string
}

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
}
