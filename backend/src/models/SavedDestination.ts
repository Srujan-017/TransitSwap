import mongoose, { type Document, type Model, Schema } from "mongoose"

export interface ISavedDestination extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  address: string
  latitude: number
  longitude: number
  createdAt: Date
  updatedAt: Date
}

const savedDestinationSchema = new Schema<ISavedDestination>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    address: { type: String, required: true, trim: true, maxlength: 240 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { timestamps: true },
)

savedDestinationSchema.index({ userId: 1, name: 1 }, { unique: true })

export const SavedDestination: Model<ISavedDestination> = mongoose.model<ISavedDestination>(
  "SavedDestination",
  savedDestinationSchema,
)
