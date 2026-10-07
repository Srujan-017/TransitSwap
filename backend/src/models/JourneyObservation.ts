import mongoose, { type Document, type Model, Schema } from "mongoose"

export interface IJourneyObservation extends Document {
  userId?: mongoose.Types.ObjectId
  // Problem 21 — links this observation back to the Journey it came from, so a
  // user re-submitting feedback with a revised actual duration updates the same
  // observation instead of creating a duplicate.
  journeyId?: mongoose.Types.ObjectId
  routeId?: string
  originName: string
  destinationName: string
  transportMode: "metro" | "bus" | "walking" | "auto" | "multimodal"
  predictedDurationMinutes: number
  actualDurationMinutes: number
  errorMinutes: number // actualDurationMinutes - predictedDurationMinutes
  delayMinutes: number // max(0, actualDurationMinutes - predictedDurationMinutes)
  departureTime: Date
  arrivalTime: Date
  weatherCondition?: string
  crowdLevel?: "LOW" | "MEDIUM" | "HIGH"
  transferCount: number
  isSyntheticDemoData: boolean
  createdAt: Date
  updatedAt: Date
}

const journeyObservationSchema = new Schema<IJourneyObservation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    journeyId: { type: Schema.Types.ObjectId, ref: "Journey", index: true },
    routeId: { type: String, trim: true, index: true },
    originName: { type: String, required: true, trim: true },
    destinationName: { type: String, required: true, trim: true },
    transportMode: {
      type: String,
      enum: ["metro", "bus", "walking", "auto", "multimodal"],
      required: true,
      index: true,
    },
    predictedDurationMinutes: { type: Number, required: true, min: 0.1 },
    actualDurationMinutes: { type: Number, required: true, min: 0.1 },
    errorMinutes: { type: Number, required: true },
    delayMinutes: { type: Number, required: true, default: 0, min: 0 },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    weatherCondition: { type: String, trim: true },
    crowdLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"] },
    transferCount: { type: Number, default: 0, min: 0 },
    isSyntheticDemoData: { type: Boolean, default: false },
  },
  { timestamps: true },
)

journeyObservationSchema.index({ transportMode: 1, createdAt: -1 })
journeyObservationSchema.index({ routeId: 1, createdAt: -1 })

export const JourneyObservation: Model<IJourneyObservation> = mongoose.model<IJourneyObservation>(
  "JourneyObservation",
  journeyObservationSchema,
)
