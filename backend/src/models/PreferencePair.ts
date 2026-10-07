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
    connectionRisk: number
    transfers: number
  }
  rejectedFeatures: {
    time: number
    cost: number
    walking: number
    reliability: number
    accessibility: number
    crowd: number
    weather: number
    connectionRisk: number
    transfers: number
  }
  // Phase 7 — extended from 7-D to 9-D (added connectionRisk, transfers).
  // Existing 7-D rows are not migrated: PairwiseLogisticRegression.predictProbability()
  // already treats a missing deltaX index as 0 (documented there), so legacy rows
  // keep training correctly on their original 7 dimensions and simply contribute
  // no gradient to the 2 new ones, rather than being discarded or crashing.
  deltaX: number[] // 9-D feature difference vector [chosen - rejected]
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
    connectionRisk: { type: Number, required: true },
    transfers: { type: Number, required: true },
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
//
// Phase 8 — extended to include `label`. Every real route choice now stores
// BOTH {chosen-rejected, label:1} and its mirror {rejected-chosen, label:0}
// (see mlPreferenceService.buildPairwiseDocs), so the same (user, chosen,
// rejected, source) tuple legitimately occurs twice — once per label. Without
// this extension the mirrored write would collide with the original as a
// "duplicate" and be silently dropped, leaving the single-class-label bug
// this phase exists to fix.
pairwisePreferenceSchema.index(
  { userId: 1, chosenRouteId: 1, rejectedRouteId: 1, source: 1, label: 1 },
  { unique: true },
)

export const PairwisePreference: Model<IPairwisePreference> = mongoose.model<IPairwisePreference>(
  "PairwisePreference",
  pairwisePreferenceSchema,
)
