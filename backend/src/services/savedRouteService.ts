import mongoose from "mongoose"
import { SavedRoute } from "../models/SavedRoute"
import { AppError } from "../middleware/errorHandler"
import type { EnrichedRoute } from "../types/intelligence"
import type { SegmentLocation } from "../types/multimodal"

interface SaveRouteInput {
  name: string
  origin: SegmentLocation
  destination: SegmentLocation
  selectedRoute: EnrichedRoute
  accessibilityProfile?: string
}

function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError("Database is not connected. Configure MONGODB_URI to use this feature.", 503)
  }
}

function assertLocation(location: SegmentLocation, field: string) {
  if (!location?.name || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
    throw new AppError(`${field} must include name, latitude and longitude.`, 400)
  }
}

export const savedRouteService = {
  async saveRoute(userId: string, input: SaveRouteInput) {
    ensureDb()
    assertLocation(input.origin, "Origin")
    assertLocation(input.destination, "Destination")

    const route = input.selectedRoute
    if (!route?.id || !Array.isArray(route.segments) || route.segments.length === 0) {
      throw new AppError("Selected route snapshot is invalid.", 400)
    }

    const name = (input.name || "").trim() || route.labelDisplay || "Saved route"

    return SavedRoute.create({
      userId,
      name,
      origin: input.origin,
      destination: input.destination,
      // Snapshot the full enriched route as-is so the saved route remains viewable
      // even after demo data changes or the route is recalculated later.
      selectedRouteSnapshot: route,
      routeSegments: route.segments,
      transportModes: route.modes,
      totalDistanceMeters: route.totalDistanceMeters,
      totalDurationSeconds: route.totalDurationSeconds,
      totalFare: route.totalFare,
      walkingDistanceMeters: route.totalWalkingMeters,
      transferCount: route.transferCount,
      sustainabilityScore: route.sustainabilityScore,
      accessibilityProfile: input.accessibilityProfile,
    })
  },

  // Every query below is scoped to { userId } so a user can never read, list, or
  // delete another user's saved route.
  async getSavedRoutes(userId: string) {
    ensureDb()
    return SavedRoute.find({ userId }).sort({ createdAt: -1 })
  },

  async getSavedRoute(userId: string, savedRouteId: string) {
    ensureDb()
    const route = await SavedRoute.findOne({ _id: savedRouteId, userId })
    if (!route) throw new AppError("Saved route not found.", 404)
    return route
  },

  async deleteSavedRoute(userId: string, savedRouteId: string) {
    ensureDb()
    const deleted = await SavedRoute.findOneAndDelete({ _id: savedRouteId, userId })
    if (!deleted) throw new AppError("Saved route not found.", 404)
    return deleted
  },
}
