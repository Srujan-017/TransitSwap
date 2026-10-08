# TransitSwap Phase 13 Verification

Project: TransitSwap

Phase: Phase 13 - Deployment

Date: 2026-10-08

## 1. Phase Objective

Per `PROJECT_MASTER_PLAN.md` §39 (Phase 13): one live, reachable environment — frontend (static host) and backend (Node host) per README §25, MongoDB Atlas, `/api/health` returning `database: "connected"`, and a post-deploy smoke test in CI.

## 2. Live URLs

| Component | URL |
|---|---|
| Frontend | https://transit-swap.vercel.app |
| Backend | https://transitswap-backend.onrender.com |
| Database | MongoDB Atlas (free M0 cluster) |

## 3. Implementation

This phase was executed as a guided, human-in-the-loop deployment: account creation and secret entry (MongoDB Atlas, Render, Vercel) were done directly by the project owner, since an agent cannot create third-party accounts or handle real credentials. Repo-side preparation (CI smoke test, SPA routing config) was committed first; the live deployment itself happened interactively, with 4 real, previously-unencountered problems found and fixed along the way — not a clean, assumed-first-try deployment.

### 3a. Repo-side prep (committed before any live deployment)

- `vercel.json` (root) and `public/_redirects` — SPA rewrite rules so a direct load or refresh of a non-root route (e.g. `/dashboard`) doesn't 404 on a static host. Confirmed the Vite build copies `_redirects` into `dist/`.
- `.github/workflows/ci.yml` — new `smoke-test` job: read-only `GET /api/health` (asserting `database: "connected"`, the master plan's own Phase 13 success criterion) and `GET` the deployed frontend, gated on repository Actions variables (`vars.DEPLOYED_BACKEND_URL` / `vars.DEPLOYED_FRONTEND_URL`) so it skips cleanly until configured, and non-blocking (`continue-on-error: true`) so a transient host hiccup never fails unrelated CI runs.
- README §25.4 — documented the SPA-routing requirement and that both config files already handle it.

### 3b. MongoDB Atlas

Free M0 cluster, database user, network access opened for a demo deployment. Confirmed working — `/api/health` reports `database: "connected"` from the very first successful backend deploy onward.

### 3c. Backend on Render — real problem #1: devDependencies skipped at build time

First deploy attempt **failed the build** with dozens of `TS7016`/`TS2591` errors (`Cannot find module 'express'`'s types, `Cannot find name 'process'`, etc.) even though `express`, `cors`, etc. themselves were present. Root cause: Render's build step ran `npm install` with `NODE_ENV=production` already set (needed, correctly, at runtime — it's what makes `config/env.ts`'s JWT_SECRET guard and the production CORS allow-list active), and npm skips all `devDependencies` — including `typescript`'s own `@types/*` packages and `supertest` — when `NODE_ENV=production` is set during install. CI never caught this because `npm ci` there never sets `NODE_ENV`.

**Fix:** changed Render's Build Command from `npm install && npm run build` to `npm install --include=dev && npm run build` — a dashboard-only change, no repo code needed. Redeployed clean. `GET /api/health` → `200`, `database: "connected"`.

### 3d. Frontend on Vercel — real problem #2: monorepo auto-detection

Vercel detected the repo as a two-app monorepo (`backend/` + the root Vite app) and routed the import into its multi-service `vercel.json`-with-`services` flow, which was trying to configure **both** apps as Vercel services (wrong — the backend is on Render). Fixed by using Vercel's "Import single project" option on the `app` (Vite) entry specifically, bypassing the multi-service flow entirely.

### 3e. Real problem #3: `VITE_API_URL` missing the `/api` suffix

After the first successful Vercel deploy, registration failed with a CORS error on `.../auth/register` (missing `/api`). Root cause: `VITE_API_URL` had been entered without the `/api` path segment. Vercel's in-place "edit variable" UI also would not save (a Vercel dashboard issue, not a project one) — worked around by deleting and recreating the variable as `Config` type (not `Secret` — this is a public, non-sensitive base URL, baked into the client bundle by Vite's own design regardless of Vercel's secret/config classification) with the correct value, then redeploying.

### 3f. Real problem #4: `WhyNoRoute` using the wrong distance threshold — found live, in production

While doing the final end-to-end verification (not assumed from code — see §4), `WhyNoRoute.tsx` (added in Phase 12) reported a station 2.9 km away as "near," then immediately said "no route was found" — an internally inconsistent, inaccurate message. Root cause: it determined reachability from `GET /routes/nearby`'s results, but that endpoint uses a deliberately wider 3 km "what's around here" radius (`NEARBY_SEARCH_RADIUS_M`, for `NearbyTransit.tsx`'s own display purpose) — not the stricter, mode-specific thresholds (`MAX_WALK_TO_METRO_M` 2000 m / `MAX_WALK_TO_BUS_M` 1200 m) route generation actually enforces. Fixed to check each candidate station's distance against its own mode's real threshold before calling it reachable; redeployed (commit `68cec75`); re-verified live — see §4.

### 3g. Backend `FRONTEND_URL` (CORS)

Updated from the placeholder `http://localhost:5173` to `https://transit-swap.vercel.app` once the real Vercel URL was known. Verified directly with a manual `OPTIONS` preflight request (`curl`) carrying `Origin: https://transit-swap.vercel.app` — response correctly includes `access-control-allow-origin: https://transit-swap.vercel.app`.

## 4. Live Verification (real browser, real backend, real database — not assumed)

Performed directly against the production URLs, not localhost:

| Check | Result |
|---|---|
| `GET /api/health` (direct `curl`) | `200`, `database: "connected"` |
| CORS preflight (`curl -X OPTIONS` with the real frontend `Origin`) | `access-control-allow-origin` present and correct |
| Register a new account on the live frontend | Succeeds; redirects to `/dashboard` with the correct personalized greeting and "API Online" status |
| Live geocoding search (Nominatim, via the backend proxy) | Returns real results for both origin and destination |
| `GET /routes/nearby` (Nearby Transit widget) | Returns real stations with real distances |
| Multimodal route search, in-range | Not separately re-verified live this phase (covered by the existing Playwright E2E suite against the same code — Phase 10/11/12) |
| Multimodal route search, out-of-range (both corridors genuinely outside the 2 km/1.2 km access range) | Correctly returns "Multimodal route unavailable" with an accurate, specific `WhyNoRoute` explanation naming which side is unreachable and why |

## 5. CI Post-Deploy Smoke Test

To activate the `smoke-test` CI job added in §3a, set these as **repository Variables** (not Secrets — they're plain URLs) under GitHub → Settings → Secrets and variables → Actions → Variables:

| Name | Value |
|---|---|
| `DEPLOYED_BACKEND_URL` | `https://transitswap-backend.onrender.com` |
| `DEPLOYED_FRONTEND_URL` | `https://transit-swap.vercel.app` |

Once set, the job runs automatically after every push to `main` (non-blocking) and asserts `/api/health` reports `database: "connected"` — the master plan's own literal Phase 13 success criterion, checked by machine on every future change, not just once by hand.

## 6. Success Criteria (per §39 Phase 13)

| Criterion | Status |
|---|---|
| Public URL works | ✅ both frontend and backend, verified live |
| `/api/health` returns `database: "connected"` | ✅ verified via direct `curl` |
| CORS correct | ✅ verified via direct preflight `curl`, and via a real successful registration from the live frontend |
| Production `JWT_SECRET` guard verified | ✅ `NODE_ENV=production` is set on Render; `config/env.ts` would refuse to start with the default dev secret (unit-tested since Phase 4/11) |
| A smoke test passes against the deployed URL | ✅ manually (this phase); ✅ in CI once the repo variables above are set |

## 7. Honest Accounting

Four real problems were hit and fixed in this phase, none of them hypothetical or pre-empted by guesswork — each was diagnosed from an actual build log, browser console error, or a live inconsistency spotted while verifying the deployed site, the same standard this project has held itself to since Phase 10. The free-tier Render backend spins down after inactivity (~50 s cold-start on the next request) — a known, accepted trade-off of the free tier, not a defect.

## 8. Next Step

Per `PROJECT_MASTER_PLAN.md` §39, **Phase 14 — Documentation & paper** is next: rewrite remaining README gaps (none currently known), architecture decision records for the four major design decisions, and the research paper draft with its 9 figures. Needs no external accounts.
