# ADR-002: A linear scorer (not a deeper model) for ranking candidates

## Status
Accepted.

## Context
Once candidate generation (ADR-001) produces a set of normalised feature vectors per journey (time, cost, walking, reliability, accessibility, crowd, weather, missed-connection risk, transfers), something has to turn that set into an ordering. The options considered were: (a) a fixed weighted-sum formula with profile presets, (b) a linear model whose weights are learned per-user from pairwise choices, (c) a non-linear model (small neural net, gradient-boosted trees) trained the same way.

## Decision
Use a linear pairwise scorer throughout: profile presets are a fixed weight vector, and the learned path (`PairwiseLogisticRegression`) is a linear model trained on the deltas between a chosen and a rejected candidate's feature vectors, via logistic regression on the sign of the human's preference.

Reasons:
- **Data volume.** A per-user model only begins training once a user has 5 recorded choices (and the learning curve in the accompanying paper, Figure 7, shows meaningful variance even at ~50-100 samples). A model class with materially more parameters than a 9-weight linear model has no realistic chance of generalising on that little data — it would overfit the first few choices and then not change further.
- **Explainability.** The explanation layer (§3.7 of the paper) needs to say *why* a route ranked where it did. A linear model's weights map directly and honestly onto "this route ranked higher because of reliability" in a way a black-box model's output does not, without a separate (and separately fallible) post-hoc explanation step.
- **Determinism and auditability.** A linear scorer's output is reproducible from its weights and the input features alone — no training-run-to-training-run variance to account for when explaining a historical recommendation, which matters for the project's broader "every claim is checked against real data" stance (§3.7).

## Consequences
- The system cannot capture genuine feature interactions (e.g. "walking matters much more when it's raining" is not expressible in a pure linear sum unless an interaction term is added explicitly) — a known, accepted limitation, not an oversight.
- The ablation study (paper §3.5, Figure 5) is only meaningful *because* the model is linear — "zero this feature's weight" is a well-defined, interpretable operation on a linear model that doesn't have an equally clean analogue on a non-linear one.
- If real usage ever accumulates enough per-user history (hundreds, not tens, of choices) to support a richer model without overfitting, this decision should be revisited — it was made for the data regime this project actually has, not as a permanent architectural stance.
