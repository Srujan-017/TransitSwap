import { Request } from "express"
import type { JwtPayload } from "jsonwebtoken"

export interface TokenPayload extends JwtPayload {
  userId: string
  email: string
  role: "user" | "admin"
}

// Type intersection rather than interface extension so TypeScript resolves
// all inherited Request properties (headers, body, etc.) without ambiguity.
export type AuthenticatedRequest = Request & { user?: TokenPayload }

export type AccessibilityProfile =
  | "standard"
  | "wheelchair"
  | "senior"
  | "pregnant"
  | "stroller"
  | "luggage"
  | "reduced_mobility"

export interface UserPreferences {
  preferredMode?: "metro" | "bus" | "walking" | "auto" | "any"
  walkingTolerance?: "low" | "medium" | "high"
  budgetPreference?: "cheapest" | "balanced" | "comfort"
  prioritize?: "speed" | "comfort" | "reliability" | "accessibility" | "time" | "cost" | "cheapest"
}

export interface ApiSuccess<T = unknown> {
  success: true
  data: T
  message?: string
}

export interface ApiError {
  success: false
  message: string
  errors?: Record<string, string>
}
