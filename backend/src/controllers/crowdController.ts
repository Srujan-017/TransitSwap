import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../types"
import { crowdService } from "../services/crowdService"
import { sendSuccess } from "../utils/response"

export async function reportCrowd(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const report = await crowdService.reportCrowd(req.user!.userId, req.body)
    sendSuccess(res, report, "Crowd report submitted", 201)
  } catch (err) {
    next(err)
  }
}

export async function getStationCrowd(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const estimate = await crowdService.stationEstimate(req.params.stationId)
    sendSuccess(res, estimate)
  } catch (err) {
    next(err)
  }
}

export async function getCrowdHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const history = await crowdService.stationHistory(req.params.stationId)
    sendSuccess(res, history)
  } catch (err) {
    next(err)
  }
}
