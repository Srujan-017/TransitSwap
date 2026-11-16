# Baseline: the app before the redesign (Phase 0)

**Date:** 16 Nov 2026 · **Commit measured:** `4b33eb8` (the last commit before the redesign) · **Purpose:** the numbers every later phase is compared with.

## 1. The gate on the unchanged app

| Check | Result |
|---|---|
| Type-check, frontend and backend | clean |
| Frontend tests | **122 pass** (15 files) |
| Backend tests, strict | **33 / 33 pass**, 0 skipped |
| Production build | builds. Largest files: `index` 320 kB (102 kB gzip), `ZoomControl` (Leaflet) 154 kB (45 kB gzip), `PlanTripPage` 112 kB (30 kB gzip) |
| End-to-end happy path (register → plan → save → feedback, real backend) | **passes** (about 17 s) |

## 2. Screenshots and accessibility audit (`npm run ui:audit`)

45 screen captures: **15 screens at each of 375, 768 and 1280 px**, in `docs/ui-redesign/before/` (`<width>-<screen>.png`, plus `results.json`).

Screens: landing, login, register, not-found, dashboard, plan (empty), plan (results), navigation (opening), navigation (simulated journey running), history, history (journey details open), saved routes, profile, research, admin.

Each is scanned with axe-core 4.8.4 (WCAG 2.1 A and AA) and checked for sideways scrolling.

**Existing findings (5), all outside the screens the feature upgrade rebuilt:**

| Screen | Width | Finding |
|---|---|---|
| Not found | 375, 768, 1280 | colour contrast, 1 element |
| Landing | 768 | colour contrast, 2 elements |
| Admin | 768 | the page scrolls sideways |

Every other screen: 0 violations and no sideways scroll. The redesign must fix these five; it must never add a new one.

## 3. How the audit works (so later phases repeat it exactly)

```bash
npm run ui:audit                      # → docs/ui-redesign/before/   (don't overwrite the baseline: use a label)
UI_SHOTS=phase-1 npm run ui:audit     # → docs/ui-redesign/phase-1/
UI_VIEWPORTS=375 UI_SHOTS=phase-1 npm run ui:audit   # one width only
```

- It uses the real frontend and backend with a throwaway in-memory database, fixed clear weather, and a test user and test admin that exist only for the run. Nothing touches the live site or any real database.
- Place search is answered locally (as in the end-to-end test), so the screens are the same on every run.
- The audit backend has the API's rate limit lifted (in `backend/scripts/ui-screens-launch.js` only). The real limit is 150 requests per 15 minutes, and a full pass sends more than that; once the API answers 429 the app signs the user out. The backend source is unchanged.
- Each width runs against its own fresh backend. A whole audit takes about 5 minutes.
- Screenshots are full-page captures, so the sticky top bar can appear part-way down the image; that is how a full-page capture draws a sticky header, not a layout bug.

## 4. What this baseline does not cover

- Real phones and other browsers (Chrome only; the redesign's final phase adds Edge, Firefox and a real phone).
- A screen-reader or keyboard-only study. axe is an automated check.
- Performance scores (Lighthouse is run in the last phase).

## 5. A quirk of this machine

The project folder is inside OneDrive. OneDrive can leave a file as a cloud "placeholder" (Windows marks it as a reparse point), and Playwright silently skips such files: `npx playwright test` then says "No tests found" even though `e2e/happy-path.spec.ts` is there. That happened here; deleting the file and writing it back (same content, git shows no change) made it a normal local file again. If it ever recurs, do the same, or mark the folder "Always keep on this device" in OneDrive.
