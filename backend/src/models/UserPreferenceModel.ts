import mongoose, { type Document, type Model, Schema } from "mongoose"

export interface IUserPreferenceModel extends Document {
  userId: mongoose.Types.ObjectId
  weights: {
    time: number
    cost: number
    walking: number
    reliability: number
    accessibility: number
    crowd: number
    weather: number
  }
  weightsArray: number[]
  featureNames: string[]
  sampleCount: number
  trainAccuracy: number
  testAccuracy?: number
  logLoss?: number
  isPersonalized: boolean
  modelVersion: string
  lastTrainedAt: Date
  createdAt: Date
  updatedAt: Date
}

const userPreferenceModelSchema = new Schema<IUserPreferenceModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    weights: {
      time: { type: Number, required: true, default: 0.25 },
      cost: { type: Number, required: true, default: 0.15 },
      walking: { type: Number, required: true, default: 0.20 },
      reliability: { type: Number, required: true, default: 0.25 },
      accessibility: { type: Number, required: true, default: 0.15 },
      crowd: { type: Number, required: true, default: 0.10 },
      weather: { type: Number, required: true, default: 0.10 },
    },
    weightsArray: [{ type: Number }],
    featureNames: [{ type: String }],
    sampleCount: { type: Number, default: 0 },
    trainAccuracy: { type: Number, default: 0 },
    testAccuracy: { type: Number },
    logLoss: { type: Number },
    isPersonalized: { type: Boolean, default: false },
    modelVersion: { type: String, default: "v1.0-logistic" },
    lastTrainedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const UserPreferenceModel: Model<IUserPreferenceModel> = mongoose.model<IUserPreferenceModel>(
  "UserPreferenceModel",
  userPreferenceModelSchema,
)
