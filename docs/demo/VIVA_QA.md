# TransitSwap — Viva Questions and Truthful Answers

Every answer below matches the code and the measured results in this repository. If you are unsure, say what is measured and what is not.

## The five hard questions

**1. "Is this machine learning?"**
Partly, and I can say exactly which part. The per-user ranker is a **pairwise logistic regression** (Bradley–Terry style) trained by batch gradient descent on the rider's own route choices, over 9 normalised features. Everything else — the accessibility rules, crowd estimate, reliability score, prediction interval, Monte Carlo — is rule-based or statistical, and is labelled that way in the code and UI. There is no deep learning, and I do not claim any.

**2. "Why did your ranker ignore the Monte Carlo risk?"**
It used to (a fault the audit found in Phase 7). It no longer does: missed-connection risk and transfer count are now two of the 9 ranking features (`connectionRisk = 1 − risk/100`), and a regression test checks that a high-risk route is ranked lower, all else equal.

**3. "What does 'agreement with a baseline' mean?"**
The share of the 22 benchmark scenarios where TransitSwap's top route is the *same* route a simpler planner (fastest, cheapest, least walking, fewest transfers, random) would pick. For the standard profile the offline benchmark gives 95 % agreement with the fastest route — so for an unconstrained rider TransitSwap behaves much like a time-optimal planner, which is expected. The interesting differences appear when constraints apply (accessibility profiles), which is what the 520-trip experiment measures. The live Research page uses real road distances and gives slightly different numbers (about 86 %); both are simulated benchmarks.

**4. "Is the data real?"**
No. Station names are real Namma Metro / BMTC names, but coordinates are approximate and every accessibility, crowd, fare and timetable attribute is **synthetic**; no station was surveyed. This is stated in the UI, README, report and paper. The system is built so a real GTFS feed and surveyed accessibility data can replace the demo data without changing the engine.

**5. "Where do the numbers in the README and paper come from?"**
From commands in this repository. The paper's results: `cd backend && npx ts-node --transpile-only scripts/generate-accessibility-paper-data.ts` writes `docs/paper/ieee/data/accessibility-paper-data.json`; `scripts/print-worked-example.ts` prints the worked example; `docs/paper/ieee/scripts/make_figures.py` draws the figures. Only timings vary between runs (seeded sample, pinned clock, offline road legs). The README benchmark table comes from `evaluationService.runEvaluation()`.

## Headline results (simulated network, 520 origin–destination pairs)

- A fastest-route planner gives a wheelchair user a route they cannot complete on **35.6 %** of trips (95 % CI 31.6–39.8 %); **19.2 %** of trips have no step-free route at all.
- Hard constraints remove both failures at a median detour of **5.7 min** for the **17.4 %** of feasible trips that need one.
- One lift outage at Majestic disconnects **66 of 420** wheelchair-feasible trips (15.7 %) and reroutes 56 more.
- The crowd rule matters only near the hours that have data: at 08:30 wheelchair "no feasible route" rises from 19.2 % to 41.5 %; at 14:30 it changes nothing.
- The learned model: **87.5 %** vs **91.7 %** for the rule baseline (synthetic benchmark) — it does *not* beat the rules; I report that.

## Likely follow-up questions

**Why hard constraints rather than a heavily weighted score?** A weight is a preference: a faster route can outscore an accessible one, and when no accessible route exists a ranker still returns its best — unusable — route. The experiment shows both failures (soft scoring still fails silently on 19.2 % of wheelchair trips).

**How did you choose 1,200 m, 15/20/35 stairs?** They are design assumptions, not clinically validated limits, and the paper says so. They should be set with disability organisations and ideally per rider.

**What happens when data is missing?** Unknown never blocks a route; it produces a warning ("open-world" policy). The cost is that a station with a wrongly missing record can be admitted; the opposite policy would discard most routes on incomplete data.

**What did the crowd-hours bug do, and how was it fixed?** Each station only has one or two readings. The old code reused a station's first reading at every hour, so MG Road looked HIGH at 9:36 pm and blocked wheelchair routes at night. Now a reading is used only within 2 hours of the travel time on the same day type; otherwise the crowd is "unavailable" and never blocks. Regression tests cover this.

**Why not RAPTOR?** The candidate search is a bounded multi-criteria graph search (6 hops, 3 transfers, Pareto filter), chosen for guaranteed termination on a small demo network; it is not RAPTOR and the paper says so.

**What is the contribution, honestly?** The constraint-before-ranking design with typed, explainable exclusions; an open-world treatment of missing data; and a reproducible evaluation that measures how often simpler planners recommend infeasible routes. Not a better predictor than the rules, and not validated with real riders.

**What is not done?** No user study; synthetic data; no live transit feeds; the benchmark is simulated; the accessibility audit is automated (axe-core, WCAG 2.1 A/AA on the main screens), not a screen-reader study.

**How is it secured?** JWT authentication (production refuses to start without a strong `JWT_SECRET`), `helmet`, rate limiting, request validation on every write endpoint, ownership checks on user data, admin accounts created only by a server-side script, never via the public API. The token is kept in `localStorage` — a documented trade-off.

**How is it tested?** 29 backend test files (unit and API integration against an in-memory MongoDB) and 35 frontend tests; the runner fails on a skipped database test in CI; GitHub Actions runs type-check, build and tests on every push; the interface was scanned with axe-core.

**Why is the backend slow at first?** The free hosting tier sleeps when idle; the first request wakes it (about 30 s).

**What would you do next?** A user study with wheelchair users, older adults and caregivers; real GTFS and surveyed station data; validating the thresholds with them; live lift-outage feeds.
