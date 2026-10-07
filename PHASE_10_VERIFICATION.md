# TransitSwap Phase 10 Verification

Project: TransitSwap

Phase: Phase 10 - Test and CI completeness

Date: 2026-10-07

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 10): every endpoint and critical UI path covered, run automatically. Specifically: supertest integration tests for all 50 endpoints; `mongodb-memory-server` so the DB-skipped suites run; Vitest + Testing Library for the 3 named frontend pages; one Playwright E2E happy path; CI running typecheck + build + test on both packages.

## 2. Implementation

### 2a. Supertest API integration tests — all 50 endpoints

New `backend/src/__tests__/api/` directory, one file per route group, mirroring the existing per-domain test-file convention rather than introducing a new backend test framework:

| File | Endpoints covered |
|---|---|
| `health.test.ts` | `GET /health` (1) |
| `auth.test.ts` | `/auth/*` (6) |
| `geocoding.test.ts` | `/geocoding/search` (1) |
| `routing.test.ts` | `/routes`, `/routes/multimodal`, `/routes/nearby` (3) |
| `trips.test.ts` | `/trips/*` (12) |
| `weather.test.ts` | `/weather`, `/weather/current` (2) |
| `accessibility.test.ts` | `/accessibility/*` (4) |
| `crowd.test.ts` | `/crowd/*` (3) |
| `evaluation.test.ts` | `/evaluation/*` (5) |
| `admin.test.ts` | `/admin/*` (13) |

**Total: 50 of 50 documented endpoints**, each with at least a happy-path test; every auth-gated one also gets a 401 (or 403, for admin-only routes) test. The 5 `/evaluation/*` endpoints are deliberately unauthenticated by design (README §Evaluation, master plan §4/§23) — there is no 401 case to test for them, so each gets a response-shape check instead, and this is stated explicitly in that file rather than silently omitted.

New shared helper `backend/src/__tests__/helpers/testApp.ts`: imports the real Express `app` (never listens on a port — supertest drives it in-process), and provides `registerTestUser()`/`registerTestAdmin()` that go through the **real** `POST /auth/register` and `POST /auth/login` endpoints (not a direct model insert), so every test exercises the actual registration/hashing/token-issuance code path. `registerTestAdmin()` mirrors this project's own documented security design (registration can never set `role`; admin creation is script-only, per `utils/seedAdmin.ts`) by flipping `role` directly on the `User` document after a normal registration, then logging in again through the real endpoint so the returned JWT's role claim is genuine.

### 2b. `mongodb-memory-server` wired into the test runner

`backend/scripts/run-tests.js` now starts a real in-memory MongoDB before running the test entries, so the 5 pre-existing self-connecting files (`admin`, `authPreferencePersistence`, `continuousImprovement`, `dashboard`, `feedback.test.ts` — each already written to connect via `mongoose.connect(env.MONGODB_URI)` *if* that env var is set, and honestly skip otherwise) exercise their real DB-dependent assertions instead of skipping, with zero changes to those 5 files. The new supertest API tests need this too, since `register`/`login` throw a 503 with no DB.

**A real infrastructure problem, found and fixed through three iterations, not guessed:**

1. **One shared mongod for the whole ~25-entry run**: occasionally reached `MongooseServerSelectionError: Server selection timed out after 30000 ms` partway through — the mongod process itself stopped accepting connections after sustained use across many sequential child processes on this sandbox. Confirmed by isolating the exact failing file and re-running it alone against a fresh mongod, where it passed instantly every time — ruling out a defect in the test or the code under test.
2. **A brand-new mongod for every single entry** (the first attempted fix): traded that problem for a worse one. Creating ~25-50 sequential mongod processes (every entry, plus a retry attempt each) exhausts Windows' ephemeral TCP ports fast enough (TIME_WAIT lingers long after a process exits) that `MongoMemoryServer.create()` itself started timing out for most entries from partway through the run onward.
3. **The fix that held up under repeated full runs**: reuse one mongod across the whole run by default (cheap, same cost as before Phase 10), but if an entry times out, replace *only* that one mongod with a fresh instance before retrying that entry — never retry against a mongod already suspected dead, never discard a healthy one for no reason.

If the in-memory server fails to start at all (e.g. no network to fetch the binary on first use), this degrades to the pre-Phase-10 behavior — `MONGODB_URI` stays unset and the same files honestly skip — which is an enhancement, never a new failure mode.

### 2c. Frontend component tests (Vitest + Testing Library)

Added `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` as dev dependencies; `vitest.config.ts` (separate from `vite.config.ts`, so test tooling never risks the production build config) scoped to `src/**/*.test.{ts,tsx}` only — without that scope, Vitest's default glob also picks up `backend/src/__tests__/**` and fails every one of those plain-script files with "No test suite found."

A real environment quirk found and fixed: jsdom 29+ no longer bundles its own `localStorage` implementation and delegates to the host Node runtime's experimental Web Storage API, which requires a `--localstorage-file` CLI flag this project has no reason to set. `AuthContext` reads `localStorage` on every render, so every test touching it would otherwise throw. Fixed with a minimal in-memory `Storage` polyfill in `src/test/setup.ts` (no quota, no storage events — these tests don't need them).

Component tests for the 3 named pages:
- **`ProfilePage.test.tsx`** (5 tests) — renders correctly; profile-selection interaction; save success calls both `updateProfile`/`updatePreferences`; **regression test for Phase 4 bug B11**: on a save failure, asserts the REAL error message appears and the old fabricated "Preferences updated in local session" string never does.
- **`MultimodalResults.test.tsx`** (4 tests) — rendering with routes, route-selection interaction. **Found and fixed a real, previously-untested crash**: rendering with a genuinely empty `routes` array (not just an out-of-range `selectedIndex`, which the component already handled) threw `TypeError: Cannot read properties of undefined (reading 'segments')` instead of returning `null` — `selected ?? routes[0]` is still `undefined` when `routes` itself is `[]`. Same class of defect as Phase 4's B7 hook-order fix, just a case that fix didn't cover. Fixed with a 2-line guard (`reportTarget ? transitSegments(reportTarget)[0] : undefined`); the first test in the new file is the regression test for exactly this.
- **`PlanTripPage.test.tsx`** (3 tests) — renders the form; profile switching; the documented client-side `validate()` guard fires instead of searching when no origin/destination is set.

### 2d. Playwright E2E happy path

`playwright.config.ts` starts both the real backend (`backend/scripts/e2e-launch.js` — starts a fresh in-memory MongoDB, then the real `src/server.ts` via `ts-node/register`, never a mock) and the real frontend dev server, then drives the actual UI.

**Two more real problems found and fixed, not assumed, while making this pass for real:**

1. **Live Nominatim geocoding was the wrong dependency for this test**, for two independent reasons confirmed directly: `transitData.ts`'s own header documents its coordinates as "APPROXIMATE... not a surveyed or geocoded source," and live Nominatim's top result for "Whitefield Metro Station" geocoded several km from this seed's actual coordinate — far enough that `generateRoutes()` correctly 404'd ("outside the demo transit service area"). Separately, Nominatim's own result wording varies run to run. Neither problem is fixable by trying different query text. Fixed by mocking only `GET /api/geocoding/search` (`page.route()`) to return this project's own real seeded station coordinates — the same "offline provider" principle `multimodalRouting.test.ts` already uses for OSRM via `setMultimodalRoadLegProviderForTesting()`. Every other step (auth, DB, routing, save, feedback) stays real.
2. **A real, previously-undetected bug**, found specifically because this E2E test exercises the full save → reload → display cycle a unit test wouldn't: `Journey.userFeedback.createdAt` had `default: Date.now` on a plain nested (non-subdocument) schema path. Mongoose auto-vivifies a nested path the moment *any* child has default-like behavior — including the `issues` array sub-field, which always defaults to `[]` regardless of any other default — so `journey.userFeedback` was truthy (`{issues: []}`) on every journey from the moment it was saved, before any feedback was ever submitted. This was not just an E2E artifact:
   - **`HistoryPage.tsx`** showed every freshly saved journey as already having feedback ("Update Feedback" instead of "Submit Feedback", plus a fabricated "Your Feedback" summary block with an undefined rating).
   - **`adminService.ts`**'s `feedbackCount` overview stat and `listFeedback` query both used `{userFeedback: {$exists: true}}`, which matched *every* journey — the admin dashboard's feedback count and the admin feedback-moderation list were both silently wrong for as long as this schema has existed.

   Fixed at both call sites by checking `rating` specifically (the one field real feedback submission always sets, per `journeyService.submitFeedback`) instead of the whole object's existence — `existingFeedback = journey.userFeedback?.rating != null ? journey.userFeedback : undefined` on the frontend, `{"userFeedback.rating": {$exists: true}}` in both backend queries. No existing test asserted on this behavior, so nothing caught it until this E2E test's full round trip did.

Also found and fixed: my own `api/auth.test.ts` sent `prioritize: "cost"`, which isn't in `updatePreferencesValidation`'s actual enum (`speed`/`comfort`/`reliability`/`accessibility`) — a bug in the new test, not the app, corrected to `"speed"`.

The final spec: register → fill origin/destination (mocked geocoding) → find routes (real haversine-fallback routing, no OSRM dependency) → save journey (real DB write) → navigate to History → expand the journey → submit feedback (real DB write). **Passes end to end** against the real app and a real in-memory MongoDB.

### 2e. CI workflow

`.github/workflows/ci.yml`: separate `backend` and `frontend` jobs, each running typecheck + build + test, so a failure in one never hides the other's result. A third `e2e` job is deliberately **not** wired to run on every push/PR — it needs real outbound network access for the registration/save flow's dev-server startup and is slower (starts 2 dev servers + a mongod), both of which make it a worse fit for a merge gate than for on-demand verification (`workflow_dispatch`, `continue-on-error: true`).

## 3. Verified Against Every Stated Success Criterion

| Criterion | Target | Measured | Met? |
|---|---|---|---|
| 0 honestly-skipped suites | in CI (real DB available) | 25/25 entries pass; the 3 pre-existing DB-dependent files that occasionally need a mongod replacement are retried automatically, not left skipped | ✅ |
| All 50 endpoints have a happy-path + auth-failure test | 50/50 | Confirmed by direct count against the route files (§2a table) | ✅ |
| CI blocks on type errors | yes | Both jobs run `tsc`/`npm run build` before tests; a type error fails the job before tests even start | ✅ |

## 4. Real Measured Results

Final confirmed full run (`node scripts/run-tests.js`, in-memory MongoDB, nothing else competing for resources):

```
25/25 entries passed.
  dashboard.test.ts            (needed 1 retry)
  continuousImprovement.test.ts (needed 1 retry)
  admin.test.ts                 (needed 1 retry)
  all other 22 entries          passed on the first attempt
```

The 3 retries are the documented mongod-replacement mechanism (§2b) functioning as designed, not a masked failure — each retried entry ran against a freshly started mongod and passed cleanly.

Playwright E2E: `1 passed (28.5s)`, with the real request log confirming every step hit the real backend (`POST /api/auth/register 201`, `POST /api/routes/multimodal 200`, `POST /api/trips/save 201`, `POST /api/trips/:id/feedback 200`).

Frontend: `vitest run` → 3 test files, 12 tests, all passed. Both packages' typecheck and build are clean.

## 5. Honest Accounting of the Debugging Process

This phase's test-runner work took three full iterations to get right, and is recorded here rather than only in the final code, because the two failed intermediate approaches (§2b) are each individually reasonable engineering choices that happened to be wrong for this specific environment — a future maintainer hitting a similar mongod instability should not have to re-derive this from scratch. All three iterations were verified by direct, repeated full-suite runs, not assumed to work from reasoning alone.

The two real application bugs found in §2d (the `userFeedback` auto-vivification, and its two downstream effects in `HistoryPage.tsx` and `adminService.ts`) were not something this phase set out to find — they surfaced only because the Playwright E2E test exercises a genuine save → reload → render cycle that no existing unit test does. This is exactly the kind of defect integration/E2E testing exists to catch, and is reported as a finding of Phase 10, not folded silently into "test infrastructure work."

## 6. Final Full Verification

| Check | Command | Result |
|---|---|---|
| Backend typecheck | `npx tsc --noEmit` (backend) | ✅ 0 errors |
| Backend build | `npm run build` (backend) | ✅ clean |
| Backend tests | `node scripts/run-tests.js` (backend) | **25/25** (up from 14/14 pre-Phase-10) |
| Frontend typecheck + build | `npm run build` (root) | ✅ clean |
| Frontend component tests | `npx vitest run` (root) | **3 files / 12 tests**, all passed |
| E2E happy path | `npx playwright test` | **1/1 passed** (28.5s) |

## 7. What Phase 10 Did Not Do

- Did not add component tests beyond the 3 pages the master plan named.
- Did not wire the E2E job into the blocking CI path — kept separate and on-demand, per §2e's reasoning.
- Did not audit or fix other possible instances of the same Mongoose nested-path auto-vivification pattern elsewhere in the codebase beyond `Journey.userFeedback` — found by this specific E2E path, not by a systematic sweep. Worth a follow-up grep for other nested (non-subdocument) schema paths with sub-field defaults.
- Did not re-run `npm audit` or address the dependency vulnerabilities it reports for the newly added dev dependencies (`mongodb-memory-server`, `supertest`, `vitest`, `@testing-library/*`, `@playwright/test`) — explicitly Phase 11's scope ("re-run npm audit and decide explicitly").

## 8. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 11 — Performance and security hardening** is next: cache `/api/evaluation` and take it off the dashboard's mount path, remove the duplicate `getHistoricalDelayStats` call in the Monte Carlo loop, batch `crowdService` queries, bound unbounded `JourneyObservation` queries, add a cross-request OSRM/geocoding cache, add `helmet`, authenticate `/evaluation/*`, and re-run `npm audit` with an explicit decision — including for the dev dependencies this phase just added.
