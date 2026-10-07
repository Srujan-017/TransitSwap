import mongoose from "mongoose"
import { PairwisePreference } from "../../models/PreferencePair"
import { UserPreferenceModel } from "../../models/UserPreferenceModel"
import { extractRouteFeatures, FEATURE_NAMES, type RouteFeatureVector } from "./featureExtractor"
import {
  LogisticModelWeights,
  PairwiseLogisticRegression,
  TrainingSample,
} from "./logisticRegression"
import type { EnrichedRoute } from "../../types/intelligence"
import type { UserPreferences } from "../../types"
import { getPreferenceAdjustedWeights, calculatePreferenceAdjustment } from "../transitDnaService"

export interface MLStatusResponse {
  isPersonalized: boolean
  sampleCount: number
  statusMessage: string
  weights: LogisticModelWeights
  modelMetrics?: {
    trainAccuracy: number
    testAccuracy?: number
    logLoss?: number
    lastTrainedAt?: string
  }
}

const DEFAULT_WEIGHTS: LogisticModelWeights = {
  time: 0.25,
  cost: 0.15,
  walking: 0.20,
  reliability: 0.25,
  accessibility: 0.15,
  crowd: 0.10,
  weather: 0.10,
}

export function getProfileWeights(profile?: string): LogisticModelWeights {
  switch (profile) {
    case "wheelchair":
      return { accessibility: 0.50, walking: 0.20, reliability: 0.15, time: 0.05, cost: 0.05, crowd: 0.025, weather: 0.025 }
    case "senior":
      return { walking: 0.30, reliability: 0.25, accessibility: 0.20, time: 0.10, cost: 0.05, crowd: 0.05, weather: 0.05 }
    case "pregnant":
      return { walking: 0.35, crowd: 0.15, accessibility: 0.20, time: 0.10, reliability: 0.10, cost: 0.05, weather: 0.05 }
    case "luggage":
      return { walking: 0.30, accessibility: 0.30, time: 0.10, cost: 0.05, reliability: 0.10, crowd: 0.05, weather: 0.10 }
    case "reduced_mobility":
      return { accessibility: 0.35, walking: 0.30, reliability: 0.15, time: 0.10, cost: 0.05, crowd: 0.025, weather: 0.025 }
    case "stroller":
      return { accessibility: 0.40, walking: 0.25, time: 0.10, cost: 0.05, reliability: 0.10, crowd: 0.05, weather: 0.05 }
    case "fastest":
      return { time: 0.60, cost: 0.10, walking: 0.10, reliability: 0.10, accessibility: 0.05, crowd: 0.025, weather: 0.025 }
    case "cheapest":
      return { cost: 0.60, time: 0.10, walking: 0.10, reliability: 0.10, accessibility: 0.05, crowd: 0.025, weather: 0.025 }
    case "comfort":
      return { crowd: 0.25, weather: 0.20, walking: 0.20, reliability: 0.15, accessibility: 0.10, time: 0.05, cost: 0.05 }
    case "standard":
    default:
      return DEFAULT_WEIGHTS
  }
}

// In-memory model cache for offline/unauthenticated demo mode
const memoryModelCache = new Map<string, { weights: LogisticModelWeights; sampleCount: number }>()

export const mlPreferenceService = {
  /**
   * Records a user's route selection, generates pairwise preference samples (Chosen vs Alternatives),
   * stores them in MongoDB, and triggers model retraining when enough samples exist.
   */
  async recordRouteChoice(
    userId: string,
    chosenRoute: EnrichedRoute,
    alternativeRoutes: EnrichedRoute[],
    source: "USER_CHOICE" | "USER_FEEDBACK" | "DEMO_SYNTHETIC_DATA" = "USER_CHOICE",
  ): Promise<{ pairsCreated: number; modelRetrained: boolean; status: MLStatusResponse }> {
    if (!chosenRoute || !Array.isArray(alternativeRoutes) || alternativeRoutes.length === 0) {
      const status = await this.getModelStatus(userId)
      return { pairsCreated: 0, modelRetrained: false, status }
    }

    const allCandidates = [chosenRoute, ...alternativeRoutes]
    const chosenVector = extractRouteFeatures(chosenRoute, allCandidates)
    const alternativeVectors = alternativeRoutes.map((r) => extractRouteFeatures(r, allCandidates))

    let pairsCreated = 0

    if (mongoose.connection.readyState === 1 && userId) {
      try {
        const docs = alternativeVectors.map((altVector) => {
          const deltaX = chosenVector.featureArray.map((val, idx) => val - altVector.featureArray[idx])
          return {
            userId,
            originName: chosenRoute.segments[0]?.from?.name ?? "Origin",
            destinationName: chosenRoute.segments[chosenRoute.segments.length - 1]?.to?.name ?? "Destination",
            chosenRouteId: chosenRoute.id,
            rejectedRouteId: altVector.routeId,
            chosenFeatures: chosenVector.features,
            rejectedFeatures: altVector.features,
            deltaX,
            label: 1,
            source,
          }
        })

        // Problem 8 hardening — insert with ordered:false so a retry of the same
        // journey-save operation (which re-sends identical chosen/rejected route
        // ids) hits the unique index on (userId, chosenRouteId, rejectedRouteId,
        // source) and is silently skipped as a duplicate, rather than creating a
        // second pairwise sample or aborting the whole batch.
        try {
          const result = await PairwisePreference.insertMany(docs, { ordered: false })
          pairsCreated = result.length
        } catch (bulkErr) {
          const err = bulkErr as { insertedDocs?: unknown[]; writeErrors?: unknown[]; code?: number }
          if (err?.insertedDocs || err?.writeErrors) {
            // Some documents were duplicates (already recorded from a prior attempt)
            // and were skipped; the rest were inserted successfully.
            pairsCreated = err.insertedDocs?.length ?? 0
          } else {
            throw bulkErr
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to store pairwise preferences in DB:", err)
      }
    } else {
      // Offline / Unauthenticated fallback cache
      const cached = memoryModelCache.get(userId) ?? { weights: { ...DEFAULT_WEIGHTS }, sampleCount: 0 }
      cached.sampleCount += alternativeVectors.length
      memoryModelCache.set(userId, cached)
      pairsCreated = alternativeVectors.length
    }

    // Retrain model if sample threshold met
    const retrainResult = await this.trainUserModel(userId)
    const status = await this.getModelStatus(userId)

    return {
      pairsCreated,
      modelRetrained: retrainResult.retrained,
      status,
    }
  },

  /**
   * Trains Pairwise Logistic Regression model on the user's recorded preference samples.
   */
  async trainUserModel(userId: string): Promise<{ retrained: boolean; metrics?: unknown }> {
    if (mongoose.connection.readyState !== 1 || !userId) {
      return { retrained: false }
    }

    try {
      const samplesDocs = await PairwisePreference.find({ userId }).sort({ createdAt: -1 }).limit(500)
      if (samplesDocs.length < 5) {
        // Cold start — insufficient data to train personalized model
        return { retrained: false }
      }

      const samples: TrainingSample[] = samplesDocs.map((doc) => ({
        deltaX: doc.deltaX,
        label: doc.label,
      }))

      // Train-test split (80/20) if enough samples exist
      let trainSamples = samples
      let testSamples: TrainingSample[] = []
      if (samples.length >= 10) {
        const splitIdx = Math.floor(samples.length * 0.8)
        trainSamples = samples.slice(0, splitIdx)
        testSamples = samples.slice(splitIdx)
      }

      const model = new PairwiseLogisticRegression()
      const trainResult = model.train(trainSamples)

      let testAccuracy: number | undefined = undefined
      if (testSamples.length > 0) {
        testAccuracy = model.evaluateAccuracy(testSamples)
      }

      // Persist model in MongoDB
      await UserPreferenceModel.findOneAndUpdate(
        { userId },
        {
          userId,
          weights: trainResult.weights,
          sampleCount: samples.length,
          trainAccuracy: trainResult.pairwiseAccuracy,
          testAccuracy,
          logLoss: trainResult.finalLoss,
          isPersonalized: true,
          lastTrainedAt: new Date(),
        },
        { upsert: true, new: true },
      )

      return { retrained: true, metrics: trainResult }
    } catch (err) {
      console.warn("⚠️ Model training error:", err)
      return { retrained: false }
    }
  },

  /**
   * Ranks candidate routes using learned ML pairwise logistic regression weights + explicit user preferences.
   * If the user doesn't have custom trained ML weights yet, uses profile-specific default weights.
   */
  async rankRoutes(
    userId: string | undefined,
    candidateRoutes: EnrichedRoute[],
    profile?: string,
    preferences?: UserPreferences,
  ): Promise<{ rankedRoutes: EnrichedRoute[]; isPersonalized: boolean; statusMessage: string }> {
    if (candidateRoutes.length <= 1) {
      return {
        rankedRoutes: candidateRoutes,
        isPersonalized: false,
        statusMessage: "Single route available.",
      }
    }

    const status = await this.getModelStatus(userId, profile, preferences)
    const weights = status.weights

    // Score routes using ML weights (personalized or profile-specific) + preference adjustments
    const scored = candidateRoutes.map((route) => {
      const vector = extractRouteFeatures(route, candidateRoutes)

      // Linear preference score: S = w · X + preference_adjustment
      let score =
        vector.features.time * (weights.time ?? 0.25) +
        vector.features.cost * (weights.cost ?? 0.15) +
        vector.features.walking * (weights.walking ?? 0.20) +
        vector.features.reliability * (weights.reliability ?? 0.25) +
        vector.features.accessibility * (weights.accessibility ?? 0.15) +
        vector.features.crowd * (weights.crowd ?? 0.10) +
        vector.features.weather * (weights.weather ?? 0.10)

      // Apply explicit user preference adjustments (mode match, walking bounds, reliability risk)
      score += calculatePreferenceAdjustment(route, preferences)

      const compositeScore = Math.round(score * 100)

      return {
        route: {
          ...route,
          transitDnaScore: compositeScore,
        },
        vector,
      }
    })

    // Sort candidates descending by ML composite score
    scored.sort((a, b) => (b.route.transitDnaScore ?? 0) - (a.route.transitDnaScore ?? 0))

    const rankedRoutes = scored.map((s) => s.route)

    return {
      rankedRoutes,
      isPersonalized: status.isPersonalized,
      statusMessage: status.statusMessage,
    }
  },

  /**
   * Fetches ML model status and learned weights for a given user, profile, and explicit preferences.
   */
  async getModelStatus(
    userId: string | undefined,
    profile?: string,
    preferences?: UserPreferences,
  ): Promise<MLStatusResponse> {
    const baseWeights = getProfileWeights(profile)
    const profileWeights = getPreferenceAdjustedWeights(baseWeights as any, preferences) as LogisticModelWeights

    if (!userId || mongoose.connection.readyState !== 1) {
      return {
        isPersonalized: false,
        sampleCount: 0,
        statusMessage: `Building your travel preference profile (Profile: ${profile ?? "standard"} active)`,
        weights: profileWeights,
      }
    }

    try {
      const stored = await UserPreferenceModel.findOne({ userId })
      if (stored && stored.isPersonalized && stored.sampleCount >= 5) {
        return {
          isPersonalized: true,
          sampleCount: stored.sampleCount,
          statusMessage: `Personalized ML Model Active (Trained on ${stored.sampleCount} pairwise choices)`,
          weights: stored.weights as LogisticModelWeights,
          modelMetrics: {
            trainAccuracy: stored.trainAccuracy,
            testAccuracy: stored.testAccuracy,
            logLoss: stored.logLoss,
            lastTrainedAt: stored.lastTrainedAt?.toISOString(),
          },
        }
      }
    } catch {
      // Fallback
    }

    return {
      isPersonalized: false,
      sampleCount: 0,
      statusMessage: `Building your travel preference profile (${profile ?? "standard"} profile baseline active)`,
      weights: profileWeights,
    }
  },
}
