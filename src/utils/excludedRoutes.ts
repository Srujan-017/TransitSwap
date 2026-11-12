import type { ApiError } from "../services/api"
import type { ExcludedRoute } from "../types/multimodal"

/**
 * The routes excluded for the rider's profile, when a failed route search carried
 * them (the API answers 404 "no accessible route" with `data.excludedRoutes`).
 * Empty when the failure was something else — e.g. no candidate route existed at all.
 */
export function excludedRoutesFromError(err: unknown): ExcludedRoute[] {
  const details = (err as ApiError | undefined)?.details as { excludedRoutes?: ExcludedRoute[] } | undefined
  return Array.isArray(details?.excludedRoutes) ? details.excludedRoutes : []
}
