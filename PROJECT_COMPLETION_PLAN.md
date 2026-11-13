# TransitSwap — Completion Audit and Final-Week Plan

**Audit date:** 12 Nov 2026 · **Submission deadline:** ~19 Nov 2026
**Audited:** GitHub `Srujan-017/TransitSwap` `main` (5af16ad, identical to the uploaded zip), the deployed site, and this local folder, against `PROJECT_MASTER_PLAN.md` (Phases 4–15 and the §43 Definition of Done) plus the features added after Phase 14.

---

## 1. How this was checked

| Check | Result |
|---|---|
| Backend typecheck (`tsc --noEmit`) | ✅ clean |
| Backend tests (`npm test`) | ⚠️ reports 26/26 PASS, but 8 of 10 API test files **skipped** and 3 files hung and needed a retry (see B2) |
| Frontend typecheck, 23 unit tests, production build | ✅ all pass; main bundle 269 kB (plan target: below 459 kB) |
| GitHub Actions CI | ❌ backend **Test** step has failed on all 22 runs since Phase 11 (8 Oct); last green run was Phase 10 |
| Deployed site | ✅ https://transit-swap.vercel.app returns 200; Render `/api/health` reports `database: "connected"` (about 34 s cold start); the deployed code matches GitHub `main` |
| Live walkthrough (local backend + in-memory MongoDB + browser) | Register, plan trip (Standard and Wheelchair), voice navigation to arrival, Save Route, Save Journey, History rating, Saved Routes, Profile, TransitDNA reset, Research page, Dashboard benchmark, Admin console, session expiry |

## 2. What is complete and working

Phases 4–14 are implemented and documented (`PHASE_4`–`PHASE_14_VERIFICATION.md`). Features added after Phase 14 are present and work live:
- accessibility hard constraints (walking cap and crowd rule)
- the UI redesign
- bus numbers, timings and direction
- map layers, fullscreen, locate-me and click-for-address
- the route-mix bar and real-street route lines
- voice-guided navigation
- the Dashboard and Landing redesigns

The Admin console, history feedback, saved routes and profile all work end to end.

## 3. Pending work — verified findings

### A. Work that was done in earlier sessions but never reached GitHub
All of it is recoverable exactly from the session log, so it will be re-applied rather than rewritten.

| # | Item | Evidence |
|---|---|---|
| A1 | **"Full project audit: fix 8 real bugs" (local commit 04b4349)** — see the list below | Code check; two bugs reproduced live |
| A2 | **Transit-App style UI (local commit c93a9cc)** — departures-board rows for bus/metro legs, crowd picker with icon cards, navigation card (ETA pill, route badge, progress bar, next-stop card, boarding countdown) | Absent from code and from the deployed bundle |
| A3 | **College project report** `docs/report/` (`report.tex` with chapters Introduction → Testing, figure generators) | Not in GitHub or the local folder |
| A4 | **IEEE paper** `docs/paper/ieee/` and `backend/scripts/generate-accessibility-paper-data.ts`, `print-worked-example.ts` | Local only; the paper cites the repo for reproducibility |

A1 contains these fixes:

| Fix | Status |
|---|---|
| An expired session (401) does not log the user out | Reproduced live: header still shows the user; every page says "Invalid or expired token" |
| "Reset Learned Weights" keeps showing old weights until reload | Reproduced live |
| Map click-for-address race: an older click's address can overwrite a newer pin | Missing in code |
| Location-search race: stale results can overwrite fresh ones | Missing in code |
| Voice navigation crashes on a route with zero segments | Missing in code |
| 5 backend test files use `console.assert`, so about 85 assertions can never fail | Missing in code |
| In-memory MongoDB index-build hang in the test harness | Missing in code |
| Benchmark request timeout | Already fixed by the 60 s edit made on GitHub |

### B. Bugs in the current code

| # | Bug | Evidence |
|---|---|---|
| B1 | GitHub CI red since Phase 11 | Actions history: backend **Test** step failing |
| B2 | Test runner is false-green: a "SKIPPED — MONGODB_URI is not configured" exit counts as PASS. 8/10 `api/*.test.ts` files did not run; `dashboard`, `continuousImprovement` and `admin` tests hang until killed | Local run log |
| B3 | When every route is excluded, the API returns no exclusion reasons, and the page wrongly says "no combination connects them" | Live: Hoodi → MG Road, wheelchair profile |
| B4 | Crowd time-slot bug: `nearestSlot()` only returns 08/14/18/20:00, so the 09:00 and 12:00 records (4 of 16) are never matched; Majestic and MG Road fall back to HIGH at every hour, blocking wheelchair, senior, pregnant, stroller and luggage routes at night | Live: "HIGH crowd" at 9:36 pm |
| B5 | Research page's ML status ignores the user's mobility profile and shows "standard profile baseline" weights, while ranking uses the profile preset | Live; `evaluationController.ts:39` |
| B6 | Accessibility warnings can be listed twice (no de-duplication) | Found in the paper experiments |
| B7 | Wheelchair rule ignores `stepFreePlatform` and treats a ramp as a lift substitute | Stated as a limitation in the paper |
| B8 | `/api/health` says "Phase 30 — AI-assisted…"; the Dashboard card is titled "(Phase 16)" | Code |

### C. Incomplete against the master plan

| # | Item | Plan reference |
|---|---|---|
| C1 | Benchmark's 5 baselines, 6-feature ablation and p50/p95 latency are computed but not shown in the UI (the Dashboard disclaimer mentions them) | Phase 9 deferral |
| C2 | App accessibility audit not done: e.g. the 5 rating stars have no accessible names (WCAG 4.1.2); no contrast or keyboard sweep | Phase 12 deferral, §43 |
| C3 | CI post-deploy smoke test never runs: the repository variables are not set, so the job is skipped | Phase 13, §43 |
| C4 | README out of date: lists "Visual / Hearing" profiles that don't exist; still describes the single-class label problem Phase 8 fixed; no voice navigation, Research page, walking cap or live URL; no screenshots | §28, §43 |
| C5 | **Phase 15 not started**: demo script, slides, viva Q&A, demo accounts on the live site, `PHASE_15_VERIFICATION.md` | Phase 15, §43 |
| C6 | Small polish: GitHub Actions on deprecated Node 20 actions; "© 2025" footer; "Location unavailable" hint left on the arrival screen | — |

### D. Accepted limitations (keep documented, no work planned)
- Network coverage below the Phase 5 target (≥60%).
- Heuristic route search instead of RAPTOR (Phase 6).
- 3 dev-only `npm audit` findings with no fix available (Phase 11).
- Synthetic data; no user study.

---

## Progress log

| Phase | Status | Evidence |
|---|---|---|
| 1. Restore and stabilise | ✅ done 12 Nov | Lost UI + 8 audit fixes restored and checked live; test runner can no longer pass on a skip or dead database; GitHub CI green (first time since Phase 10) |
| 2. Accessibility correctness | ✅ done 13 Nov | B3–B7 fixed. Backend 29/29 test files pass in strict mode, frontend 30/30 tests, both typechecks clean. Checked live: the Hoodi → MG Road wheelchair trip (previously a 404 caused by the crowd-hours bug) now returns a route, shows the data warning once, and lists the 2 excluded routes with reasons |
| 3. Research page completeness | ✅ done 13 Nov | New on-demand "Route Ranking Benchmark" card shows agreement with all 5 baselines, the 6-feature ablation and p50/p95/mean latency (checked live: renders after ~20 s); stale "Phase 16"/"Phase 30" labels replaced; 5 new component tests (frontend 35/35) |
| 4. Accessibility audit | ✅ done 13 Nov | axe-core (WCAG 2.1 A/AA) run on every main screen in the live app: landing, login, register, dashboard, plan (idle + results), navigation, history (with feedback form), saved routes, profile, research now report 0 violations. Fixed: contrast tokens, unnamed password/star/marker controls, unlabeled date/time/profile inputs, missing `main` landmark, route-label colours, crowd-report card layout. Admin console not scanned. Not covered by an automated scan: screen-reader and manual keyboard walkthroughs |
| 5–6 | pending | — |

Note for Phase 5: the crowd-hours fix changes the "deployed" crowd numbers in the paper; regenerate them with `generate-accessibility-paper-data.ts`.

## 4. Phased plan for the final week

Each phase follows the master plan's §40 procedure: implement, typecheck both packages, full tests, live browser check, then a verification note. One phase at a time.

| Phase | Day | Scope | Done when |
|---|---|---|---|
| **1. Restore and stabilise** | 1 | A1, A2 (re-applied from the session log); B1, B2: a skip must not count as a pass, fix the three hanging tests, all 10 API test files run against MongoDB | Every test file really runs and passes; CI green on GitHub; both lost bugs fixed live |
| **2. Accessibility correctness and explanations** | 2 | B3: return each excluded route's typed reason and show "Why no accessible route?" with them. B4: fix crowd slots. B5, B6, B7 | The Hoodi → MG Road wheelchair search shows real reasons; no HIGH crowd at night from a fallback; regression tests added |
| **3. Research and Dashboard completeness** | 3 | C1: show baselines, ablation and latency on the Research page. B8 labels | All benchmark numbers visible and sourced |
| **4. App accessibility audit** | 3–4 | C2: accessible names, keyboard paths, visible focus and contrast on Plan Trip, Results, Navigation, History and Profile | Main flows usable by keyboard; no unlabeled controls |
| **5. Documentation and paper sync** | 4–5 | A3 report and A4 paper restored and pushed; re-run paper data if Phase 2 changed results and update the paper's numbers; C4 README; C6 polish | README matches the code; the paper's numbers regenerate from the repo |
| **6. Deploy and demo (master-plan Phase 15)** | 5–6 | Redeploy Vercel and Render; C3 CI variables; demo accounts and admin on the live site; C5 demo script, slides and viva Q&A; `PHASE_15_VERIFICATION.md` | Live demo runs with no dead end; every spoken claim matches the code |
| Buffer | 7 | Final full regression on the live site; submission | — |

**Decision point in Phase 2:** fixing B4 (crowd slots) and B7 (wheelchair rule) changes some of the paper's numbers. Recommended: fix both, because B4 blocks valid routes during an evening demo, then regenerate the paper data (one command) in Phase 5.
