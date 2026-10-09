import type { Request, Response, NextFunction } from "express"
import { geocodingService } from "../services/geocodingService"
import { sendSuccess } from "../utils/response"
import { AppError } from "../middleware/errorHandler"

export async function searchLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query.q
    if (typeof q !== "string" || q.trim().length < 2) {
      throw new AppError("Query parameter 'q' must be at least 2 characters.", 400)
    }
    const results = await geocodingService.search(q.trim())
    sendSuccess(res, results)
  } catch (err: unknown) {
    next(err)
  }
}

export async function reverseGeocode(req: Request, res: Response, next: NextFunction) {
  try {
    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      throw new AppError("Query parameter 'lat' must be a number between -90 and 90.", 400)
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      throw new AppError("Query parameter 'lng' must be a number between -180 and 180.", 400)
    }
    const result = await geocodingService.reverse(lat, lng)
    sendSuccess(res, result)
  } catch (err: unknown) {
    next(err)
  }
}
