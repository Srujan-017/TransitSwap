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
// Known, tracked failure: userPreferences.test.ts currently reports 2 failing
// assertions. That is a real model limitation (relative min-max normalization
// over tiny candidate sets — see PROJECT_MASTER_PLAN.md §20, §24), not a test
// bug, and it is explicitly scoped to Phase 7. It is listed below as a KNOWN
// issue so it is never confused with an unexpected regression, but it still
// makes the overall run exit non-zero — this script does not paper over it.

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
]

// Entries with a known, already-diagnosed failure, tracked for a specific
// future phase. Listed explicitly so a new, unrelated failure in the same
// file is never mistaken for "the known one".
const KNOWN_FAILURES = {
  "src/__tests__/userPreferences.test.ts":
    "2 assertions fail (walking-tolerance magnitude, reliability-priority magnitude) — " +
    "a ranking-model limitation tracked for Phase 7, not a test bug. See PROJECT_MASTER_PLAN.md §20/§24.",
}

// Invoke ts-node's actual bin script via `node`, rather than the .bin/ts-node
// shim. On Windows that shim is a .cmd file, and spawnSync() can't exec a
// .cmd directly without shell:true (EINVAL) — going through `node` sidesteps
// the shell entirely and works identically on every platform.
const tsNodeScript = path.join(ROOT, "node_modules", "ts-node", "dist", "bin.js")

const results = []

for (const entry of ENTRIES) {
  console.log(`\n${"═".repeat(70)}`)
  console.log(`▶ RUNNING: ${entry}`)
  console.log("═".repeat(70))

  const res = spawnSync(process.execPath, [tsNodeScript, "--transpile-only", entry], {
    cwd: ROOT,
    stdio: "inherit",
  })

  const exitCode = res.status ?? (res.error ? 1 : 0)
  if (res.error) {
    console.error(`\n⚠️  Failed to spawn ts-node for ${entry}: ${res.error.message}`)
  }

  results.push({ entry, exitCode })
}

console.log(`\n${"═".repeat(70)}`)
console.log("TEST SUMMARY — every entry below ran, regardless of earlier failures")
console.log("═".repeat(70))

let anyFailed = false
let anyUnexpectedFailure = false

for (const { entry, exitCode } of results) {
  const passed = exitCode === 0
  const known = KNOWN_FAILURES[entry]

  if (passed) {
    console.log(`  ✅ PASS   ${entry}`)
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
