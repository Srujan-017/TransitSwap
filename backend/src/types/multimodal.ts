import type { AccessibilityProfile } from "./index"

export type MultimodalMode = "walking" | "metro" | "bus" | "auto"

export interface SegmentLocation {
  name: string
  latitude: number
  longitude: number
}

export interface TransitDetails {
  lineName: string
  lineColor: string
  stopCount: number
  stops: string[]
}

export interface RouteSegment {
  id: string
  mode: MultimodalMode
  from: SegmentLocation
  to: SegmentLocation
  distanceMeters: number
  durationSeconds: number
  estimatedFare: number
  instruction: string
  geometry: { type: "LineString"; coordinates: [number, number][] }
  transitDetails?: TransitDetails
}

export type RouteLabel = "FASTEST" | "CHEAPEST" | "MIN_WALKING" | "BALANCED"

export interface MultimodalRoute {
  id: string
  label: RouteLabel
  labelDisplay: string
  labelColor: string
  segments: RouteSegment[]
  totalDistanceMeters: number
  totalDurationSeconds: number
  totalWalkingMeters: number
  totalFare: number
  transferCount: number
  modes: MultimodalMode[]
  summary: string
  isDemoData: true
}

export interface MultimodalRequest {
  origin: { name?: string; latitude: number; longitude: number }
  destination: { name?: string; latitude: number; longitude: number }
  profile?: AccessibilityProfile | "fastest" | "cheapest" | "comfort"
  departureTime?: string // e.g. "08:30" – used for confidence interval & smart departure calculation
}
