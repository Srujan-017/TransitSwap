import mongoose from "mongoose"
import request from "supertest"
import app from "../../app"
import { User } from "../../models/User"
import { env } from "../../config/env"

/**
 * Phase 10 — shared supertest helper for the API integration test files.
 *
 * These tests hit the REAL Express app (imported directly, never listening
 * on a port) with REAL HTTP requests via supertest, and need a real MongoDB
 * connection for anything auth-gated (authService.ensureDb() throws a 503
 * without one). ensureDbConnected() connects once per test-runner process —
 * safe to call from every test file's own setup, since mongoose.connect() on
 * an already-open connection is a no-op.
 */
export async function ensureDbConnected(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) return true
  if (!env.MONGODB_URI) return false
  try {
    await mongoose.connect(env.MONGODB_URI)
    return true
  } catch {
    return false
  }
}

export { app }

let userCounter = 0

export interface TestUser {
  token: string
  userId: string
  email: string
  password: string
}

/**
 * Registers a real user through the real POST /auth/register endpoint (not
 * a direct model insert) so every test exercises the actual registration
 * code path, including password hashing and token issuance.
 */
export async function registerTestUser(overrides: {
  name?: string
  email?: string
  password?: string
  accessibilityProfile?: string
} = {}): Promise<TestUser> {
  const connected = await ensureDbConnected()
  if (!connected) {
    throw new Error("registerTestUser requires a DB connection (MONGODB_URI). See helpers/testApp.ts.")
  }

  userCounter += 1
  const email = overrides.email ?? `phase10.test.${Date.now()}.${userCounter}@example.com`
  const password = overrides.password ?? "TestPassword123"

  const res = await request(app)
    .post("/api/auth/register")
    .send({
      name: overrides.name ?? "Phase 10 Test User",
      email,
      password,
      accessibilityProfile: overrides.accessibilityProfile,
    })

  if (res.status !== 201 || !res.body?.data?.token) {
    throw new Error(`registerTestUser failed: ${res.status} ${JSON.stringify(res.body)}`)
  }

  return {
    token: res.body.data.token,
    userId: res.body.data.user.id,
    email,
    password,
  }
}

/**
 * Creates an admin user for testing admin-only routes. Mirrors this
 * project's own documented security design (registration can never set
 * role; admin creation is script-only, see utils/seedAdmin.ts) by flipping
 * `role` directly on the User document AFTER a normal registration, rather
 * than via any API request — then logs in again through the real /auth/login
 * endpoint so the returned JWT's role claim is genuinely "admin" (the
 * token issued at registration time still carries the old "user" role).
 */
export async function registerTestAdmin(): Promise<TestUser> {
  const user = await registerTestUser({ name: "Phase 10 Test Admin" })
  await User.findByIdAndUpdate(user.userId, { role: "admin" })

  const loginRes = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password })
  if (loginRes.status !== 200 || !loginRes.body?.data?.token) {
    throw new Error(`registerTestAdmin login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`)
  }

  return { ...user, token: loginRes.body.data.token }
}

export function authHeader(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`]
}
