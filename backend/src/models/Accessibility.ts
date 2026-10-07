import { type Document, type Model, Schema, model } from "mongoose"
import type { AccessibilityStatus } from "../types/intelligence"

export interface IAccessibility extends Document {
  stationId: string
  stationName: string
  transportMode: "metro" | "bus"
  latitude: number | null
  longitude: number | null
  hasLift: boolean | null
  hasRamp: boolean | null
  hasEscalator: boolean | null
  stairCount: number | null
  tactilePaving: boolean | null
  accessibleToilet: boolean | null
  wheelchairAccessible: boolean | null
  stepFreeEntrance: boolean | null
  stepFreePlatform: boolean | null
  lastVerified: Date
  verificationSource: string
  status: AccessibilityStatus
  notes: string | null
  // Problem 23 — admin station status. An inactive station is preserved (not
  // deleted) but excluded from route generation's station lookups.
  active: boolean
}

const accessibilitySchema = new Schema<IAccessibility>(
  {
    stationId: { type: String, required: true, unique: true, trim: true },
    stationName: { type: String, required: true, trim: true },
    transportMode: { type: String, enum: ["metro", "bus"], required: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    hasLift: { type: Boolean, default: null },
    hasRamp: { type: Boolean, default: null },
    hasEscalator: { type: Boolean, default: null },
    stairCount: { type: Number, default: null, min: 0 },
    tactilePaving: { type: Boolean, default: null },
    accessibleToilet: { type: Boolean, default: null },
    wheelchairAccessible: { type: Boolean, default: null },
    stepFreeEntrance: { type: Boolean, default: null },
    stepFreePlatform: { type: Boolean, default: null },
    lastVerified: { type: Date, required: true },
    verificationSource: {
      type: String,
      enum: [
        "synthetic_demo",
        "field_survey",
        "community_report",
        "transit_authority",
        "external_dataset",
        // Legacy values kept for backward compatibility
        "Demo Accessibility Dataset",
        "Surveyed Dataset",
        "User Report",
      ],
      default: "synthetic_demo",
    },
    status: {
      type: String,
      enum: ["accessible", "partially_accessible", "not_accessible", "unknown"],
      required: true,
    },
    notes: { type: String, default: null, trim: true, maxlength: 500 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Accessibility: Model<IAccessibility> = model<IAccessibility>("Accessibility", accessibilitySchema)
