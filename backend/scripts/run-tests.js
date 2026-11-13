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
// stays unset and the same files honestly skip, exactly as before.
//
// ── Completion-phase 1 additions (false-green fix) ───────────────────────────
//
// Found by auditing a full run: a test file that printed "SKIPPED — MONGODB_URI
// is not configured" still exited 0 and was counted as a PASS. 8 of the 10 API
// files did exactly that after a database was lost mid-run, yet the summary said
// "26/26 entries passed" — and the GitHub CI job could never have noticed. Now:
//   * every child's output is captured (and still streamed live), so a SKIPPED
//     marker is detected instead of being invisible behind exit code 0;
//   * a skip while the runner HAS a database means the database was unreachable
//     → that is a FAILURE (and the database is replaced and the entry retried);
//   * a skip because no database could be started at all is reported as SKIP,
//     never PASS, and fails the run when CI=true or REQUIRE_DB=1 is set;
//   * the database is health-checked before every entry, so a dead mongod is
//     replaced up front instead of costing a 120 s timeout;
//   * failures are emitted as GitHub Actions annotations and a step summary, so
//     a red CI run explains itself without opening the raw log.
//
// Usage:  node scripts/run-tests.js                 run every entry
//         node scripts/run-tests.js api/crowd ml    run only entries whose path contains an argument

const { spawn } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")

const ALL_ENTRIES = [
  "src/__tests__/accessibility.test.ts",
  "src/__tests__/crowdAccessibilityBlock.test.ts",
  "src/__tests__/profilePolicy.test.ts",
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
  // Completion-phase 2 — pure (no database) regression tests for B4 (crowd
  // time slots) and B6/B7 (warning de-duplication, wheelchair step-free rule).
  "src/__tests__/crowdTimeSlots.test.ts",
  "src/__tests__/accessibilityRuleGaps.test.ts",
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
  // Completion-phase 2 — B3 (exclusion reasons through the API) and B5 (ML status profile).
  "src/__tests__/api/exclusionReasons.test.ts",
]

const filters = process.argv.slice(2)
// A filter either narrows the standard entries by substring, or names any
// other test file (relative to backend/) to run it through the same harness.
const extraFiles = filters.filter((f) => !ALL_ENTRIES.includes(f) && fs.existsSync(path.join(ROOT, f)))
const ENTRIES = filters.length
  ? [...ALL_ENTRIES.filter((e) => filters.some((f) => e.includes(f))), ...extraFiles]
  : ALL_ENTRIES

// No KNOWN_FAILURES currently tracked — the walking-tolerance/reliability-
// priority magnitude issue (Phase 7) and the single-class ML label issue
// (Phase 8) are both fixed. Kept as an empty object (not removed) so a
// future phase that needs to track a diagnosed-but-deferred failure has
// the mechanism ready without re-inventing it.
const KNOWN_FAILURES = {}

// Invoke ts-node's actual bin script via `node`, rather than the .bin/ts-node
// shim. On Windows that shim is a .cmd file, and spawn() can't exec a .cmd
// directly without shell:true (EINVAL) — going through `node` sidesteps the
// shell entirely and works identically on every platform.
const tsNodeScript = path.join(ROOT, "node_modules", "ts-node", "dist", "bin.js")

const PER_ENTRY_TIMEOUT_MS = Number(process.env.TEST_ENTRY_TIMEOUT_MS) || 120_000
const STRICT_DB = Boolean(process.env.CI || process.env.REQUIRE_DB)
const SKIP_MARKER = /SKIPPED/

// Phase 10 — found by direct diagnosis, not assumed, across several rounds:
// (1) ONE mongod shared for the whole ~25-entry run can reach a
//     `MongooseServerSelectionError: Server selection timed out` partway
//     through — the mongod process itself stops accepting connections
//     after sustained use on this Windows sandbox.
// (2) The opposite extreme — a brand-new mongod for literally every entry —
//     trades that problem for a worse one: creating ~25-50 sequential mongod
//     processes exhausts Windows' ephemeral TCP ports fast enough (TIME_WAIT
//     lingers long after a process exits) that MongoMemoryServer.create()
//     itself starts timing out for every entry from partway through the run.
// The balance that held up: reuse ONE mongod across the whole run in the
// common case, and replace it only when it is proven unhealthy (a failed
// health check, a timeout, or a skip that says the DB was unreachable).
async function startMongod() {
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server")
    const mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    console.log(`✅ In-memory MongoDB ready at ${mongod.getUri()}`)
    return mongod
  } catch (err) {
    console.warn(`⚠️  Could not start in-memory MongoDB (${err.message}) — DB-dependent entries will be reported as SKIPPED, not passed.`)
    delete process.env.MONGODB_URI
    return null
  }
}

// A real round-trip (connect + ping) with a short timeout. Cheap (tens of ms)
// and lets a dead mongod be replaced BEFORE an entry wastes its 120 s budget.
async function isDbHealthy(uri) {
  const mongoose = require("mongoose")
  let conn
  try {
    conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 4000 }).asPromise()
    await conn.db.admin().ping()
    return true
  } catch {
    return false
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
}

// Runs one entry in a child process, streaming its output live while also
// capturing it (bounded) so skip markers and failure details can be inspected.
function runEntry(entry) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tsNodeScript, "--transpile-only", entry], {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    const chunks = []
    let size = 0
    const keep = (buf) => {
      chunks.push(buf)
      size += buf.length
      while (size > 400_000 && chunks.length > 1) size -= chunks.shift().length
    }
    child.stdout.on("data", (b) => { process.stdout.write(b); keep(b) })
    child.stderr.on("data", (b) => { process.stderr.write(b); keep(b) })

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, PER_ENTRY_TIMEOUT_MS)

    let spawnError = null
    child.on("error", (err) => { spawnError = err })
    child.on("close", (code, signal) => {
      clearTimeout(timer)
      resolve({
        code: timedOut || spawnError ? 1 : code ?? 1,
        signal,
        timedOut,
        spawnError,
        output: Buffer.concat(chunks).toString("utf8"),
      })
    })
  })
}

// GitHub Actions workflow-command values must escape %, CR and LF.
const ghEscape = (s) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")

function failureExcerpt(output) {
  const lines = output.split(/\r?\n/).map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trimEnd()).filter(Boolean)
  const picked = lines.filter((l) => /❌|FAILED|Error|AssertionError|did not finish|SKIPPED/.test(l))
  return (picked.length ? picked : lines).slice(-12).join("\n").slice(0, 1800)
}

async function main() {
  // A filter that matches nothing must not look like a pass.
  if (ENTRIES.length === 0) {
    console.error(`❌ No test entries matched: ${filters.join(", ")}`)
    process.exit(1)
  }

  const results = []
  let mongod = await startMongod()

  for (const entry of ENTRIES) {
    let outcome = null
    let attempt = 0

    while (attempt < 2 && !outcome) {
      attempt += 1

      // Replace a mongod that cannot answer a ping before spending the entry on it.
      if (mongod && !(await isDbHealthy(process.env.MONGODB_URI))) {
        console.warn("\n⚠️  The test database stopped answering — replacing it before the next entry.")
        await mongod.stop().catch(() => {})
        mongod = await startMongod()
      }

      console.log(`\n${"═".repeat(70)}`)
      console.log(`▶ RUNNING: ${entry}${attempt > 1 ? ` (retry ${attempt - 1})` : ""}`)
      console.log("═".repeat(70))

      const res = await runEntry(entry)
      const skipped = res.code === 0 && SKIP_MARKER.test(res.output)
      const hadDb = Boolean(process.env.MONGODB_URI)

      if (res.timedOut) {
        console.error(`\n⚠️  ${entry} did not finish within ${PER_ENTRY_TIMEOUT_MS / 1000}s and was killed.`)
        if (mongod) {
          await mongod.stop().catch(() => {})
          mongod = await startMongod()
        }
        outcome = attempt >= 2 ? { status: "TIMEOUT", res } : null
      } else if (res.spawnError) {
        console.error(`\n⚠️  Failed to spawn ts-node for ${entry}: ${res.spawnError.message}`)
        outcome = attempt >= 2 ? { status: "FAIL", res } : null
      } else if (res.code !== 0) {
        outcome = attempt >= 2 ? { status: "FAIL", res } : null
      } else if (skipped && hadDb) {
        // The entry skipped even though a database was supposed to be available:
        // the connection failed. Never a pass — replace the database and retry.
        console.error(`\n⚠️  ${entry} skipped its database assertions although a test database was running — treating as a failure.`)
        if (mongod) {
          await mongod.stop().catch(() => {})
          mongod = await startMongod()
        }
        outcome = attempt >= 2 ? { status: "FAIL", res, reason: "skipped although a database was available" } : null
      } else if (skipped) {
        outcome = { status: "SKIP", res }
      } else {
        outcome = { status: "PASS", res }
      }
      if (outcome) outcome.retried = attempt > 1
    }
    results.push({ entry, ...outcome })
  }

  if (mongod) await mongod.stop().catch(() => {})

  console.log(`\n${"═".repeat(70)}`)
  console.log(`TEST SUMMARY — every entry below ran, regardless of earlier failures`)
  console.log("═".repeat(70))

  const summaryRows = []
  for (const r of results) {
    const known = KNOWN_FAILURES[r.entry]
    const retryNote = r.retried ? "  (needed 1 retry)" : ""
    if (r.status === "PASS") console.log(`  ✅ PASS   ${r.entry}${retryNote}`)
    else if (r.status === "SKIP") console.log(`  ⚠️  SKIP   ${r.entry}  — database assertions NOT run`)
    else if (r.status === "TIMEOUT") console.log(`  ⏱️  TIMEOUT ${r.entry}`)
    else if (known) console.log(`  ⚠️  KNOWN  ${r.entry}\n            ${known}`)
    else console.log(`  ❌ FAIL   ${r.entry}${r.reason ? `  — ${r.reason}` : ""}`)
    summaryRows.push(`| ${r.status === "PASS" ? "✅" : r.status === "SKIP" ? "⚠️" : "❌"} ${r.status}${r.retried ? " (retried)" : ""} | \`${r.entry}\` |`)
  }

  const count = (s) => results.filter((r) => r.status === s).length
  const passed = count("PASS")
  const skipped = count("SKIP")
  const failed = results.length - passed - skipped
  console.log(`\n${passed} passed, ${skipped} skipped, ${failed} failed — ${results.length} entries.`)

  if (skipped > 0) {
    console.log(`\n⚠️  ${skipped} entr${skipped === 1 ? "y" : "ies"} SKIPPED because no test database could be started. A skip is NOT a pass.`)
  }
  if (failed > 0) console.log("\n❌ At least one failure occurred. Investigate before proceeding.")
  else if (skipped === 0) console.log("\n🎉 All test entries passed.")

  // Make a red CI run explain itself: one annotation per failure + a step summary.
  if (process.env.GITHUB_ACTIONS) {
    for (const r of results) {
      if (r.status === "PASS" && r.retried) console.log(`::warning title=Flaky test: ${r.entry}::passed only on retry`)
      if (r.status === "FAIL" || r.status === "TIMEOUT") {
        console.log(`::error title=Test ${r.status}: ${r.entry}::${ghEscape(failureExcerpt(r.res.output))}`)
      }
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
      const md = `## Backend tests — ${passed} passed, ${skipped} skipped, ${failed} failed\n\n| Result | Entry |\n|---|---|\n${summaryRows.join("\n")}\n`
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
    }
  }

  const skipFails = skipped > 0 && STRICT_DB
  if (skipFails) console.log("\n❌ Skipped entries are not allowed when CI=true or REQUIRE_DB=1.")
  process.exit(failed > 0 || skipFails ? 1 : 0)
}

main()
