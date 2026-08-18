import type { Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { env } from "../config/env"
import type { AuthenticatedRequest, TokenPayload } from "../types"
import { sendError } from "../utils/response"

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    return sendError(res, "Authentication required. Please sign in.", 401)
  }

  const token = authHeader.split(" ")[1]
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload
    req.user = payload
    next()
  } catch {
    return sendError(res, "Invalid or expired token. Please sign in again.", 401)
  }
}

/**
 * Problem 23 — admin authorization. Must run AFTER requireAuth (relies on req.user
 * already being populated from a verified JWT — never re-verifies the token itself,
 * and never trusts a role value from the request body or query string).
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, "Authentication required. Please sign in.", 401)
  }
  if (req.user.role !== "admin") {
    return sendError(res, "Admin access required.", 403)
  }
  next()
}
