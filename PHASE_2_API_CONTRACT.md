# TransitSwap Phase 2 API Contract

Project: TransitSwap

Phase: Phase 2 - Frontend / Backend Contract Verification

Date: 2026-09-20

## 1. Scope

Phase 2 verifies the contract between the existing React frontend and the existing Express backend. It does not rebuild TransitSwap, replace the routing stack, redesign the UI, change database schemas, change algorithms, upgrade dependencies, or add new features.

Verified stack:

- Frontend: React, TypeScript, Vite, Leaflet/OpenStreetMap.
- Backend: Node.js, Express, TypeScript, MongoDB/Mongoose support.
- Geocoding: backend Nominatim proxy.
- Road routing: backend OSRM integration.
- Multimodal routing: existing backend multimodal service using the existing transit dataset.
- Intelligence modules: existing weather, crowd, accessibility, reliability, TransitDNA, Pairwise Logistic Regression, explanation, history, feedback, admin, and evaluation functionality.

## 2. Shared Response Envelope

Most backend endpoints return:

```ts
{
  success: boolean
  data: T
  message?: string
}
```

Frontend service modules unwrap `data.data` and expose domain objects directly.

## 3. Frontend API Client

File: `src/services/api.ts`

- Base URL: `import.meta.env.VITE_API_URL || "http://localhost:5000/api"`.
- Auth token key: `ts_token`.
- Auth header: `Authorization: Bearer <token>`.
- Default timeout: `10000` ms.
- Error handling: Axios errors are normalized to `Error(message)` using backend `message` when present.

## 4. Auth Contract

| Frontend service | Backend route | Auth | Request | Response data |
|---|---|---:|---|---|
| `authService.register` | `POST /api/auth/register` | No | `name`, `email`, `password`, optional `accessibilityProfile` | `{ user: User, token: string }` |
| `authService.login` | `POST /api/auth/login` | No | `email`, `password` | `{ user: User, token: string }` |
| `authService.getMe` | `GET /api/auth/me` | Yes | none | `User` |
| `intelligenceService.updateProfile` | `PUT /api/auth/profile` | Yes | optional `name`, optional `accessibilityProfile` | `User` |
| `intelligenceService.updatePreferences` | `PUT /api/auth/preferences` | Yes | partial `UserPreferences` | `User` |
| `intelligenceService.resetTransitDna` | `POST /api/auth/transitdna/reset` | Yes | none | `User` |

Frontend auth state uses `ts_user` and `ts_token` in local storage via `src/context/AuthContext.tsx`.

## 5. Map, Geocoding, And Routing Contract

| Frontend service | Backend route | Auth | Request | Response data |
|---|---|---:|---|---|
| `mapService.search` | `GET /api/geocoding/search?q=...` | Yes | query `q` | `GeoLocation[]` |
| `routingService.getRoute` | `POST /api/routes` | Yes | origin/destination coordinates, optional `mode` | `RouteResult[]` |
| `multimodalService.getRoutes` | `POST /api/routes/multimodal` | Yes | origin/destination name and coordinates, optional `profile`, optional `departureTime` | `MultimodalRoute[]` |
| `multimodalService.getNearbyTransit` | `GET /api/routes/nearby` | Yes | query `latitude`, `longitude` | `NearbyTransitResponse` |

Road routing modes remain `driving`, `walking`, and `cycling`. Multimodal transport modes remain `walking`, `metro`, `bus`, and `auto`.

## 6. Weather, Accessibility, Crowd, And Evaluation Contract

| Frontend/service consumer | Backend route | Auth | Request | Response data |
|---|---|---:|---|---|
| route enrichment/backend smoke | `GET /api/weather` | Yes | query `latitude`, `longitude` | weather impact/current weather data |
| route enrichment/backend smoke | `GET /api/weather/current` | Yes | query `latitude`, `longitude` | weather impact/current weather data |
| `intelligenceService.getAccessibilityStations` | `GET /api/accessibility/stations` | Yes | none | `AccessibilityStation[]` |
| backend/API consumer | `GET /api/accessibility/stations/:stationId` | Yes | path `stationId` | accessibility station |
| backend/API consumer | `GET /api/accessibility/stations/:stationId/reports` | Yes | path `stationId` | accessibility reports |
| `intelligenceService.reportAccessibilityIssue` | `POST /api/accessibility/report` | Yes | `stationId`, `stationName`, `issueType`, `description` | success envelope |
| `intelligenceService.reportCrowd` | `POST /api/crowd/report` | Yes | `stationId`, `stationName`, `transportMode`, `crowdLevel` | success envelope |
| backend/API consumer | `GET /api/crowd/station/:stationId` | Yes | path `stationId` | station crowd estimate |
| backend/API consumer | `GET /api/crowd/history/:stationId` | Yes | path `stationId` | crowd history |
| `intelligenceService.getEvaluationMetrics` | `GET /api/evaluation` | No | none | `EvaluationMetrics` |
| backend/API consumer | `GET /api/evaluation/ml` | No | none | ML evaluation data |
| backend/API consumer | `GET /api/evaluation/ml/status` | No | none | ML status |
| backend/API consumer | `GET /api/evaluation/reliability/evaluation` | No | none | reliability evaluation data |
| backend/API consumer | `GET /api/evaluation/reliability/stats` | No | none | reliability stats |

Crowd report values are constrained to `LOW`, `MEDIUM`, and `HIGH`. Accessibility issue values are constrained by `backend/src/routes/accessibility.routes.ts`.

## 7. Journey, Feedback, Destinations, And Saved Routes Contract

All `/api/trips` endpoints require authentication.

| Frontend service | Backend route | Request | Response data |
|---|---|---|---|
| `tripService.saveJourney` | `POST /api/trips/save` | origin, destination, selected multimodal route, optional alternatives, optional departure time | `JourneyRecord` |
| `tripService.getHistory` | `GET /api/trips/history` | none | `JourneyRecord[]` |
| `tripService.getJourney` | `GET /api/trips/:id` | path Mongo id | `JourneyRecord` |
| `tripService.deleteJourney` | `DELETE /api/trips/:id` | path Mongo id | success envelope |
| `tripService.saveDestination` | `POST /api/trips/destinations` | name, address, latitude, longitude | `SavedDestinationRecord` |
| `tripService.getDestinations` | `GET /api/trips/destinations` | none | `SavedDestinationRecord[]` |
| `tripService.deleteDestination` | `DELETE /api/trips/destinations/:id` | path Mongo id | success envelope |
| `tripService.saveRoute` | `POST /api/trips/saved-routes` | name, origin, destination, selected route, optional accessibility profile | `SavedRouteRecord` |
| `tripService.getSavedRoutes` | `GET /api/trips/saved-routes` | none | `SavedRouteRecord[]` |
| `tripService.getSavedRoute` | `GET /api/trips/saved-routes/:id` | path Mongo id | `SavedRouteRecord` |
| `tripService.deleteSavedRoute` | `DELETE /api/trips/saved-routes/:id` | path Mongo id | success envelope |
| `intelligenceService.submitJourneyFeedback` | `POST /api/trips/:id/feedback` | rating, optional comment, optional issues, optional actual duration | `{ transitDnaUpdated, message, journey }` |

Important saved journey detail:

- `POST /api/trips/save` accepts the full selected `MultimodalRoute`.
- The persisted journey response stores `selectedRoute` as a compact backend `RouteSnapshot`.
- The frontend contract now models this as `JourneyRouteSnapshot` instead of incorrectly typing it as the full `MultimodalRoute`.

## 8. Admin Contract

All `/api/admin` endpoints require a valid JWT and `role === "admin"`.

| Frontend service | Backend route | Request | Response data |
|---|---|---|---|
| `adminService.getOverview` | `GET /api/admin/overview` | none | `AdminOverview` |
| `adminService.listStations` | `GET /api/admin/stations` | none | `AdminStation[]` |
| `adminService.createStation` | `POST /api/admin/stations` | station id, name, mode, optional coordinates | `AdminStation` |
| `adminService.updateStation` | `PUT /api/admin/stations/:stationId` | allowed station updates | `AdminStation` |
| `adminService.deactivateStation` | `PUT /api/admin/stations/:stationId/deactivate` | path station id | `AdminStation` |
| `adminService.deleteStation` | `DELETE /api/admin/stations/:stationId` | path station id | success envelope |
| backend/API consumer | `GET /api/admin/accessibility` | none | accessibility admin data |
| `adminService.updateAccessibility` | `PUT /api/admin/accessibility/:stationId` | allowed accessibility updates | `AdminStation` |
| `adminService.setLiftStatus` | `PUT /api/admin/accessibility/:stationId/lift` | `liftStatus: "working" | "broken"` | `AdminStation` |
| `adminService.listCrowdReports` | `GET /api/admin/crowd` | none | `AdminCrowdReport[]` |
| `adminService.deleteCrowdReport` | `DELETE /api/admin/crowd/:reportId` | path Mongo id | success envelope |
| `adminService.listFeedback` | `GET /api/admin/feedback` | optional `rating`, optional `issue` | `AdminFeedbackRecord[]` |
| `adminService.getDataset` | `GET /api/admin/dataset` | none | `AdminDatasetInfo[]` |

## 9. Contract Corrections Made In Phase 2

Only type-level frontend contract corrections were made:

- `src/services/intelligenceService.ts`: removed `any` return/request shortcuts for profile, preferences, and TransitDNA reset methods.
- `src/types/index.ts`: extended `User` to include optional `id`, optional `updatedAt`, and optional `crowd`/`weather` learned weights returned by the backend model.
- `src/services/tripService.ts`: added `JourneyRouteSnapshot` and changed `JourneyRecord.selectedRoute` to match the backend's persisted journey snapshot shape.

No runtime endpoint behavior was changed.

## 10. Preserved Non-Goals

Confirmed:

- No Google Maps integration was added.
- Leaflet/OpenStreetMap remains the frontend map stack.
- Nominatim remains the geocoding provider through the backend proxy.
- OSRM remains the road routing provider.
- Multimodal route generation remains in the backend multimodal service.
- Existing demo/synthetic data sources remain unchanged.
- No MongoDB/Mongoose schemas were changed.
- No recommendation, TransitDNA, Pairwise Logistic Regression, reliability, crowd, accessibility, weather, or route-ranking algorithms were changed.
- No dependencies were upgraded.
- No UI redesign was performed.

