import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../types"
import { adminService } from "../services/adminService"
import { sendSuccess } from "../utils/response"

export async function getOverview(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await adminService.getOverview())
  } catch (err) {
    next(err)
  }
}

export async function listStations(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await adminService.listStations())
  } catch (err) {
    next(err)
  }
}

export async function createStation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const station = await adminService.createStation(req.body)
    sendSuccess(res, station, "Station created", 201)
  } catch (err) {
    next(err)
  }
}

export async function updateStation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await adminService.updateStation(req.params.stationId, req.body), "Station updated")
  } catch (err) {
    next(err)
  }
}

export async function deactivateStation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await adminService.deactivateStation(req.params.stationId), "Station deactivated")
  } catch (err) {
    next(err)
  }
}

export async function deleteStation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await adminService.deleteStation(req.params.stationId)
    sendSuccess(res, null, "Station deleted")
  } catch (err) {
    next(err)
  }
}

export async function listAccessibility(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await adminService.listStations())
  } catch (err) {
    next(err)
  }
}

export async function updateAccessibility(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await adminService.updateAccessibility(req.params.stationId, req.body), "Accessibility record updated")
  } catch (err) {
    next(err)
  }
}

export async function setLiftStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { liftStatus } = req.body
    const record = await adminService.setLiftStatus(req.params.stationId, liftStatus)
    sendSuccess(res, record, `Lift marked ${liftStatus}. This affects accessibility filtering for future route searches.`)
  } catch (err) {
    next(err)
  }
}

export async function listCrowdReports(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await adminService.listCrowdReports())
  } catch (err) {
    next(err)
  }
}

export async function deleteCrowdReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await adminService.deleteCrowdReport(req.params.reportId)
    sendSuccess(res, null, "Crowd report removed")
  } catch (err) {
    next(err)
  }
}

export async function listFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const rating = req.query.rating ? Number(req.query.rating) : undefined
    const issue = typeof req.query.issue === "string" ? req.query.issue : undefined
    sendSuccess(res, await adminService.listFeedback({ rating, issue }))
  } catch (err) {
    next(err)
  }
}

export async function getDataset(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await adminService.getDatasetInfo())
  } catch (err) {
    next(err)
  }
}
