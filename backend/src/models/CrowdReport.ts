import mongoose, { type Document, type Model, Schema } from "mongoose"
import type { CrowdLevel, DataSource } from "../types/intelligence"

export interface ICrowdReport extends Document {
  userId: mongoose.Types.ObjectId
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  crowdLevel: CrowdLevel
  reportedAt: Date
  source: DataSource
  confidence: number
  status: "accepted" | "flagged"
  createdAt: Date
  updatedAt: Date
}

const crowdReportSchema = new Schema<ICrowdReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stationId: { type: String, required: true, trim: true, index: true },
    stationName: { type: String, required: true, trim: true },
    transportMode: { type: String, enum: ["metro", "bus"], required: true },
    crowdLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], required: true },
    reportedAt: { type: Date, default: Date.now, index: true },
    source: {
      type: String,
      enum: ["LIVE_USER_REPORT", "RECENT_USER_REPORT", "HISTORICAL_DATA", "DEMO_DATA", "UNAVAILABLE"],
      default: "RECENT_USER_REPORT",
    },
    confidence: { type: Number, default: 0.75, min: 0, max: 1 },
    status: { type: String, enum: ["accepted", "flagged"], default: "accepted" },
  },
  { timestamps: true },
)

crowdReportSchema.index({ stationId: 1, reportedAt: -1 })

export const CrowdReport: Model<ICrowdReport> = mongoose.model<ICrowdReport>("CrowdReport", crowdReportSchema)
