# TransitSwap Phase 14 Verification

Project: TransitSwap

Phase: Phase 14 - Documentation & Paper

Date: 2026-10-09

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 14): a complete, accurate written record — final README, ADRs for the four major design decisions, a research paper (problem, related work, method, evaluation, limitations, future work) with the 9 figures from §35, and `PHASE_4`–`PHASE_13` verification documents per phase. Success criteria: every number in the paper traceable to a command; the limitations section covers every item in §33; no claim unsupported by code.

## 2. Implementation

### 2a. Reproducible data generation (the "command" every number traces to)

`backend/scripts/generate-paper-data.ts` computes real data for 8 of the paper's 9 figures directly from production services — no business logic is reimplemented, no number is hand-typed:

| Figure | Source computation |
|---|---|
| Fig 2 (pipeline latency) | `performance.now()` timing of 4 real pipeline stages for one evaluation scenario |
| Fig 3 (coverage map) | 40×40 grid over the real station/stop coordinate extent, tested against `MAX_WALK_TO_METRO_M`/`MAX_WALK_TO_BUS_M` |
| Fig 4 (Pareto scatter) | `enrichScenarioRoutes()` over all 22 evaluation scenarios, richest candidate set kept |
| Fig 5 (ablation) | `evaluationService.runEvaluation()`, called directly, unmodified |
| Fig 6 (calibration curve) | `historicalReliabilityService.generateSyntheticJourneyObservations()`, 80/20 chronological split, 7 standard z-critical values (0.674–2.576, textbook values, not fitted) |
| Fig 7 (learning curve) | `mlEvaluationService.generateSyntheticPreferenceDataset()` + the real `stratifiedSplit()`, fresh `PairwiseLogisticRegression` instances trained on increasing prefixes of one fixed training set, evaluated on one fixed held-out test set |
| Fig 9 (explanation card) | `transitDnaService.generateWhyRecommended()` on the same richest-candidate scenario as Fig 4 |

An offline, haversine-based `RoadLegProvider` is installed via the existing `setMultimodalRoadLegProviderForTesting()` test seam (the same pattern already used by `multimodalRouting.test.ts`/`evaluationHarness.test.ts`) so Figures 2–5, 7 and 9 are fully network-independent and reproducible byte-for-byte on a re-run.

**Figure 8 (sensitivity tornado)** is the one figure computed separately, by `backend/scripts/sensitivity-sweep.ts` — a real, already-tested Phase 9 script, run unmodified, deliberately *against live OSRM* rather than the offline fallback (to measure genuine routing sensitivity, not an artifact of the offline approximation). Its output was merged into the same `data.json` the other 8 figures come from.

`backend/scripts/generate-paper-figures.js` performs no computation — it only renders each figure's already-computed numbers to hand-authored SVG, from the single canonical `docs/paper/data.json` input.

### 2b. Figures

All 9 SVGs generated to `docs/paper/figures/`. 4 (`fig1`, `fig3`, `fig6`, `fig8`) were visually confirmed rendering correctly via the Browser pane. The remaining 5 (`fig2`, `fig4`, `fig5`, `fig7`, `fig9`) were confirmed by direct source inspection — coordinates, bar widths, and path points were checked by hand against the underlying `data.json` values and found internally consistent (e.g. Figure 2's four stage times sum to its stated total; Figure 5's bar widths are proportional to its stated percentages, sorted descending; Figure 7's `<path>` points and `<circle>` centers share identical coordinates). `fig4-pareto-scatter.svg` was additionally re-verified visually in this session after an earlier transient Browser-pane screenshot timeout, and renders correctly.

### 2c. Paper

`docs/paper/paper.md` — Abstract, Problem Statement, Related Work (RAPTOR/CSA, multi-criteria and accessible routing, learning-to-rank, calibration — per the master plan's own §39 citation guidance), Method (§3.1–3.8, one subsection per major subsystem, each citing the specific test file or script backing its claims), Evaluation (§4, the real 22-scenario baseline-agreement table), Limitations (§5), Future Work (§6), and a reproduction recipe (§7) naming the exact 3 commands that regenerate every figure from scratch.

### 2d. Architecture Decision Records

`docs/adr/001`–`004`: candidate generation (4 fixed patterns → graph search, Phase 6), the linear scorer for ranking, relative (min-max) normalisation of ranking features (including the real Phase 7 magnitude-blindness finding, stated as a known limitation rather than silently fixed), and DB-optional graceful degradation. Each follows a Context/Decision/Consequences structure and references the real code behaviour it documents.

### 2e. License

`LICENSE` — MIT, matching the project's existing "free to use" framing on the landing page. No license file existed previously.

### 2f. README

Added §26 (Paper, Architecture Decisions & License) pointing to the new paper, ADRs, and license, with a table-of-contents entry. Audited the rest of the document against current code during this phase (fabricated-number removal, Mumbai→Bengaluru migration, and `null`-coverage honesty gating were already correctly in place from Phase 4/9 — no further corrections were needed).

## 3. Testing

- `npx tsc --noEmit` — backend: clean. Frontend: clean. (The new generator scripts live under `backend/scripts/`, outside `backend/src/`'s `tsconfig` root, so they do not affect either package's main typecheck — confirmed, not assumed.)
- Frontend suite (`npx vitest run`): **12/12 passed**, 3 test files.
- Backend suite (`node scripts/run-tests.js`, full run including all Phase 1–13 test files): all suites passed, including the Phase 9 evaluation-harness tests (22 scenarios confirmed, no degenerate exact-coordinate scenarios, genuine baseline disagreement, all 6 ablation features present and well-formed) and the Phase 8 ML validity suite (11/11). Tests requiring `MONGODB_URI` honestly skip when no database is configured locally (the same documented, intentional behaviour as every prior phase) rather than silently passing.

## 4. Honest Accounting

- Figures 2, 4, 5, 7, and 9 were verified by direct inspection of their SVG source and underlying data rather than a second round of Browser-pane screenshots, after the pane intermittently timed out on screenshot capture for wide-aspect SVGs in this session (a pane-visibility/rendering-timing quirk, not a defect in the generated files) — `fig4` was subsequently re-captured successfully and matches the source-level verification exactly.
- Figure 6's calibration curve shows real under-coverage at low nominal confidence (43.8% empirical at 50% nominal) and saturation to 100% from 80% nominal upward — reported as a genuine limitation in both the paper (§5) and ADR context, not smoothed into a cleaner-looking claim.
- Figure 8's sensitivity sweep used live OSRM (not the offline fallback the other 8 figures use) specifically so the robustness finding (max 5% decision-change rate across 9 constants) reflects real routing behaviour, not an artifact of the deterministic test provider — stated explicitly in both the paper and this document.
- `backend/scripts/paper-data.json` and `backend/scripts/sensitivity-output.txt` were intermediate/scratch outputs of the generation process; the reviewed, canonical copy that the paper actually cites is the committed `docs/paper/data.json` (script header's own stated intent). The scratch copies were deleted rather than committed, to avoid two sources of truth for the same numbers.
- The paper's §4 evaluation table (95% agreement with shortest-time) is reported alongside an honest explanation of why it's high — most corridors in the current seeded dataset still have only 1-2 non-dominated candidates even after Phase 6's graph-search upgrade — rather than presented without context as if it undermined the ranker (the ablation study, §3.5, independently shows the ranker does have real, measurable leverage).

## 5. Success Criteria (per §39 Phase 14)

| Criterion | Status |
|---|---|
| Every number in the paper traceable to a command | ✅ `backend/scripts/generate-paper-data.ts` (8 figures) + `backend/scripts/sensitivity-sweep.ts` (1 figure, Phase 9, run unmodified); reproduction steps in paper §7 |
| Limitations section covers all of §33 | ✅ synthetic/approximate network, partial geographic coverage, no cited fare source, no user study, rule-based (not calibrated) reliability score, imperfect calibration outside 80-95%, estimation-not-forecasting for crowd/weather, high baseline agreement explained honestly — each stated in paper §5 |
| No claim unsupported by code | ✅ every Method subsection (§3.1-3.8) names the specific service, test file, or script backing its claim |
| Final README | ✅ §26 added; full audit pass found no remaining inaccuracies |
| ADRs for the four major design decisions | ✅ `docs/adr/001`-`004` |
| `PHASE_4`-`PHASE_13` verification documents | ✅ already existed, confirmed present, no further action needed |

## 6. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 15 — Demo, presentation & viva** is next and final: a demo script using corridors that work, highlighting the wheelchair-accessibility hard-filter and an annotated explanation card, slides built from this phase's 9 figures, and rehearsed truthful answers to the five hard questions in §32. Needs no external accounts. Per the project's established one-phase-at-a-time procedure (§40), begin only once explicitly requested.
