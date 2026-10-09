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
  // Minutes the rider should expect to wait at the stop before boarding,
  // derived from the line/route's own scheduled frequency — not a live
  // GPS-tracked arrival, and labelled as such wherever it's shown.
  waitMinutes: number
  // The route number riders look for on the bus itself (e.g. "5"), separate
  // from the descriptive `lineName`. Buses only — metro already identifies
  // itself unambiguously by line name/colour.
  routeNumber?: string
  // Clock time ("8:42 AM") the rider should expect to board this leg,
  // computed from the request's departureTime plus the cumulative duration
  // of every prior segment. Omitted (not fabricated) when no departureTime
  // was supplied — same honesty rule as calculateSmartDeparture.
  estimatedBoardingTime?: string
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
