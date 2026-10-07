import type { AccessibilityProfile } from "./index"
import type { MultimodalRoute, RouteSegment } from "./multimodal"

export type AccessibilityStatus = "accessible" | "partially_accessible" | "not_accessible" | "unknown"
export type CrowdLevel = "LOW" | "MEDIUM" | "HIGH"
export type DataSource = "LIVE_USER_REPORT" | "RECENT_USER_REPORT" | "HISTORICAL_DATA" | "DEMO_DATA" | "UNAVAILABLE"
export type WeatherImpactLevel = "low" | "medium" | "high" | "unavailable"

export interface WeatherData {
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

export interface WeatherImpact {
  available: boolean
  level: WeatherImpactLevel
  walkingPenaltyPercent: number
  weatherFriendly: boolean
  summary: string
  warnings: string[]
  weather?: WeatherData
}

export interface AccessibilityRecord {
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  latitude: number | null
  longitude: number | null
  hasLift: boolean | null
  hasRamp: boolean | null
  hasEscalator: boolean | null
  stairCount: number | null
  tactilePaving: boolean | null
  accessibleToilet: boolean | null
  wheelchairAccessible: boolean | null
  stepFreeEntrance: boolean | null
  stepFreePlatform: boolean | null
  lastVerified: string
  verificationSource: "synthetic_demo" | "field_survey" | "community_report" | "transit_authority" | "external_dataset" | "Demo Accessibility Dataset" | "Surveyed Dataset" | "User Report"
  status: AccessibilityStatus
  notes: string | null
  // Problem 23 — optional so existing DEMO_ACCESSIBILITY_DATA entries don't need
  // updating; absent/undefined is treated as active.
  active?: boolean
}

export interface CheckedAccessibilityStation {
  stationId: string
  stationName: string
  status: AccessibilityStatus
  warnings: string[]
}

export interface AccessibilityEvaluation {
  profile: AccessibilityProfile | "fastest" | "cheapest" | "comfort"
  status: AccessibilityStatus
  blocked: boolean
  summary: string
  warnings: string[]
  checkedStations: CheckedAccessibilityStation[]
  accessibilityScore: number // 0-100, transparent composite score
  rejectionReason: string | null // explains why a route was rejected if blocked
  dataSource: "synthetic_demo" | "field_survey" | "community_report" | "transit_authority" | "external_dataset" | "mixed"
}

export interface CrowdStationEstimate {
  stationId: string
  stationName: string
  crowdLevel?: CrowdLevel
  source: DataSource
  confidence: number
  summary: string
}

export interface RouteCrowdSummary {
  level?: CrowdLevel
  source: DataSource
  summary: string
  stations: CrowdStationEstimate[]
}

export interface ReliabilityAnalysis {
  score: number // 0 - 100
  level: "HIGH" | "MEDIUM" | "LOW"
  summary: string
  delayVarianceMinutes: number
  factors: string[]
}

export interface ConfidenceInterval {
  expectedArrivalMin: string // e.g. "8:57 AM"
  expectedArrivalMax: string // e.g. "9:03 AM"
  meanDurationMinutes: number
  lowerBoundMinutes: number
  upperBoundMinutes: number
  confidenceLevelPercent: number // e.g. 90; 0 when isDataDriven is false — not a real percentage
  explanation: string
  // Problem 2 fix — true only when this interval was computed from sufficient
  // historical JourneyObservation data. False means it's a rule-of-thumb demo
  // fallback and must not be presented as a genuine confidence interval.
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
  overallRiskPercent: number // 0 - 100
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  simulatedTrialsCount: number // e.g. 500 Monte Carlo runs
  transfers: TransferRiskDetail[]
  summary: string
}

export interface DepartureSuggestion {
  recommendedDepartureOffsetMinutes: number // e.g. -10 for 10 min earlier
  suggestedDepartureTime: string // e.g. "8:05 AM"
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

export interface EnrichedRoute extends MultimodalRoute {
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
  // to rank this route.
  isPersonalized?: boolean
  // Problem 9 — relative (0-100) sustainability score, NOT a real emissions estimate.
  sustainabilityScore?: number
  sustainabilitySummary?: string
}

export interface RouteSnapshot {
  routeId: string
  label: string
  summary: string
  segments: RouteSegment[]
  totalDistanceMeters: number
  totalDurationSeconds: number
  totalWalkingMeters: number
  totalFare: number
  transferCount: number
  modes: string[]
  weatherImpact?: WeatherImpact
  accessibility?: AccessibilityEvaluation
  crowd?: RouteCrowdSummary
  reliability?: ReliabilityAnalysis
  confidenceInterval?: ConfidenceInterval
  missedConnectionRisk?: MissedConnectionRisk
  whyRecommended?: string[]
  sustainabilityScore?: number
  sustainabilitySummary?: string
}

