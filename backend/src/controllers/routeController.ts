import type { Request, Response, NextFunction } from "express"
import { routingService } from "../services/routingService"
import { sendSuccess } from "../utils/response"
import type { RouteRequest } from "../types/routing"

export async function calculateRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as RouteRequest
    const routes = await routingService.getRoute(body)
    sendSuccess(res, routes)
  } catch (err: unknown) {
    next(err)
  }
}
