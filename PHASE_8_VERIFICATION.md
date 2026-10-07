# TransitSwap Phase 8 Verification

Project: TransitSwap

Phase: Phase 8 - ML validity

Date: 2026-10-07

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 8): make the learning-to-rank model's reported numbers mean something. The plan names the exact defect: `recordRouteChoice` stored only `{chosen − rejected, label: 1}` for every real route choice — never the mirrored `{rejected − chosen, label: 0}` — so every stored sample had label 1. On a single-class dataset, a classifier that always predicts 1 scores 100% "accuracy" without having learned anything. The synthetic benchmark had the same single-class defect, plus an unshuffled, archetype-ordered 80/20 split.

## 2. Root Cause, Confirmed Before Writing Any Code

Read `recordRouteChoice` and `generateSyntheticPreferenceDataset` end to end before touching either:

- **`recordRouteChoice`** (`mlPreferenceService.ts`): for each alternative route, built exactly one document — `deltaX = chosenFeatures - rejectedFeatures`, `label: 1` — and inserted it. No code path anywhere ever produced a `label: 0` row. Every `PairwisePreference` document in the database was label 1 by construction.
- **`generateSyntheticPreferenceDataset`** (`mlEvaluationService.ts`): 3 archetypes × 20 exact, noise-free `deltaX` vectors, all `label: 1`, concatenated in archetype order (0-19 archetype 1, 20-39 archetype 2, 40-59 archetype 3). The 80/20 split was a positional slice (`samples.slice(0, 48)` / `samples.slice(48)`), so the 12-sample test set was **always** the tail of archetype 3 only — never a mix, and always label 1.
- Verified empirically (not just by reading code): a constant "always predict 1" classifier scores exactly 100% on the pre-Phase-8 dataset, identical to the reported `mlPairwiseAccuracyPercent`. The benchmark was measuring nothing.

## 3. Implementation

### 3a. Two-class labels (`mlPreferenceService.ts`)

Pulled the per-alternative document construction out of `recordRouteChoice` into a new, exported, DB-free pure function, **`buildPairwiseDocs()`**, so it is directly unit-testable without a MongoDB connection. For each alternative it now returns **two** documents:
- `{deltaX: chosen − rejected, label: 1}`
- `{deltaX: rejected − chosen, label: 0}` (the exact negation)

Both carry the same `chosenRouteId`/`rejectedRouteId`/`chosenFeatures`/`rejectedFeatures` — the ground truth of which route the user actually picked never changes; only the training-sample direction and label do. `recordRouteChoice` now calls `buildPairwiseDocs()` and inserts both; `pairsCreated` doubles accordingly (correctly — twice as many training rows are genuinely created).

### 3b. Unique index extended (`models/PreferencePair.ts`)

The existing uniqueness guard `(userId, chosenRouteId, rejectedRouteId, source)` would have treated the new mirror row as a duplicate of the original and silently dropped it. Extended to `(userId, chosenRouteId, rejectedRouteId, source, label)` — documented inline — so both labels for the same real choice coexist, while an actual duplicate retry (same tuple **and** same label) is still correctly rejected.

### 3c. Seeded shuffle before the real-user 80/20 split (`mlPreferenceService.trainUserModel`)

Samples are fetched sorted by `createdAt`, and Phase 8's mirrored label-1/label-0 pair for the same alternative is always inserted adjacently in the same batch — an unshuffled positional slice could systematically put both halves of a mirrored pair on the same side of the split, or put all the newest choices in the test set. Added `seededShuffle()` (new `ml/seededRandom.ts`, mulberry32 PRNG + Fisher-Yates) with a fixed documented seed (`TRAIN_TEST_SPLIT_SEED = 42`) before splitting — deterministic (same stored samples always produce the same split and the same reported accuracy on retrain) without being an unshuffled positional artifact.

### 3d. Synthetic benchmark rebuilt: noisy, two-class, stratified (`mlEvaluationService.ts`)

- **Noisy**: each archetype's base 9-D vector now gets independent seeded Gaussian noise (`seededGaussianNoise`, scale 0.3) per sample, instead of being repeated exactly 20 times.
- **Two-class**: every noisy sample is mirrored into its `{-deltaX, label: 0}` counterpart, exactly like real recorded choices now are — 120 total samples, **60 label:1 / 60 label:0, verified exactly balanced**.
- **Stratified split**: new exported `stratifiedSplit()` groups samples by `(archetype, label)`, seed-shuffles and 80/20-splits **within each group**, then concatenates and reshuffles — guaranteeing every archetype and both labels appear in both the train and test sets, rather than a positional slice that can starve the test set of whole archetypes.
- Extended to 9 dimensions (`connectionRisk`, `transfers` added to each archetype's base vector), consistent with Phase 7's feature vector.
- `evaluateBaselineAccuracy`'s fixed rule weights extended to the matching 9-element array.

### 3e. Dead code removed (`mlEvaluationService.ts`, `evaluationController.ts`)

Removed 5 unused imports (`PairwisePreference`, `extractRouteFeatures`, `multimodalService`, `reliabilityService`, `EnrichedRoute` — the master plan named 3; the file had grown 2 more since Phase 7's edits, all equally dead) and the dead `userSamplesCount` variable, which was computed from a `userId` parameter and then never read. `runMLEvaluation()` no longer takes a `userId` — it evaluates a synthetic benchmark, not any real user's data (that's `getMLStatus()`'s job) — and `evaluationController.getMLEvaluation` updated to match.

### 3f. "Report accuracy only on the held-out set"

`mlPairwiseAccuracyPercent` was already computed via `evaluateAccuracy(testSamples)` (held-out), not training accuracy — structurally correct already. What was wrong was the *data*: with a single-class, unstratified test set, "held-out accuracy" was a meaningless 100% regardless. Added an explicit code comment at the call site recording that `trainResult.pairwiseAccuracy` (the training-set fit) is deliberately not surfaced in the benchmark report, since a model's fit to its own training data says nothing about generalization.

### 3g. Data migration for pre-Phase-8 rows (`scripts/migrate-mirror-pairwise-preferences.ts`)

Per the master plan: *"existing single-class rows must be migrated (mirror them) or discarded with a note."* Chose mirroring. Wrote an idempotent, documented, standalone script (`npm run migrate:mirror-pairwise` from `backend/`) that finds every stored `label: 1` row lacking a `label: 0` mirror and inserts one. **Not run in this session** — this development environment has no `MONGODB_URI` configured (confirmed: the script's own guard prints "nothing to migrate" and exits cleanly when run), so there is no pre-existing stored data anywhere to migrate. Provided and documented for any real deployment that accumulated label-1-only rows before this phase.

## 4. Verified Against Every Stated Success Criterion

| Criterion | Target | Measured | Met? |
|---|---|---|---|
| Balanced labels | label:1 count = label:0 count | **60 / 60** (exact) in the 120-sample synthetic dataset | ✅ |
| Held-out accuracy strictly between 50% and 100% | 50% < x < 100% | **87.5%** (was a fake 100% before this phase) | ✅ |
| Weights recover a planted preference | the known-dominant feature wins | Trained on the cost-sensitive archetype's 40 samples alone, `cost` is the single highest-weighted feature (1.49, next-highest 1.03) | ✅ |
| Test split contains all archetypes | every archetype represented | **All 3** archetypes present in the stratified test set, verified by a dedicated test, not just by construction | ✅ |
| Constant classifier does not achieve 100% | < 100% | **50.0%** exactly (matches the label balance, as expected for a constant predictor on balanced data) | ✅ |
| Log-loss decreases over iterations | strictly decreasing | **0.6283 → 0.5243** (2 iterations vs 200, same data, same starting weights) | ✅ |

### An honest, unflattering finding — reported as the master plan requires

The master plan's own risk note for this phase: *"honest accuracy will be lower than the current fake 100% — that is the correct outcome and must be presented as such."* The measured result goes further than "lower" — on this seeded run, the trained model's held-out accuracy (**87.5%**) is actually **below** the fixed rule-based baseline's held-out accuracy (**91.7%**), an **accuracyImprovementPercent of −4.2%**. This is a real, reproducible measurement (seed 7, 96 train / 24 test samples), not a bug: a logistic regression model trained on 96 noisy synthetic samples drawn from 3 overlapping archetypes, and a hand-tuned rule baseline whose fixed weights already happen to resemble reasonable transit priorities, are genuinely close in quality on a dataset this small — and this run's test split happened to favor the baseline. Per the master plan's explicit instruction (and this project's established practice of reporting Phase 5's missed coverage targets and Phase 9's deferred re-benchmarking honestly rather than reframing them), **this is reported as measured, not adjusted or seed-shopped toward a flattering result.** The correct interpretation is not "the ML model is broken" but "a 9-feature pairwise logistic regression model has not yet been shown to beat a reasonable fixed baseline on this small amount of synthetic data" — a legitimate, bounded finding, not a claim this project makes anywhere else in its materials.

## 5. New Tests Added

New file `backend/src/__tests__/mlValidity.test.ts`, 11 assertions, directly operationalizing the master plan's Phase 8 testing bullet:

1. `buildPairwiseDocs()` returns exactly 2 documents per alternative.
2. Both `label: 0` and `label: 1` are present.
3. The `label: 0` document's `deltaX` is the exact negation of `label: 1`'s (a true mirror, not independently computed).
4. Both documents preserve the same ground-truth `chosenRouteId`/`rejectedRouteId`.
5. The synthetic dataset's labels are exactly balanced (60/60).
6. A constant classifier does not achieve 100% (measured: 50.0%).
7. The stratified test split contains every archetype.
8. The stratified split is a true partition (train + test = total, no loss or duplication).
9. The benchmark's held-out accuracy is strictly between 50% and 100%.
10. Trained weights recover cost as the dominant feature when trained on cost-sensitive-only data.
11. Log-loss strictly decreases between 2 and 200 training iterations.

Added to `backend/scripts/run-tests.js`'s entry list (now 14 entries, up from 13). No existing test needed to change: `ml.test.ts`'s hand-written 7-D training data still trains correctly (verified — `PairwiseLogisticRegression.dot()`'s existing `?? 0` handling for a deltaX shorter than the 9-D weight vector, same mechanism documented in Phase 7), and no test anywhere asserted on `mlEvaluationService`'s old single-class behavior or the removed `userId` parameter.

## 6. Final Full Verification

| Check | Command | Result |
|---|---|---|
| Backend typecheck | `npx tsc --noEmit` (backend) | ✅ 0 errors |
| Backend build | `npm run build` (backend) | ✅ clean |
| Backend tests | `node scripts/run-tests.js` (backend) | **14/14** — 0 known failures |
| `mlValidity.test.ts` isolated | `npx tsx src/__tests__/mlValidity.test.ts` | **11/11** |
| Migration script smoke test | `npx tsx scripts/migrate-mirror-pairwise-preferences.ts` | Runs cleanly, correctly reports "nothing to migrate" (no DB configured) |
| Frontend typecheck | `npx tsc --noEmit` (root) | ✅ 0 errors |
| Frontend build | `npm run build` (root) | ✅ clean |

## 7. What Phase 8 Did Not Do

- Did not re-run or change Phase 9's evaluation harness (`evaluationService.ts`, the `/api/evaluation` route-ranking benchmark) — that is a separate, already-deferred benchmark measuring route quality, not ML label validity. This phase only touched the **pairwise preference learning** benchmark (`mlEvaluationService.ts` / `/api/ml-evaluation`).
- Did not attempt to make the ML model beat the rule-based baseline — the measured −4.2% gap is reported as a genuine finding, not fixed by tuning hyperparameters or cherry-picking a seed toward a better-looking number.
- Did not run the migration script against real data — none exists in this environment to migrate.
- Did not change `transitDnaService.scoreRoute()` or `rankRoutes()`'s formulas — Phase 8 is about the *training data and evaluation* being valid, not the ranking formula itself (Phase 7's scope).

## 8. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 9 — Evaluation harness rebuild** is next: build a ≥20-scenario benchmark with genuine trade-offs using realistic addresses (not exact station coordinates), add least-walking/fewest-transfers/random baselines, add 7 ablation configurations, add a sensitivity sweep over the ~11 magic constants, report p50/p95 latency, and replace the deterministic `sin`/`cos` seed noise with properly sampled (seeded) randomness — the same seeded-randomness infrastructure (`ml/seededRandom.ts`) built in this phase can be reused there directly. This also finally re-runs the route-ranking benchmark (`evaluationService.ts`) against the Phase 6 candidate-generation engine and the Phase 7 ranking fixes, both of which have been waiting for their own re-evaluation since Phase 6.
