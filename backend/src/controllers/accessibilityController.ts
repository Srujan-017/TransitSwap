import type { Response, NextFunction } from "express"
import type { Request } from "express"
import type { AuthenticatedRequest } from "../types"
import { accessibilityService } from "../services/accessibilityService"
import { sendSuccess } from "../utils/response"
import { AppError } from "../middleware/errorHandler"

export async function listAccessibilityStations(_req: Request, res: Response, next: NextFunction) {
  try {
    const stations = await accessibilityService.listStations()
    sendSuccess(res, stations, `${stations.length} accessibility station records returned (synthetic demo dataset).`)
  } catch (err) {
    next(err)
  }
}

export async function getAccessibilityStation(req: Request, res: Response, next: NextFunction) {
  try {
    const station = await accessibilityService.getStation(req.params.stationId)
    if (!station) throw new AppError("Accessibility station not found.", 404)
    sendSuccess(res, station)
  } catch (err) {
    next(err)
  }
}

export async function reportAccessibilityIssue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const report = await accessibilityService.reportIssue(req.user!.userId, req.body)
    sendSuccess(res, report, "Accessibility report submitted for verification.", 201)
  } catch (err) {
    next(err)
  }
}

export async function getStationReports(req: Request, res: Response, next: NextFunction) {
  try {
    const reports = await accessibilityService.getReportsForStation(req.params.stationId)
    sendSuccess(res, reports, `${reports.length} community reports found.`)
  } catch (err) {
    next(err)
  }
}
