import mongoose from "mongoose"
import { Journey } from "../models/Journey"
import { SavedDestination } from "../models/SavedDestination"
import { AppError } from "../middleware/errorHandler"
import { transitDnaService } from "./transitDnaService"
import { historicalReliabilityService } from "./reliability/historicalReliabilityService"
import { parseLocalDateTime } from "../utils/dateTime"
import type { EnrichedRoute, RouteSnapshot } from "../types/intelligence"
import type { SegmentLocation } from "../types/multimodal"

interface SaveJourneyInput {
  origin: SegmentLocation
  destination: SegmentLocation
  selectedRoute: EnrichedRoute
  // BUG 2 FIX: store alternatives so feedback can trigger real TransitDNA learning
  alternativeRoutes?: EnrichedRoute[]
  // Problem 21 — the real departure date/time the user picked on PlanTripPage
  // (e.g. "2026-08-16T08:30:00"), if they picked one. Never invented here.
  departureTime?: string
}

interface SubmitFeedbackInput {
  rating: number
  comment?: string
  issues?: string[]
  // Problem 21 — optional, user-entered actual journey duration in minutes.
  actualDurationMinutes?: number
}

interface SaveDestinationInput {
  name: string
  address: string
  latitude: number
  longitude: number
}

function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError("Database is not connected. Configure MONGODB_URI to use this feature.", 503)
  }
}

function assertLocation(location: SegmentLocation, field: string) {
  if (!location?.name || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
    throw new AppError(`${field} must include name, latitude and longitude.`, 400)
  }
}

function toSnapshot(route: EnrichedRoute): RouteSnapshot {
  if (!route?.id || !Array.isArray(route.segments) || route.segments.length === 0) {
    throw new AppError("Selected route snapshot is invalid.", 400)
  }

  return {
    routeId: route.id,
    label: route.labelDisplay,
    summary: route.summary,
    segments: route.segments,
    totalDistanceMeters: route.totalDistanceMeters,
    totalDurationSeconds: route.totalDurationSeconds,
    totalWalkingMeters: route.totalWalkingMeters,
    totalFare: route.totalFare,
    transferCount: route.transferCount,
    modes: route.modes,
    weatherImpact: route.weatherImpact,
    accessibility: route.accessibility,
    crowd: route.crowd,
    // Problem 9 — carry the relative sustainability score/summary into the saved snapshot.
    sustainabilityScore: route.sustainabilityScore,
    sustainabilitySummary: route.sustainabilitySummary,
  }
}

export const journeyService = {
  /**
   * Problem 7 fix — route-choice learning now happens HERE, at the moment the
   * user actually picks and saves a route (comparing it against the alternatives
   * shown), rather than only at feedback time. Feedback (see submitFeedback
   * below) becomes an additional, secondary signal and skips re-learning from
   * the same choice if this already succeeded.
   */
  async saveJourney(userId: string, input: SaveJourneyInput) {
    ensureDb()
    assertLocation(input.origin, "Origin")
    assertLocation(input.destination, "Destination")
    const snapshot = toSnapshot(input.selectedRoute)
    const alternativeRoutes = input.alternativeRoutes ?? []

    let choiceLearningApplied = false
    if (alternativeRoutes.length > 0) {
      const updated = await transitDnaService.learnFromUserChoice(userId, input.selectedRoute, alternativeRoutes, "USER_CHOICE")
      choiceLearningApplied = updated !== null
    }

    // Problem 21 — only stored when the user actually picked a date/time while
    // planning; parseLocalDateTime returns null (not "now") otherwise, so an
    // absent departureTime here honestly means "unknown", not "left now".
    const departureTime = parseLocalDateTime(input.departureTime) ?? undefined

    return Journey.create({
      userId,
      origin: input.origin,
      destination: input.destination,
      departureTime,
      selectedRoute: snapshot,
      routeSegments: snapshot.segments,
      transportModes: snapshot.modes,
      totalDistanceMeters: snapshot.totalDistanceMeters,
      totalDurationSeconds: snapshot.totalDurationSeconds,
      estimatedFare: snapshot.totalFare,
      walkingDistanceMeters: snapshot.totalWalkingMeters,
      transferCount: snapshot.transferCount,
      routeSummary: snapshot.summary,
      status: "planned",
      // Store enriched route data so feedback can trigger TransitDNA learning later
      // as a fallback (e.g. if the save-time attempt above failed or wasn't possible).
      selectedRouteEnriched: input.selectedRoute,
      alternativeRoutesEnriched: alternativeRoutes,
      choiceLearningApplied,
    })
  },

  async getHistory(userId: string) {
    ensureDb()
    return Journey.find({ userId }).sort({ createdAt: -1 }).limit(100)
  },

  async getJourney(userId: string, journeyId: string) {
    ensureDb()
    const journey = await Journey.findOne({ _id: journeyId, userId })
    if (!journey) throw new AppError("Journey not found.", 404)
    return journey
  },

  async deleteJourney(userId: string, journeyId: string) {
    ensureDb()
    const deleted = await Journey.findOneAndDelete({ _id: journeyId, userId })
    if (!deleted) throw new AppError("Journey not found.", 404)
    return deleted
  },

  async saveDestination(userId: string, input: SaveDestinationInput) {
    ensureDb()
    const destination = await SavedDestination.findOneAndUpdate(
      { userId, name: input.name.trim() },
      {
        userId,
        name: input.name.trim(),
        address: input.address.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )
    return destination
  },

  async getDestinations(userId: string) {
    ensureDb()
    return SavedDestination.find({ userId }).sort({ createdAt: -1 })
  },

  async deleteDestination(userId: string, destinationId: string) {
    ensureDb()
    const deleted = await SavedDestination.findOneAndDelete({ _id: destinationId, userId })
    if (!deleted) throw new AppError("Saved destination not found.", 404)
    return deleted
  },

  /**
   * BUG 2 / PROBLEM 7 FIX: submitFeedback stores the rating, and only attempts
   * TransitDNA learning as a FALLBACK — if saveJourney already triggered it
   * (choiceLearningApplied), we skip re-learning to avoid duplicate pairwise
   * preference samples for the same route-choice event. The UI is only told
   * "TransitDNA updated" when an update actually happened (here or at save time).
   */
  async submitFeedback(userId: string, journeyId: string, feedback: SubmitFeedbackInput) {
    ensureDb()
    const journey = await Journey.findOne({ _id: journeyId, userId })
    if (!journey) throw new AppError("Journey not found.", 404)

    journey.userFeedback = {
      rating: feedback.rating,
      comment: feedback.comment || "",
      issues: feedback.issues || [],
      actualDurationMinutes: feedback.actualDurationMinutes,
      createdAt: new Date(),
    }
    journey.status = "completed"

    let transitDnaUpdated = false
    let transitDnaMessage = "Feedback saved."

    const doc = journey as unknown as Record<string, unknown>
    const selectedEnriched = doc.selectedRouteEnriched as EnrichedRoute | undefined
    const alternativesEnriched = doc.alternativeRoutesEnriched as EnrichedRoute[] | undefined

    if (journey.choiceLearningApplied) {
      // Already learned from this exact route choice when the journey was saved —
      // avoid creating duplicate pairwise preference samples.
      transitDnaMessage = "Feedback saved. TransitDNA already learned from this route choice when it was saved."
    } else if (selectedEnriched && Array.isArray(alternativesEnriched) && alternativesEnriched.length > 0) {
      try {
        const updatedWeights = await transitDnaService.learnFromUserChoice(userId, selectedEnriched, alternativesEnriched, "USER_FEEDBACK")
        if (updatedWeights) {
          transitDnaUpdated = true
          transitDnaMessage = "Feedback saved. TransitDNA preference weights updated from your route choice."
          journey.choiceLearningApplied = true
        } else {
          transitDnaMessage = "Feedback saved. TransitDNA learning skipped — database unavailable or user not found."
        }
      } catch {
        transitDnaMessage = "Feedback saved. TransitDNA update encountered an error."
      }
    } else {
      // No enriched alternatives stored (e.g. an older journey saved before this
      // was tracked) — honest message only; do not imply learning happened.
      transitDnaMessage = "Feedback saved. Route-choice learning was not available for this journey."
    }

    // Problem 21 — continuous improvement loop: only when the user provided a
    // valid actual duration AND this journey has a real, user-selected
    // departure time do we have enough honest information to create a
    // JourneyObservation. Never derive duration/arrival from feedback
    // submission time — if departureTime is unavailable, skip and say so.
    let reliabilityMessage = ""
    if (typeof feedback.actualDurationMinutes === "number") {
      if (!journey.departureTime) {
        reliabilityMessage =
          "Reliability learning was skipped because the journey did not contain enough timing information."
      } else {
        const routeSnapshot = journey.selectedRoute as unknown as RouteSnapshot | undefined
        const predictedDurationMinutes = journey.totalDurationSeconds / 60
        const transportMode: "metro" | "bus" | "walking" | "auto" | "multimodal" =
          journey.transportModes.length === 1
            ? (journey.transportModes[0] as "metro" | "bus" | "walking" | "auto")
            : "multimodal"

        const result = await historicalReliabilityService.recordObservation({
          userId,
          journeyId: String(journey._id),
          routeId: routeSnapshot?.routeId,
          originName: journey.origin.name,
          destinationName: journey.destination.name,
          transportMode,
          predictedDurationMinutes,
          actualDurationMinutes: feedback.actualDurationMinutes,
          departureTime: journey.departureTime,
          weatherCondition: routeSnapshot?.weatherImpact?.weather?.condition,
          crowdLevel: routeSnapshot?.crowd?.level,
          transferCount: journey.transferCount,
          // Real user-entered duration on a real saved journey — never synthetic.
          isSyntheticDemoData: false,
        })

        if (result.success) {
          journey.reliabilityObservationRecorded = true
          reliabilityMessage = result.wasUpdate
            ? "Your journey observation was updated in the reliability dataset."
            : "Your journey observation was added to the reliability dataset."
        } else {
          reliabilityMessage = `Reliability learning was skipped: ${result.message}`
        }
      }
    }

    const message = reliabilityMessage ? `${transitDnaMessage} ${reliabilityMessage}` : transitDnaMessage

    await journey.save()

    return { journey, transitDnaUpdated, message }
  },
}
