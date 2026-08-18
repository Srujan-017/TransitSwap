import api from "./api"
import type { CrowdLevel } from "../types/multimodal"
import type { JourneyRecord } from "./tripService"

export interface AccessibilityStation {
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
  status: string
  notes: string | null
}

export interface EvaluationMetrics {
  totalScenariosEvaluated: number
  agreementRateWithShortestTimePercent: number
  agreementRateWithCheapestPercent: number
  transitSwapAverageReliability: number
  baselineShortestTimeAverageReliability: number
  transitSwapAverageWalkingMeters: number
  baselineShortestTimeAverageWalkingMeters: number
  transitSwapAverageMissedConnectionRiskPercent: number
  baselineShortestTimeMissedConnectionRiskPercent: number
  confidenceIntervalCoveragePercent: number | null
  confidenceIntervalCoverageNote?: string
  averageComputationLatencyMs: number
  isSimulatedBenchmark: boolean
  benchmarkDisclaimer?: string
  evaluatedAt: string
  scenarios: Array<{
    originName: string
    destinationName: string
    transitSwapChosenLabel: string
    shortestTimeChosenLabel: string
    cheapestChosenLabel: string
    durationDifferenceVsShortestMin?: number
    walkingSavingsVsShortestTimeMeters: number
    reliabilityDifferenceVsShortestPercent?: number
    reliabilityImprovementPercent?: number
  }>
}

export const intelligenceService = {
  async getAccessibilityStations(): Promise<AccessibilityStation[]> {
    const { data } = await api.get<{ success: boolean; data: AccessibilityStation[] }>("/accessibility/stations")
    return data.data
  },

  async reportAccessibilityIssue(input: {
    stationId: string
    stationName: string
    issueType: string
    description: string
  }): Promise<void> {
    await api.post("/accessibility/report", input)
  },

  async reportCrowd(input: {
    stationId: string
    stationName: string
    transportMode: "metro" | "bus"
    crowdLevel: CrowdLevel
  }): Promise<void> {
    await api.post("/crowd/report", input)
  },

  async getEvaluationMetrics(): Promise<EvaluationMetrics> {
    const { data } = await api.get<{ success: boolean; data: EvaluationMetrics }>("/evaluation")
    return data.data
  },

  async updateProfile(profileData: { name?: string; accessibilityProfile?: string }): Promise<any> {
    const { data } = await api.put("/auth/profile", profileData)
    return data.data
  },

  async updatePreferences(preferences: Record<string, any>): Promise<any> {
    const { data } = await api.put("/auth/preferences", preferences)
    return data.data
  },

  async resetTransitDna(): Promise<any> {
    const { data } = await api.post("/auth/transitdna/reset")
    return data.data
  },

  // Problem 15 fix — return the backend's actual result (honest message,
  // whether TransitDNA really updated, and the updated journey record so the
  // caller can update its local state without a full page reload) instead of
  // discarding the response, and accept the optional `issues` tags the
  // feedback UI collects.
  async submitJourneyFeedback(
    journeyId: string,
    // Problem 21 — actualDurationMinutes is optional; omit it entirely (don't
    // send 0/NaN) when the user hasn't entered one.
    feedback: { rating: number; comment?: string; issues?: string[]; actualDurationMinutes?: number },
  ): Promise<{ transitDnaUpdated: boolean; message: string; journey: JourneyRecord }> {
    const { data } = await api.post<{
      success: boolean
      message?: string
      data: { transitDnaUpdated: boolean; journey: JourneyRecord }
    }>(`/trips/${journeyId}/feedback`, feedback)
    return {
      transitDnaUpdated: data.data?.transitDnaUpdated ?? false,
      message: data.message ?? "Feedback submitted.",
      journey: data.data.journey,
    }
  },
}

