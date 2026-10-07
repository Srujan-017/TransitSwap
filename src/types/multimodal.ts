// Phase 3 — Multimodal types (mirrors backend/src/types/multimodal.ts).
// Keep in sync when backend types change.

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
export type CrowdLevel = "LOW" | "MEDIUM" | "HIGH"
export type DataSource = "LIVE_USER_REPORT" | "RECENT_USER_REPORT" | "HISTORICAL_DATA" | "DEMO_DATA" | "UNAVAILABLE"
export type AccessibilityStatus = "accessible" | "partially_accessible" | "not_accessible" | "unknown"

export interface WeatherImpact {
  available: boolean
  level: "low" | "medium" | "high" | "unavailable"
  walkingPenaltyPercent: number
  weatherFriendly: boolean
  summary: string
  warnings: string[]
  weather?: {
    temperatureC: number
    feelsLikeC: number
    condition: string
    rainMm: number
    windKph: number
    humidity: number
    observedAt: string
    source: "OpenWeatherMap" | "Demo Weather Data"
    isDemoData: boolean
  }
}

export interface AccessibilityEvaluation {
  profile: string
  status: AccessibilityStatus
  blocked: boolean
  summary: string
  warnings: string[]
  checkedStations: Array<{
    stationId: string
    stationName: string
    status: AccessibilityStatus
    warnings: string[]
  }>
  accessibilityScore: number
  rejectionReason: string | null
  dataSource: string
}

export interface RouteCrowdSummary {
  level?: CrowdLevel
  source: DataSource
  summary: string
  stations: Array<{
    stationId: string
    stationName: string
    crowdLevel?: CrowdLevel
    source: DataSource
    confidence: number
    summary: string
  }>
}

export interface ReliabilityAnalysis {
  score: number
  level: "HIGH" | "MEDIUM" | "LOW"
  summary: string
  delayVarianceMinutes: number
  factors: string[]
}

export interface ConfidenceInterval {
  expectedArrivalMin: string
  expectedArrivalMax: string
  meanDurationMinutes: number
  lowerBoundMinutes: number
  upperBoundMinutes: number
  confidenceLevelPercent: number
  explanation: string
  isDataDriven: boolean
}

export interface TransferRiskDetail {
  fromSegmentMode: string
  toSegmentMode: string
  transferStation: string
  scheduledBufferMinutes: number
  estimatedRiskPercent: number
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  explanation: string
}

export interface MissedConnectionRisk {
  overallRiskPercent: number
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  simulatedTrialsCount: number
  transfers: TransferRiskDetail[]
  summary: string
}

export interface DepartureSuggestion {
  recommendedDepartureOffsetMinutes: number
  suggestedDepartureTime: string
  expectedArrival: string
  reason: string
  reliabilityGainPercent: number
}

export interface LastMileOption {
  mode: "walk" | "auto" | "bike"
  distanceMeters: number
  durationSeconds: number
  estimatedFare: number
  comfortScore: number
  isRecommended: boolean
  instruction: string
}

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
  weatherImpact?: WeatherImpact
  accessibility?: AccessibilityEvaluation
  crowd?: RouteCrowdSummary
  reliability?: ReliabilityAnalysis
  confidenceInterval?: ConfidenceInterval
  missedConnectionRisk?: MissedConnectionRisk
  departureSuggestion?: DepartureSuggestion
  lastMileOptions?: LastMileOption[]
  whyRecommended?: string[]
  transitDnaScore?: number
  // Problem 23 — honest personalization status: true only when a trained
  // per-user TransitDNA (Pairwise Logistic Regression) model was actually used
  // to rank this route, not merely because a profile/preferences were set.
  isPersonalized?: boolean
  // Problem 9 — relative (0-100) sustainability score. NOT a real emissions estimate.
  sustainabilityScore?: number
  sustainabilitySummary?: string
}

// Problem 11 — Nearby Transit
export interface NearbyTransitStation {
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  latitude: number
  longitude: number
  distanceMeters: number
  estimatedWalkingMinutes: number
  accessibility:
    | {
        status: string
        hasLift: boolean | null
        hasRamp: boolean | null
      }
    | "unknown"
  crowd:
    | {
        level?: CrowdLevel
        source: string
      }
    | "unavailable"
}

export interface NearbyTransitResponse {
  metro: NearbyTransitStation | null
  bus: NearbyTransitStation | null
}

