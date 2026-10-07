#!/usr/bin/env ts-node
// ── Phase 8 data migration ───────────────────────────────────────────────────
//
// Before this phase, mlPreferenceService.recordRouteChoice() stored exactly
// ONE document per alternative route: {chosen - rejected, label: 1}. Every
// stored PairwisePreference row therefore had label 1 — a single-class
// dataset. Phase 8 fixes new writes to store both that row AND its mirror
// {rejected - chosen, label: 0} (see mlPreferenceService.buildPairwiseDocs).
//
// This script is the one-time backfill for rows written BEFORE that fix: for
// every existing label:1 row that has no corresponding label:0 mirror, it
// inserts one. It is idempotent — safe to run multiple times, or never, on
// an empty database — because it only inserts mirrors that don't already
// exist, and the (userId, chosenRouteId, rejectedRouteId, source, label)
// unique index rejects any accidental duplicate insert.
//
// Not run automatically: this project's development environment has no
// MongoDB connection configured (MONGODB_URI unset — see PHASE_8_VERIFICATION.md
// §5), so there is no existing stored data to migrate in this environment.
// Provided for any real deployment that accumulated label:1-only rows before
// this phase. Run with: npm run migrate:mirror-pairwise (from backend/).

import mongoose from "mongoose"
import { env } from "../src/config/env"
import { PairwisePreference } from "../src/models/PreferencePair"

async function main() {
  if (!env.MONGODB_URI) {
    console.log("⚠️  MONGODB_URI not configured — nothing to migrate. Exiting.")
    return
  }

  await mongoose.connect(env.MONGODB_URI)
  console.log("✅ Connected to MongoDB")

  const singleClassRows = await PairwisePreference.find({ label: 1 })
  console.log(`Found ${singleClassRows.length} label:1 rows to check for a missing mirror.`)

  let mirrorsCreated = 0
  let alreadyMirrored = 0
  let skippedLegacyShape = 0

  for (const row of singleClassRows) {
    const existingMirror = await PairwisePreference.findOne({
      userId: row.userId,
      chosenRouteId: row.chosenRouteId,
      rejectedRouteId: row.rejectedRouteId,
      source: row.source,
      label: 0,
    })

    if (existingMirror) {
      alreadyMirrored += 1
      continue
    }

    if (!Array.isArray(row.deltaX) || row.deltaX.length === 0) {
      skippedLegacyShape += 1
      continue
    }

    try {
      await PairwisePreference.create({
        userId: row.userId,
        sessionId: row.sessionId,
        originName: row.originName,
        destinationName: row.destinationName,
        chosenRouteId: row.chosenRouteId,
        rejectedRouteId: row.rejectedRouteId,
        chosenFeatures: row.chosenFeatures,
        rejectedFeatures: row.rejectedFeatures,
        deltaX: row.deltaX.map((v) => -v),
        label: 0,
        source: row.source,
      })
      mirrorsCreated += 1
    } catch (err) {
      // Duplicate-key race (e.g. two runs overlapping) — safe to skip.
      console.warn(`⚠️ Could not create mirror for row ${row.id}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log("\n── Migration summary ──")
  console.log(`Mirrors created:       ${mirrorsCreated}`)
  console.log(`Already had a mirror:  ${alreadyMirrored}`)
  console.log(`Skipped (no deltaX):   ${skippedLegacyShape}`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error("❌ Migration failed:", err)
  process.exit(1)
})
