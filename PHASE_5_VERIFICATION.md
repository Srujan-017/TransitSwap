# TransitSwap Phase 5 Verification

Project: TransitSwap

Phase: Phase 5 - Transit data expansion (redefined mid-phase: city migration Mumbai -> Bengaluru + expansion)

Date: 2026-10-07

## 1. Phase Objective (as redefined)

`PROJECT_MASTER_PLAN.md` §39 scoped Phase 5 as "raise coverage from 13.8% of Mumbai to a usable majority, and candidate richness from ~2 to >=3 non-dominated routes." Mid-phase, the user gave an explicit, authoritative instruction: the project's real target city is Bengaluru, not Mumbai. Rather than build out the originally-planned Mumbai expansion and redo it immediately after, this phase migrated the dataset to Bengaluru's real transit network **and** expanded it in the same pass — both are the same deliverable (a bigger, correct, real-world-grounded seeded dataset), so doing them together was more efficient than two passes.

## 2. Research Performed Before Writing Any Data

Checked explicitly via WebSearch: no official, reliably-downloadable GTFS feed was found for either Namma Metro or BMTC in this session. Per `PROJECT_MASTER_PLAN.md`'s own Phase 5 guidance, the fallback is a seeded, clearly-labelled expansion rather than a live import — the same approach the original (Mumbai) dataset already used.

Real facts gathered and used:
- Namma Metro's 3 real operational lines: **Purple** (Whitefield↔Challaghatta), **Green** (Madavara↔Silk Institute), **Yellow** (RV Road↔Bommasandra, opened August 2025).
- Real interchange points: Majestic (Purple/Green), RV Road (Green/Yellow).
- BMTC's real "Big10" corridor names (HAL Airport Road, Hosur Road, Sarjapur Road, Bannerghatta Road, Kanakapura Road) and real scale (4,500+ regular routes — this seed's 10 routes is a tiny, clearly-labelled fraction).
- Namma Metro's real February 2026 distance-slab fare table (₹11 for 0-2km through ₹95 above 30km), approximated here as a flat basefare+perStation model consistent with how the rest of this dataset already works.

## 3. What Changed

| File | Before | After |
|---|---|---|
| `transitData.ts` | 19 metro stations, 2 lines, 1 hard-coded interchange, 12 bus stops, 4 bus routes, Mumbai names/coords | 41 metro stations, 3 real Namma Metro lines, 2 real interchanges (generalized lookup, not hard-coded), 24 bus stops, 10 bus routes, real Bengaluru names |
| `accessibilityData.ts` | 25 records (19 metro + 6 of 12 bus stops — 6 unrecorded) | 65 records — **every** metro station and bus stop now has one |
| `crowdData.ts` | 12 records, Mumbai ids | 16 records, Bengaluru ids |
| `evaluationService.ts` | 5 Mumbai Line-1-only scenarios | 5 Bengaluru scenarios across all 3 lines |
| `multimodalService.ts` | flat `METRO_WAIT_SEC`/`BUS_WAIT_SEC` constants | per-line/per-route `frequencyMinutes` |
| 10 backend test files | Mumbai station names | Bengaluru station names (verified individually) |
| 4 frontend files | Mumbai copy/coords | Bengaluru copy/coords |
| `README.md` | Mumbai facts throughout | Bengaluru facts throughout, §18 benchmark re-run and re-verified, not just text-replaced |

`PROJECT_MASTER_PLAN.md` and `PHASE_0`-`PHASE_4` documents are **deliberately left unchanged** — they are an accurate historical record of the Mumbai-based codebase at the time each was written, per this project's own stated principle of never rewriting past phase documents. This document is the canonical record of the city migration going forward.

## 4. The Generalized Interchange Lookup

The original `stationsOnPath()` had exactly one hard-coded interchange constant (`"m1-02"`), because the Mumbai seed had exactly one interchange. Bengaluru's seed has two real ones (Majestic, RV Road). Generalized to find whichever station id is shared between two different lines' `stations` arrays, instead of a hard-coded id. This is still only a single-hop transfer (origin line → shared station → destination line) — not a general graph search, which remains Phase 6's scope. Verified by a dedicated test case: Madavara (Green-only) → Whitefield (Purple-only), which has no single line connecting them and correctly routes through the real Majestic interchange, producing a pure `metro` segment labelled `"Green Line + Purple Line"`.

## 5. A Regression Caught Mid-Phase

`userPreferences.test.ts` has its own self-contained accessibility fixture (Test 8, "Hard Accessibility Constraint Precedence") that independently referenced `"WEH Metro"`/`"Chakala Metro"` by name. Renaming only `accessibilityData.ts` without updating this fixture broke it silently: with no real record named `"WEH Metro"` anymore, the route hit the Phase 4 B5 `unrecordedStationPlaceholder` fallback (status `"unknown"`) instead of the real not-accessible record, so the wheelchair hard-block no longer fired.

This was masked in the test harness's one-line summary because `backend/scripts/run-tests.js` only disambiguates `KNOWN` vs `FAIL` at the whole-file level, and this file already has 2 pre-existing `KNOWN` failures — a 3rd failure inside the same file still just printed `KNOWN`. Caught by checking the isolated per-assertion output (8 passed → 5 passed, 3 failed) rather than trusting the aggregate summary alone. Fixed by renaming the fixture to match the new dataset; re-verified back to exactly 6 passed / 2 failed, confirmed identical to the pre-Phase-5 baseline by diffing the exact assertion text.

**Lesson for future phases:** the test harness's file-level `KNOWN` label can hide a new, unrelated failure inside an already-partially-failing file. Always check a `KNOWN` file's isolated output after a change that could plausibly affect it, not just the one-line summary.

## 6. Measured Results (honest, not inflated)

### Geographic grid reachability (padded Bengaluru bounding box, 40×40 grid, 1600 points)

| Metric | Mumbai (pre-Phase-5) | Bengaluru (Phase 5) | Change |
|---|---|---|---|
| Within 2000m of a metro station | 12.3% | 27.2% | 2.2x |
| Within 1200m of a bus stop | 5.6% | 10.1% | 1.8x |
| Reachable by either rule | 13.8% | **30.0%** | **2.2x** |

### O/D pair success rate (8×8 grid sample, 281 pairs — same methodology as the original audit)

| Metric | Mumbai (pre-Phase-5) | Bengaluru (Phase 5) | Change |
|---|---|---|---|
| Pairs with ≥1 route | 1.4% | **6.8%** | 4.9x |
| Successful pairs with ≥3 routes | 0% (0/4) | 10.5% (2/19) | new, non-zero |

### Against the master plan's own success criteria

| Criterion | Target | Achieved | Met? |
|---|---|---|---|
| Grid coverage | ≥60% | 30.0% | **No** |
| ≥3 candidates on ≥50% of successful queries | ≥50% | 10.5% | **No** |
| Every stop has an accessibility record | 100% | 100% (65/65) | **Yes** |
| All Phase 3 validation tests still pass | pass | pass (verified, including the regression caught and fixed above) | **Yes** |

**Honest conclusion:** Phase 5 delivered a real, substantial, independently-verified improvement on every coverage metric (roughly 2-5x depending on measure) and fully met 2 of 4 original success criteria. It did **not** reach the ambitious ≥60%/≥50% targets set during the original audit. Investigating why (see §7 below) confirmed this is not primarily a data-size problem that more hand-authored stations could fix — it is structurally bounded by candidate generation still being 4 fixed journey patterns rather than a path search.

## 7. Why the Ambitious Targets Weren't Reached, and Why More Manual Data Isn't the Fix

A gap analysis (12×12 grid) showed 107/144 points (74%) still uncovered, spread broadly across the padded bounding box, not concentrated in one fixable area. Closing that by hand-authored stations alone would require 50-100+ more — beyond what can be reliably authored with verified real place names and reasonable coordinate accuracy in one session without quality degrading.

More importantly: even where candidates **are** generated, the structural ceiling is candidate generation itself. The 4 fixed pattern functions (`tryWalkMetroWalk`, `tryWalkBusWalk`, `tryWalkMetroAuto`, `tryWalkBusMetroWalk`) cap how many genuinely different candidates can ever be found for a given corridor, regardless of how large the underlying dataset grows. This is a validated finding, not a guess: the O/D success rate improved 4.9x but the ≥3-candidate rate only reached 10.5%, well short of 50% — more data raised the floor (more queries succeed at all) far more than it raised the ceiling (how many distinct candidates a successful query returns).

**This strengthens, rather than weakens, the case for Phase 6 (candidate generation engine) as the next step** — a real path search over a stop graph is now clearly necessary to meet the richness target, not just helpful.

## 8. A New, Real Finding in the Benchmark

Re-running `evaluationService.runEvaluation()` on the new Bengaluru scenarios (not just updating the scenario names) surfaced something that wasn't just a city-name swap: **agreement with the lowest-cost baseline dropped from 100% to 60%** (2 of 5 scenarios now diverge). Agreement with the shortest-time baseline remains 100%, for the same explainable reason as before Phase 5 (most corridors still produce ≤2 candidates, often Pareto-dominated). This is a genuine, if small, signal that the larger network has started producing real cost/speed trade-offs where the smaller Mumbai seed had none at all — exactly the direction Phase 5 was meant to move things, even though it didn't reach the target magnitude.

## 9. Final Verification

| Check | Command | Result |
|---|---|---|
| Backend typecheck | `npx tsc --noEmit` (backend) | ✅ 0 errors |
| Backend build | `npm run build` (backend) | ✅ clean |
| Backend tests | `npm test` (backend) | 12/13 — same 2 known Phase-7-tracked failures as the pre-Phase-5 baseline, confirmed identical by diffing assertion text; 0 unexpected |
| Frontend typecheck | `npx tsc --noEmit` (root) | ✅ 0 errors |
| Frontend build | `npm run build` (root) | ✅ clean |

## 10. Commits

```
b7f9fb6 Phase 5: migrate seeded transit dataset from Mumbai to Bengaluru and expand network coverage
288f1d1 Phase 5: migrate all backend test fixtures from Mumbai to Bengaluru station names
2a14344 Phase 5: migrate frontend copy and README to Bengaluru, re-verify benchmark numbers
```

Baseline: `38b705b` (tag `v-phase-4-complete`).

## 11. What Phase 5 Did Not Do

- No GTFS import (none was reliably available this session — documented, not silently skipped).
- No change to candidate generation's 4 fixed pattern functions (Phase 6's scope) beyond the minimal, justified `stationsOnPath()` interchange generalization described in §4.
- No change to the ranking engine's feature set (Phase 7's scope).
- Did not reach the ≥60%/≥50% coverage targets — reported honestly as a partial result, not rounded up or reframed as success.

## 12. Next Step

Per `PROJECT_MASTER_PLAN.md` §39 and the finding in §7 above, **Phase 6 — Candidate generation engine** is next, and is now more clearly justified than before this phase: the measured data shows the candidate-richness ceiling is structural (the 4 fixed patterns), not primarily a function of dataset size. A real path search over a stop graph is needed before Phase 7 (ranking-feature correctness) or Phase 9 (evaluation harness rebuild) can produce meaningful results.
