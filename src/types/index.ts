export interface User {
  _id: string
  name: string
  email: string
  // Problem 23 — admin role, set only server-side (JWT-derived). Never trust or
  // send this from the client for authorization decisions; the backend enforces
  // requireAdmin independently regardless of what the frontend shows.
  role: "user" | "admin"
  accessibilityProfile: AccessibilityProfile
  preferences: UserPreferences
  transitDNA: {
    totalTrips: number
    lastUpdated: string
    learnedWeights: {
      time: number
      cost: number
      walking: number
      reliability: number
      accessibility: number
    }
  }
  createdAt: string
}

export type AccessibilityProfile =
  | "standard"
  | "wheelchair"
  | "senior"
  | "pregnant"
  | "stroller"
  | "luggage"
  | "reduced_mobility"

export interface UserPreferences {
  preferredMode: TransportMode
  walkingTolerance: "low" | "medium" | "high"
  budgetPreference: "cheapest" | "balanced" | "comfort"
  prioritize: "speed" | "comfort" | "reliability" | "accessibility"
}

export type TransportMode = "metro" | "bus" | "walking" | "auto" | "any"

export interface JourneySegment {
  mode: TransportMode
  from: string
  to: string
  duration: number
  distance: number
  fare: number
  line?: string
}

export interface Route {
  id: string
  origin: string
  destination: string
  totalTime: number
  totalCost: number
  walkingDistance: number
  transfers: number
  transportModes: TransportMode[]
  segments: JourneySegment[]
  crowdLevel?: "low" | "medium" | "high"
  accessibilityScore?: number
  reliabilityScore?: number
  weatherImpact?: "low" | "medium" | "high"
  arrivalConfidence?: number
  transferRisk?: "low" | "medium" | "high"
  recommended?: boolean
}

export interface TravelHistory {
  _id: string
  userId: string
  origin: string
  destination: string
  selectedRoute: Route
  completedAt: string
  feedback?: JourneyFeedback
}

export interface JourneyFeedback {
  rating: number
  tags: string[]
  note?: string
}

export interface SavedDestination {
  _id: string
  label: string
  address: string
  icon: "home" | "work" | "school" | "other"
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface AuthTokens {
  accessToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  accessibilityProfile?: AccessibilityProfile
}
