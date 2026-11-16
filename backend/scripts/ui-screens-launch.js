#!/usr/bin/env node
// ── UI redesign, Phase 0 — backend for the screenshot and accessibility audit ──
//
// Like e2e-launch.js: an in-memory MongoDB plus the real server (src/server.ts). Two differences, both only for
// this audit:
//   * WEATHER_SOURCE=clear, so every run shows the same weather and screenshots can be compared run to run;
//   * one admin account is created in the in-memory database (credentials from the environment, set by
//     playwright.screens.config.ts), so the admin console can be screenshotted too.
// Used only as the backend `webServer` of playwright.screens.config.ts. Never used in production.

const path = require("node:path")

async function main() {
  const { MongoMemoryServer } = require(path.join(__dirname, "..", "node_modules", "mongodb-memory-server"))

  console.log("▶ [ui-audit] Starting in-memory MongoDB...")
  const mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.PORT = process.env.PORT || "5000"
  process.env.WEATHER_SOURCE = "clear"
  console.log("✅ [ui-audit] In-memory MongoDB ready")

  const stop = async () => {
    await mongod.stop()
    process.exit(0)
  }
  process.on("SIGTERM", stop)
  process.on("SIGINT", stop)

  // The API allows 150 requests per 15 minutes per client. A full audit pass (every screen, and the app checks the
  // session twice per page load) sends more than that, and once the API answers 429 the app signs the user out and the
  // audit fails for a reason that has nothing to do with the screens. So, for this audit backend only, the limiter is
  // swapped for one with no practical limit. backend/src/app.ts is not touched; production keeps its limit.
  const limiterPath = require.resolve(path.join(__dirname, "..", "node_modules", "express-rate-limit"))
  const realLimiter = require(limiterPath)
  const relaxed = Object.assign((options) => realLimiter({ ...options, max: 1_000_000, limit: 1_000_000 }), realLimiter)
  relaxed.default = relaxed
  relaxed.rateLimit = relaxed
  require.cache[limiterPath].exports = relaxed

  require("ts-node/register")
  require(path.join(__dirname, "..", "src", "server.ts"))

  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (ADMIN_NAME && ADMIN_EMAIL && ADMIN_PASSWORD) {
    const mongoose = require(path.join(__dirname, "..", "node_modules", "mongoose"))
    const { User } = require(path.join(__dirname, "..", "src", "models", "User.ts"))
    for (let i = 0; i < 100 && mongoose.connection.readyState !== 1; i++) await new Promise((r) => setTimeout(r, 200))
    if (mongoose.connection.readyState !== 1) throw new Error("the database did not connect in time")
    if (!(await User.findOne({ email: ADMIN_EMAIL.toLowerCase() }))) {
      await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL.toLowerCase(), password: ADMIN_PASSWORD, role: "admin" })
    }
    console.log("✅ [ui-audit] Admin account ready")
  }
}

main().catch((err) => {
  console.error("❌ [ui-audit] Failed to start the audit backend:", err)
  process.exit(1)
})
