import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../types"
import { journeyService } from "../services/journeyService"
import { sendSuccess } from "../utils/response"

export async function saveJourney(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const journey = await journeyService.saveJourney(req.user!.userId, req.body)
    sendSuccess(res, journey, "Journey saved successfully", 201)
  } catch (err) {
    next(err)
  }
}

export async function getJourneyHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const journeys = await journeyService.getHistory(req.user!.userId)
    sendSuccess(res, journeys)
  } catch (err) {
    next(err)
  }
}

export async function getJourney(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const journey = await journeyService.getJourney(req.user!.userId, req.params.id)
    sendSuccess(res, journey)
  } catch (err) {
    next(err)
  }
}

export async function deleteJourney(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await journeyService.deleteJourney(req.user!.userId, req.params.id)
    sendSuccess(res, { deleted: true }, "Journey deleted")
  } catch (err) {
    next(err)
  }
}

export async function saveDestination(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const destination = await journeyService.saveDestination(req.user!.userId, req.body)
    sendSuccess(res, destination, "Destination saved", 201)
  } catch (err) {
    next(err)
  }
}

export async function getSavedDestinations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const destinations = await journeyService.getDestinations(req.user!.userId)
    sendSuccess(res, destinations)
  } catch (err) {
    next(err)
  }
}

export async function deleteSavedDestination(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await journeyService.deleteDestination(req.user!.userId, req.params.id)
    sendSuccess(res, { deleted: true }, "Saved destination deleted")
  } catch (err) {
    next(err)
  }
}

export async function submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await journeyService.submitFeedback(req.user!.userId, req.params.id, req.body)
    // Problem 15 fix — use the service's honest, situation-specific message
    // (e.g. "already learned", "learning unavailable") as the actual response
    // message, instead of a generic string that always implies success/learning.
    sendSuccess(
      res,
      { journey: result.journey, transitDnaUpdated: result.transitDnaUpdated },
      result.message,
    )
  } catch (err) {
    next(err)
  }
}

