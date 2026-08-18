import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import { User } from "../models/User"

const DEMO_EMAIL = "demo@transitswap.app"
const DEMO_PASSWORD = "Demo@1234"
const DEMO_NAME = "Demo User"

/**
 * BUG 8 FIX: Ensure the demo account exists in the database on every startup.
 * If MongoDB is not connected, this is a no-op (demo mode still works without auth).
 * If the account already exists, it is not modified.
 * The demo password is hashed — it is never stored in plain text.
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

    // Create demo account
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12)
    await User.create({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: hashedPassword,
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
