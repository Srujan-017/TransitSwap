import mongoose from "mongoose"
import { User } from "../models/User"

const DEMO_EMAIL = "demo@transitswap.app"
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "Demo@1234"
const DEMO_NAME = "Demo User"

/**
 * BUG 8 FIX: Ensure the demo account exists in the database on every startup.
 * If MongoDB is not connected, this is a no-op (demo mode still works without auth).
 * If the account already exists, it is not modified.
 * The demo password is hashed — it is never stored in plain text.
 *
 * Phase 4 fix (B1) — this used to pre-hash DEMO_PASSWORD with bcrypt.hash()
 * and pass the resulting digest to User.create(). userSchema.pre("save")
 * (models/User.ts) then hashed THAT digest again, so the stored password was
 * bcrypt(bcrypt(plaintext)) — comparePassword(plaintext, stored) could never
 * succeed and the seeded demo account was unusable. Passing the plaintext
 * password straight to User.create() and letting the model's own pre-save
 * hook hash it exactly once (the same pattern already used correctly by
 * utils/seedAdmin.ts) fixes this.
 */
export async function seedDemoUser(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    // DB not connected — demo account cannot be created but app still works in demo mode
    return
  }

  try {
    const existing = await User.findOne({ email: DEMO_EMAIL })
    if (existing) {
      console.log("✅  Demo account exists:", DEMO_EMAIL)
      return
    }

    // Create demo account — plaintext password; userSchema.pre("save") hashes
    // it once before it's ever written to the database.
    await User.create({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      accessibilityProfile: "standard",
      preferences: {
        preferredMode: "any",
        walkingTolerance: "medium",
        budgetPreference: "balanced",
        prioritize: "reliability",
      },
      transitDNA: {
        totalTrips: 0,
        lastUpdated: new Date(),
        learnedWeights: { time: 0.25, cost: 0.15, walking: 0.20, reliability: 0.25, accessibility: 0.15 },
      },
    })
    console.log("✅  Demo account created:", DEMO_EMAIL)
  } catch (err) {
    console.warn("⚠️  Could not seed demo user:", err instanceof Error ? err.message : err)
  }
}
