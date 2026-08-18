import mongoose, { type Document, type Model, Schema } from "mongoose"

export type AccessibilityIssueType =
  | "lift_unavailable"
  | "ramp_blocked"
  | "escalator_not_working"
  | "stairs_issue"
  | "entrance_blocked"
  | "tactile_paving_damaged"
  | "accessible_toilet_unavailable"
  | "station_accessibility_issue"
  | "other"

export interface IAccessibilityReport extends Document {
  userId: mongoose.Types.ObjectId
  stationId: string
  stationName: string
  issueType: AccessibilityIssueType
  description: string
  status: "pending" | "confirmed" | "resolved" | "rejected"
  createdAt: Date
  updatedAt: Date
}

const accessibilityReportSchema = new Schema<IAccessibilityReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stationId: { type: String, required: true, trim: true },
    stationName: { type: String, required: true, trim: true },
    issueType: {
      type: String,
      enum: [
        "lift_unavailable",
        "ramp_blocked",
        "escalator_not_working",
        "stairs_issue",
        "entrance_blocked",
        "tactile_paving_damaged",
        "accessible_toilet_unavailable",
        "station_accessibility_issue",
        "other",
      ],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 600 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "resolved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
)

export const AccessibilityReport: Model<IAccessibilityReport> = mongoose.model<IAccessibilityReport>(
  "AccessibilityReport",
  accessibilityReportSchema,
)
