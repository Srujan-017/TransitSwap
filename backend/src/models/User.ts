import mongoose, { type Document, type Model } from "mongoose"
import bcrypt from "bcryptjs"
import type { AccessibilityProfile } from "../types"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  // Problem 23 — admin role. Always defaults to "user"; the public registration
  // endpoint never accepts this field from the request body (see authController),
  // so a client can never self-elevate to admin.
  role: "user" | "admin"
  accessibilityProfile: AccessibilityProfile
  preferences: {
    preferredMode: "metro" | "bus" | "walking" | "auto" | "any"
    walkingTolerance: "low" | "medium" | "high"
    budgetPreference: "cheapest" | "balanced" | "comfort"
    prioritize: "speed" | "comfort" | "reliability" | "accessibility"
  }
  transitDNA: {
    totalTrips: number
    lastUpdated: Date
    learnedWeights: {
      time: number
      cost: number
      walking: number
      reliability: number
      accessibility: number
      // Problem 1 fix — these were previously dropped when persisting TransitDNA,
      // even though the pairwise ML model learns all 7 features. Optional so old
      // documents (saved before this fix) still validate; Mongoose applies the
      // schema defaults below when such a document is loaded.
      crowd?: number
      weather?: number
    }
  }
  savedDestinations: Array<{
    label: string
    address: string
    icon: "home" | "work" | "school" | "other"
  }>
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    accessibilityProfile: {
      type: String,
      enum: ["standard", "wheelchair", "senior", "pregnant", "stroller", "luggage", "reduced_mobility"],
      default: "standard",
    },
    preferences: {
      preferredMode: { type: String, enum: ["metro", "bus", "walking", "auto", "any"], default: "any" },
      walkingTolerance: { type: String, enum: ["low", "medium", "high"], default: "medium" },
      budgetPreference: { type: String, enum: ["cheapest", "balanced", "comfort"], default: "balanced" },
      prioritize: { type: String, enum: ["speed", "comfort", "reliability", "accessibility"], default: "reliability" },
    },
    transitDNA: {
      totalTrips: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
      learnedWeights: {
        time: { type: Number, default: 0.25 },
        cost: { type: Number, default: 0.15 },
        walking: { type: Number, default: 0.20 },
        reliability: { type: Number, default: 0.25 },
        accessibility: { type: Number, default: 0.15 },
        // Problem 1 fix — safe defaults so existing documents saved before this
        // change validate and hydrate correctly without a migration.
        crowd: { type: Number, default: 0.10 },
        weather: { type: Number, default: 0.10 },
      },
    },
    savedDestinations: [
      {
        label: String,
        address: String,
        icon: { type: String, enum: ["home", "work", "school", "other"], default: "other" },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc: unknown, obj: Record<string, unknown>) => { obj.password = undefined; return obj } },
  },
)

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema)
