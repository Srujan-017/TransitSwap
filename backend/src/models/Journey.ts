import mongoose, { type Document, type Model, Schema } from "mongoose"

export type JourneyStatus = "planned" | "completed" | "cancelled"

export interface IJourney extends Document {
  userId: mongoose.Types.ObjectId
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
  // Problem 21 — the real departure date/time the user selected while planning
  // this journey (if any), threaded through from PlanTripPage. Only ever set
  // from the user's own selection — never invented — so it can be honestly used
  // later to compute a real JourneyObservation from actual feedback duration.
  departureTime?: Date
  selectedRoute: Record<string, unknown>
  selectedRouteEnriched?: Record<string, unknown>
  alternativeRoutesEnriched?: Record<string, unknown>[]
  // Problem 7 fix — set once pairwise preference learning has been triggered for
  // this journey's route-choice event, so feedback submitted later doesn't create
  // duplicate pairwise samples for the same choice.
  choiceLearningApplied?: boolean
  routeSegments: Record<string, unknown>[]
  transportModes: string[]
  totalDistanceMeters: number
  totalDurationSeconds: number
  estimatedFare: number
  walkingDistanceMeters: number
  transferCount: number
  routeSummary: string
  status: JourneyStatus
  userFeedback?: {
    rating: number
    comment: string
    issues: string[]
    // Problem 21 — optional, user-entered actual journey duration in minutes.
    // Only ever the user's own honest estimate; never derived from feedback
    // submission time or any other inferred timestamp.
    actualDurationMinutes?: number
    createdAt: Date
  }
  // Problem 21 — set once a JourneyObservation has been created from this
  // journey's feedback, so re-submitting an updated duration updates that same
  // observation (via JourneyObservation.journeyId) instead of duplicating it.
  reliabilityObservationRecorded?: boolean
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

const journeySchema = new Schema<IJourney>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    origin: { type: coordinateSchema, required: true },
    destination: { type: coordinateSchema, required: true },
    departureTime: { type: Date },
    selectedRoute: { type: Schema.Types.Mixed, required: true },
    selectedRouteEnriched: { type: Schema.Types.Mixed },
    alternativeRoutesEnriched: [{ type: Schema.Types.Mixed }],
    choiceLearningApplied: { type: Boolean, default: false },
    routeSegments: [{ type: Schema.Types.Mixed, required: true }],
    transportModes: [{ type: String, enum: ["walking", "metro", "bus", "auto"], required: true }],
    totalDistanceMeters: { type: Number, required: true, min: 0 },
    totalDurationSeconds: { type: Number, required: true, min: 0 },
    estimatedFare: { type: Number, required: true, min: 0 },
    walkingDistanceMeters: { type: Number, required: true, min: 0 },
    transferCount: { type: Number, required: true, min: 0 },
    routeSummary: { type: String, required: true, trim: true, maxlength: 400 },
    status: { type: String, enum: ["planned", "completed", "cancelled"], default: "planned" },
    userFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
      issues: [{ type: String }],
      actualDurationMinutes: { type: Number, min: 1, max: 1440 },
      createdAt: { type: Date, default: Date.now },
    },
    reliabilityObservationRecorded: { type: Boolean, default: false },
  },
  { timestamps: true },
)

journeySchema.index({ userId: 1, createdAt: -1 })

export const Journey: Model<IJourney> = mongoose.model<IJourney>("Journey", journeySchema)

