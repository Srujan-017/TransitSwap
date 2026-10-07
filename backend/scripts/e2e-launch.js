#!/usr/bin/env node
// ── Phase 10 — E2E test backend launcher ────────────────────────────────────
//
// Playwright's "one happy path" (register -> plan -> save -> feedback) needs
// a REAL backend with a REAL database behind it — register/save/feedback all
// go through authService.ensureDb()/journeyService.ensureDb(), which throw a
// 503 with no MongoDB connected. This script starts an in-memory MongoDB
// (same mongodb-memory-server already used by backend/scripts/run-tests.js)
// and then starts the actual server (src/server.ts, via ts-node) against it —
// not a mock, not a stub, the real app.ts + real authService/journeyService.
//
// Used only as the backend `webServer` command in playwright.config.ts.
// Never used in production or in the regular npm test run.

const path = require("node:path")

async function main() {
  const { MongoMemoryServer } = require(path.join(__dirname, "..", "node_modules", "mongodb-memory-server"))

  console.log("▶ [e2e] Starting in-memory MongoDB...")
  const mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.PORT = process.env.PORT || "5000"
  console.log(`✅ [e2e] In-memory MongoDB ready at ${mongod.getUri()}`)

  process.on("SIGTERM", async () => {
    await mongod.stop()
    process.exit(0)
  })
  process.on("SIGINT", async () => {
    await mongod.stop()
    process.exit(0)
  })

  require("ts-node/register")
  require(path.join(__dirname, "..", "src", "server.ts"))
}

main().catch((err) => {
  console.error("❌ [e2e] Failed to start test backend:", err)
  process.exit(1)
})
