export interface AdminOverview {
  users: number | "N/A"
  journeys: number | "N/A"
  savedRoutes: number | "N/A"
  savedDestinations: number | "N/A"
  crowdReports: number | "N/A"
  accessibilityRecords: number
  feedback: number | "N/A"
  databaseConnected: boolean
}

export interface AdminStation {
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
  verificationSource: string
  status: "accessible" | "partially_accessible" | "not_accessible" | "unknown"
  notes: string | null
  active?: boolean
}

export interface AdminCrowdReport {
  _id: string
  userId: string
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  crowdLevel: "LOW" | "MEDIUM" | "HIGH"
  reportedAt: string
  source: string
  confidence: number
  status: "accepted" | "flagged"
}

export interface AdminFeedbackRecord {
  _id: string
  origin: { name: string }
  destination: { name: string }
  userId: { _id: string; name: string; email: string } | string
  userFeedback: {
    rating: number
    comment: string
    issues: string[]
    actualDurationMinutes?: number
    createdAt: string
  }
  createdAt: string
}

export interface AdminDatasetInfo {
  dataset: string
  records: number | string
  source: string
  status: string
}
