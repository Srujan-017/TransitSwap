import type { Response, NextFunction } from "express"
import type { Request } from "express"
import type { AuthenticatedRequest } from "../types"
import { authService } from "../services/authService"
import { sendSuccess } from "../utils/response"

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, accessibilityProfile } = req.body
    const { user, token } = await authService.register(name, email, password, accessibilityProfile)
    sendSuccess(res, { user, token }, "Account created successfully", 201)
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    const { user, token } = await authService.login(email, password)
    sendSuccess(res, { user, token }, "Login successful")
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    // requireAuth runs first and guarantees req.user is populated
    const authReq = req as AuthenticatedRequest
    const user = await authService.getById(authReq.user!.userId)
    sendSuccess(res, user)
  } catch (err) {
    next(err)
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest
    const user = await authService.updateProfile(authReq.user!.userId, req.body)
    sendSuccess(res, user, "Profile updated successfully")
  } catch (err) {
    next(err)
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest
    const user = await authService.updatePreferences(authReq.user!.userId, req.body)
    sendSuccess(res, user, "Preferences updated successfully")
  } catch (err) {
    next(err)
  }
}

export async function resetTransitDna(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest
    const user = await authService.resetTransitDna(authReq.user!.userId)
    sendSuccess(res, user, "TransitDNA weights reset to baseline defaults")
  } catch (err) {
    next(err)
  }
}

