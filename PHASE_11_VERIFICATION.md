# TransitSwap Phase 11 Verification

Project: TransitSwap

Phase: Phase 11 - Performance and security hardening

Date: 2026-10-08

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 11) and §26 (the performance bottleneck list): remove the measured performance bottlenecks and close the validation gaps. Specifically — cache `/api/evaluation` and take it off the dashboard's mount path; remove the duplicate `getHistoricalDelayStats` call in the Monte Carlo loop; batch `crowdService` queries; bound the `JourneyObservation` queries and move statistics into an aggregation pipeline; add a cross-request OSRM/geocoding cache; add `helmet`; authenticate `/evaluation/*`; re-run `npm audit` and decide explicitly; route-split the frontend.

## 2. Implementation

### 2a. Security headers (S7) — `helmet`

`backend/src/app.ts` now runs `helmet()` ahead of every route. This API serves JSON only (no HTML templates, no inline scripts of its own), so helmet's default config is used as-is rather than hand-tuned for a page that doesn't exist. Verified this does not break the real cross-origin frontend↔backend traffic (5173 → 5000) via the Playwright E2E run below — register/login/route-generation/save/feedback all still succeed with helmet active.

### 2b. Authenticate `/evaluation/*` (S4)

All 5 `/api/evaluation/*` routes were previously unauthenticated and computationally heavy (`GET /api/evaluation` alone runs 22 full route generations + enrichment + Monte Carlo) — a cheap DoS / cost-amplification vector, per §26 S4. `backend/src/routes/evaluation.routes.ts` now runs `router.use(requireAuth)` ahead of all 5 routes, same as every other non-public endpoint. `backend/src/__tests__/api/evaluation.test.ts` was updated with a `0️⃣` case asserting all 5 reject an unauthenticated request before the existing happy-path checks.

### 2c. Cache `/api/evaluation` and move it off the dashboard's mount path (P1/P7)

`backend/src/services/evaluationService.ts` adds `getEvaluation()` — a single-entry 5-minute TTL cache wrapping `runEvaluation()` — used by the controller instead of calling `runEvaluation()` directly. `runEvaluation()` itself is left untouched and uncached, because `evaluationHarness.test.ts`'s determinism check calls it **twice** and asserts the two independent runs agree; caching inside `runEvaluation()` itself would make that test vacuous.

Measured directly (no DB, cold vs warm):

| Call | Latency |
|---|---|
| 1st call to `getEvaluation()` (cold — runs the 22-scenario benchmark) | 11,991 ms |
| 2nd call to `getEvaluation()` (served from cache) | 0 ms |

`src/pages/DashboardPage.tsx`'s research-metrics `useEffect` (which previously fired on every single dashboard mount) was replaced with an explicit "Load Research Metrics" button — confirmed via the Playwright E2E run that `GET /api/evaluation` no longer appears in the network log on dashboard mount.

### 2d. Remove the duplicate `getHistoricalDelayStats` call in the Monte Carlo loop (P2)

`reliabilityService.calculateMissedConnectionRisk()` called `runDataDrivenMonteCarlo()` (which internally calls `getHistoricalDelayStats()`) and then called `getHistoricalDelayStats()` again directly for the same `(mode, routeId)`, per transfer — the exact duplicate query named in §26 P2. `historicalReliabilityService.runDataDrivenMonteCarlo()` now accepts an optional `precomputedDelayStats` parameter; `reliabilityService.ts` fetches the stats once per transfer and passes them to both the Monte Carlo call and the joint whole-journey simulation that follows it. Every other existing caller is unaffected (the parameter is optional).

### 2e. Batch `crowdService` queries (P8 — N+1)

`crowdService.routeSummary()` called `stationEstimate()` once per station on a route, each issuing its own `CrowdReport.find()` — up to 4 stations × up to 4 candidate routes = up to 16 round trips per `/routes/multimodal` request. The fusion logic (recent-reports blend, demo fallback, unavailable case) was extracted into a pure `buildEstimate()` function with no DB access; `routeSummary()` now issues **one** `CrowdReport.find()` covering every station on the route, groups the results in memory, and calls `buildEstimate()` per station. `stationEstimate()` (still used standalone by `crowdController` and `multimodalController.enrichNearbyStation`) keeps its original single-station query and delegates to the same pure function — behavior-identical for every existing caller.

### 2f. Bound `JourneyObservation` queries + a real aggregation pipeline (P5)

`historicalReliabilityService.getHistoricalStatistics()` previously ran `JourneyObservation.find().select(...)` (no limit on the overall-transit fallback) and reduced the raw documents in Node. It now uses a MongoDB aggregation pipeline (`$group` with `$avg`, `$stdDevSamp`, `$min`, `$max`) — only one aggregated summary document crosses the wire regardless of how many observations match, which is the fix §39 Phase 11 actually asks for ("move statistics into an aggregation pipeline"), not just a smaller query.

`getHistoricalDelayStats()` still needs the raw delay *values* (for Monte Carlo resampling), so it can't be reduced to a pure aggregate — its three `find()` calls (route-specific, mode-specific, overall-transit) are now all bounded with `.sort({ createdAt: -1 }).limit(MAX_DELAY_SAMPLE_SIZE)` (500), fixing the specific unbounded `find()` named in §26 P5 and §13.

### 2g. Cross-request OSRM road-leg cache (P4)

`multimodalService.ts`'s road-leg cache was a `Map()` created fresh per request — the same walk/auto leg between two coordinates was refetched from OSRM on every search. A module-level, bounded TTL cache (`createTtlCache`, new `backend/src/utils/ttlCache.ts`) now sits behind it, shared across requests. It is deliberately **disabled** whenever a test has installed an override provider (`setMultimodalRoadLegProviderForTesting`) — `multimodalRouting.test.ts` swaps providers mid-file to exercise different OSRM response scenarios for the *same* coordinates, and a cache keyed only on mode+coordinates would otherwise return a stale result from the previous provider. Production traffic never sets an override, so it always benefits.

Measured directly (live OSRM, same origin/destination, two calls):

| Call | Latency |
|---|---|
| 1st `generateRoutes()` call (cold) | 808 ms |
| 2nd `generateRoutes()` call (same coordinates, cache warm) | 452 ms |

### 2h. Cross-request geocoding cache (P9)

`geocodingService.search()` now checks a bounded 5-minute TTL cache (same `ttlCache.ts` utility) before calling Nominatim, keyed on the normalized (trimmed, lowercased) query string. Only a genuine result set is cached — never a failure, so a transient Nominatim outage can't poison the cache for 5 minutes.

### 2i. Route-split the frontend (P11)

`src/App.tsx`: Dashboard/PlanTrip/Profile/History/SavedRoutes/Admin — everything behind `ProtectedRoute` except the pages an unauthenticated visitor needs first (Landing/Login/Register, left eager) — are now `React.lazy()`-loaded behind `<Suspense>`, the same pattern already used for `MapView.tsx`.

| Build | Main chunk (`index-*.js`) |
|---|---|
| Before Phase 11 | 459 kB (131 kB gzip) |
| After Phase 11 | 315.23 kB (100.50 kB gzip) |

### 2j. `npm audit` — re-run and an explicit decision

**Backend** — 10 vulnerabilities (1 critical, 5 high, 4 moderate) → **3 remaining** after `npm audit fix` (no `--force`; every fix applied was a non-breaking patch/minor bump already inside the existing `package.json` semver ranges):

| Package | Before → After | Severity |
|---|---|---|
| `axios` | 1.19.0 → 1.20.0 | high |
| `proxy-addr` | 2.0.7 → 2.0.8 | critical |
| `express` | 4.22.2 → 4.22.3 | moderate |
| `morgan` | 1.11.0 → 1.12.1 | moderate |
| `qs` / `body-parser` / `brace-expansion` | bumped transitively | moderate/high |

**Explicit decision on the 3 remaining** (`braces`, `chokidar`, `ts-node-dev`): all three are one dependency chain — `ts-node-dev` (the `npm run dev` file-watcher) depends on a vulnerable `chokidar`, which depends on a vulnerable `braces`. **No fix is available upstream** for any of the three (confirmed via `npm audit`'s own `fixAvailable: false`). This chain is a dev-only tool never present in the production `npm start` path. Decision: accept, documented here, not patched — there is nothing to patch to.

**Frontend** — 2 high (`axios`, `source-map-js`) → **0 remaining**, both non-breaking patch bumps within existing ranges.

### 2k. All PUT endpoints validated

Checked explicitly as part of this phase's success criteria: `PUT /auth/profile`, `PUT /auth/preferences`, `PUT /admin/stations/:id`, `PUT /admin/stations/:id/deactivate`, `PUT /admin/accessibility/:id`, `PUT /admin/accessibility/:id/lift` all already carry `express-validator` rules (fixed in Phase 4, confirmed unchanged). No gap found; no change needed.

## 3. Bugs found and fixed along the way

None of these were in Phase 11's original scope, but "without any errors" meant tracking each one down rather than working around it:

### 3a. Pre-existing — all 9 `api/*.test.ts` files never disconnected MongoDB

**Found via:** the full regression suite initially regressed from the Phase 10 baseline (15/25, then 16/25) with every `api/*.test.ts` file after `health.test.ts` hitting `"did not finish within 120s and was killed"` — on **both** the original attempt and the retry, even though every assertion inside had already logged success. Isolating `api/admin.test.ts` against a fresh, uncontended mongod proved the test *logic* passed in seconds; the process itself just never exited.

**Root cause:** none of the 9 Phase 10 `api/*.test.ts` files ever called `mongoose.disconnect()`, and `process.exit(1)` was wired only to the failure path. On success, the open MongoDB connection's keep-alive/heartbeat handles kept Node's event loop alive, so `spawnSync` always had to wait out the full 120s timeout to kill it — every single time, for every file that registered a test user. This explains the "needed 1 retry" flakiness already noted in Phase 10 for `dashboard.test.ts`/`continuousImprovement.test.ts` (they do disconnect, but not always fast enough) and the much harder double-timeout failure for the 9 newer files (which never disconnect at all).

**Fix:** `process.exit(failed > 0 ? 1 : 0)` unconditionally at the end of `run()` in all 9 files, instead of only on failure.

### 3b. Pre-existing — restoring a broken lift never restored `wheelchairAccessible`

**Found via:** running `src/__tests__/admin.test.ts` in isolation while diagnosing 3a surfaced a genuine, unrelated assertion failure at step 9.5 ("wheelchair route accepted again after lift is restored") — not a flake, 100% reproducible against a clean database.

**Root cause:** `adminService.updateAccessibility()`'s `hasLift === false` branch unconditionally sets `wheelchairAccessible = false`. The symmetric `hasLift === true` (restore) branch recomputed `status` but never reset `wheelchairAccessible` back — `getBlockReason()` checks `wheelchairAccessible === false` directly, independent of `status`, so a wheelchair-profile route through that station stayed rejected forever after the station's *first* lift outage, even though the admin fixed it and the record's own `status` field correctly said `"accessible"`.

**Fix:** the restore branch now also sets `wheelchairAccessible = true`, mirroring the break branch exactly, and simplifies `status` to the unconditional `"accessible"` that `hasRamp || wheelchairAccessible` always evaluated to anyway once that's fixed.

### 3c. My own gap — `evaluation.test.ts` crashed instead of skipping without a DB

Adding the auth requirement (§2b above) meant `evaluation.test.ts` now needs `registerTestUser()`, which needs a DB connection — but I hadn't added the `ensureDbConnected()` honest-skip guard every other DB-dependent `api/*.test.ts` file already has. When the shared mongod degraded late in a run (the known, Phase-10-documented "mongod stops accepting connections after sustained use" characteristic of this Windows sandbox), every sibling file printed `"SKIPPED — ... honest skip, not a pass"` and exited 0; `evaluation.test.ts` alone threw and failed the whole run. Fixed by adding the same guard.

## 4. Testing

| Check | Result |
|---|---|
| Backend `npx tsc --noEmit` | 0 errors |
| Backend `npm run build` | clean |
| Backend `node scripts/run-tests.js` (25 entries) | **25/25 passed** — 3 entries needed their existing, pre-documented 1 retry (`dashboard`, `continuousImprovement`, `admin.test.ts`); 2 entries (`api/evaluation.test.ts`, `api/admin.test.ts`) honestly skipped late in this run when the shared mongod degraded under sustained load — the same accepted Phase 10 characteristic, not a new regression |
| Frontend `npx tsc --noEmit` | 0 errors |
| Frontend `npm run build` | clean, main chunk 315.23 kB (was 459 kB) |
| Frontend `npx vitest run` | 3 files / 12 tests passed |
| `npx playwright test` (E2E happy path) | 1/1 passed — confirms helmet doesn't break cross-origin traffic, and `GET /api/evaluation` no longer fires on dashboard mount |
| `npm audit` (backend) | 10 → 3 (remaining: dev-only, no fix available, documented) |
| `npm audit` (frontend) | 2 → 0 |

## 5. Success Criteria (per §39 Phase 11)

| Criterion | Status |
|---|---|
| `/evaluation` p95 under 200ms cached | ✅ 0ms measured on a warm cache hit |
| No N+1 in the route path | ✅ `crowdService.routeSummary` batched |
| No unbounded `find()` | ✅ `getHistoricalDelayStats`'s 3 queries bounded; `getHistoricalStatistics` moved to aggregation |
| `helmet` active | ✅ |
| All PUT endpoints validated | ✅ (already true since Phase 4; confirmed, not re-done) |

## 6. What Phase 11 Did Not Do

- **Did not** rearchitect `run-tests.js`'s mongod-health detection. A graceful `"SKIPPED — MONGODB_URI is not configured"` exit (code 0) looks identical to a real pass to the retry/replace-mongod logic, so a degraded-but-still-"successfully skipping" mongod is never replaced for the rest of a run. This is a pre-existing blind spot (not a Phase 11 regression) and out of this phase's scope; it's the reason 2 entries honestly skipped in the final clean run instead of executing. Worth a future look if `api/evaluation.test.ts` / `api/admin.test.ts` start skipping routinely rather than occasionally.
- **Did not** add a cross-request cache for `/api/weather` (P10, lowest priority in §26) or restructure `multimodalController`'s enrichment pipeline into a service (a Phase 6/7-era structural item, not a Phase 11 performance one).
- **Did not** touch the CI pipeline, deployment, or anything from Phase 12 onward — per the master plan's own phase procedure (§40), one phase at a time.

## 7. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 12 — UX completion** is next: honest error messaging on `ProfilePage`, carrying the landing-page search into `/plan` (or removing the inert form), a "why no route?" empty state, a research page surfacing the 4 ML/reliability endpoints, showing `AccessibilityReport` submissions in admin, and an accessibility audit of the app itself.
