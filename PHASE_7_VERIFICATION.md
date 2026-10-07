# TransitSwap Phase 7 Verification

Project: TransitSwap

Phase: Phase 7 - Feature set and ranking correctness

Date: 2026-10-07

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 7): make the ranker see everything the system computes, and make preferences work on every path. Specifically: extend the feature vector to 9 dimensions (add `missedConnectionRisk` and `transferCount`), decide explicitly whether `sustainability` is a ranking feature or a display metric, apply `getPreferenceAdjustedWeights` on the personalized path, and address the magnitude-blindness bug the master plan called out by name: *"a 95%-risk / 4-transfer route outranks a 5%-risk / 0-transfer route even when the user prioritises reliability."*

## 2. Root Cause, Confirmed Before Writing Any Code

Ran `userPreferences.test.ts` in isolation (not just the aggregate summary) to see exactly why its 2 tracked failures failed:

- **Walking-tolerance magnitude**: a 250m/35min route vs a 1200m/30min route, with `walkingTolerance: "low"`. The route generator's relative min-max normalization gave the 5-minute time difference a full 0→1 swing — identical in magnitude to the 950m walking difference — so the `speed` priority's time-weight boost outvoted the `low` walking-tolerance's walking-weight boost, even though a 5-minute gap is not a large real-world difference.
- **Reliability-priority magnitude**: a 92-score/5%-risk/1-transfer route vs a 65-score/45%-risk/2-transfer route that was only 3 minutes faster. Same mechanism: the 3-minute gap got the full 0→1 swing, and risk/transfers weren't in the feature vector at all, so the faster-but-riskier route won even under `prioritize: "reliability"`.

Both are exactly the magnitude-blindness bug the master plan named. The fix needed two independent parts, not one: (a) stop letting small absolute gaps consume the entire normalized range, and (b) actually give the ranker the risk/transfer signals it was missing.

## 3. Implementation

### 3a. Normalization floor (`featureExtractor.ts`)

Added a documented floor to the relative min-max normalization for `time`, `cost`, and `walking`: each now normalizes against `max(actual_spread, floor)` instead of always `actual_spread`. Floors: 10 minutes, ₹20, 500m. When the real spread between candidates is at or above the floor, behavior is **byte-identical** to Phase 4-6 (verified — every test scenario with a large spread, e.g. the Speed-priority test's 20-minute gap, produces the same ranking as before). Only degenerate small-spread cases are dampened, which is exactly the bug.

### 3b. Extended feature vector: 7 → 9 dimensions (`featureExtractor.ts`)

Added:
- **`connectionRisk`** = `1 − missedConnectionRisk.overallRiskPercent / 100`. Deliberately **not** relative min-max normalized — like `reliability`, it's already an absolute, real-world-calibrated 0-100 scale, so treating it as relative would reintroduce the exact magnitude-blindness bug this phase is fixing. Missing data defaults to 20% (neutral-ish), not 0% — consistent with the Phase 4 B5 lesson that unrecorded signals must never be silently rewarded as optimal.
- **`transfers`** = relative min-max on `transferCount`, same floor/assumed-max pattern as walking (floor 1 transfer, assumed max 4).

`FEATURE_NAMES`, `featureArray`, `RouteFeatureVector.features` all extended in the same order everywhere: `[time, cost, walking, reliability, accessibility, crowd, weather, connectionRisk, transfers]`.

### 3c. Weight vectors extended everywhere (9 fields, consistently ordered)

- `LogisticModelWeights` (`logisticRegression.ts`) — interface, default `initialWeights` array, `getWeightsObject()`, `setWeights()`.
- `LearnedWeights` (`transitDnaService.ts`) — `connectionRisk`/`transfers` added optional, same pattern already used for `crowd`/`weather`.
- `DEFAULT_WEIGHTS` in both `transitDnaService.ts` and `mlPreferenceService.ts`.
- `getProfileWeights()` — every one of the 10 profiles given explicit `connectionRisk`/`transfers` values: higher transfer-weight for profiles where transfer effort matters physically (senior, pregnant, luggage, reduced_mobility: 0.15), lower for profiles indifferent to it (fastest, cheapest, wheelchair: 0.05).
- `transitDnaService.scoreRoute()` and `mlPreferenceService.rankRoutes()` — both linear-sum formulas extended with the 2 new terms.
- `getPreferenceAdjustedWeights()` — `prioritize: "reliability"` now boosts `connectionRisk` by the same 1.5× it already applies to `reliability`, since both describe "will I actually get there as expected."

### 3d. Personalized-path preference bug fixed (P1-6, `mlPreferenceService.getModelStatus`)

**This was the actual bug, confirmed by reading the code, not assumed from the plan's description.** `getModelStatus()` called `getPreferenceAdjustedWeights()` on the non-personalized baseline branch, but returned `stored.weights` **untouched** on the personalized branch (`stored.isPersonalized && stored.sampleCount >= 5`). Once a user's model personalized, every explicit preference they'd set (`prioritize`, `walkingTolerance`, `budgetPreference`) was silently dropped from ranking and from the single-route scoring path in `multimodalController.ts` (which reads from the same `getModelStatus()` call). Fixed by calling `getPreferenceAdjustedWeights(stored.weights, preferences)` on the personalized branch too — now both branches apply preferences identically.

### 3e. Sustainability: explicit decision, documented (not changed)

Per the master plan's instruction to *"decide explicitly whether sustainability is a ranking feature or a display metric and document it"*: **kept as a display-only metric**, not added to the 9-feature ranking vector. Reasoning: `sustainabilityScore` is already documented in `types/intelligence.ts` as "relative (0-100), NOT a real emissions estimate" — it's a derived comparison label for the explanation UI, not an independently measured route attribute with its own real-world unit (unlike risk% or transfer count). Promoting it to a ranking feature would require first defining what it actually measures in absolute terms, which is out of this phase's scope. No code change; this paragraph is the record of the decision.

### 3f. Data migration (`PreferencePair.ts`, `UserPreferenceModel.ts`, `User.ts`)

Per the master plan: *"existing `deltaX` rows are 7-D — version the schema and retrain, or pad with a documented migration."* Chose the pad-not-destroy path, with no destructive migration needed:
- `PairwiseLogisticRegression.dot()` already treated `deltaX[idx] ?? 0` for any missing index (now documented there explicitly) — a legacy 7-D row scored against today's 9-D weights simply contributes 0 gradient to the 2 new dimensions instead of crashing or needing a backfill.
- `featureMapSchema` (chosen/rejected features), `UserPreferenceModel.weights`, and `User.transitDNA.learnedWeights` all gained `connectionRisk`/`transfers` fields using the exact same "optional-with-default" pattern the codebase already used for `crowd`/`weather` (added in an earlier phase for the same reason) — pre-Phase-7 documents hydrate and validate with no migration script required.
- `authService.resetTransitDna()`'s literal baseline weights and `mlEvaluationService.MLEvaluationReport`'s type both updated to stay consistent; the synthetic 7-D benchmark dataset in `mlEvaluationService.generateSyntheticPreferenceDataset()` was deliberately **not** rebuilt — that is explicitly Phase 8's scope ("rebuild the synthetic benchmark"), not Phase 7's.

## 4. Verified Against Every Stated Success Criterion

| Criterion | Target | Measured | Met? |
|---|---|---|---|
| All test files green, including the 2 previously-tracked failures | 13/13 (the plan's text says 14/14, written before this project's actual file count of 13 was known; graded against the real current suite) | **13/13**, confirmed by isolated run of `userPreferences.test.ts` (8/8, not a `KNOWN`-masked pass) | ✅ |
| Dominance violations | 0 | **0** across the new 5-scenario property test (Test 10) covering every one of the 5 route-level metrics in turn | ✅ |
| Risk and transfers demonstrably affect order | required | **Confirmed by direct probe with no preference boost active**: identical duration/fare/walking, only risk (5% vs 70%) and transfers (0 vs 3) differ → low-risk/few-transfer route scores 77 vs 65, a 12-point swing from these 2 features alone | ✅ |

### Real measured scores (not hand-derived) for the 2 previously-failing scenarios

| Scenario | Route | transitDnaScore before fix | transitDnaScore now |
|---|---|---|---|
| Walking tolerance LOW (250m/35min vs 1200m/30min) | shortwalk / longwalk | longwalk ranked first (bug) | **shortwalk: 77, longwalk: 69** — shortwalk now correctly first |
| Priority = reliability (92-score/5%-risk/1-transfer, 3min slower vs 65-score/45%-risk/2-transfer, 3min faster) | reliable / risky | risky ranked first (bug) | **reliable: 84, risky: 70** — reliable now correctly first |

("before fix" column is the test assertion failure itself — both scenarios are `userPreferences.test.ts` Tests 3 and 5, which failed prior to this phase and pass now; see `PHASE_6_VERIFICATION.md`'s carried-forward `KNOWN` tracking and the `12/13` baseline every prior phase measured against.)

## 5. New Tests Added

Added to `userPreferences.test.ts` (now 10 tests, up from 8):

- **Test 9 — Risk & transfers measurably change order**: 2 routes, identical on every dimension except `missedConnectionRisk` (5% vs 70%) and `transferCount` (0 vs 3), ranked under a `speed`-priority preference that does **not** boost either signal — isolating the raw 9-feature vector's own effect from any preference-weight boosting. Confirms the master plan's explicit testing requirement.
- **Test 10 — Pareto-dominance property check**: 5 hand-built scenarios, each varying exactly one of (time, cost, walking, transfers, reliability+risk together) while holding every other dimension equal, each paired with the preference profile most likely to stress-test that exact dimension. Asserts the strictly-better route is ranked first in all 5. This directly operationalizes the master plan's "a Pareto-dominated route is never ranked first" property-test requirement at the ranking-score level (distinct from `multimodalRouting.test.ts`'s `assertNoDominatedRoute`, which checks the same property at the candidate-generation/Pareto-filter level from Phase 6 — the two are complementary, not duplicates).

No existing test's assertions needed to change — every previously-passing test (`ml.test.ts`'s 7-D synthetic training data, `preferenceEndToEnd.test.ts`'s single-route scoring, `multimodalRouting.test.ts`'s Pareto-filter checks) was verified unaffected, because `PairwiseLogisticRegression.dot()`'s existing `?? 0` handling absorbs the extra 2 dimensions safely, and the normalization floor only changes behavior when the real spread is smaller than the floor.

## 6. Final Full Verification

| Check | Command | Result |
|---|---|---|
| Backend typecheck | `npx tsc --noEmit` (backend) | ✅ 0 errors |
| Backend build | `npm run build` (backend) | ✅ clean |
| Backend tests | `node scripts/run-tests.js` (backend) | **13/13** — 0 known failures remaining |
| `userPreferences.test.ts` isolated | `npx tsx src/__tests__/userPreferences.test.ts` | **10/10**, confirmed not masked by file-level `KNOWN` labeling |
| Frontend typecheck | `npx tsc --noEmit` (root) | ✅ 0 errors |
| Frontend build | `npm run build` (root) | ✅ clean |

## 7. What Phase 7 Did Not Do

- Did not rebuild `mlEvaluationService.generateSyntheticPreferenceDataset()`'s 7-D synthetic archetypes, and did not fix the single-class-label / unshuffled-split issues in `trainUserModel()` — both explicitly Phase 8 ("ML validity") scope.
- Did not re-run Phase 9's evaluation benchmark against the richer ranking — Phase 9 is its own phase, already deferred there by Phase 6.
- Did not change `sustainabilityScore`'s role or definition — decided and documented as display-only (§3e), not promoted to a ranking feature.
- Did not touch candidate generation (`multimodalService.ts`, Phase 6's scope) — this phase only changes how already-generated candidates are scored and ordered.
- Did not add a renormalization step to force weight sums to exactly 1.0 — the codebase's existing weight tables (e.g. `DEFAULT_WEIGHTS` summing to 1.20 before this phase) were never strictly normalized either; adding 2 more features without forcing a renormalization is consistent with that pre-existing informal convention, not a regression from it.

## 8. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 8 — ML validity** is next: store both `{chosen − rejected, 1}` and `{rejected − chosen, 0}` for every pairwise sample (currently only the chosen-preferred direction is stored, producing single-class training data), shuffle before the 80/20 split, rebuild the synthetic benchmark with two-class varied samples, and report accuracy only on the held-out set. This now has a correct 9-feature ranking signal to validate against, rather than the 7-feature, magnitude-blind one Phase 7 fixed.

