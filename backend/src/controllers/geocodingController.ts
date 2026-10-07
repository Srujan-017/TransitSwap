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
