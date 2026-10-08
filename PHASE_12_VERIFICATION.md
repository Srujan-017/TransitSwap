# TransitSwap Phase 12 Verification

Project: TransitSwap

Phase: Phase 12 - UX completion

Date: 2026-10-08

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 12): finish the partial screens and make the product honest under failure. Specifically — honest error messaging on `ProfilePage`; carry the landing-page search into `/plan` (or remove the inert form); a "why no route?" empty state that shows the reachable area; a research page surfacing the 4 ML/reliability endpoints; show `AccessibilityReport` submissions in admin; an accessibility audit of the app itself (keyboard nav, ARIA, contrast).

## 2. Implementation

### 2a. Honest error messaging on `ProfilePage`

`handleSave`'s error path was already fixed in Phase 4 (bug B11). This phase found and fixed the **same class of bug** still present in `handleResetDna`: on a genuine TransitDNA reset failure, it reported `"TransitDNA reset in local mode."` — a fabricated success-sounding message with the same green-checkmark styling as a real reset, even though nothing was actually reset. Now sets `savedMessageIsError` and reports the real error, exactly mirroring `handleSave`'s already-correct pattern.

### 2b. Carry the landing-page search into `/plan`

`LandingPage.tsx`'s search form previously collected origin/destination/profile and discarded all three, navigating straight to `/register` (§9/§32: "search form collects 3 fields and discards them"). An unauthenticated visitor can't search routes directly — routing is behind auth — so this now persists what they typed to `sessionStorage` (`ts_landing_search`) before navigating; `PlanTripPage` picks it up once, pre-filling the real search (never a fabricated selected location — the user still picks a real geocoded result).

`LocationSearch.tsx` gained an `initialQuery` prop that seeds the input text and fires a real geocoding search on mount.

**A real bug found and fixed during live verification, not assumed fixed from reading the code:** the first implementation read and cleared `sessionStorage` inside a `useEffect`, which runs *after* the first render — by which point `LocationSearch` had already mounted with an empty `initialQuery` and captured that into its own internal `useState`. Manually testing the flow in a browser (register → Plan Trip) showed the fields staying empty. Moving the read into a **lazy `useState` initializer** (synchronous, runs during the first render, before `LocationSearch` mounts) fixed it halfway — then a second manual test still failed, which led to the real root cause: `React.StrictMode` (active in `main.tsx`) double-invokes lazy state initializers in development specifically to catch side effects during render, and the initializer also called `sessionStorage.removeItem()` — the first of the two invocations cleared it, so the second saw it already gone. Split into a pure read (the initializer) and a separate `useEffect` for the removal (idempotent, safe to double-fire). Re-tested in a real browser end-to-end after the fix: origin and destination now pre-fill correctly and a live geocoding search fires for both.

### 2c. "Why no route?" empty state

New `src/components/multimodal/WhyNoRoute.tsx`, shown in `PlanTripPage`'s multimodal error state in place of the old generic `"...outside the demo transit service area. Try Road Routing instead."` boilerplate. Reuses `GET /routes/nearby` (the same endpoint `NearbyTransit.tsx` already calls for the origin) for **both** the origin and destination, and reports which side(s) are actually outside the demo network's reach — concrete and data-driven, never fabricated. Verified live: searching Gateway of India → Marine Drive, Mumbai (genuinely outside the Bengaluru demo network) produced *"Your origin and destination are outside the demo transit network's reach (no metro station within 2 km or bus stop within 1.2 km of either point)."*

### 2d. Research page

New `src/pages/ResearchPage.tsx` at `/research` (linked from the main nav), surfacing the 4 ML/reliability endpoints that existed since Phase 8/9 with no UI (§32 "research endpoints... no UI"; now authenticated per Phase 11 S4, so this page is the first real consumer):

- **Your Learning-to-Rank Model Status** (`GET /evaluation/ml/status`) — personalization badge, sample count, live feature weights.
- **Pairwise Logistic Regression — Synthetic Benchmark** (`GET /evaluation/ml`) — ML vs rule-baseline accuracy, log loss, disclaimer.
- **Prediction Interval Empirical Coverage** (`GET /evaluation/reliability/evaluation`) — 90%/95% coverage, real-vs-synthetic data source badge.
- **Historical Prediction Error Statistics** (`GET /evaluation/reliability/stats`) — sample size, mean error, σ, honest "insufficient data" state when `isSufficientData` is false.

All 4 types mirror their backend response shapes exactly (`intelligenceService.ts`), not invented frontend shapes. Verified live — all 4 cards render real values (e.g. 87.5% ML accuracy vs 91.7% rule baseline, 100% empirical coverage on 16 synthetic test journeys).

### 2e. `AccessibilityReport` submissions surfaced in admin

New backend: `adminService.listAccessibilityReports()` / `updateAccessibilityReportStatus()`, `GET /admin/accessibility-reports` (optional `status` filter) and `PUT /admin/accessibility-reports/:reportId` (validated against the model's own `status` enum). These reuse the existing `AccessibilityReport` collection — written by `accessibilityService.reportIssue()` since Phase 7 and never surfaced anywhere (§32: "AccessibilityReport records are written and never surfaced in any UI").

Frontend: `AdminDashboardPage.tsx`'s existing "Reports" tab gained a "Community accessibility reports" section — station, issue type, description, reporter, timestamp, and a status dropdown (pending/confirmed/resolved/rejected) that calls the new PUT endpoint. Verified live end-to-end: submitted a real report as a regular user → confirmed it appeared in Admin → Reports with status "pending" → changed status to "resolved" via the dropdown → confirmed the badge updated and persisted.

### 2f. Accessibility audit (scoped)

Added `aria-label` to every icon-only interactive control found across the main flows (title-only is an unreliable accessible-name source — Phase 10's own E2E test comment already noted this for `HistoryPage`'s icon buttons):

| File | Control(s) fixed |
|---|---|
| `HistoryPage.tsx` | Open/collapse journey details, delete journey, delete destination |
| `SavedRoutesPage.tsx` | Delete saved route |
| `PlanTripPage.tsx` | Swap origin/destination |
| `LocationSearch.tsx` | Use my current location, clear field |
| `Navbar.tsx` | Mobile hamburger menu (`aria-expanded` + `aria-label`), account dropdown (`aria-haspopup` + `aria-expanded` + `aria-label`) |
| `AdminDashboardPage.tsx` (new) | Accessibility report status selector |

**Honestly out of scope, not claimed done:** a full WCAG-level color-contrast audit and a repo-wide keyboard-navigation sweep. Keyboard focus is largely already handled by the existing `focus:ring-2` utility classes applied broadly across the design system (a genuine pre-existing strength, not something this phase added), and every interactive element touched is a real `<button>`/`<select>` (keyboard-operable by default) — but contrast ratios were not measured against WCAG AA/AAA thresholds.

## 3. Testing

| Check | Result |
|---|---|
| Backend `npx tsc --noEmit` | 0 errors |
| Backend `node scripts/run-tests.js` (25 entries) | **25/25 passed** (3 entries needed their existing, pre-documented 1 retry — unrelated to this phase) |
| Frontend `npx tsc --noEmit` | 0 errors |
| Frontend `npm run build` | clean; `ResearchPage` split into its own 8.36 kB chunk; main chunk 315.90 kB (unchanged from Phase 11) |
| Frontend `npx vitest run` | 3 files / 12 tests passed |
| `npx playwright test` (E2E happy path) | 1/1 passed — confirms the landing-search carry-through logic doesn't break the existing register → plan → save → feedback flow when no carried search is present |
| **Live manual verification** (real backend + real in-memory MongoDB + real browser, not assumed from code) | Landing search → register → Plan Trip pre-fill (after finding/fixing the StrictMode bug); "why no route?" message for a genuinely out-of-network search; all 4 Research page cards; Admin → Reports community accessibility report submit → list → status moderation → persisted |

## 4. Honest Accounting

This phase is a good example of why "verified in a browser" and "typechecks and builds" are not the same claim. The landing-search carry-through **typechecked cleanly and built cleanly** in its first, broken form — the bug was only visible by actually registering a user and opening Plan Trip. It then took a *second* round of live testing (not just re-reading the code) to find the StrictMode double-invocation as the real root cause, after the first fix (lazy initializer) only partially worked. Both rounds are recorded above rather than silently folded into "implementation."

## 5. What Phase 12 Did Not Do

- No WCAG contrast audit (§2f above).
- No moderation workflow beyond a status dropdown for `AccessibilityReport`s (no bulk actions, no email notification to the reporter) — the master plan only asked that they be surfaced, not that a full triage system be built.
- `LandingPage`'s sample "Recommended Route" card remains illustrative/static — only the search form's inputs were made to carry real user intent, per the master plan's own instruction ("carry the landing search into /plan **or remove the form**"); the form was kept and fixed rather than removed.
- Did not touch CI, deployment, or anything from Phase 13 onward — per the master plan's phase procedure (§40), one phase at a time.

## 6. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 13 — Deployment** is next: a live frontend + backend environment, MongoDB Atlas, `/api/health` returning `database: "connected"`, and a post-deploy smoke test in CI.
