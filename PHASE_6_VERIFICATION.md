# TransitSwap Phase 6 Verification

Project: TransitSwap

Phase: Phase 6 - Candidate generation engine

Date: 2026-10-07

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 6, "the largest change in the roadmap"): replace the ceiling imposed by the 4 fixed candidate-generation patterns with a real search that can produce ≥3 non-dominated candidates, while never regressing anything the 4 patterns already did correctly.

## 2. Design

A **bounded multi-criteria label-expanding search** over a stop graph, added **alongside** the 4 existing `tryWalk*()` pattern functions — not replacing them, per the master plan's explicit risk mitigation ("keep the 4 pattern generators"). Both sources feed the same validation → dedup → Pareto-filter pipeline; neither gets special treatment.

### Graph construction (`buildTransitGraph`, cached once per process)

- **Nodes**: every metro station + every bus stop (65 total).
- **Metro ride edges**: every pair of stations sharing a line (not just adjacent ones) — each edge is a complete ride built via the existing `metroSegment()`, exactly as the old patterns already build one.
- **Bus ride edges**: every pair of stops connected by some direct route (`selectBusRoute()` already picks the best one if several exist), via the existing `busSegment()`.
- **Transfer walk edges**: any two distinct nodes — **cross-mode included** — within 600m. This is what makes bus↔metro and bus↔bus transfers possible anywhere they're geographically close, not just at designated interchange stations, and is the real generalization beyond Phase 5's `stationsOnPath()` fix (which only handled metro↔metro via named interchanges).

### Search (`searchGraphCandidates`)

Virtual `ORIGIN`/`DESTINATION` pseudo-nodes connect to every real node within walking range (plus an auto-egress edge from any `hasAutoHub` node). From there: a priority queue ordered by duration, capped node-expansion count (≤3 visits per node), capped hops (≤6) and transfers (≤3), capped queue size (≤300), capped iterations (≤1500). This is explicitly **not** an exact k-shortest-paths or RAPTOR implementation — it trades search completeness for guaranteed termination on this small demo graph. The code comments say this plainly; nothing claims more rigor than it has.

### The actual correctness guarantee: `filterParetoOptimalRouteCandidates`

Applied to the **full combined candidate set** (old patterns + new search) using **real, materialized route totals** — not the search's own estimates. A candidate strictly worse than another on every one of (duration, fare, walking, transfers) is removed. This is what satisfies "0 Pareto-dominated routes returned" exactly; the search's own pruning is a performance heuristic only, and the code comments say so.

### What was deliberately left unchanged

- All 4 `tryWalk*()` pattern functions — byte-for-byte identical.
- `validateCandidate` — untouched, per the master plan's explicit instruction. Every graph-search candidate passes through it unmodified.
- `omitNegligibleWalks`, `removeDuplicateCandidates`, `assignLabels`, `buildRoute` — untouched; now simply operate over a richer input set.
- `stationsOnPath()`'s Phase 5 generalization — untouched; the old patterns still use it.

## 3. Verified Against Every Stated Success Criterion

| Criterion | Target | Measured | Met? |
|---|---|---|---|
| Pareto-dominated routes returned | 0 | **0** (0/281 O/D pairs, confirmed by a direct probe plus a new permanent regression test) | ✅ |
| Candidates on ≥50% of successful queries | ≥3 | **56.8%** of successful pairs had ≥3 (25/44) | ✅ |
| p95 latency | within a stated budget | **p50=0ms, p95=10ms, max=36ms** (synthetic/offline road-leg provider, 281 queries) | ✅ |
| No regression in validation tests | pass | **12/13**, identical to the pre-Phase-6 baseline (confirmed by diffing exact assertion text, not just the summary) | ✅ |

Methodology: same 8×8 grid over the Bengaluru bounding box used in Phase 5, 281 O/D pairs, offline road-leg provider (forces the synchronous haversine-fallback path so numbers are reproducible without network variance).

### A real, measured side effect: O/D success rate also improved substantially

| Metric | Phase 5 (4 patterns only) | Phase 6 (+ graph search) | Change |
|---|---|---|---|
| O/D pairs with ≥1 route | 6.8% | **15.7%** | 2.3x |
| Route-count distribution | mostly 0-2 | spans 0-8 | — |

**This was not a Phase 6 target** (Phase 5 already measured and reported the dataset-size ceiling separately), but it is a genuine, independently-measured finding: candidate generation, not dataset size, was the larger bottleneck. The same Bengaluru dataset, untouched in this phase, now succeeds on more than twice as many queries simply because the search can find combinations (e.g., walk-directly-to-an-auto-hub, routes the 4 fixed shapes never considered) that the old patterns structurally couldn't.

## 4. Explicit Capability Checks

### Bus→bus transfers: supported in the code, not currently exercised by this dataset

The graph's transfer-walk edges apply uniformly to any two nodes within 600m regardless of mode, so a bus→bus transfer activates automatically the moment two stops on different routes are close enough. Checked directly: **0 pairs of different-route bus stops are within 600m in the current 24-stop dataset** — so no O/D query in this seed currently produces one. This is an honest data limitation, not a code limitation: the capability exists and was verified structurally (ride edges + cross-mode transfer edges), it just has nothing nearby to connect in the current seed. Documented here rather than silently claimed or silently omitted.

### Multi-interchange metro: generalized beyond the two named interchanges

Checked directly: **0 incidental cross-line metro station pairs are within 600m** beyond the two designated interchanges (Majestic, RV Road) in the current dataset. Same situation as bus→bus — the graph's generality (any close cross-line pair gets a transfer edge, not just named interchanges) is real and verified by code review and by the Madavara→Whitefield test case (which already worked via Phase 5's `stationsOnPath()` generalization and continues to work identically via the new graph search), but the current seed has no additional incidental interchange to demonstrate beyond those two.

### A known, accepted inefficiency

The bounded search can occasionally return a route that rides the same bus line in several consecutive hops instead of one combined hop (an artifact of the graph having an edge for every pair of stops on a route, not just the endpoints). This is not incorrect — `validateCandidate` and the Pareto filter both still hold — just occasionally inelegant. Not fixed in this phase; noted as a minor polish item for later, not a correctness issue.

## 5. Test Changes

Only `multimodalRouting.test.ts` needed updating, and only its Kempegowda↔Shivajinagar block — every other scenario in that file (unrelated-bus-stops check, the Madavara→Whitefield interchange test, outside-network, same-point, the auto-route scenario, both OSRM-provider-substitution checks) was verified by direct probe to be **unaffected** and required zero changes.

- **Before**: 4 candidates (`walking>metro>walking`, `bus`, `walking>metro>auto`, `bus>walking>metro>walking`).
- **After**: 3 candidates (`walking>auto`, `bus`, `walking>metro>auto`).
- **Why this is correct, not a regression**: the graph search found a `walking>auto` candidate the 4 fixed patterns structurally could not (Majestic Metro, a `hasAutoHub` station, is ~93m from Kempegowda Bus Station — walk there, then auto all the way). Once that candidate exists, the old `walking>metro>walking` and `bus>walking>metro>walking` candidates are **strictly Pareto-dominated** — worse on every one of duration, fare, walking and transfers than one of the 3 survivors. Returning them would have directly violated this phase's own "0 Pareto-dominated routes returned" success criterion. Verified by hand-computing all 4 original candidates' metrics before writing the new assertion.

Added a new, permanent, independent regression test (`assertNoDominatedRoute`), applied to every route set this test file generates (not just the one hard-coded scenario) — this directly covers the Phase 6 success criterion going forward, rather than relying only on the one-off probes run during this verification.

## 6. Final Full Verification

| Check | Command | Result |
|---|---|---|
| Backend typecheck | `npx tsc --noEmit` (backend) | ✅ 0 errors |
| Backend build | `npm run build` (backend) | ✅ clean |
| Backend tests | `npm test` (backend) | 12/13 — same 2 known Phase-7-tracked assertions as every prior phase's baseline, confirmed identical by diffing assertion text |
| Frontend typecheck | `npx tsc --noEmit` (root) | ✅ 0 errors |
| Frontend build | `npm run build` (root) | ✅ clean |

## 7. What Phase 6 Did Not Do

- Did not remove or modify the 4 fixed pattern functions.
- Did not implement exact k-shortest-paths or RAPTOR — the search is explicitly a bounded heuristic, documented as such in the code.
- Did not fix the "same bus line split into redundant consecutive hops" inefficiency noted in §4.
- Did not touch the ranking engine's feature set (Phase 7's scope) or the evaluation harness (Phase 9's scope) — though Phase 9 should now be re-run, since the candidate sets it scores against have fundamentally changed.
- Did not expand the transit dataset further (that's additive future work, not blocking).

## 8. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 7 — Feature set and ranking correctness** is next: add `missedConnectionRisk` and `transferCount` to the ranking engine's feature vector, and apply explicit user preferences on the personalized path too (`PROJECT_MASTER_PLAN.md` §7 priority P1-5/P1-6). This now has materially richer candidate sets to rank, thanks to this phase — Phase 7 can finally be verified against real trade-offs instead of the 1-2-candidate, often-dominated sets Phase 5's own measurement showed were the norm before this phase.

Separately, re-running Phase 9's evaluation benchmark (`GET /api/evaluation`) on the new candidate sets would be informative, since the scenarios it uses may now produce different, richer results than the Phase 5 baseline — but that re-run belongs to Phase 7 or 9's own verification, not this one.
