# ADR-003: Relative (min-max) normalisation of ranking features

## Status
Accepted; known limitation documented.

## Context
The nine ranking features (time, cost, walking, reliability, accessibility, crowd, weather, missed-connection risk, transfers) are on wildly different natural scales (minutes vs. rupees vs. metres vs. a 0-100 score vs. a count). Before a weighted linear sum means anything, they need a common scale. Two options: normalise each feature relative to the min/max observed *within the current candidate set* (relative normalisation), or normalise against a fixed, pre-defined global scale (e.g. "0-120 minutes maps to 0-1") decided in advance.

## Decision
Use relative (min-max) normalisation across the current candidate set for each query.

Reasoning at the time: it requires no manually-chosen global scale constants to get wrong or to keep in sync with reality (what's a "slow" trip varies by city and corridor), and it guarantees every feature contributes proportionally to the *actual spread present in this specific choice*, rather than being swamped by a global scale that doesn't match the local candidate set's range.

## Consequences — including a known limitation found in this project's own Phase 7 audit
Relative normalisation is **magnitude-blind across different queries**: a 2-minute spread between the fastest and slowest candidate in a small, tight candidate set is normalised to the same [0,1] range as a 40-minute spread in a looser one. The ranker therefore cannot express "this particular time difference doesn't actually matter much in absolute terms" — a 2-minute edge counts exactly as much in the weighted sum as a 40-minute one would have, in two different queries. This was identified directly in this project's own Phase 7 audit work as a real limitation, not fixed, because fixing it well requires exactly the kind of global, calibrated scale constants that motivated choosing relative normalisation in the first place — doing so without real usage data to calibrate against risks trading one set of unvalidated assumptions for another.

This is stated in the accompanying paper (§5, Limitations) rather than silently left as an implementation detail, and is the direct reason the ablation study (paper Figure 5) reports *decision-change rate* (does the top candidate change) rather than claiming any absolute, cross-query-comparable "feature importance" score — the normalisation scheme makes the latter claim unsound.

## Alternatives considered
A fixed global scale was rejected for this project specifically because no real usage data exists yet to calibrate it against (see ADR for graceful degradation, 004, and the paper's own repeated point that this is a demo deployment on a synthetic dataset) — introducing invented global constants here would have been exactly the kind of unvalidated assumption the project otherwise goes out of its way to avoid (e.g. §3.6's calibration work, §3.6's sensitivity sweep). Revisit once real journey-choice data exists to calibrate a global scale honestly.
