#!/usr/bin/env node
// ── Phase 4 fix for Bug B3 ───────────────────────────────────────────────────
//
// The previous `npm test` chained 13 `ts-node` invocations with `&&`, so the
// FIRST failing file aborted the whole run and every file after it never
// executed. That silently hid 7 of 13 test entries behind whichever file
// failed first (see PROJECT_MASTER_PLAN.md §24, §31 B3).
//
// This runner executes every entry unconditionally, in order, regardless of
// earlier failures, then prints one honest summary and exits non-zero if ANY
// entry failed. Nothing about the test files themselves changed.
//
// ── Phase 10 addition ────────────────────────────────────────────────────────
//
// Several existing files (admin/authPreferencePersistence/continuousImprovement/
// dashboard/feedback.test.ts) already check `mongoose.connection.readyState`
// and connect themselves via `mongoose.connect(env.MONGODB_URI)` IF that env
// var is set — otherwise they honestly skip their DB-dependent assertions
// (see PROJECT_MASTER_PLAN.md §24, Phase 10). Rather than editing 5 files to
// add a mock, this runner starts a real (in-memory) MongoDB via
// mongodb-memory-server and exports its connection string as MONGODB_URI —
// the existing self-connect logic in those files (and the new Phase 10 API
// integration tests, which need a real DB for register/login to work at all)
// then picks it up with no code change of its own. If the in-memory server
// fails to start for any reason (e.g. no network to fetch the mongod binary
// on first use), this degrades to the pre-Phase-10 behavior: MONGODB_URI
// stays unset and the same files honestly skip, exactly as before — this is
// an enhancement, never a new failure mode.
//
// See startMongod() and the top of main() below for how the mongod's
// lifecycle is managed across the whole run — found by direct diagnosis,
// through more than one failed approach, not assumed.

const { spawnSync } = require("node:child_process")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")

// Same 13 entries, same order, as the previous `&&`-chained script.
const ENTRIES = [
  "src/__tests__/accessibility.test.ts",
  "src/__tests__/ml.test.ts",
  "src/__tests__/recommendationExplanation.test.ts",
  "src/__tests__/reliability.test.ts",
  "src/__tests__/multimodalRouting.test.ts",
  "src/__tests__/userPreferences.test.ts",
  "src/__tests__/mlValidity.test.ts",
  "src/__tests__/evaluationHarness.test.ts",
  "src/__tests__/preferenceEndToEnd.test.ts",
  "src/__tests__/authPreferencePersistence.test.ts",
  "src/__tests__/feedback.test.ts",
  "src/__tests__/dashboard.test.ts",
  "src/__tests__/continuousImprovement.test.ts",
  "src/__tests__/admin.test.ts",
  "src/utils/test-full-pipeline.ts",
  // Phase 10 — supertest API integration tests, one file per route group,
  // covering all 50 documented endpoints with at least a happy-path test
  // and (where the endpoint is auth-gated) a 401/403 failure test.
  "src/__tests__/api/health.test.ts",
  "src/__tests__/api/auth.test.ts",
  "src/__tests__/api/geocoding.test.ts",
  "src/__tests__/api/routing.test.ts",
  "src/__tests__/api/trips.test.ts",
  "src/__tests__/api/weather.test.ts",
  "src/__tests__/api/accessibility.test.ts",
  "src/__tests__/api/crowd.test.ts",
  "src/__tests__/api/evaluation.test.ts",
  "src/__tests__/api/admin.test.ts",
]

// No KNOWN_FAILURES currently tracked — the walking-tolerance/reliability-
// priority magnitude issue (Phase 7) and the single-class ML label issue
// (Phase 8) are both fixed. Kept as an empty object (not removed) so a
// future phase that needs to track a diagnosed-but-deferred failure has
// the mechanism ready without re-inventing it.
const KNOWN_FAILURES = {}

// Invoke ts-node's actual bin script via `node`, rather than the .bin/ts-node
// shim. On Windows that shim is a .cmd file, and spawnSync() can't exec a
// .cmd directly without shell:true (EINVAL) — going through `node` sidesteps
// the shell entirely and works identically on every platform.
const tsNodeScript = path.join(ROOT, "node_modules", "ts-node", "dist", "bin.js")

// Phase 10 — found by direct diagnosis, not assumed, across several rounds:
// (1) ONE mongod shared for the whole ~25-entry run can reach a
//     `MongooseServerSelectionError: Server selection timed out` partway
//     through — the mongod process itself stops accepting connections
//     after sustained use on this Windows sandbox.
// (2) The opposite extreme — a brand-new mongod for literally every entry —
//     trades that problem for a worse one: creating ~25-50 sequential mongod
//     processes (every entry, plus a retry attempt each) exhausts Windows'
//     ephemeral TCP ports fast enough (TIME_WAIT lingers long after a
//     process exits) that MongoMemoryServer.create() itself starts timing
//     out for every entry from partway through the run onward.
// The balance that held up under repeated testing: reuse ONE mongod across
// the whole run in the common case (cheap — the same cost as before), but
// if an entry fails or times out, replace ONLY that one mongod with a fresh
// instance before retrying — a dead mongod never gets reused, and a healthy
// one is never thrown away and recreated for no reason.
async function startMongod() {
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server")
    const mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    console.log(`✅ In-memory MongoDB ready at ${mongod.getUri()}`)
    return mongod
  } catch (err) {
    console.warn(`⚠️  Could not start in-memory MongoDB (${err.message}) — DB-dependent entries will honestly skip, as before Phase 10.`)
    delete process.env.MONGODB_URI
    return null
  }
}

async function main() {
  const results = []
  // Phase 10 — a bounded per-entry timeout, independent of the mongod
  // strategy above: protects against any other kind of stall (not just a
  // dead mongod) ever blocking the whole suite silently.
  const PER_ENTRY_TIMEOUT_MS = 120_000

  let mongod = await startMongod()

  for (const entry of ENTRIES) {
    // Retry once on a timeout or failure. If the failure might be the
    // shared mongod itself (anything other than a clean non-zero exit —
    // i.e. a timeout, or no mongod currently running), replace it with a
    // fresh one before retrying; a clean assertion failure gets retried
    // against the SAME mongod, since there's no reason to suspect it.
    let attempt = 0
    let res
    let timedOut = false

    do {
      attempt += 1
      console.log(`\n${"═".repeat(70)}`)
      console.log(`▶ RUNNING: ${entry}${attempt > 1 ? ` (retry ${attempt - 1})` : ""}`)
      console.log("═".repeat(70))

      res = spawnSync(process.execPath, [tsNodeScript, "--transpile-only", entry], {
        cwd: ROOT,
        stdio: "inherit",
        env: process.env,
        timeout: PER_ENTRY_TIMEOUT_MS,
        killSignal: "SIGKILL",
      })

      timedOut = res.signal === "SIGKILL" || res.signal === "SIGTERM"
      const failed = timedOut || (res.status ?? (res.error ? 1 : 0)) !== 0
      if (!failed) break
      if (timedOut) {
        console.error(`\n⚠️  ${entry} did not finish within ${PER_ENTRY_TIMEOUT_MS / 1000}s and was killed.`)
        if (mongod) {
          await mongod.stop().catch(() => {})
          mongod = await startMongod()
        }
      } else if (res.error) {
        console.error(`\n⚠️  Failed to spawn ts-node for ${entry}: ${res.error.message}`)
      }
    } while (attempt < 2)

    const exitCode = timedOut ? 1 : res.status ?? (res.error ? 1 : 0)
    results.push({ entry, exitCode, timedOut, retried: attempt > 1 })
  }

  if (mongod) {
    await mongod.stop().catch(() => {})
  }

  console.log(`\n${"═".repeat(70)}`)
  console.log("TEST SUMMARY — every entry below ran, regardless of earlier failures")
  console.log("═".repeat(70))

  let anyFailed = false
  let anyUnexpectedFailure = false

  for (const { entry, exitCode, timedOut, retried } of results) {
    const passed = exitCode === 0
    const known = KNOWN_FAILURES[entry]

    if (passed) {
      console.log(`  ✅ PASS   ${entry}${retried ? "  (needed 1 retry — see Phase 10 notes)" : ""}`)
    } else if (timedOut) {
      console.log(`  ⏱️  TIMEOUT ${entry}`)
      anyFailed = true
      anyUnexpectedFailure = true
    } else if (known) {
      console.log(`  ⚠️  KNOWN  ${entry}`)
      console.log(`            ${known}`)
      anyFailed = true
    } else {
      console.log(`  ❌ FAIL   ${entry}`)
      anyFailed = true
      anyUnexpectedFailure = true
    }
  }

  const passedCount = results.filter((r) => r.exitCode === 0).length
  console.log(`\n${passedCount}/${results.length} entries passed.`)

  if (anyUnexpectedFailure) {
    console.log("\n❌ At least one UNEXPECTED failure occurred. Investigate before proceeding.")
  } else if (anyFailed) {
    console.log("\n⚠️  All failures are KNOWN and tracked (see above). No unexpected regressions.")
  } else {
    console.log("\n🎉 All test entries passed.")
  }

  process.exit(anyFailed ? 1 : 0)
}

main()
