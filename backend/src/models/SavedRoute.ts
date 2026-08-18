import mongoose, { type Document, type Model, Schema } from "mongoose"

// Problem 10 — SavedRoute is a reusable route SNAPSHOT, distinct from SavedDestination
// (a single point) and from Journey (a record of an actual trip taken). It must remain
// viewable even if the route is recalculated later, demo data changes, or the user
// searches something else — so the route/segment data is stored as a point-in-time
// snapshot (Mixed), not a live reference to a route id.

export interface ISavedRoute extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  origin: {
    name: string
    latitude: number
    longitude: number
  }
  destination: {
    name: string
    latitude: number
    longitude: number
  }
  selectedRouteSnapshot: Record<string, unknown>
  routeSegments: Record<string, unknown>[]
  transportModes: string[]
  totalDistanceMeters: number
  totalDurationSeconds: number
  totalFare: number
  walkingDistanceMeters: number
  transferCount: number
  sustainabilityScore?: number
  accessibilityProfile?: string
  createdAt: Date
  updatedAt: Date
}

const coordinateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
)

const savedRouteSchema = new Schema<ISavedRoute>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    origin: { type: coordinateSchema, required: true },
    destination: { type: coordinateSchema, required: true },
    selectedRouteSnapshot: { type: Schema.Types.Mixed, required: true },
    routeSegments: [{ type: Schema.Types.Mixed, required: true }],
    transportModes: [{ type: String, enum: ["walking", "metro", "bus", "auto"], required: true }],
    totalDistanceMeters: { type: Number, required: true, min: 0 },
    totalDurationSeconds: { type: Number, required: true, min: 0 },
    totalFare: { type: Number, required: true, min: 0 },
    walkingDistanceMeters: { type: Number, required: true, min: 0 },
    transferCount: { type: Number, required: true, min: 0 },
    sustainabilityScore: { type: Number, min: 0, max: 100 },
    accessibilityProfile: { type: String, maxlength: 40 },
  },
  { timestamps: true },
)

savedRouteSchema.index({ userId: 1, createdAt: -1 })

export const SavedRoute: Model<ISavedRoute> = mongoose.model<ISavedRoute>("SavedRoute", savedRouteSchema)
