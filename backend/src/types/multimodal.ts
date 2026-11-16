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
  // The next couple of departures after estimatedBoardingTime, spaced by
  // the same scheduled frequency — in case the rider misses the first one.
  // Omitted under the same rule as estimatedBoardingTime.
  upcomingBoardingTimes?: string[]
  // The route's real terminus in this boarding direction (e.g. "Shivajinagar
  // Bus Stand") — what the rider should look for on the bus's own headboard,
  // since the same physical stop serves both directions. Buses only.
  towards?: string
  // Buses only: the route this leg rides (BUS_ROUTES id), so the timetable can be looked up.
  routeId?: string
  // Buses only, set with estimatedBoardingTime: when the same bus reaches the stop where the rider
  // gets off ("9:31 AM"), from the route's timetable.
  estimatedArrivalTime?: string
  // Where each stop on this leg is (same order as `stops`), so a navigation screen can tell how many stops
  // are left from the rider's position. Buses and metro.
  stopPoints?: Array<{ name: string; latitude: number; longitude: number }>
  // Metro only: where the rider changes to another line, e.g. at Majestic to the Green Line.
  lineChanges?: Array<{ station: string; toLine: string }>
  // The same boarding/arrival times as estimatedBoardingTime/estimatedArrivalTime, as ISO timestamps,
  // so a live screen can count down to the bus. Set together with them.
  boardingAtIso?: string
  arrivalAtIso?: string
  // Buses only: minutes between buses at the time of travel (shorter in the weekday peaks). Set with
  // estimatedBoardingTime; waitMinutes is left as the conservative figure the route totals use.
  headwayMinutes?: number
}

// One manoeuvre of a walking or auto leg, from the road router: "Turn right onto 80 Feet Road".
export interface TurnStep {
  instruction: string
  distanceMeters: number
  durationSeconds: number
  type: string // "depart" | "turn" | "new name" | "continue" | "roundabout" | "arrive" ...
  modifier?: string // "left" | "right" | "slight left" | "sharp right" | "straight" | "uturn"
  street?: string
  location: [number, number] // [longitude, latitude] where the manoeuvre happens
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
  // Turn-by-turn steps for walking and auto legs, when the road router supplied them.
  steps?: TurnStep[]
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
  // When the journey starts (ISO), set only when the rider chose a departure time.
  departureAt?: string
}

export interface MultimodalRequest {
  origin: { name?: string; latitude: number; longitude: number }
  destination: { name?: string; latitude: number; longitude: number }
  profile?: AccessibilityProfile | "fastest" | "cheapest" | "comfort"
  departureTime?: string // e.g. "08:30" – used for confidence interval & smart departure calculation
  // Demo weather chosen by the rider ("live" or absent = the real forecast/current weather).
  weather?: "live" | "clear" | "rain" | "heavy_rain" | "heat"
}
