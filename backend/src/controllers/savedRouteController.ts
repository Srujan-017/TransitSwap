import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../types"
import { savedRouteService } from "../services/savedRouteService"
import { sendSuccess } from "../utils/response"

export async function saveRoute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const savedRoute = await savedRouteService.saveRoute(req.user!.userId, req.body)
    sendSuccess(res, savedRoute, "Route saved", 201)
  } catch (err) {
    next(err)
  }
}

export async function getSavedRoutes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const routes = await savedRouteService.getSavedRoutes(req.user!.userId)
    sendSuccess(res, routes)
  } catch (err) {
    next(err)
  }
}

export async function getSavedRoute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const route = await savedRouteService.getSavedRoute(req.user!.userId, req.params.id)
    sendSuccess(res, route)
  } catch (err) {
    next(err)
  }
}

export async function deleteSavedRoute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await savedRouteService.deleteSavedRoute(req.user!.userId, req.params.id)
    sendSuccess(res, { deleted: true }, "Saved route deleted")
  } catch (err) {
    next(err)
  }
}
