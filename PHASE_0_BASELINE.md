# TransitSwap Phase 0 Baseline

Project: TransitSwap

Phase: Phase 0 - Freeze and Baseline Verification

Date: 2026-09-20

## Git State

- Git repository: FAIL - this folder is not currently inside a Git repository.
- Current branch: N/A
- Latest commit: N/A
- Working tree: N/A - no `.git` metadata found.
- Baseline branch: NOT CREATED - `phase-0-baseline` cannot be created without a Git repository.
- Baseline tag: NOT CREATED - `v-phase-0-baseline` cannot be created without a Git repository.

Baseline checkpoint could not be safely tagged because this folder is not a Git repository.

## Stack Verified From Current Code

- Frontend: PASS - React 19, TypeScript, Vite 8, Tailwind CSS v4, Leaflet/react-leaflet.
- Backend: PASS - Node.js, Express, TypeScript.
- Database: PASS - MongoDB/Mongoose support exists; runtime database status was disconnected because no backend `.env` / `MONGODB_URI` is configured.
- Map: PASS - Leaflet renders OpenStreetMap tiles via `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
- Geocoding: PASS - backend Nominatim proxy exists and returned results when called with authentication.
- Routing: PASS - backend OSRM routing exists and returned a driving route from the public OSRM server.
- Weather: PASS - OpenWeather integration exists; without `OPENWEATHER_API_KEY`, current runtime uses labelled demo weather fallback.
- Multimodal engine: PASS - backend `multimodalService` generated transit candidates from local demo transit data.

## Commands Run

- `git status --short --branch`: FAIL - not a Git repository.
- `git branch --show-current`, `git branch --list phase-0-baseline`, `git log --oneline -10`: FAIL - not a Git repository.
- `npm install`: PASS - frontend dependencies installed, 0 vulnerabilities reported.
- `npm install` in `backend/`: PASS - backend dependencies installed; npm audit reported 4 moderate vulnerabilities. No fixes or upgrades were run.
- `npm run build`: PASS - frontend build completed. Warning: Vite future native config loader does not support `__dirname` in `vite.config.ts`.
- `npm run build` in `backend/`: PASS - TypeScript build completed.
- `npm test` in `backend/`: FAIL - script stopped in `src/__tests__/userPreferences.test.ts`.
- `npm run dev` in `backend/`: PASS - API started on port 5000.
- `npm run dev`: PASS - Vite started on port 5173.

## Backend Test Result

Existing backend test script was run exactly as defined in `backend/package.json`.

- Fully passed before failure:
  - `accessibility.test.ts`: 249 accessibility tests passed.
  - `ml.test.ts`: Pairwise Logistic Regression unit tests passed.
  - `recommendationExplanation.test.ts`: 19 explanation-layer tests passed.
  - `reliability.test.ts`: historical reliability, prediction interval, Monte Carlo, and smart-departure hardening tests passed.
- Failed:
  - `userPreferences.test.ts`
  - Failing assertions:
    - "Low walking tolerance penalizes 1200m walk strongly"
    - "Reliability priority ranks high reliability & low transfer risk route first"
  - Suite summary printed: 6 passed, 2 failed.
- Blocked by `&&` chain after the failure:
  - `preferenceEndToEnd.test.ts`
  - `authPreferencePersistence.test.ts`
  - `feedback.test.ts`
  - `dashboard.test.ts`
  - `continuousImprovement.test.ts`
  - `admin.test.ts`
  - `src/utils/test-full-pipeline.ts`

No tests were modified.

## Runtime Startup

- Backend startup: PASS - server started at `http://localhost:5000`.
- Health endpoint: PASS - `GET /api/health` returned `status: ok`.
- MongoDB: BLOCKED - not configured. Health reported `database: disconnected`; backend logged that DB connection was skipped because `MONGODB_URI` is not set.
- Frontend startup: PASS - Vite started at `http://localhost:5173`.
- Frontend load: PASS - HTTP 200 for `/`, expected root shell present.
- Browser render: PASS - React mounted into `#root`, visible page text included TransitSwap/journey content, and no console errors were captured on initial load.

## Smoke Test Results

The protected API smoke tests used a locally signed development JWT with the existing development fallback secret from code. No real credentials or secrets were printed.

- Application loads: PASS.
- Registration/login: BLOCKED - MongoDB unavailable. Registration returned `users.findOne() buffering timed out after 10000ms`.
- Authentication state persistence: NOT VERIFIED - requires frontend login with a working database-backed user.
- Current location/browser permission: NOT VERIFIED - browser location permission was not requested in Phase 0.
- Destination search/geocoding: PASS - authenticated Nominatim proxy returned results for "Andheri Mumbai".
- Map render: PARTIAL PASS - Leaflet/OpenStreetMap implementation verified in code; initial landing-page browser render passed. Interactive map page was not manually driven through login.
- Road route search: PASS - `POST /api/routes` returned one OSRM route with provider `osrm`.
- Multimodal route request: PASS - `POST /api/routes/multimodal` returned 3 candidates.
- Route candidates returned: PASS.
- Weather fallback: PASS - API returned `Demo Weather Data` with `isDemoData: true`.
- Crowd information/fallback: PASS - multimodal route included crowd summary; direct unknown station check returned `UNAVAILABLE`.
- Accessibility filtering: PASS - API returned 25 synthetic demo station records; multimodal route included accessibility evaluation.
- Reliability information: PASS - multimodal route included reliability data.
- Connection risk / arrival confidence: PASS - multimodal route included missed-connection risk and confidence interval fields.
- TransitDNA / recommendation information: PASS - multimodal route included `transitDnaScore`.
- Recommendation explanation: PASS - multimodal route included `whyRecommended`.
- Journey history: BLOCKED - `GET /api/trips/history` returned 503 because MongoDB is not connected.
- Feedback: BLOCKED - requires saved journey and MongoDB.
- Dashboard: PARTIAL PASS - public evaluation API returned metrics; authenticated user dashboard UI was not driven through login.
- Profile: BLOCKED - requires database-backed authenticated user.
- Admin: PARTIAL PASS - admin-protected API endpoints `/api/admin/overview`, `/api/admin/dataset`, and `/api/admin/stations` responded with a signed admin-role dev JWT; write operations require MongoDB.

## Major Module Status

- Authentication: FAIL/BLOCKED - implemented, but registration/login cannot work without MongoDB.
- User profile: BLOCKED - implemented, requires MongoDB-authenticated user.
- Preferences: FAIL - existing `userPreferences.test.ts` has 2 failing assertions.
- Multimodal routing: PASS.
- Metro: PASS - static demo metro network exists and is used.
- Bus: PASS - static demo bus network exists and is used.
- Walking: PASS - generated multimodal segments include walking.
- Auto: PASS - fare config and multimodal support exist.
- Fare: PASS - fare config exists and routes include fare.
- Last mile: PASS - multimodal route enrichment includes last-mile options.
- Accessibility: PASS.
- Crowd: PASS with limitations - demo/user-report blend exists; direct reports require MongoDB.
- Weather: PASS with demo fallback.
- Reliability: PASS.
- Arrival confidence: PASS.
- Connection risk: PASS.
- Smart departure: PASS.
- TransitDNA: PASS.
- Pairwise Logistic Regression: PASS - ML unit test passed and ranker active in multimodal response.
- Recommendation explanation: PASS.
- Journey history: BLOCKED - MongoDB unavailable.
- Saved destinations: BLOCKED - MongoDB unavailable.
- Feedback: BLOCKED - MongoDB unavailable and later tests were not reached.
- Admin: PARTIAL PASS - read endpoints work in demo/disconnected mode; write endpoints require MongoDB.
- Evaluation: PASS - evaluation endpoint returned metrics.

## Architecture Verification

Actual current flow is approximately:

User -> React Frontend -> Express REST API -> backend multimodal route generation -> accessibility filtering -> route enrichment -> weather -> crowd -> fare -> reliability -> connection risk -> arrival confidence -> last mile -> TransitDNA -> Pairwise Logistic Regression ranking -> recommendation explanation -> journey/feedback persistence when MongoDB is available.

This matches the requested architecture at a high level. No architecture changes were made.

## Routing Implementation

- Leaflet map display: PASS.
- OpenStreetMap tiles: PASS.
- Nominatim geocoding: PASS, auth-protected.
- OSRM road routing: PASS.
- Project-owned multimodal transit combinations: PASS - generated by `backend/src/services/multimodalService.ts` from local transit data.
- Google Maps: NOT PRESENT in current routing stack.

## Data Source Classification

- Transit network data: DEMO/SYNTHETIC - static Mumbai metro/bus demo corridor in `backend/src/data/transitData.ts`.
- Metro data: DEMO/SYNTHETIC - approximate static station/line data.
- Bus data: DEMO/SYNTHETIC - approximate static stops/routes.
- Crowd data: MIXED - synthetic demo history plus authenticated user reports when MongoDB is connected.
- Accessibility data: DEMO/SYNTHETIC by default; MIXED if admin/community MongoDB records exist.
- Weather data: MIXED - live OpenWeather when configured, deterministic demo weather otherwise.
- Reliability/history data: MIXED - synthetic demo observations and user journey observations when MongoDB is connected.
- User preference data: USER-GENERATED when MongoDB is connected; unavailable in the current no-DB runtime.
- Journey history / saved destinations / saved routes: USER-GENERATED when MongoDB is connected; blocked in current runtime.

## ML / Intelligence Verification

- Weighted/profile scoring: PASS.
- TransitDNA: PASS.
- Pairwise Logistic Regression: PASS.
- Preference learning: PARTIAL/FAIL - implementation exists, but `userPreferences.test.ts` currently fails 2 assertions.
- Reliability calculation: PASS.
- Monte Carlo connection-risk calculation: PASS.
- Arrival confidence: PASS.
- Recommendation explanation: PASS.

## Environment Configuration

Actual env template files:

- `.env.example`: PRESENT.
- `backend/.env.example`: PRESENT.
- `.env`: MISSING.
- `.env.local`: MISSING.
- `backend/.env`: MISSING.
- `backend/.env.local`: MISSING.

Expected variables in templates/code:

- Frontend `VITE_API_URL`: PRESENT in `.env.example`.
- Backend `PORT`: PRESENT in `backend/.env.example`.
- Backend `MONGODB_URI`: PRESENT in `backend/.env.example`, missing at runtime.
- Backend `JWT_SECRET`: PRESENT in `backend/.env.example`; runtime used code fallback because `.env` is absent.
- Backend `OPENWEATHER_API_KEY`: PRESENT in `backend/.env.example`, missing at runtime.
- Backend `FRONTEND_URL`: PRESENT in `backend/.env.example`.
- Backend `OSRM_API_URL`: PRESENT in code as optional override, not listed in `backend/.env.example`.

No actual secret values were printed.

## Deployment Configuration

- Vercel config file: NOT FOUND.
- Render config file: NOT FOUND.
- Railway config file: NOT FOUND.
- Docker config: NOT FOUND.
- Deployment docs: PRESENT in `README.md`.
- CORS config: PASS - backend allows configured `FRONTEND_URL`, with localhost flexibility in development and stricter production behavior.
- Frontend API URL config: PASS - `VITE_API_URL` with `http://localhost:5000/api` fallback.

## Problems Identified

### A. Blocking

- No Git repository metadata is present, so Phase 0 branch/tag checkpoint cannot be created.
- MongoDB is not configured, blocking registration/login, profile, journey history, saved destinations/routes, feedback persistence, and report submissions.
- Registration without MongoDB currently waits for Mongoose buffering and returns a 500 timeout instead of an immediate graceful 503.

### B. Existing Bugs

- `backend/src/__tests__/userPreferences.test.ts` fails two assertions:
  - low walking tolerance does not penalize a 1200m walk strongly enough for the test expectation.
  - reliability priority does not rank the high-reliability/low-risk route first for the test expectation.

### C. Configuration Issues

- `backend/.env` is absent, so runtime uses the development JWT fallback and no MongoDB/OpenWeather key.
- `backend/.env.example` does not list optional `OSRM_API_URL`, although code supports it.
- Backend npm audit reports 4 moderate vulnerabilities after install. No dependency fixes were run in Phase 0.

### D. Data Limitations

- Transit, metro, bus, accessibility, and baseline crowd datasets are demonstration/synthetic datasets.
- Weather is demo data until `OPENWEATHER_API_KEY` is configured.
- User-generated crowd/accessibility/reliability/preference data requires MongoDB and real app usage.

### E. Documentation Mismatches

- `README.md` says that when `MONGODB_URI` is absent, journeys are saved to memory only; current `journeyService` returns 503 when MongoDB is disconnected.
- Geocoding is auth-protected in current code, so unauthenticated destination search API calls return 401.
- Root/health responses identify the app as "Phase 30", while this baseline task is Phase 0 verification.

### F. Future Phase Work - Do Not Touch In Phase 0

- Real transit/GTFS data upgrade.
- Accessibility dataset replacement with field-survey or authority data.
- Crowd data improvement.
- Reliability validation/calibration.
- ML validation and preference-learning fixes.
- Final recommendation tuning.
- UI integration polish.
- Research/evaluation expansion.
- Deployment verification.

## Files And Artifacts Changed During Phase 0

Documentation created:

- `PHASE_0_BASELINE.md`

Generated by existing commands:

- `node_modules/` from frontend `npm install`.
- `backend/node_modules/` from backend `npm install`.
- `dist/` from frontend `npm run build`.
- `backend/dist/` from backend `npm run build`.
- `package-lock.json` and `backend/package-lock.json` were touched by `npm install` while installing from the existing dependency definitions.

No functional source code, UI code, API contracts, database schemas, datasets, algorithms, or `package.json` dependency versions were intentionally changed.

## Success Criteria Checklist

- [x] Existing project inspected
- [x] Git state recorded
- [x] Existing work preserved
- [x] No destructive commands used
- [x] Frontend dependencies verified
- [x] Backend dependencies verified
- [x] Frontend build tested
- [x] Backend build tested
- [x] Existing tests executed
- [x] Environment configuration checked
- [x] Backend startup checked
- [x] Frontend startup checked
- [x] Main end-to-end flow smoke-tested where possible
- [x] Routing stack verified
- [x] Multimodal implementation verified
- [x] Data sources classified
- [x] Existing ML/intelligence verified
- [x] Deployment configuration inspected
- [x] Baseline report created
- [x] No future feature implemented
- [x] No existing functionality intentionally changed

Phase 0 stops here.
