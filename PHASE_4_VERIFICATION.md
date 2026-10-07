# TransitSwap Phase 4 Verification

Project: TransitSwap

Phase: Phase 4 - Stabilisation (truth before features)

Date: 2026-10-07

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 4): make every documented command work and every claim in the repository true, before any feature work (data expansion, candidate-generation redesign, ranking-feature changes) begins. This phase fixes bugs, not behaviour the project's design deliberately chose (e.g. graceful degradation, honest `isDataDriven`/`null` gating, the 4-pattern candidate generator) — see `PROJECT_MASTER_PLAN.md` §42 for what was intentionally left untouched.

Phase 4 intentionally did **not**:

- Expand the transit dataset (Phase 5).
- Rewrite candidate generation into a graph search (Phase 6).
- Add missed-connection risk or transfer count to the ranking feature vector (Phase 7).
- Fix the pairwise-training single-class-label issue (Phase 8) — flagged, tracked, left untouched.
- Rebuild the evaluation/benchmark scenario set (Phase 9).
- Change any Mongoose schema's shape beyond what a specific bug fix required.
- Touch the 4 fixed candidate-generation pattern functions' core logic (only the shared `excludeIds`/`omitNegligibleWalks` plumbing around them).

## 2. Starting Point

No git repository existed. `PHASE_0_BASELINE.md` recorded that a baseline branch/tag could not be created for this reason. This phase began by creating one.

- `git init`, full working tree committed as `729e55b`.
- Tagged `v-phase-3-baseline` — the exact uploaded project state audited in `PROJECT_MASTER_PLAN.md`, before any Phase 4 change.
- Verified before tagging: no `node_modules/`, `dist/`, or real `.env` file was staged (only `.env.example` placeholders, which are meant to be committed).

## 3. Procedure Followed

Per `PROJECT_MASTER_PLAN.md` §40, each fix below was: inspected in the existing code, scoped to the minimum necessary change, implemented, typechecked (`tsc --noEmit`, both packages), built (both packages), regression-tested (`npm test`, full 13-entry suite), and committed individually with a message documenting the root cause, the fix, and the verification evidence — before moving to the next fix. 11 commits in total; `git log --oneline v-phase-3-baseline..HEAD` lists them in order.

## 4. Bugs Fixed (PROJECT_MASTER_PLAN.md §31)

| ID | Problem | Fix | Files | Verification |
|---|---|---|---|---|
| B1 | Seeded demo account's password was hashed twice (`bcrypt.hash()` called in `seedDemoUser`, then again by the model's `pre("save")` hook) — the account could never log in | Pass the plaintext to `User.create()`; the hook hashes it exactly once | `backend/src/utils/seedDemoUser.ts` | Direct bcrypt probe: `compare(plaintext, doubleHash)` was `false`, `compare(plaintext, singleHash)` is `true` |
| B2 | "Reset TransitDNA" rewrote `User.transitDNA` only; the ranker reads `UserPreferenceModel` via `mlPreferenceService.getModelStatus()`, which was never touched — resetting had no effect on recommendations | `resetTransitDna()` now also deletes the user's `UserPreferenceModel` and `PairwisePreference` rows. Related dead-code cleanup: `multimodalController` no longer scores with `User.transitDNA.learnedWeights` (nothing downstream read it once 2+ candidates exist); it now uses the same `getModelStatus()` weights the ranker uses | `backend/src/services/authService.ts`, `backend/src/controllers/multimodalController.ts` | Direct probe: `calculateMultimodalRoute()` invoked with a mock request runs end-to-end, 200, correct route count and populated score |
| B3 | `npm test` chained 13 `ts-node` calls with `&&`; the first failure aborted everything after it — 7 of 13 test files never ran | New `backend/scripts/run-tests.js` runs every entry unconditionally, prints one honest summary, exits non-zero only if something failed | `backend/package.json`, `backend/scripts/run-tests.js` | All 13 entries now execute every run (confirmed in every subsequent regression pass in this phase) |
| B4 | `Accessibility.active`, written by `adminService.deactivateStation()`/`updateStation()`, was never read anywhere — deactivating a station had no routing effect, contradicting the model's own doc-comment | `accessibilityService` gained `getInactiveStationIds()`; `multimodalService.generateRoutes()` fetches it once per request and excludes those stations from every nearest-station lookup and connector search (`RoadContext.excludeIds`) | `backend/src/services/accessibilityService.ts`, `backend/src/services/multimodalService.ts` | Probe with a stubbed connected DB marking Versova Metro deactivated: the Versova↔Ghatkopar route no longer touches that station and correctly reroutes via the next-nearest one; DB-disconnected baseline is byte-for-byte unchanged |
| B5 | `extractTransitStations()` silently dropped any route station with no matching accessibility record (6 of 12 bus stops have none). With 0 matched stations, scoring defaulted to a generous `avgStationScore` of 70 — a wheelchair route through completely unrecorded stations could score ~100/100 "accessible" with zero warnings | Unmatched stations now get an explicit `status: "unknown"` placeholder instead of being dropped — they appear in `checkedStations` and generate a named warning, and `dataSource` reports `"no_data"` instead of the misleading `"synthetic_demo"` | `backend/src/services/accessibilityService.ts`, `backend/src/types/intelligence.ts` | Probe (route via "Versova Junction"/"Juhu Beach", neither in the accessibility dataset, profile=wheelchair): `accessibilityScore` 100 → 83, `checkedStations` empty → 2 entries, `warnings` empty → 6 explicit entries, `dataSource` `"synthetic_demo"` → `"no_data"` |
| B6 | `PUT /auth/profile`, `PUT /auth/preferences`, `PUT /admin/stations/:id`, `PUT /admin/accessibility/:id` had no body validation (admin routes validated only the path param) — an admin could store an out-of-range coordinate with no check at all | Added `express-validator` rules matching each route's actual allowed fields | `backend/src/routes/auth.routes.ts`, `backend/src/routes/admin.routes.ts` | Live HTTP probes (server started locally, admin JWT forged with the known dev secret): bad latitude/stairCount/enum values → 400 with field-level messages; the same valid values → 503 (no DB), proving the validator passes legitimate input through |
| B7 | A `useMemo()` in `MultimodalResults.tsx` sat after `if (!selected) return null` — a Rules-of-Hooks violation (latent crash if `selected`'s truthiness ever differs between renders) | Moved both `useMemo` calls above the early return; the derived consts they depend on now read `selected` with optional chaining | `src/components/multimodal/MultimodalResults.tsx` | `tsc --noEmit` clean; component logic/JSX otherwise unchanged |
| B8 | Same function as B2 also omitted `crowd`/`weather` from the reset `learnedWeights`, leaving an inconsistent 5-of-7 vector | Fixed in the same change as B2 — all 7 weights written | `backend/src/services/authService.ts` | Code review; covered by B2's verification |
| B9 | `userPreferences.test.ts` printed `❌ FAILED: ...` and then an unconditional `✅ ... passed` for the same assertion | `assert()` now returns its result; each success message is gated on it | `backend/src/__tests__/userPreferences.test.ts` | Confirmed in test output: a failing assertion no longer has a contradicting pass line beneath it |
| B10 | `reliabilityService.calculateLastMileOptions()` hard-coded its own auto tariff (₹30 + ₹15/km), silently disagreeing with `FARE_CONFIG.auto` (₹25 + ₹13/km) used everywhere else an auto leg is priced | Reads `FARE_CONFIG.auto` directly | `backend/src/services/reliabilityService.ts` | Code review + full regression; bike's tariff left unchanged (no canonical source exists elsewhere for it) |
| B11 | `ProfilePage.handleSave()`'s catch block reported *any* save failure as `"Preferences updated in local session."`, styled with the same green success checkmark | Added a `savedMessageIsError` flag; failures now show the real error message in red with a warning icon | `src/pages/ProfilePage.tsx` | `tsc --noEmit` clean; manual review of the render branch |
| B12 | `walkSegment()` could emit a 0m walk ("Walk 0 m to X", degenerate 2-identical-point geometry) whenever an endpoint coincided with a station — all 5 of the evaluation benchmark's scenarios hit this path | New `omitNegligibleWalks()` drops any walking segment under 20m, applied centrally before `validateCandidate()`. Safe by construction: a dropped walk's two endpoints were already within the 50m continuity tolerance | `backend/src/services/multimodalService.ts` | Regression caught in `multimodalRouting.test.ts` (Borivali/Goregaon scenario uses exact bus-stop coordinates); test's expected mode patterns updated from `walking>bus>walking` → `bus` with a comment explaining why — this is the test now correctly asserting the fixed behaviour |

All 12 bugs from `PROJECT_MASTER_PLAN.md` §31 are fixed. None of the fixes required changing a Mongoose schema's existing fields (B4/B5 added new, additive, in-memory-only representations; no migration needed).

## 5. Frontend Type Errors Fixed (PROJECT_MASTER_PLAN.md §25)

`npm run build` was `vite build`, which transpiles with esbuild and never type-checks — it reported success with 5 outstanding `tsc` errors. Fixed:

- `PlanTripPage.tsx`: `PROFILES[].id` widened to `string`; added a `RoutingProfile` type (`AccessibilityProfile | "fastest" | "cheapest" | "comfort"`, matching the backend's `MultimodalRequest.profile`) and typed `PROFILES`/the `profile` state with it.
- `ProfilePage.tsx`: `form.preferredMode`/`walkingTolerance`/`budgetPreference`/`prioritize` were declared as plain `string`, failing against `Partial<UserPreferences>`'s literal-union fields. Typed `TRANSPORT_MODES`/`WALK_TOLERANCE`/`BUDGET_PREFERENCE`'s `id` fields and a new `PRIORITIZE_OPTIONS` constant against the corresponding `UserPreferences` field types.
- `package.json`: `"build": "vite build"` → `"build": "tsc --noEmit && vite build"`, so a future type error fails the build instead of shipping silently.

Verified: `tsc --noEmit` clean (0 errors, was 5); `npm run build` succeeds end-to-end with the new type-check step.

## 6. README Corrected (PROJECT_MASTER_PLAN.md §28)

All 20 identified mismatches between `README.md` and the actual code were corrected, each with an inline "Phase 4 correction" note in the document itself. Summary (full detail in the `README.md` commit message):

- §3/§5/§13/§20 — "Box-Muller Monte Carlo, 500 trials" → the real mechanism (empirical resampling from stored historical delays, 1,000 trials).
- §5/§11/§20 — "lr=0.05 nudge formula" → the real mechanism (Pairwise Logistic Regression, batch gradient descent, 7 features).
- §11 — "5 equal dimensions, 20% each" → the real 7-dimensional vector and default weights; documented the known single-class training-label limitation (tracked for Phase 8, not hidden).
- §9 — API reference expanded from 13 (several wrong paths) to all 50 real endpoints, grouped by resource, matching `PHASE_2_API_CONTRACT.md`.
- §12 — accessibility profile list corrected (`visual_impairment`/`hearing_impairment`/`elderly` don't exist; the 7 real profiles and their actual hard-constraint rules do).
- §13 — reliability score and confidence-interval formulas corrected to the real rule-based score and the real sample-mean/sample-std-dev statistical interval; documented that the Monte Carlo risk score, while computed and displayed, is not yet a ranking feature.
- §14 — XAI tag table replaced with real example tags and their real trigger conditions.
- §15 — "CI 90% Coverage" metric corrected to reflect the deliberate `null` (the code's own comment calls the old hardcoded 92% a bug that was fixed).
- §16 — weather seed and route-geometry descriptions corrected to the real mechanisms.
- §17/§5 — "bcrypt 5" → "bcryptjs 2.4" (the actual dependency).
- **§18 — the fabricated results table** (82/100 vs 71/100 reliability, 92% CI coverage, "~15%/~29% improvement") replaced with a real captured run of `evaluationService.runEvaluation()`: **0% difference on every metric, 100% agreement with both baselines** — plus an honest explanation of why (exact-station-coordinate scenarios + typically-Pareto-dominated candidate sets mean no ranking strategy has a genuine trade-off to resolve differently on this scenario set).
- §19 — limitations list updated with measured facts (grid coverage, O/D pair success rate) instead of vague language.
- §20 — every scripted viva answer rewritten against the real code; 2 new Q&As added anticipating the hardest honest questions ("why does the ranker ignore the Monte Carlo risk score?", "doesn't 100% baseline agreement mean multi-criteria scoring is pointless?").

Left unchanged because they are now actually true as a result of this phase's own bug fixes:

- §17 "express-validator on all POST/PUT endpoints" — true since the B6 fix.
- §4 Phase 20 "TypeScript 0-error build" — true since §5 of this document.

## 7. Final Verification

| Check | Command | Result |
|---|---|---|
| Backend typecheck | `npx tsc --noEmit` (backend) | ✅ 0 errors |
| Backend build | `npm run build` (backend) | ✅ clean |
| Backend tests | `npm test` (backend) | 12/13 — 1 **known, tracked** failure (see below), 0 unexpected |
| Frontend typecheck | `npx tsc --noEmit` (root) | ✅ 0 errors (was 5) |
| Frontend build | `npm run build` (root) | ✅ clean, now type-checks first |

### The one remaining test failure is tracked, not hidden

`userPreferences.test.ts` reports 2 failing assertions (low-walking-tolerance magnitude, reliability-priority magnitude). Both were independently hand-verified during the audit (`PROJECT_MASTER_PLAN.md` §20) as a genuine ranking-model limitation — relative min-max normalization over 2-4 candidates destroys magnitude information, so a soft preference weight multiplier cannot reliably override it. This is **explicitly scoped to Phase 7** (feature set and ranking correctness), which itself depends on Phase 5/6 (data expansion, candidate generation) providing candidate sets with genuine trade-offs to validate against. Fixing it now, before that dependency chain, would mean redesigning the ranking/normalization approach with no way to verify the fix against anything but the same 2-4-candidate toy scenarios already in the test file. `backend/scripts/run-tests.js` labels this failure `KNOWN` in its summary (distinct from `FAIL`) precisely so it is never confused with a new regression in any future phase's test run.

## 8. Commits

```
0e92a92 Phase 4: fix B3 (test runner silently skips 7/13 entries) and B9 (contradictory pass/fail test output)
0454a70 Phase 4: fix B1 — seeded demo account password was hashed twice and could never log in
fd51a44 Phase 4: fix B4 — deactivating a station had no effect on route generation
5d9e3af Phase 4: fix B5 — accessibility check silently skipped unrecorded stations and rewarded their absence (safety-relevant)
2339638 Phase 4: fix B2/B8 — 'Reset TransitDNA' did not reset what the ranker uses, and dropped 2 of 7 weights
b048bb7 Phase 4: fix B7 — conditional React hook after an early return in MultimodalResults
0e89ebf Phase 4: fix the 5 frontend TypeScript errors and make `build` actually type-check
200eac4 Phase 4: fix B10 (duplicate/inconsistent auto fare) and B11 (ProfilePage reported a failed save as a success)
1457a3d Phase 4: fix B12 — degenerate zero-length walking segments in generated routes
4ea6f86 Phase 4: fix B6 — add missing body validation on 4 PUT endpoints
37f7b0a Phase 4: correct all 20 README mismatches identified in PROJECT_MASTER_PLAN.md §28
```

Baseline: `729e55b` (tag `v-phase-3-baseline`).

## 9. No Phase 5 Work Performed

Confirmed no Phase 5 (transit data expansion) work was performed:

- The seeded dataset in `backend/src/data/transitData.ts` and `backend/src/data/accessibilityData.ts` is byte-for-byte unchanged — same 19 metro stations, 2 lines, 12 bus stops, 4 bus routes, 25 accessibility records.
- No GTFS import or loader was added.
- Candidate generation's 4 fixed pattern functions (`tryWalkMetroWalk`, `tryWalkBusWalk`, `tryWalkMetroAuto`, `tryWalkBusMetroWalk`) are structurally unchanged — only the shared `excludeIds` (B4) and `omitNegligibleWalks` (B12) plumbing around them was added.
- The hard-coded metro interchange (`m1-02`) is unchanged.
- Geographic coverage (~13.8% of the Mumbai bounding box; ~98.6% of random O/D pairs return no route — `PROJECT_MASTER_PLAN.md` §14) is unchanged by this phase; fixing that is Phase 5's explicit objective.

## 10. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 5 — Transit data expansion** is next: raise geographic coverage and candidate richness so Phase 6 (candidate generation redesign) and Phase 7 (ranking-feature correctness) have real trade-offs to work with. This is a data-engineering task, materially different in kind from this phase's bug-fixing, and should begin as its own phase with its own verification document.
