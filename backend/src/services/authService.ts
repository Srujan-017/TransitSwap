import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import { User, type IUser } from "../models/User"
import { UserPreferenceModel } from "../models/UserPreferenceModel"
import { PairwisePreference } from "../models/PreferencePair"
import { env } from "../config/env"
import { AppError } from "../middleware/errorHandler"

function signToken(user: IUser): string {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions)
}

function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError("Database is not connected. Configure MONGODB_URI to use authentication features.", 503)
  }
}

export const authService = {
  async register(name: string, email: string, password: string, accessibilityProfile = "standard") {
    ensureDb()
    const existing = await User.findOne({ email })
    if (existing) throw new AppError("Email already registered. Please sign in instead.", 409)

    const user = await User.create({ name, email, password, accessibilityProfile })
    const token = signToken(user)
    return { user, token }
  },

  async login(email: string, password: string) {
    ensureDb()
    const user = await User.findOne({ email }).select("+password")
    if (!user) throw new AppError("Invalid email or password.", 401)

    const valid = await user.comparePassword(password)
    if (!valid) throw new AppError("Invalid email or password.", 401)

    const token = signToken(user)
    return { user, token }
  },

  async getById(userId: string) {
    ensureDb()
    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found.", 404)
    return user
  },

  async updateProfile(userId: string, data: { name?: string; accessibilityProfile?: string }) {
    ensureDb()
    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found.", 404)
    if (data.name) user.name = data.name
    if (data.accessibilityProfile) user.accessibilityProfile = data.accessibilityProfile as any
    await user.save()
    return user
  },

  async updatePreferences(userId: string, preferences: Partial<IUser["preferences"]>) {
    ensureDb()
    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found.", 404)
    user.preferences = { ...user.preferences, ...preferences }
    await user.save()
    return user
  },

  /**
   * Phase 4 fix (B2/B8) — resetting TransitDNA used to only rewrite
   * User.transitDNA.learnedWeights, which nothing downstream actually reads:
   * mlPreferenceService.rankRoutes() (the real ranking path) scores routes
   * from UserPreferenceModel, not from the User document, so a "reset" had
   * no observable effect on recommendations at all. It also omitted the
   * crowd/weather weights, leaving an inconsistent 5-of-7 vector even on the
   * User document itself.
   *
   * A real reset now:
   *   1. Rewrites User.transitDNA with all 9 baseline weights (Phase 7 added
   *      connectionRisk/transfers; unchanged display-only behavior, now complete).
   *   2. Deletes the user's trained UserPreferenceModel, so
   *      mlPreferenceService.getModelStatus() falls back to the profile's
   *      baseline weights again — this is the actual ranking-affecting fix.
   *   3. Deletes the user's PairwisePreference training samples, so the very
   *      next journey save can't immediately re-train a personalized model
   *      from pre-reset history and silently undo the reset.
   */
  async resetTransitDna(userId: string) {
    ensureDb()
    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found.", 404)
    user.transitDNA = {
      totalTrips: 0,
      lastUpdated: new Date(),
      learnedWeights: { time: 0.25, cost: 0.15, walking: 0.2, reliability: 0.25, accessibility: 0.15, crowd: 0.10, weather: 0.10, connectionRisk: 0.15, transfers: 0.10 },
    }
    await user.save()

    await Promise.all([
      UserPreferenceModel.deleteOne({ userId }),
      PairwisePreference.deleteMany({ userId }),
    ])

    return user
  },
}
