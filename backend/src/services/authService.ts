import jwt from "jsonwebtoken"
import { User, type IUser } from "../models/User"
import { env } from "../config/env"
import { AppError } from "../middleware/errorHandler"

function signToken(user: IUser): string {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions)
}

export const authService = {
  async register(name: string, email: string, password: string, accessibilityProfile = "standard") {
    const existing = await User.findOne({ email })
    if (existing) throw new AppError("Email already registered. Please sign in instead.", 409)

    const user = await User.create({ name, email, password, accessibilityProfile })
    const token = signToken(user)
    return { user, token }
  },

  async login(email: string, password: string) {
    const user = await User.findOne({ email }).select("+password")
    if (!user) throw new AppError("Invalid email or password.", 401)

    const valid = await user.comparePassword(password)
    if (!valid) throw new AppError("Invalid email or password.", 401)

    const token = signToken(user)
    return { user, token }
  },

  async getById(userId: string) {
    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found.", 404)
    return user
  },

  async updateProfile(userId: string, data: { name?: string; accessibilityProfile?: string }) {
    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found.", 404)
    if (data.name) user.name = data.name
    if (data.accessibilityProfile) user.accessibilityProfile = data.accessibilityProfile as any
    await user.save()
    return user
  },

  async updatePreferences(userId: string, preferences: Partial<IUser["preferences"]>) {
    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found.", 404)
    user.preferences = { ...user.preferences, ...preferences }
    await user.save()
    return user
  },

  async resetTransitDna(userId: string) {
    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found.", 404)
    user.transitDNA = {
      totalTrips: 0,
      lastUpdated: new Date(),
      learnedWeights: { time: 0.25, cost: 0.15, walking: 0.2, reliability: 0.25, accessibility: 0.15 },
    }
    await user.save()
    return user
  },
}
