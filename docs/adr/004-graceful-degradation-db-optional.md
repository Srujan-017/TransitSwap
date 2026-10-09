# ADR-004: Graceful degradation — the backend must run with no database configured

## Status
Accepted; load-bearing throughout the project.

## Context
MongoDB is used for user accounts, saved journeys, historical reliability samples, and admin-managed accessibility reports. Early in the project it was tempting to treat a database connection as a precondition for the backend to start at all — simpler to reason about, and the conventional default for an Express + Mongoose app.

In practice, this project has been run and demonstrated in several environments without a configured database: local development before `MONGODB_URI` is set, the figure/data-generation scripts for the accompanying paper (none of the 9 figures needed a live database), and any reviewer or grader who clones the repository and runs it without first provisioning MongoDB Atlas.

## Decision
Every service that touches the database checks `mongoose.connection.readyState` before querying. Read-heavy, demo-critical paths (route generation, accessibility lookups, crowd estimates) fall back to seeded, in-memory demo data when the database is unavailable, clearly marked with `isDemoData`/`isSyntheticDemoData` flags threaded into API responses rather than silently presented as live data. Paths that are inherently meaningless without persistence (authentication, saved journeys) instead return an explicit `503` rather than fabricating a fake success.

## Consequences
- The backend has a genuine "cold start, zero configuration" mode that stays useful (route planning, accessibility info, explanations all work) rather than failing outright — this is the mode most of the accompanying paper's own figures were computed in.
- It forced every new feature added after this decision (accessibility, crowd, reliability, ML ranking) to be designed with its data-availability boundary considered explicitly from the start, rather than assuming a connection and bolting on error handling later.
- The cost is more branching in each service (`if (dbAvailable) { ... } else { ... }`) than a database-required design would need — accepted deliberately, since the alternative (requiring real infrastructure just to evaluate or demo the system) was judged worse for a project whose own evaluation and paper-generation tooling need to run reproducibly without external dependencies.
- This is also why the honesty-gating work in the explanation layer (paper §3.7) matters: once demo data and real data can both flow through the same code path, every claim shown to a user has to be checked against which one it actually is, every time — "the database happens to be connected right now" is never allowed to be the only thing standing between a real claim and a fabricated one.
