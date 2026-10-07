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
// mongodb-memory-server and exports its connection string as MONGODB_URI for
// every spawned child process below — the existing self-connect logic in
// those files (and the new Phase 10 API integration tests, which need a real
// DB for register/login to work at all) then picks it up with no code change
// of its own. If the in-memory server fails to start for any reason (e.g. no
// network to fetch the mongod binary on first use), this degrades to the
// pre-Phase-10 behavior: MONGODB_URI stays unset and the same files honestly
// skip, exactly as before — this is an enhancement, never a new failure mode.

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

async function main() {
  // Phase 10 — start an in-memory MongoDB so every DB-dependent test entry
  // (the 5 pre-existing self-connecting files, plus the new API integration
  // tests below) actually exercises its real path instead of honestly
  // skipping. Never fatal: a failure here just means MONGODB_URI stays unset,
  // which is exactly the pre-Phase-10 behavior those files already handle.
  let mongod = null
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server")
    console.log("▶ Starting in-memory MongoDB for this test run...")
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    console.log(`✅ In-memory MongoDB ready at ${mongod.getUri()}`)
  } catch (err) {
    console.warn(`⚠️  Could not start in-memory MongoDB (${err.message}) — DB-dependent entries will honestly skip, as before Phase 10.`)
  }

  const results = []
  // Phase 10 — a bounded per-entry timeout. Found during Phase 10's own
  // development: running this many sequential ts-node child processes
  // against one long-lived in-memory MongoDB occasionally wedges on this
  // Windows sandbox (observed hanging in 2 different files on 2 different
  // runs, each confirmed to pass instantly and reliably in isolation — a
  // resource/connection-handling fragility in the environment, not a code
  // defect in the file that happened to be running when it stalled).
  // Without a timeout, that hang blocks the ENTIRE suite forever with no
  // error; with one, it's reported as exactly what it is — a timeout on
  // that one entry — and every other entry still runs.
  const PER_ENTRY_TIMEOUT_MS = 120_000

  for (const entry of ENTRIES) {
    console.log(`\n${"═".repeat(70)}`)
    console.log(`▶ RUNNING: ${entry}`)
    console.log("═".repeat(70))

    const res = spawnSync(process.execPath, [tsNodeScript, "--transpile-only", entry], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
      timeout: PER_ENTRY_TIMEOUT_MS,
      killSignal: "SIGKILL",
    })

    const timedOut = res.signal === "SIGKILL" || res.signal === "SIGTERM"
    const exitCode = timedOut ? 1 : res.status ?? (res.error ? 1 : 0)
    if (timedOut) {
      console.error(`\n⚠️  ${entry} did not finish within ${PER_ENTRY_TIMEOUT_MS / 1000}s and was killed.`)
    } else if (res.error) {
      console.error(`\n⚠️  Failed to spawn ts-node for ${entry}: ${res.error.message}`)
    }

    results.push({ entry, exitCode, timedOut })
  }

  if (mongod) {
    await mongod.stop()
    console.log("\n✅ In-memory MongoDB stopped.")
  }

  console.log(`\n${"═".repeat(70)}`)
  console.log("TEST SUMMARY — every entry below ran, regardless of earlier failures")
  console.log("═".repeat(70))

  let anyFailed = false
  let anyUnexpectedFailure = false

  for (const { entry, exitCode, timedOut } of results) {
    const passed = exitCode === 0
    const known = KNOWN_FAILURES[entry]

    if (passed) {
      console.log(`  ✅ PASS   ${entry}`)
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
