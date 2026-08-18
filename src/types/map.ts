// Phase 2 — Maps & Routing types.
// Designed to be extended by future phases (accessibility, crowd, weather, reliability).

export type TransportMode = "driving" | "walking" | "cycling"

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

export interface RouteResult {
  id: string
  distanceMeters: number
  durationSeconds: number
  geometry: RouteGeometry
  legs: RouteLeg[]
  provider: string
  mode: TransportMode
  isDemoData?: boolean
  // Future phases will attach:
  //   accessibilityScore?: number       (Phase 6)
  //   crowdLevel?: "low"|"medium"|"high" (Phase 8)
  //   weatherImpact?: "low"|"medium"|"high" (Phase 5)
  //   reliabilityScore?: number          (Phase 11)
}

export type RouteStatus = "idle" | "loading" | "success" | "error"
