import type { Request, Response, NextFunction } from "express"
import mongoose from "mongoose"
import { User } from "../models/User"
import { accessibilityService } from "../services/accessibilityService"
import { crowdService } from "../services/crowdService"
import { multimodalService } from "../services/multimodalService"
import type { NearbyTransitResult } from "../services/multimodalService"
import { calculateWeatherImpact, weatherService } from "../services/weatherService"
import { reliabilityService } from "../services/reliabilityService"
import { transitDnaService } from "../services/transitDnaService"
import { mlPreferenceService } from "../services/ml/mlPreferenceService"
import { sustainabilityService } from "../services/sustainabilityService"
import { sendSuccess } from "../utils/response"
import { AppError } from "../middleware/errorHandler"
import type { MultimodalRequest } from "../types/multimodal"
import type { EnrichedRoute } from "../types/intelligence"

export async function calculateMultimodalRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as MultimodalRequest
    const routes = multimodalService.generateRoutes(body)

    if (routes.length === 0) {
      throw new AppError(
        "No multimodal route found. The selected locations may be outside the demo transit service area.",
        404,
      )
    }

    const profile = body.profile ?? "standard"
    const weather = await weatherService.getCurrent(body.destination.latitude, body.destination.longitude)
    const accessibilityFiltered = await accessibilityService.filterRoutes(routes, profile)
    const allWalkingMeters = accessibilityFiltered.map((route) => route.totalWalkingMeters)

    // Load authenticated user's profile preferences & learned TransitDNA weights
    let personalizedWeights: { time: number; cost: number; walking: number; reliability: number; accessibility: number } | undefined = undefined
    let userPreferences: import("../types").UserPreferences | undefined = undefined
    const authUserId = (req as unknown as { user?: { userId: string } }).user?.userId

    if (authUserId && mongoose.connection.readyState === 1) {
      try {
        const dbUser = await User.findById(authUserId)
        if (dbUser) {
          if (dbUser.preferences) {
            userPreferences = dbUser.preferences
          }
          if (dbUser.transitDNA?.learnedWeights) {
            personalizedWeights = dbUser.transitDNA.learnedWeights as unknown as typeof personalizedWeights
          }
        }
      } catch {
        // Non-fatal — fall back to baseline defaults
      }
    }

    // Enrich each route with weather, crowd, reliability, and intelligence scores
    const enriched: EnrichedRoute[] = await Promise.all(
      accessibilityFiltered.map(async (route, index) => {
        const enrichedRoute: EnrichedRoute = {
          ...route,
          weatherImpact: calculateWeatherImpact(
            weather,
            route.totalWalkingMeters,
            allWalkingMeters.filter((_, otherIndex) => otherIndex !== index),
          ),
          crowd: await crowdService.routeSummary(route),
        }

        // Rule-based prototype reliability estimate (not a calibrated ML model)
        enrichedRoute.reliability = reliabilityService.calculateReliability(enrichedRoute)

        // Data-driven 90% prediction interval derived from historical journey duration prediction errors
        enrichedRoute.confidenceInterval = await reliabilityService.calculateConfidenceInterval(
          enrichedRoute,
          body.departureTime,
        )

        // Data-Driven Monte Carlo simulation (1,000 empirical trials over historical delay distribution)
        enrichedRoute.missedConnectionRisk = await reliabilityService.calculateMissedConnectionRisk(enrichedRoute)

        // Smart departure suggestion — null when no departure time was supplied,
        // so the frontend can honestly ask the user to pick one.
        enrichedRoute.departureSuggestion =
          (await reliabilityService.calculateSmartDeparture(enrichedRoute, body.departureTime)) ?? undefined

        // Last-mile connectivity options
        enrichedRoute.lastMileOptions = reliabilityService.calculateLastMileOptions(enrichedRoute)

        // Initial feature score using TransitDNA and user preferences
        enrichedRoute.transitDnaScore = transitDnaService.scoreRoute(
          enrichedRoute,
          personalizedWeights,
          profile,
          userPreferences,
        )

        // Problem 9 — relative (0-100) sustainability score, an additional
        // decision-support metric. Not part of the 7-feature ML ranking model.
        const sustainability = sustainabilityService.calculateSustainability(enrichedRoute)
        enrichedRoute.sustainabilityScore = sustainability.sustainabilityScore
        enrichedRoute.sustainabilitySummary = sustainability.sustainabilitySummary

        return enrichedRoute
      }),
    )

    if (enriched.length === 0) {
      throw new AppError(
        "No accessible multimodal route found for the selected profile in the current demo dataset.",
        404,
      )
    }

    // Pairwise Logistic Regression ML Learning-to-Rank Engine + TransitDNA Explicit User Preferences
    const { rankedRoutes, statusMessage, isPersonalized } = await mlPreferenceService.rankRoutes(
      authUserId,
      enriched,
      profile,
      userPreferences,
    )

    // Attach plain-language explainability reasons and an honest personalization
    // status to each route (Problem 23 — surfaced in the UI as a badge, distinct
    // from a merely profile-based recommendation).
    rankedRoutes.forEach((route) => {
      route.whyRecommended = transitDnaService.generateWhyRecommended(
        route,
        rankedRoutes,
        profile,
        userPreferences,
        isPersonalized,
      )
      route.isPersonalized = isPersonalized
    })

    sendSuccess(
      res,
      rankedRoutes,
      `TransitSwap ML Intelligence Engine: Pairwise Logistic Regression ranker active (${statusMessage}). Evaluated with weather, accessibility, reliability & Monte Carlo simulation.`,
    )
  } catch (err: unknown) {
    next(err)
  }
}

// ── Problem 11 — Nearby Transit ─────────────────────────────────────────────
// Reuses multimodalService.getNearbyTransit() (which itself reuses the existing
// nearestMetro()/nearestBusStop()/haversine() helpers), then enriches each result
// with the existing accessibilityService and crowdService — no duplicate crowd
// algorithm and no duplicate accessibility dataset are introduced here.

interface NearbyTransitStationView extends NearbyTransitResult {
  accessibility: {
    status: string
    hasLift: boolean | null
    hasRamp: boolean | null
  } | "unknown"
  crowd: {
    level?: "LOW" | "MEDIUM" | "HIGH"
    source: string
  } | "unavailable"
}

async function enrichNearbyStation(station: NearbyTransitResult): Promise<NearbyTransitStationView> {
  const [accessibilityRecord, crowdEstimate] = await Promise.all([
    accessibilityService.getStation(station.stationId).catch(() => null),
    crowdService.stationEstimate(station.stationId, station.stationName).catch(() => null),
  ])

  return {
    ...station,
    accessibility: accessibilityRecord
      ? {
          status: accessibilityRecord.status,
          hasLift: accessibilityRecord.hasLift,
          hasRamp: accessibilityRecord.hasRamp,
        }
      : "unknown",
    crowd: crowdEstimate && crowdEstimate.source !== "UNAVAILABLE"
      ? { level: crowdEstimate.crowdLevel, source: crowdEstimate.source }
      : "unavailable",
  }
}

export async function getNearbyTransit(req: Request, res: Response, next: NextFunction) {
  try {
    const latitude = Number(req.query.latitude)
    const longitude = Number(req.query.longitude)

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new AppError("latitude must be a number between -90 and 90.", 400)
    }
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new AppError("longitude must be a number between -180 and 180.", 400)
    }

    const nearby = multimodalService.getNearbyTransit(latitude, longitude)

    if (!nearby.metro && !nearby.bus) {
      sendSuccess(
        res,
        { metro: null, bus: null },
        "No nearby transit found in the current demonstration network.",
      )
      return
    }

    const [metro, bus] = await Promise.all([
      nearby.metro ? enrichNearbyStation(nearby.metro) : Promise.resolve(null),
      nearby.bus ? enrichNearbyStation(nearby.bus) : Promise.resolve(null),
    ])

    sendSuccess(res, { metro, bus }, "Nearby transit found in the current demonstration network.")
  } catch (err: unknown) {
    next(err)
  }
}

