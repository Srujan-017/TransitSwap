import type { Request, Response, NextFunction } from "express"
import { accessibilityService } from "../services/accessibilityService"
import { crowdService } from "../services/crowdService"
import { planTrip } from "../services/tripPlanner"
import { multimodalService } from "../services/multimodalService"
import type { NearbyTransitResult } from "../services/multimodalService"
import { sendSuccess } from "../utils/response"
import { AppError } from "../middleware/errorHandler"
import type { MultimodalRequest } from "../types/multimodal"

export async function calculateMultimodalRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as MultimodalRequest
    const authUserId = (req as unknown as { user?: { userId: string } }).user?.userId
    const { rankedRoutes, statusMessage, excludedRoutes, busAlternativeNote } = await planTrip(body, { userId: authUserId })

    // Not sendSuccess() here — busAlternativeNote is a new, optional,
    // top-level field alongside the unchanged `data` array, so every
    // existing consumer (frontend service, tests) that reads only
    // `data`/`message` is completely unaffected.
    res.status(200).json({
      success: true,
      data: rankedRoutes,
      message: `TransitSwap ML Intelligence Engine: Pairwise Logistic Regression ranker active (${statusMessage}). Evaluated with weather, accessibility, reliability & Monte Carlo simulation.`,
      ...(busAlternativeNote ? { busAlternativeNote } : {}),
      // Candidate routes that were ruled out for this profile, each with its typed
      // reason — optional, so every existing consumer is unaffected.
      ...(excludedRoutes.length ? { excludedRoutes } : {}),
    })
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
