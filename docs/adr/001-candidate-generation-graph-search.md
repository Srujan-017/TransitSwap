# ADR-001: Replace fixed journey patterns with a round-based graph search

## Status
Accepted (Phase 6).

## Context
Through Phase 5, candidate generation was four hand-coded pattern functions: `walk→metro→walk`, `walk→bus→walk`, `walk→metro→auto`, and one four-leg combination. Each function independently queried the stop data, computed legs, and returned at most one candidate per pattern.

This had two problems. Structurally, it could never produce a bus-to-bus transfer, a route through two different metro lines via an interchange, or any path the four authors of those functions hadn't anticipated. For a multi-criteria ranker specifically, the deeper problem was that most real queries produced only one or two candidates, often with one dominating the other on every axis (faster, cheaper, less walking) — leaving the ranker nothing genuine to choose between. A ranker's output is only as interesting as its input candidate set's diversity.

## Decision
Replace the four fixed patterns with a bounded round-based search over a real stop graph: walk edges to every station/stop within each mode's access radius, in-vehicle edges along each line/route's stop sequence, transfer edges at shared or nearby stops. The search expands a bounded number of rounds (mirroring the stop-counting structure of RAPTOR-style algorithms, though without a real timetable to scan — see the paper's Related Work, §2) and returns up to *k* raw candidates, which are then reduced to the Pareto frontier over (duration, fare, walking distance, transfers) before ranking.

## Consequences
- Candidate sets became measurably richer on corridors with real choices available (see `fig4-pareto-scatter.svg` in the accompanying paper, a 4-candidate real example).
- `validateCandidate()`'s structural/continuity checks became more important, not less — a graph search can produce a technically-connected but practically-silly route (e.g. a transfer requiring backtracking) that a hand-coded pattern never would have generated, so the existing validation layer needed to keep catching those unchanged.
- Most corridors in the current synthetic dataset still only have 1-2 non-dominated candidates even with the richer search (see the paper's §4, 95% shortest-time agreement) — the graph search raised the *ceiling* on candidate diversity but didn't change the dataset's actual geographic richness, which is the real bottleneck now.
- The old four pattern functions were deleted entirely rather than kept as a fallback — once the graph search subsumed every case they handled, keeping them around as dead/parallel logic would have been a correctness risk (two code paths that could silently diverge), not a safety net.
