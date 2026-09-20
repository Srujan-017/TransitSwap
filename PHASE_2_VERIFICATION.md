# TransitSwap Phase 2 Verification

Project: TransitSwap

Phase: Phase 2 - Frontend / Backend Contract Verification

Date: 2026-09-20

## 1. Phase Objective

Verify and safely document the contract between the existing React frontend and the existing Express backend while preserving the current architecture and functionality.

Phase 2 intentionally did not:

- Rebuild TransitSwap.
- Replace Leaflet/OpenStreetMap, Nominatim, or OSRM.
- Rewrite multimodal route generation.
- Change MongoDB/Mongoose schemas.
- Change recommendation, TransitDNA, Pairwise Logistic Regression, reliability, accessibility, weather, crowd, or admin algorithms.
- Upgrade dependencies.
- Redesign the UI.

## 2. Files Created

- `PHASE_2_API_CONTRACT.md`
- `PHASE_2_VERIFICATION.md`

## 3. Files Modified

- `src/services/intelligenceService.ts`
- `src/services/tripService.ts`
- `src/types/index.ts`

All modifications are frontend TypeScript contract/type corrections only.

## 4. Contract Corrections

### 4.1 Auth/Profile Contract Types

`src/services/intelligenceService.ts`

- `updateProfile(...)` now returns `Promise<User>`.
- `updatePreferences(...)` now accepts `Partial<UserPreferences>` and returns `Promise<User>`.
- `resetTransitDna()` now returns `Promise<User>`.

This matches the backend auth controller, which returns the updated user document for these endpoints.

### 4.2 User Type Alignment

`src/types/index.ts`

- Added optional `id` virtual.
- Added optional `updatedAt`.
- Added optional TransitDNA learned weights `crowd` and `weather`.

This matches the backend `User` model, where Mongoose timestamps and virtuals may be present and learned weights include optional crowd/weather fields for older document compatibility.

### 4.3 Journey Route Snapshot Alignment

`src/services/tripService.ts`

- Added `JourneyRouteSnapshot`.
- Changed `JourneyRecord.selectedRoute` from `MultimodalRoute` to `JourneyRouteSnapshot`.

This matches backend persistence behavior:

- The frontend sends a full `MultimodalRoute` when saving a journey.
- The backend stores a compact `RouteSnapshot` in `Journey.selectedRoute`.
- Saved routes still store the full route snapshot in `SavedRouteRecord.selectedRouteSnapshot`.

## 5. Frontend Build

Command:

```powershell
npm run build
```

Result: PASS.

Observed warning preserved:

- Vite warns that future native config loading will not support `__dirname` in `vite.config.ts`.

No Vite config change was made because the build passes and Phase 2 is not a tooling modernization pass.

## 6. Backend Build

Command:

```powershell
cd backend
npm run build
```

Result: PASS.

## 7. Backend Test Suite

Command:

```powershell
cd backend
npm test
```

Result: EXPECTED PARTIAL FAIL.

Passed before the known failure:

- `accessibility.test.ts`: all 249 accessibility tests passed.
- `ml.test.ts`: Pairwise Logistic Regression ML unit tests passed.
- `recommendationExplanation.test.ts`: all 19 recommendation explanation tests passed.
- `reliability.test.ts`: historical reliability, prediction interval, Monte Carlo, and smart departure hardening tests passed.

Stopped at:

- `userPreferences.test.ts`

Known preserved failures:

- `Low walking tolerance penalizes 1200m walk strongly`
- `Reliability priority ranks high reliability & low transfer risk route first`

Because `backend/package.json` chains tests with `&&`, later tests were not attempted after the known failure. No tests or preference algorithms were modified.

## 8. Local Runtime Environment

Observed:

- MongoDB Windows service: `Running`.
- Backend API: already listening on port `5000`.
- Frontend Vite dev server: already listening on port `5173`.
- `GET /api/health`: returned `success: true`, `data.status: "ok"`, `data.database: "connected"`.

## 9. API Smoke Verification

Smoke tests were run against the live backend at `http://localhost:5000/api` using a fresh throwaway user.

### 9.1 Auth/Profile

PASS:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/preferences`
- `POST /api/auth/transitdna/reset`

Observed contract:

- Register/login returned `{ user, token }`.
- Profile/preferences/TransitDNA reset returned updated `User` data.

### 9.2 Geocoding And Routing

PASS:

- `GET /api/geocoding/search?q=Andheri%20Mumbai`
- `POST /api/routes`
- `POST /api/routes/multimodal`
- `GET /api/routes/nearby`

Observed contract:

- Geocoding returned locations.
- OSRM route returned at least one route result.
- Multimodal route returned route candidates with segments.
- Nearby transit returned the expected payload shape.

### 9.3 Weather, Accessibility, Crowd, Evaluation

PASS:

- `GET /api/weather/current`
- `GET /api/accessibility/stations`
- `POST /api/crowd/report`
- `POST /api/accessibility/report`
- `GET /api/evaluation`

Observed contract:

- Weather endpoint returned data.
- Accessibility station list returned records.
- Crowd and accessibility report submissions were accepted.
- Evaluation metrics returned scenario data.

### 9.4 Trips, History, Destinations, Saved Routes, Feedback

PASS:

- `POST /api/trips/save`
- `GET /api/trips/history`
- `POST /api/trips/destinations`
- `POST /api/trips/saved-routes`
- `GET /api/trips/saved-routes`
- `POST /api/trips/:id/feedback`

Observed contract:

- Saved journey response returned a compact route snapshot with `selectedRoute.routeId`.
- History included the saved journey.
- Saved route response preserved the full selected route snapshot with `selectedRouteSnapshot.id`.
- Feedback returned the updated journey and message fields.

### 9.5 Admin Read Contract

PASS using a local development admin-role JWT signed with the backend's runtime development secret fallback. No token or real secret was documented.

- `GET /api/admin/overview`
- `GET /api/admin/stations`
- `GET /api/admin/crowd`
- `GET /api/admin/feedback`
- `GET /api/admin/dataset`

Admin write endpoints were verified by code contract inspection, not mutated in the smoke run.

### 9.6 Frontend Runtime

PASS:

- `GET http://localhost:5173` returned HTTP 200 and the Vite app shell.

## 10. Security And Secrets

Confirmed:

- No real secrets were added.
- No `.env` values were committed in Phase 2.
- No JWT token was documented.
- Smoke users were throwaway local test data.

Note:

- Local backend runtime currently uses the development JWT fallback because `backend/.env` does not define `JWT_SECRET`. This is acceptable for local verification only and remains guarded in production by `backend/src/config/env.ts`.

## 11. Data And Algorithm Integrity

Confirmed unchanged:

- Transit demo dataset.
- Accessibility demo/community model.
- Crowd reporting model.
- Weather fallback behavior.
- Historical reliability and Monte Carlo logic.
- TransitDNA learned weights logic.
- Pairwise Logistic Regression ranking logic.
- Recommendation explanation logic.
- Admin controller behavior.
- MongoDB schemas.

## 12. Known Issues Preserved

The two existing `userPreferences.test.ts` failures remain and were intentionally not fixed in Phase 2:

- Low walking tolerance does not satisfy the test's 1200m penalty expectation.
- Reliability priority does not satisfy the test's route ordering expectation.

These are algorithm/test-expectation issues and belong to a future dedicated preference-ranking phase.

## 13. Phase 2 Success Criteria

- [x] Frontend service modules inspected.
- [x] Backend route/controller contracts inspected.
- [x] Auth token contract verified.
- [x] API base URL contract verified.
- [x] Auth/profile/preference contracts verified.
- [x] Geocoding contract verified.
- [x] OSRM road routing contract verified.
- [x] Multimodal route contract verified.
- [x] Nearby transit contract verified.
- [x] Weather contract verified.
- [x] Accessibility contract verified.
- [x] Crowd contract verified.
- [x] Evaluation contract verified.
- [x] Journey/history contract verified.
- [x] Saved destination contract verified.
- [x] Saved route contract verified.
- [x] Feedback contract verified.
- [x] Admin read contract verified.
- [x] Frontend build PASS.
- [x] Backend build PASS.
- [x] Existing backend test caveat preserved and documented.
- [x] Local frontend runtime verified.
- [x] No dependency upgrades.
- [x] No schema changes.
- [x] No algorithm changes.
- [x] No UI redesign.
- [x] `PHASE_2_API_CONTRACT.md` created.
- [x] `PHASE_2_VERIFICATION.md` created.

Phase 2 stops here.

