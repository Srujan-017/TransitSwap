# Phase 15 — Demo, Presentation and Viva: Verification

**Date:** 13 Nov 2026 · **Plan reference:** `PROJECT_MASTER_PLAN.md` §39 Phase 15 and §43. This phase also closes the final-week completion plan in `PROJECT_COMPLETION_PLAN.md` (completion phases 1–6).

## What this phase delivered

| Deliverable | Where |
|---|---|
| Demo script: exact steps, what to say, known dead ends and fixes | `docs/demo/DEMO_SCRIPT.md` |
| Slides built from the real result figures (14 slides, speaker notes) | `docs/demo/TransitSwap_Presentation.pptx` |
| Truthful viva answers: the five hard questions from §32, headline results, likely follow-ups | `docs/demo/VIVA_QA.md` |
| Live deployment checked against the latest code | see below |

## Evidence

**Deployment (checked 13 Nov 2026)**

| Check | Result |
|---|---|
| Frontend `https://transit-swap.vercel.app` serves the latest build | ✅ the Research benchmark card, the "other routes were excluded" list, the accessible-name fixes and the rating-group labels are all present in the deployed bundle |
| Backend `/api/health` | ✅ `database: "connected"`, latest `phase` string |
| Demo account signs in on the live backend | ✅ HTTP 200 |
| Wheelchair, trip where every route is unusable (Indiranagar → Cubbon Park) | ✅ HTTP 404 with 4 excluded routes and typed reasons (station and walking distance) |
| Wheelchair, trip where some routes are unusable (Whitefield → Indiranagar) | ✅ HTTP 200: 2 recommended, 2 excluded with reasons |
| Same trips, standard profile | ✅ HTTP 200, nothing excluded, no `excludedRoutes` field |
| Crowd rule on the live site, Hoodi → MG Road, wheelchair | ✅ weekday 08:30: no route (crowd + station reasons); weekday 14:30, weekday 21:36 and Saturday 08:30: one route |
| `/api/evaluation/ml/status` | ✅ 200 |

**Repository and CI:** GitHub Actions is green on the latest commit (type-check, build, 29 backend test files in strict mode, 35 frontend tests). Slides were rendered through PowerPoint and checked slide by slide.

## Not done / needs the owner

1. **An admin account on the live site.** Admin accounts are deliberately created only by a server-side script that needs the production `MONGODB_URI`; that secret is not available to the assistant and an admin account was not created. To create one: set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `MONGODB_URI` (the Atlas string from the Render environment) in a terminal and run `npx ts-node --transpile-only src/utils/seedAdmin.ts` from `backend/`. The admin step in the demo is optional.
2. **CI post-deploy smoke test** is still skipped: set the repository variables `DEPLOYED_BACKEND_URL` (`https://transitswap-backend.onrender.com`) and optionally `DEPLOYED_FRONTEND_URL` under GitHub → Settings → Secrets and variables → Actions → Variables. Not set from here (no GitHub settings access).
3. **LaTeX documents are not compiled on this machine** (local MiKTeX is incomplete). Compile `docs/report/report.tex` and `docs/paper/ieee/TransitSwap_IEEE.tex` on Overleaf. The Word version of the paper was exported to PDF and is 6 pages.
4. **Report front matter:** university name/affiliation, the four USNs, HOD and Principal names (marked `<…>` in `report.tex`).
5. **No rehearsal with people.** The viva answers and demo flow are checked against the code and the live site, but have not been practised aloud.

## Honest status against §43 (Definition of Done)

Met: bugs B1–B12 fixed with regression tests; both packages type-check clean and `build` type-checks; `npm test` exits 0 with every file executed (a skip counts as a failure in CI); CI blocks on type and test errors; `helmet` and rate limiting active, writes validated; `/api/evaluation` authenticated and cached; frontend route-split; live frontend and backend with `database: "connected"`; baseline disagreement against 5 baselines with ablation and sensitivity data; ML trained on both labels with a held-out split; paper, 9 figures, ADRs, report and viva material.

Not met or only partly met, and stated as such everywhere:

- Network coverage is below the Phase 5 target (≥60 %): the network is a synthetic demonstration corridor.
- Candidate search is a bounded heuristic, not RAPTOR.
- The learned model does not beat the rule-based baseline on the synthetic benchmark (87.5 % vs 91.7 %).
- Prediction-interval coverage cannot be validated on real data (none exists); the code reports "not empirically validated" rather than a number.
- All data synthetic; no user study; accessibility checked with an automated scanner, not a screen-reader study.
- The dev-only dependency advisories with no available fix remain (Phase 11 decision).
- Master-plan items that depend on the live site's admin account and CI variables are listed above as owner actions.
