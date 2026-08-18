import mongoose, { type Document, type Model, Schema } from "mongoose"

export interface IPairwisePreference extends Document {
  userId: mongoose.Types.ObjectId
  sessionId?: string
  originName: string
  destinationName: string
  chosenRouteId: string
  rejectedRouteId: string
  chosenFeatures: {
    time: number
    cost: number
    walking: number
    reliability: number
    accessibility: number
    crowd: number
    weather: number
  }
  rejectedFeatures: {
    time: number
    cost: number
    walking: number
    reliability: number
    accessibility: number
    crowd: number
    weather: number
  }
  deltaX: number[] // 7-D feature difference vector [chosen - rejected]
  label: number    // 1 for chosen > rejected
  source: "USER_CHOICE" | "USER_FEEDBACK" | "DEMO_SYNTHETIC_DATA"
  createdAt: Date
}

const featureMapSchema = new Schema(
  {
    time: { type: Number, required: true },
    cost: { type: Number, required: true },
    walking: { type: Number, required: true },
    reliability: { type: Number, required: true },
    accessibility: { type: Number, required: true },
    crowd: { type: Number, required: true },
    weather: { type: Number, required: true },
  },
  { _id: false },
)

const pairwisePreferenceSchema = new Schema<IPairwisePreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId: { type: String, trim: true },
    originName: { type: String, required: true },
    destinationName: { type: String, required: true },
    chosenRouteId: { type: String, required: true },
    rejectedRouteId: { type: String, required: true },
    chosenFeatures: { type: featureMapSchema, required: true },
    rejectedFeatures: { type: featureMapSchema, required: true },
    deltaX: [{ type: Number, required: true }],
    label: { type: Number, enum: [0, 1], default: 1 },
    source: {
      type: String,
      enum: ["USER_CHOICE", "USER_FEEDBACK", "DEMO_SYNTHETIC_DATA"],
      default: "USER_CHOICE",
    },
  },
  { timestamps: true },
)

pairwisePreferenceSchema.index({ userId: 1, createdAt: -1 })

// Problem 8 hardening — a retry of the same journey-save operation must not create
// duplicate pairwise preference samples for the same route-choice event. Minimal
// uniqueness mechanism: the tuple (user, chosen route, rejected route, source) can
// only exist once. This is enforced at the database level so it holds even under
// concurrent/duplicate requests, not just when the app-level check happens to run.
pairwisePreferenceSchema.index(
  { userId: 1, chosenRouteId: 1, rejectedRouteId: 1, source: 1 },
  { unique: true },
)

export const PairwisePreference: Model<IPairwisePreference> = mongoose.model<IPairwisePreference>(
  "PairwisePreference",
  pairwisePreferenceSchema,
)
