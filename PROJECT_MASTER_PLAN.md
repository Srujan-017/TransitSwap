# TransitSwap — Project Master Plan

**Document type:** Audit result + gap analysis + completion roadmap
**Audit date:** 2026-10-07
**Audit basis:** The uploaded source tree only. Every claim below is grounded in a file reference, a command I ran, or a probe I executed against the compiled backend.
**Audit scope:** Read-only. No source file was modified. `node_modules/` (both packages) and `backend/dist/` were created by the sanctioned install/build verification steps.

---

## 1. Project Overview

TransitSwap is a full-stack TypeScript web application that recommends urban public-transport journeys by scoring several route attributes at once instead of returning only the shortest route.

- **Frontend:** React 19 + Vite 8 + Tailwind CSS v4 + Leaflet, 10 pages, ~5,900 lines (`src/`).
- **Backend:** Express 4 + TypeScript + Mongoose 8, 50 REST endpoints, ~7,400 lines (`backend/src/`).
- **Transit data:** a static, hand-authored Mumbai corridor (19 metro stations across 2 lines, 12 bus stops across 4 routes) in `backend/src/data/transitData.ts`.
- **Database:** MongoDB, optional — the backend runs without it and degrades to demo data or explicit 503s.

The implementation is substantially real: the routing engine, accessibility rule engine, weighted ranking, pairwise logistic regression, Monte Carlo resampling, explanation generator, auth, admin console and 13 test files all exist as working code, not stubs. Both packages build. The backend compiles with zero TypeScript errors.

What is *not* yet true is the project's own headline claim. The multi-criteria engine does not currently produce decisions that differ from a trivial shortest-time baseline, and the two features most prominently marketed — Monte Carlo connection risk and TransitDNA preference learning — have no effect on the ranking that users see. Sections 27 and 34 give the evidence.

### Current phase (derived, not assumed)

`PHASE_0_BASELINE.md` … `PHASE_3_VERIFICATION.md` (all dated 2026-09-20) are an accurate, honest audit trail. They record Phase 3 — *Routing Engine Hardening* — as complete and explicitly confirm no Phase 4 work was done. My independent verification agrees with those documents, including their record of the `npm test` failure and the Node-version warning.

**The project stands at: end of Phase 3. Phase 4 has not begun.**

`README.md` is a *different* matter: it is the oldest document and has drifted far from the code (Section 28).

---

## 2. Problem Statement

A commuter choosing between public-transport options must weigh travel time, fare, walking distance, number of transfers, station accessibility, crowding and weather exposure simultaneously. Mainstream navigation tools optimise primarily for travel time and surface little of the rest, and they cannot apply a hard constraint such as "this route must be step-free end to end."

TransitSwap's premise is that a transparent, auditable multi-criteria ranking plus per-route plain-language justification is more useful to such a commuter than a single time-optimal answer.

**Honest restatement of the problem actually solved today:** given an origin and destination *inside a small seeded Mumbai corridor*, TransitSwap enumerates up to four hand-coded journey patterns, enriches them with demo weather/crowd/accessibility context, filters out routes that violate hard accessibility constraints, and ranks the survivors with a weighted linear score, explaining each result.

---

## 3. Objectives

**Implemented:**

1. Generate multimodal (walk / metro / bus / auto) candidate journeys from a transit dataset — `backend/src/services/multimodalService.ts`.
2. Validate every generated candidate for connectivity, continuity and geometry before returning it — `validateCandidate()`, `multimodalService.ts:489`.
3. Enrich candidates with weather, crowd, accessibility, reliability and connection-risk context — `backend/src/controllers/multimodalController.ts:19`.
4. Apply accessibility as a *hard* constraint (route rejection) plus a *soft* score, per mobility profile — `backend/src/services/accessibilityService.ts`.
5. Rank candidates with a weighted linear score over 7 normalised features — `backend/src/services/ml/mlPreferenceService.ts:210`.
6. Explain each recommendation in plain language — `transitDnaService.generateWhyRecommended()`.
7. Persist users, journeys, saved routes, destinations, feedback and community reports with JWT auth.
8. Provide an admin console over stations, accessibility, crowd reports and feedback.

**Stated but not yet achieved:**

9. Demonstrate that multi-criteria ranking yields *measurably different and better* routes than single-criterion baselines. (Currently 100% agreement with the shortest-time baseline — Section 34.)
10. Learn per-user preferences and apply them. (The learned model trains, but on a degenerate single-class dataset, and its effect is confounded — Section 20.)

---

## 4. Proposed Solution (as built)

```
origin + destination + profile + optional departure time
        │
        ▼
4 hand-coded journey-pattern generators      ← backend/src/services/multimodalService.ts
  walk→metro→walk
  walk→bus→walk
  walk→metro→auto
  walk→bus→walk→metro→walk
        │  (OSRM for walk/auto legs; haversine×factor fallback)
        ▼
candidate validation + de-duplication + label assignment (FASTEST/CHEAPEST/MIN_WALKING/BALANCED)
        │
        ▼
accessibility hard filter (per profile)      ← accessibilityService.filterRoutes()
        │
        ▼
enrichment: weather · crowd · reliability · 90% prediction interval
            · Monte Carlo connection risk · smart departure · last-mile · sustainability
        │
        ▼
weighted linear ranking over 7 features      ← mlPreferenceService.rankRoutes()
        │
        ▼
explanation tags + personalisation flag      ← transitDnaService.generateWhyRecommended()
        │
        ▼
ranked EnrichedRoute[] → React UI
```

---

## 5. Target Users

- **Primary (designed for):** urban commuters with a mobility, mobility-adjacent or comfort constraint — the seven profiles in `backend/src/types/index.ts:14` are `standard`, `wheelchair`, `senior`, `pregnant`, `stroller`, `luggage`, `reduced_mobility`. The accessibility engine is genuinely the most developed differentiator in the codebase.
- **Secondary:** cost- or comfort-sensitive commuters, via the `fastest` / `cheapest` / `comfort` pseudo-profiles.
- **Operator:** an admin maintaining station and accessibility records (`/admin`).
- **Actual users today:** nobody outside the seeded corridor. 98.6% of origin/destination pairs on a uniform grid over Mumbai return zero routes (Section 14).

---

## 6. Technology Stack (verified from `package.json` + lockfiles)

| Layer | Technology | Version in repo |
|---|---|---|
| UI | React / React DOM | 19 |
| Build | Vite | 8.2.1 |
| Styling | Tailwind CSS (via `@tailwindcss/vite`) | v4 |
| Maps | Leaflet + react-leaflet | 1.9 / 5.0 |
| Routing (client) | react-router-dom | 7.18 |
| HTTP | axios | 1.19 |
| Icons | lucide-react | 1.30 |
| Server | Express | 4.19 |
| Language | TypeScript | 5.7 (fe) / 5.5 (be) |
| ODM | Mongoose | 8.4 |
| Auth | jsonwebtoken 9 + **bcryptjs 2.4** | — |
| Validation | express-validator | 7.1 |
| Logging / limits | morgan 1.10, express-rate-limit 7.3 | — |
| Test runner | **none** — bare `ts-node` scripts chained with `&&` | — |

Externals: **OSRM** (`router.project-osrm.org`, road legs), **Nominatim** (geocoding), **OpenWeatherMap** (optional), **OpenStreetMap tiles**.

> Note: the README claims `bcrypt 5`; the dependency is `bcryptjs 2.4.3`. There is no test framework (no Jest/Vitest/Mocha).

Runtime during audit: Node **v20.20.2**, npm 10.8.2. `.mise.toml` and the README ask for Node 22. Both builds pass on Node 20.

---

## 7. Architecture

### Layering (accurate)

```
React pages ──▶ src/services/*.ts (axios, token interceptor)
                        │ HTTP + JSON { success, data, message }
                        ▼
      routes/*.routes.ts  (express-validator rules + requireAuth/requireAdmin)
                        ▼
      controllers/*.ts    (thin; orchestration only — multimodalController is the exception)
                        ▼
      services/*.ts       (all domain logic)
                        ▼
      models/*.ts (Mongoose)  +  data/*.ts (static seeded datasets)
```

The layering is clean and consistently applied. Three structural observations:

1. **`multimodalController.ts` is not thin.** Lines 19–150 hold the whole enrichment and ranking orchestration — user lookup, weather, accessibility filtering, six enrichment calls per route, ranking, explanation. This is the de facto pipeline orchestrator and belongs in a service.
2. **Two parallel transit-data sources.** Routing reads the static arrays in `data/transitData.ts`; accessibility and the admin console read the `Accessibility` MongoDB collection (seeded from `data/accessibilityData.ts`). They are joined **by station display name** (`accessibilityService.ts:25`), and nothing keeps them in sync. This is the root cause of bugs B4 and B5.
3. **`src/imports/pasted_text/`** holds 9,440 lines across 12 files (including two `.ts` files) that nothing imports. It is excluded from `tsconfig.json` and is pure dead weight.

---

## 8. Complete End-to-End Workflow

Traced from the code for the primary flow: *user plans a multimodal trip.*

| # | Component | File : symbol | In | Out |
|---|---|---|---|---|
| 1 | Form | `src/pages/PlanTripPage.tsx:155` `handleSearch` | origin, destination, profile, date+time | validated request |
| 2 | Geocoding | `LocationSearch.tsx:72` → `mapService.search` | query ≥2 chars, 350 ms debounce | `GeoLocation[]` |
| 2a | Geocode proxy | `geocodingController.ts:7` → `geocodingService.search` | `q` | Nominatim top-5, `limit=5`, 8 s timeout |
| 3 | Departure time | `utils/formatters.ts:69` `buildLocalDepartureDateTime` | date + time | `"YYYY-MM-DDTHH:mm:00"` or **`undefined`** (never a fabricated "now") |
| 4 | API call | `src/services/multimodalService.ts:6` | — | `POST /api/routes/multimodal`, 15 s timeout |
| 5 | Validation | `routes/multimodal.routes.ts:9` | lat/lng bounds | 400 on failure |
| 6 | Candidate generation | `multimodalService.ts:774` `generateRoutes` | origin, destination | 0–4 `MultimodalRoute` |
| 6a | Access/egress search | `nearestMetro` ≤2000 m, `nearestBusStop` ≤1200 m | coords | station or `null` |
| 6b | Metro path | `transitData.ts:157` `stationsOnPath` | 2 station ids | ordered station list, via the single hard-coded interchange `m1-02` |
| 6c | Bus path | `multimodalService.ts:292` `selectBusRoute` | 2 stops | fewest-stops route, deterministic tie-break |
| 6d | Road legs | `multimodalService.ts:189` `roadLeg` | mode + coords | OSRM result, per-request `Map` cache; `fallbackRoadLeg` on any failure |
| 6e | Validation | `validateCandidate:489` | segments | continuity ≤50 m, geometry, dataset cross-check |
| 6f | Labels | `assignLabels:716` | candidates | FASTEST → CHEAPEST → MIN_WALKING → BALANCED, each used at most once |
| 7 | Weather | `weatherService.getCurrent` | destination coords | live OWM or `demoWeather()`; 10-min in-process cache |
| 8 | Accessibility filter | `accessibilityService.filterRoutes` | routes + profile | blocked routes removed, `AccessibilityEvaluation` attached |
| 9 | Crowd | `crowdService.routeSummary` | route | 70/30 blend of ≤90-min user reports and demo baseline |
| 10 | Reliability | `reliabilityService.calculateReliability` | enriched route | rule-based score 20–99 |
| 11 | Prediction interval | `historicalReliabilityService.calculatePredictionInterval` | duration, mode, routeId | 90% interval **if ≥5 observations**, else `isDataDriven:false` |
| 12 | Connection risk | `reliabilityService.calculateMissedConnectionRisk` | route | joint 1,000-trial empirical resampling |
| 13 | Smart departure | `calculateSmartDeparture` | route + time | offset ∈ {0,−5,−10,−15} or **`null`** if no time given |
| 14 | Last mile | `calculateLastMileOptions` | final segment | walk / auto / bike |
| 15 | Sustainability | `sustainabilityService` | segments | distance-weighted 0–100 relative score |
| 16 | Ranking | `mlPreferenceService.rankRoutes` | enriched routes | descending `transitDnaScore` |
| 17 | Explanation | `transitDnaService.generateWhyRecommended` | route + peers | ≤4 tags |
| 18 | Render | `MultimodalResults.tsx` | `MultimodalRoute[]` | cards, timeline, map polylines |

**Dead link in the chain (step 16a):** `multimodalController.ts:36-53` loads `dbUser.transitDNA.learnedWeights` into `personalizedWeights`, passes it to `transitDnaService.scoreRoute()` at line 95, and that score is then **discarded** — `rankRoutes()` at line 118 recomputes `transitDnaScore` from `UserPreferenceModel` weights instead. The per-user weights stored on the `User` document never influence the ranking. See bug B2.

---

## 9. Frontend Architecture

10 pages, 14 components, 8 services, 4 type modules.

| Screen | File | APIs called | Status |
|---|---|---|---|
| Landing | `LandingPage.tsx` | none | **PARTIAL** — the hero search form collects origin/destination/profile into state and then discards all three, navigating to `/register` (`:32`). Decorative. |
| Login | `LoginPage.tsx` | `/auth/login` | COMPLETE |
| Register | `RegisterPage.tsx` | `/auth/register` | COMPLETE |
| Dashboard | `DashboardPage.tsx` | `/health`, `/trips/history`, `/trips/destinations`, `/trips/saved-routes`, `/evaluation` | COMPLETE — but fires the expensive `/evaluation` benchmark on every mount (Section 26) |
| Plan Trip | `PlanTripPage.tsx` | `/geocoding/search`, `/routes`, `/routes/multimodal`, `/routes/nearby`, `/trips/save`, `/trips/saved-routes`, `/trips/destinations` | COMPLETE — richest screen; loading, error and empty states all present |
| History | `HistoryPage.tsx` | `/trips/history`, `/trips/:id/feedback`, deletes | COMPLETE — star rating, issue tags, actual-duration entry |
| Saved Routes | `SavedRoutesPage.tsx` | `/trips/saved-routes` | COMPLETE |
| Profile | `ProfilePage.tsx` | `/auth/profile`, `/auth/preferences`, `/auth/transitdna/reset` | **PARTIAL** — 4 type errors (Section 25); on failure shows `"Preferences updated in local session."` (`:87`) although nothing was saved anywhere |
| Admin | `AdminDashboardPage.tsx` | 12 `/admin/*` endpoints | COMPLETE |
| 404 | `NotFoundPage.tsx` | none | COMPLETE |

**State management:** local `useState` + one `AuthContext`. No Redux/Zustand/React Query — appropriate at this size. Token in `localStorage` under `ts_token`, attached by an axios request interceptor (`src/services/api.ts:12`).

**Component notes:**
- `MultimodalResults.tsx` — **Rules-of-Hooks violation.** `useMemo` at `:56`, early `return null` at `:58`, then another `useMemo` at `:66`. If `selected` is ever `undefined` on one render and defined on the next, React throws "rendered fewer hooks than expected". Currently unreachable because the parent only mounts the component when `routes.length > 0`, but it is a latent crash.
- `MapView.tsx` — correctly lazy-loaded via `React.lazy` to keep Leaflet (155 kB) out of the initial bundle; uses `divIcon` to sidestep the Leaflet/Vite marker-asset problem. Solid.
- `LocationSearch.tsx` — debounce, outside-click close, error state all correct. `Search` icon imported but unused.

---

## 10. Backend Architecture

11 route modules → 12 controllers → 17 services → 10 Mongoose models.

**Middleware chain** (`app.ts`): `trust proxy` → CORS (exact `FRONTEND_URL`, plus any localhost origin outside production) → morgan (dev only) → `express.json({limit:"200kb"})` → rate limit (150 req / 15 min per IP on `/api`) → router → 404 → `errorHandler`.

**Error handling** is centralised and correct: `AppError` carries a status code; `errorHandler` additionally maps Mongoose `ValidationError` → 400, duplicate key 11000 → 409, `CastError` → 400, and never leaks stack traces to clients.

**Graceful degradation** is a deliberate, consistently implemented design choice. `config/db.ts:13` does **not** exit on a failed Mongo connection; every service checks `mongoose.connection.readyState === 1` and either falls back to seeded data (accessibility, crowd, reliability) or raises a clear 503 (auth, journeys, saved routes, reports). I verified this works: the full pipeline test and all route generation run with no database.

**Service inventory:**

| Service | Lines | Role | Nature |
|---|---|---|---|
| `multimodalService` | 833 | candidate generation + validation | deterministic heuristic |
| `reliability/historicalReliabilityService` | 683 | observation store, error statistics, prediction intervals, empirical Monte Carlo | statistical |
| `accessibilityService` | 533 | per-profile scoring, warnings, hard constraints | rule-based |
| `reliabilityService` | 402 | reliability score, CI, connection risk, smart departure, last mile | rule-based + simulation |
| `transitDnaService` | 368 | weight adjustment, scoring, explanations | rule-based |
| `ml/mlPreferenceService` | 314 | pairwise sample recording, training, ranking | ML orchestration |
| `journeyService` | 273 | journeys, destinations, feedback, learning triggers | CRUD + orchestration |
| `adminService` | 252 | station/accessibility/crowd/feedback admin | CRUD |
| `ml/logisticRegression` | 191 | gradient-descent pairwise logistic regression | ML |
| `crowdService` | 183 | report storage + rule-based fusion | rule-based |
| `weatherService` | 169 | OWM client + cache + demo fallback + impact rules | API + rules |
| `evaluationService` | 169 | 5-scenario benchmark | evaluation |
| `ml/mlEvaluationService` | 154 | synthetic ML benchmark | evaluation |
| `ml/featureExtractor` | 133 | 7-feature min-max normalisation | ML |
| `routingService` | 126 | OSRM client + instruction builder | API client |
| `savedRouteService` | 80 | saved-route CRUD | CRUD |
| `authService` | 80 | register/login/profile/preferences | auth |
| `sustainabilityService` | 64 | relative mode-mix score | rule-based |
| `geocodingService` | 55 | Nominatim client | API client |

---

## 11. Database Architecture

10 models. Ownership scoping is correct everywhere: every read, update and delete of user-owned data is scoped by `{ userId }` (verified across `journeyService`, `savedRouteService`).

| Model | Purpose | Key fields | Indexes | Notes |
|---|---|---|---|---|
| `User` | accounts | `email` (unique), `password` (`select:false`), `role`, `accessibilityProfile`, `preferences{4}`, `transitDNA.learnedWeights{7}` | email unique | `pre("save")` bcrypt cost 12; `toJSON` strips password; `role` defaults `"user"` and is never read from a request body |
| `Journey` | trips taken | origin/destination, `departureTime?`, `selectedRoute` (Mixed snapshot), `selectedRouteEnriched`, `alternativeRoutesEnriched`, `choiceLearningApplied`, `userFeedback{}` | `{userId, createdAt:-1}` | stores full enriched snapshots → large documents |
| `JourneyObservation` | reliability ground truth | predicted/actual duration, `errorMinutes`, `delayMinutes`, `isSyntheticDemoData` | userId, journeyId, routeId, `{transportMode,createdAt}` | the one real learning loop |
| `PairwisePreference` | ML training samples | `chosenFeatures`, `rejectedFeatures`, `deltaX[7]`, `label`, `source` | `{userId,createdAt}`, **unique** `{userId,chosenRouteId,rejectedRouteId,source}` | `label` is **always 1** — see Section 20 |
| `UserPreferenceModel` | trained model | `weights{7}`, `sampleCount`, `trainAccuracy`, `testAccuracy`, `logLoss`, `isPersonalized` | userId unique | **the weights the ranker actually uses** |
| `Accessibility` | station registry + a11y | 13 nullable feature flags, `status`, `verificationSource`, `active` | stationId unique | **no lat/lng range validators**; `active` is written and never read |
| `AccessibilityReport` | community reports | `issueType` enum, `description`, `status` | userId | write-only — no UI reads them |
| `CrowdReport` | crowd reports | `crowdLevel`, `reportedAt`, `source`, `confidence` | stationId, reportedAt, `{stationId,reportedAt:-1}` | real user-generated data |
| `SavedRoute` | reusable snapshots | full `selectedRouteSnapshot` (Mixed) | `{userId,createdAt:-1}` | correctly a snapshot, not a live reference |
| `SavedDestination` | favourites | name, address, lat/lng | **unique** `{userId,name}` | upsert-by-name |

`weightsArray` and `featureNames` on `UserPreferenceModel` are declared in the schema and never written.

---

## 12. API Architecture

**50 endpoints.** `PHASE_2_API_CONTRACT.md` documents them accurately and matches the code — it is the trustworthy API reference, not the README.

Representative rows (full enumeration in `PHASE_2_API_CONTRACT.md`):

| Method | Endpoint | Auth | Validated | Controller → Service | Status |
|---|---|---:|---|---|---|
| GET | `/api/health` | — | n/a | `healthController` | COMPLETE |
| POST | `/api/auth/register` | — | ✅ | `authController` → `authService` | COMPLETE |
| POST | `/api/auth/login` | — | ✅ | `authController` → `authService` | COMPLETE |
| GET | `/api/auth/me` | JWT | n/a | `authController` → `authService` | COMPLETE |
| PUT | `/api/auth/profile` | JWT | ❌ **none** | `authController` → `authService` | PARTIAL |
| PUT | `/api/auth/preferences` | JWT | ❌ **none** | `authController` → `authService` | PARTIAL |
| POST | `/api/auth/transitdna/reset` | JWT | n/a | `authController` → `authService` | **BROKEN** (B2) |
| GET | `/api/geocoding/search` | JWT | controller-level | `geocodingController` → Nominatim | COMPLETE |
| POST | `/api/routes` | JWT | ✅ | `routeController` → OSRM | COMPLETE |
| POST | `/api/routes/multimodal` | JWT | ✅ | `multimodalController` → 8 services | COMPLETE for the seeded corridor |
| GET | `/api/routes/nearby` | JWT | ✅ | `multimodalController` | COMPLETE |
| POST | `/api/trips/save` | JWT | ✅ | `tripController` → `journeyService` | COMPLETE |
| POST | `/api/trips/:id/feedback` | JWT | ✅ | `tripController` → `journeyService` | COMPLETE |
| GET | `/api/weather`, `/weather/current` | JWT | ✅ | `weatherController` | COMPLETE — **unused by UI** |
| GET | `/api/accessibility/stations/:id/reports` | JWT | ✅ | `accessibilityController` | COMPLETE — **unused by UI** |
| GET | `/api/crowd/station/:id`, `/crowd/history/:id` | JWT | ✅ | `crowdController` | COMPLETE — **unused by UI** |
| GET | `/api/evaluation` | ❌ **none** | n/a | `evaluationController` → `evaluationService` | COMPLETE but uninformative (S34) |
| GET | `/api/evaluation/ml`, `/ml/status` | ❌ **none** | n/a | → `mlEvaluationService` | **INVALID** (S21) — **unused by UI** |
| GET | `/api/evaluation/reliability/evaluation`, `/stats` | ❌ **none** | n/a | → `historicalReliabilityService` | PARTIAL — **unused by UI** |
| PUT | `/api/admin/stations/:id` | JWT+admin | param only | `adminController` → `adminService` | PARTIAL (B6) |
| PUT | `/api/admin/accessibility/:id` | JWT+admin | param only | `adminController` → `adminService` | PARTIAL (B6) |
| PUT | `/api/admin/stations/:id/deactivate` | JWT+admin | param only | `adminController` → `adminService` | **BROKEN** (B4) |

**Findings:**
- **11 of 50 endpoints are unreachable from the UI**, including all 4 ML/reliability research endpoints. The entire ML evaluation story has no surface in the product.
- **All 5 `/api/evaluation/*` endpoints are unauthenticated**, and `/api/evaluation` runs 5 full route generations plus Monte Carlo per call (measured 2,044 ms offline; slower with live OSRM).
- Response envelope is consistent: `{ success, data, message? }` via `utils/response.ts`.

---

## 13. Routing Architecture

**Modes:** `walking`, `metro`, `bus`, `auto` (multimodal); `driving`, `walking`, `cycling` (road-only via OSRM).

**Candidate generation is four fixed strategy functions**, run in parallel (`multimodalService.ts:784`). It is **not** a graph search — there is no Dijkstra, A*, RAPTOR or CSA. Consequences:
- The metro interchange is a single hard-coded constant: `const INTERCHANGE = "m1-02"` (`transitData.ts:168`). Adding a third line requires editing this function.
- Bus→bus transfers are impossible. Metro→metro is possible only through `m1-02`.
- A corridor served by some other combination simply yields nothing.

**Validation layer (Phase 3's main contribution) is genuinely strong** — `validateCandidate()` enforces: non-empty; first segment starts at origin and last ends at destination (≤50 m); consecutive segments continuous (≤50 m); finite non-negative distance/duration/fare; valid GeoJSON `LineString` with ≥2 coordinate pairs in `[lng,lat]` order; transit segments cross-checked against the dataset (`transitStopsMatchDataset`, including monotonic stop ordering on a real bus route); non-transit segments must not carry `transitDetails`. Invalid candidates are dropped, not returned.

**Deterministic cost model (all magic numbers in `multimodalService.ts:23-32`):**

| Constant | Value | Nature |
|---|---|---|
| `MAX_WALK_TO_METRO_M` | 2000 | assumption |
| `MAX_WALK_TO_BUS_M` | 1200 | assumption |
| `WALK_SPEED_MPS` | 1.4 | plausible |
| `METRO_MIN_PER_STOP` | 2.5 min | assumption |
| `METRO_WAIT_SEC` | 300 | flat — ignores `frequencyMinutes` |
| `BUS_WAIT_SEC` | 480 | flat — **ignores `BusRoute.frequencyMinutes`, which is defined but never read** |
| `BUS_SPEED_MPS` | 6.0 (21.6 km/h) | assumption |
| `AUTO_SPEED_MPS` | 4.2 (15.1 km/h) | assumption |
| metro distance factor | ×1.15 | assumption |
| bus distance factor | ×1.35 | assumption |
| auto fallback factor | ×1.25 | assumption |

**Fare model** (`FARE_CONFIG`, `transitData.ts:138`): metro ₹10 + ₹3/station; bus ₹5 + ₹1.50/km; auto ₹25 + ₹13/km. Hard-coded, no source cited, no time-of-day or pass logic.

**`reliabilityService.calculateLastMileOptions`** re-hard-codes a *different* auto tariff (₹30 + ₹15/km, `reliabilityService.ts:369`) that contradicts `FARE_CONFIG.auto`. Duplicated, inconsistent logic.

**Measured behaviour** (probe against compiled `dist`, OSRM stubbed to force fallback):

| Corridor | Routes | Labels |
|---|---|---|
| Versova → Ghatkopar | 2 | FASTEST, BALANCED |
| Andheri → Marol Naka | 2 | FASTEST, BALANCED |
| Dahisar E → Ghatkopar | 2 | FASTEST, BALANCED |
| Borivali → Goregaon | **4** | all four patterns |
| Bandra W → Kurla | 1 | BALANCED |
| arbitrary Mumbai point pair | **0** | — |

Typical output is **2 candidates, one of which is Pareto-dominated**. Example, Andheri → Marol Naka: `15 min / ₹22 / 0 m walk / 0 transfers` versus `55 min / ₹41 / 1,316 m walk / 1 transfer`. The second is worse on *every* axis. A multi-criteria ranker given such a set has nothing to decide — which is exactly why the benchmark reports 100% agreement with the shortest-time baseline (Section 34).

**Zero-length walking segments:** when an endpoint coincides with a station, `walkSegment` emits a 0 m walk with a degenerate 2-identical-coordinate geometry and the instruction `"Walk 0 m to <station>"`. `validSegment` permits this (only transit segments require `distanceMeters > 0`). All 5 benchmark scenarios use exact station coordinates, so the benchmark exercises this degenerate case exclusively.

---

## 14. Transportation Data

| Dataset | Location | Records | Classification |
|---|---|---|---|
| Metro stations | `data/transitData.ts:46` | 19 (L1 ×12, L2A ×7) | **SEEDED / DEMO** — "Based on Mumbai Metro network … (approximate)" |
| Metro lines | `:74` | 2 | **SEEDED / DEMO** |
| Bus stops | `:92` | 12 | **SEEDED / DEMO** — "BEST bus network (approximate)" |
| Bus routes | `:109` | 4 | **SEEDED / DEMO**; `frequencyMinutes` defined, never used |
| Fares | `:138` | 1 config | **SYNTHETIC** — no cited tariff source |
| Accessibility | `data/accessibilityData.ts` | 25 | **SYNTHETIC** — file header: "No stations were physically surveyed"; every record `verificationSource:"synthetic_demo"` |
| Crowd baseline | `data/crowdData.ts` | 12 | **SYNTHETIC / DEMO** |
| Crowd reports | `CrowdReport` collection | runtime | **REAL** (authenticated, timestamped user reports) |
| Journey observations (seed) | `historicalReliabilityService.ts:594` | 80 | **SYNTHETIC**, `isSyntheticDemoData:true` |
| Journey observations (user) | `JourneyObservation` | runtime | **REAL** user-entered durations, `isSyntheticDemoData:false` |
| Pairwise preferences | `PairwisePreference` | runtime | **REAL** choices, but degenerate labels (S20) |
| Weather | OpenWeatherMap | live | **LIVE** with key; **SYNTHETIC** fallback, `isDemoData:true` |
| Road geometry | OSRM | live | **LIVE**; straight-line fallback |
| Geocoding | Nominatim | live | **LIVE** |
| Map tiles | OpenStreetMap | live | **LIVE** |

**Data provenance is labelled honestly and consistently throughout the code.** `isDemoData`, `isSyntheticDemoData`, `source:"DEMO_DATA"`, `verificationSource:"synthetic_demo"`, `isSimulatedBenchmark:true` and explicit disclaimer strings are applied without exception. This is a genuine strength and should be preserved exactly as-is.

### Measured geographic coverage

Over a 40×40 grid on Mumbai's bounding box (lat 18.90–19.28, lng 72.78–72.98, 1,600 points):

| Metric | Result |
|---|---|
| Within 2,000 m of a metro station | **12.3%** |
| Within 1,200 m of a bus stop | **5.6%** |
| Within reach of *either* access rule | **13.8%** |
| Dataset bounding box | lat 19.0547–19.2355, lng 72.8150–72.9082 |

Over 281 origin/destination pairs sampled from an 8×8 grid:

| Metric | Result |
|---|---|
| Pairs returning **zero** routes | **277 (98.6%)** |
| Pairs returning 1 route | 4 |
| Pairs returning **≥2** routes | **0** |

The dataset covers roughly a single metro corridor. For nearly any realistic pair of Mumbai addresses the API returns `404 — "outside the demo transit service area"`. This is the project's single largest functional limitation.

**Licensing:** OSM/Nominatim (ODbL), OSRM (BSD), OpenWeatherMap (free tier, attribution). The README credits MMRC and BEST; the derived coordinates/fares are approximations, not licensed extracts. No `LICENSE` file exists.

---

## 15. Map and Road Routing

- **Provider:** Leaflet + OSM raster tiles, correct attribution (`MapView.tsx:117`).
- **Geocoding:** Nominatim via an authenticated backend proxy, `User-Agent: TransitSwap/2.0 (final-year-engineering-project)`, 5 results, 8 s timeout. Nominatim's usage policy (≤1 req/s) is **not** enforced server-side; the 350 ms client debounce plus the 150 req/15 min limiter are the only brakes. No server-side geocoding cache.
- **Road routing:** OSRM `/route/v1/{foot|bike|driving}`, `overview=full`, `geometries=geojson`, `steps=true`, `alternatives=3`, 10 s timeout. Errors mapped to 504/429/502/422/404.
- **Quality gate:** `isUsableRoadRoute` + `hasPlausibleModeDuration` reject OSRM results implying >2.5 m/s walking or >12 m/s cycling — a good defensive check.
- **Caching:** per-request `Map` keyed on mode + 6-dp coordinates. Not shared across requests; the same walk leg is refetched on every search.
- **Interaction with transit routing:** OSRM supplies only the walk and auto legs. Metro and bus geometry is straight-line station-to-station polylines (`metroGeometry`, `busGeometry`), so rail lines render as chords rather than following track.

---

## 16. Weather

- **Provider:** OpenWeatherMap current-weather endpoint, metric, 7 s timeout (`weatherService.ts:151`).
- **Cache:** in-process `Map`, 10 min TTL, key = coordinates to 2 dp (~1.1 km cell).
- **Fallback:** `demoWeather()` (`:29`) — deterministic from `|lat + lng|`, flagged `isDemoData:true`, `source:"Demo Weather Data"`, and condition strings literally prefixed `"Demo ..."`. Triggered when no API key is set *or* on any request failure.
- **Status:** **current observation only.** Not a forecast, not historical. A trip planned for 08:30 tomorrow is scored against the weather *right now*.
- **Impact model** (`calculateWeatherImpact:69`) — rule-based, explicitly documented as not ML: rain ≥5 mm → +35 severity; rain >0 → +18; feels-like ≥34 °C → +20; wind ≥35 kph → +10. Severity is then scaled by *this route's* walking distance (×0.4 under 300 m, ×1.0 to 800 m, ×1.5 above) and capped at 100. `weatherFriendly` is set only when the route walks ≥150 m less than *every* alternative and severity >0.
- **Effect on ranking:** via the `weather` feature only, as a 3-level bucket (`low→1.0`, `medium→0.6`, `high→0.2`) at default weight 0.10. The finely-computed `walkingPenaltyPercent` is quantised away before it reaches the ranker.
- One endpoint pair (`/api/weather`, `/api/weather/current`) is fully built and never called by the UI.

---

## 17. Crowd

- **Inputs:** authenticated user reports (`CrowdReport`, real) and a 12-record synthetic baseline keyed by `(stationId, dayType, timeSlot)`.
- **Time bucketing:** 4 coarse slots — `<10:00→"08:00"`, `<16:00→"14:00"`, `<22:00→"18:00"`, else `"20:00"` (`crowdService.ts:17`).
- **Fusion** (`stationEstimate:77`) — rule-based, honestly labelled: reports from the last 90 minutes get 70% weight, the synthetic baseline 30%; blended on a LOW=1 / MEDIUM=2 / HIGH=3 scale and rounded. Confidence: 0.7 + 0.05·n (capped 0.95) when blended, 0.45 for demo-only, 0 for unavailable. `source` is always one of `RECENT_USER_REPORT` / `DEMO_DATA` / `UNAVAILABLE`.
- **This is estimation, not prediction.** There is no model that forecasts crowding at a future departure time. The code says so; the README's "crowd intelligence" framing overstates it.
- **Bucketing ignores the user's departure time entirely** — `nearestSlot()` takes `new Date()`. A trip planned for tomorrow 08:00 is scored with the current slot.
- **Effect on ranking:** `crowd` feature, 3-level bucket, default weight 0.10.
- `GET /api/crowd/station/:id` and `/history/:id` exist and are never called by the UI.

---

## 18. Accessibility

**The strongest and most defensible subsystem in the project.** 533 lines of explicit, auditable rules.

**Transparent station score (0–100)** — `calculateStationScore:59`, additive with documented partial credit for `null` (unknown): step-free entrance 15, step-free platform 15, lift 15, ramp 10, escalator 10, tactile paving 10, accessible toilet 5, low stair count 10, wheelchair-accessible 10.

**Per-profile route score** — `calculateProfileAccessibilityScore:98`, a distinct rule set per profile combining average station score, total stairs, walking distance and transfer count. (The `luggage` branch carries a fixed comment noting that `>20` must be tested before `>10` — the ordering is now correct.)

**Hard constraints → route rejection** — `getBlockReason:268`:

| Profile | Blocks when |
|---|---|
| `standard`/`fastest`/`cheapest`/`comfort` | never |
| `wheelchair` | `not_accessible`; or `wheelchairAccessible === false`; or no step-free entrance + no lift + no ramp; or stairs >0 with no lift and no ramp |
| `stroller` | `not_accessible`; or >20 stairs with no lift and no ramp |
| `reduced_mobility` | `not_accessible`; or >15 stairs with no step-free alternative |
| `senior` / `pregnant` / `luggage` | only `not_accessible` **and** >35 stairs |

**Flow:** requirement → `evaluateRoute` (checks each matched station) → `filterRoutes` drops blocked routes → survivors carry `accessibilityScore` (0 if blocked), `warnings[]`, `checkedStations[]`, `rejectionReason`, `dataSource` → `accessibility` feature feeds the ranker → profile-specific explanation tags. Verified by test: a route through WEH Metro (38 stairs, no lift, no ramp) is correctly rejected for `wheelchair` even when the user's `preferredMode` is metro.

**Two real gaps:**

1. **Silent coverage hole.** `extractTransitStations:30` matches records **by display name**. Only 6 of 12 bus stops have accessibility records (`b-01, b-03, b-05, b-06, b-10, b-12`). A route through `b-02, b-04, b-07, b-08, b-09` or `b-11` contributes **no** station to the check — it can never be blocked, and with *no* matched stations `calculateProfileAccessibilityScore` falls back to `avgStationScore = 70` and then *adds* bonuses because `totalStairs` sums to 0. A wheelchair user can therefore receive a high accessibility score for a route whose stations have no data at all. The service doc-comment claims it "Checks EVERY transit station/segment" — it does not.
2. **Name-based joining is brittle.** Any divergence between `transitData.ts` names and `Accessibility.stationName` silently drops the station from evaluation. There is no referential integrity and no startup consistency check.

`AccessibilityReport` submissions are stored and never surfaced anywhere — not in the UI, not in the admin console.

---

## 19. Reliability

Three distinct mechanisms, correctly separated and honestly labelled in code:

**(a) Reliability score — rule-based heuristic** (`reliabilityService.ts:73`). Base 90; 0 transfers +5, 1 transfer −5, n≥2 → −12n; bus −8, metro +4, auto −4; weather penalty >30% → −10, >15% → −4; HIGH crowd −10, MEDIUM −3. Clamped 20–99. `delayVarianceMinutes = (100 − score) × 0.12`, which is a presentational transform, not a measured variance. The code explicitly calls this "a rule-based prototype reliability estimate (not a calibrated ML model)".

**(b) Prediction interval — genuinely data-driven** (`historicalReliabilityService.calculatePredictionInterval:284`). Computes sample mean and *sample* standard deviation (÷ N−1, correct) of historical `errorMinutes = actual − predicted`, with a hierarchical fallback `route_specific → mode_specific → overall_transit`, minimum 5 samples. Interval = `(predicted + meanError) ± z·σ`, `z₉₀=1.645`, `z₉₅=1.96`, floors of 1.5/2.0 min. Below threshold it returns a rule-of-thumb `×0.9 … ×1.15` band with `confidenceLevelPercent: 0` and `isDataDriven: false` — it refuses to present a fake confidence level. This is methodologically sound work.

**(c) Missed-connection risk — empirical resampling Monte Carlo** (`reliabilityService.ts:176`). 1,000 joint trials; each trial samples one historical delay per transfer from the real empirical distribution and fails the trial if *any* transfer's delay exceeds its buffer; `P(miss ≥1) = missed/1000`. Buffers are demo assumptions: bus 6 min, metro 4 min, other 5 min. A separate **deterministic** variant (`calculateDeterministicTransferRiskPercent:39`) computes `1 − Π(1−pᵢ)` directly from the same data for Smart Departure, so candidate offsets rank reproducibly instead of jittering with sampling noise. That is a thoughtful, correct design decision.

**Smart departure** evaluates offsets {0, −5, −10, −15} and requires a ≥5-point risk improvement before recommending an earlier departure. Returns **`null`** when no departure time was supplied rather than assuming "now".

**How reliability reaches the recommendation:** only (a), via the `reliability` feature = `score/100`, default weight 0.25.

**Critical gap: (b) and (c) do not reach the recommendation at all.** Neither `confidenceInterval` nor `missedConnectionRisk` nor `transferCount` is one of the 7 ranking features. I verified the consequence empirically:

```
prioritize = "reliability", two routes identical except risk and transfers:
  SAFE  : 35 min, 0 transfers,  5% missed-connection risk → score 67
  RISKY : 32 min, 4 transfers, 95% missed-connection risk → score 86   ← ranked FIRST
```

The flagship Monte Carlo simulation is computed, displayed, and then ignored by the ranker — even when the user explicitly asks to prioritise reliability.

---

## 20. User Preferences

**Storage:** `User.preferences` — `preferredMode`, `walkingTolerance`, `budgetPreference`, `prioritize` (`models/User.ts:81`). Defaults: `any`, `medium`, `balanced`, `reliability`.

**Retrieval:** `multimodalController.ts:42` loads them per route request.

**Application** — two mechanisms, deliberately de-duplicated:
1. `getPreferenceAdjustedWeights` (`transitDnaService.ts:34`) multiplies the matching weight by 1.5 (or 1.6/0.5 for low/high walking tolerance, 1.3 for comfort budget) and **renormalises so weights sum to ~1.0**.
2. `calculatePreferenceAdjustment` (`:93`) adds a flat +0.12 when the route includes the preferred mode. The code comment documents that walking-tolerance and priority adjustments were *removed* from here to stop double-counting — a correct fix.

**Learning:** explicit preferences and learned weights are meant to be complementary.

**Critical gap — explicit preferences stop working once the ML model activates.** `getModelStatus` (`mlPreferenceService.ts:288`) applies `getPreferenceAdjustedWeights` **only on the non-personalised path**. Once `UserPreferenceModel.isPersonalized === true` and `sampleCount ≥ 5`, it returns `stored.weights` raw. From that point on, `prioritize`, `walkingTolerance` and `budgetPreference` have **zero** effect on ranking; only the +0.12 preferred-mode nudge survives. A user who sets "prioritise accessibility" sees it silently ignored after their fifth saved journey.

**Cold start:** profile-specific weight presets in `getProfileWeights` (`:37`) — e.g. `wheelchair` = accessibility 0.50, walking 0.20; `fastest` = time 0.60. Sensible and transparent.

**Two failing tests are symptoms of the weighted-linear model's limits, not test bugs.** I verified both by hand:
- *Low walking tolerance:* short-walk (35 min / 250 m) vs long-walk (30 min / 1,200 m) → long-walk wins 0.657 vs 0.619. After renormalisation, time (0.2595) ≈ walking (0.2214), and min-max normalisation over only two candidates maps a 5-minute gap to the full [0,1] range.
- *Priority = reliability:* 0.784 vs 0.672 in favour of the risky route, as shown in Section 19.

The root cause in both cases is that **relative min-max normalisation over 2–4 candidates destroys magnitude information**: a 3-minute difference and a 30-minute difference both become `0 vs 1`. A soft preference expressed as a weight multiplier cannot override that.

---

## 21. AI / Machine Learning — strict assessment

### What genuinely qualifies as machine learning

**Pairwise Logistic Regression for learning-to-rank** — `ml/logisticRegression.ts`, 191 lines, correctly implemented from first principles:
- Model: `P(A ≻ B) = σ(w · (X_A − X_B))`, no intercept (correct for pairwise ranking — a bias term is unidentifiable on differences).
- Loss: binary cross-entropy + L2, `p` clamped to `[1e-7, 1−1e-7]`.
- Optimiser: batch gradient descent, lr 0.05, 200 iterations, L2 0.01.
- `sigmoid` bounds `z` to ±20 against overflow.
- Weights clamped to ≥0.01 after each step to keep "higher feature value = more preferred".

| Question | Answer |
|---|---|
| Problem solved | Rank candidate routes by learned per-user preference |
| Inputs | `deltaX[7] = X_chosen − X_rejected` from `PairwisePreference` |
| Features | time, cost, walking, reliability, accessibility, crowd, weather — all min-max normalised to [0,1], 1.0 = best (`featureExtractor.ts`) |
| Approach | Pairwise logistic regression (RankNet-style, linear scorer) |
| Training | **Yes** — real gradient descent on real stored samples; triggered at ≥5 samples on journey save (`mlPreferenceService.trainUserModel:149`) |
| Persistence | `UserPreferenceModel` (per-user weights, sampleCount, trainAccuracy, testAccuracy, logLoss) + mirrored to `User.transitDNA.learnedWeights` |
| Inference | `rankRoutes` computes `w · X + preferenceAdjustment`, sorts descending |
| Where used | The ranked order the user sees — this is the real inference path |
| Data | Real user choices; the evaluation path uses synthetic data |

### Fatal methodological defect: every training label is 1

`PairwisePreference.label` defaults to 1 (`models/PreferencePair.ts:58`) and **nothing ever writes 0**. `recordRouteChoice` emits `{deltaX: chosen − rejected, label: 1}` for each alternative and never the mirrored `{rejected − chosen, label: 0}` pair that symmetric pairwise LTR requires.

Consequences:
1. **Single-class training set.** There is no negative class, so the gradient only ever pushes `w·Δ` upward. Combined with the `≥0.01` clamp, weights inflate monotonically rather than converging to a discriminative optimum.
2. **`trainAccuracy` and `pairwiseAccuracy` are meaningless.** A constant classifier that always predicts 1 scores 100%. The persisted `trainAccuracy`/`testAccuracy` values therefore measure nothing and must not be reported as results.
3. **The 80/20 split in `trainUserModel` is not a split.** `PairwisePreference.find().sort({createdAt:-1})` then `slice(0,0.8n)` / `slice(0.8n)` partitions newest-first by time, and all labels are 1 on both sides, so test accuracy is also degenerate.

**The fix is small and well understood:** for each recorded choice also store the mirrored pair with `label: 0`, and shuffle before splitting. This is a ~20-line change in `recordRouteChoice` plus a shuffle in `trainUserModel`.

### `mlEvaluationService` — the reported ML benchmark is invalid

`generateSyntheticPreferenceDataset()` (`mlEvaluationService.ts:85`) builds 60 samples: **3 distinct `deltaX` vectors, each duplicated 20 times, all with `label: 1`.**

The 80/20 split is a chronological slice of an archetype-ordered array: train = 20×A1 + 20×A2 + 8×A3; **test = 12 samples, all archetype 3.** So:
- The test set contains exactly one feature vector, repeated.
- Baseline accuracy on it is 100% (`w·Δ = +0.20 ≥ 0` → predicts 1 → correct).
- ML accuracy is also ~100%.
- `accuracyImprovementPercent ≈ 0`.

`GET /api/evaluation/ml` therefore reports a comparison with no information content. It is also unauthenticated and never called by the UI. Additionally `mlEvaluationService` imports `multimodalService`, `reliabilityService` and `EnrichedRoute` without using them, and computes `userSamplesCount` which never reaches the report — dead code.

### What does **not** qualify as ML (correctly labelled as such in the code)

`transitDnaService.scoreRoute` (weighted linear sum), `calculateWeatherImpact`, `crowdService` fusion, `accessibilityService` scoring, `calculateReliability`, `sustainabilityService`, `generateWhyRecommended`. The code consistently says "rule-based, not machine learning" in these files. That honesty is correct and should be preserved.

### Statistical (not ML) methods — valid

Sample mean/variance with Bessel's correction, z-based prediction intervals, hierarchical fallback with minimum-sample gating, and empirical-resampling Monte Carlo. These are correctly implemented and are the most academically defensible quantitative work in the project.

### No unnecessary AI

No deep learning, RL, GNN, LSTM, transformers, CV or generative AI — and none is needed. Recommended additions are limited to **fixing** the existing logistic regression, not replacing it.

---

## 22. Recommendation Engine

```
candidates (2–4)
   │
   ▼ featureExtractor.extractRouteFeatures(route, allCandidates)
     relative min-max over the candidate set; singleton fallbacks:
       time    1 − dur/90min      cost 1 − fare/150     walking 1 − walk/2000m
     reliability score/100 · accessibility score/100 · crowd 3-bucket · weather 3-bucket
   │
   ▼ weights = getModelStatus(userId, profile, preferences)
       personalised?  → UserPreferenceModel.weights      (preferences NOT applied — S20)
       otherwise      → getPreferenceAdjustedWeights(getProfileWeights(profile), prefs)
   │
   ▼ score = Σ wᵢ·xᵢ  +  (+0.12 if preferred mode present)
   ▼ transitDnaScore = round(score × 100)
   ▼ sort descending
   ▼ generateWhyRecommended(route, allRoutes, profile, prefs, isPersonalized) → ≤4 tags
```

**Nature of ranking: hybrid — weighted linear scoring with learned weights.** The *functional form* is fixed and linear; only the weight vector is learned. It is accurate to call this "learning-to-rank with a linear scorer", not "an ML recommender".

**What the ranker sees:** time, cost, walking, reliability, accessibility, crowd, weather.
**What it does not see, despite being computed and displayed:** `missedConnectionRisk`, `confidenceInterval`, `transferCount`, `sustainabilityScore`, `departureSuggestion`, `lastMileOptions`. Verified: two routes identical but for sustainability 100 vs 10 both score 93.

**The explanation layer is the best-engineered part of the recommendation pipeline.** `generateWhyRecommended` grounds every claim against the actual candidate set (`minDur`, `minFare`, `minWalk`, `maxRel`), gates the prediction-interval claim on `isDataDriven === true`, gates the sustainability claim on being strictly ahead of at least one alternative, gates the personalisation badge on a genuinely trained model, and caps output at 4 tags. 19 unit tests assert exactly these honesty properties and all pass. This is a legitimately strong XAI contribution.

---

## 23. Authentication and Security

**Correct:**
- bcryptjs cost 12 via `pre("save")`; `password` has `select: false`; `toJSON` strips it.
- JWT HS256, `userId`/`email`/`role`, 7-day default expiry; `requireAuth` verifies and never trusts a client-supplied role.
- `requireAdmin` runs after `requireAuth`, reads only `req.user.role`, and fails closed on a legacy token with no `role` claim (asserted by test).
- Registration cannot set `role` — the controller destructures only `name, email, password, accessibilityProfile` (asserted by test). Admin creation is script-only (`utils/seedAdmin.ts`), refuses to promote an existing user, and requires env vars.
- Generic auth errors ("Invalid email or password") — no user enumeration.
- Production guard: `config/env.ts:18` throws if `JWT_SECRET` is missing or still the dev default.
- Ownership scoping on every user-owned query.
- Rate limiting 150/15 min; body limit 200 kB; `trust proxy` set.
- `admin.listFeedback` populates only `name email` and defensively deletes `password`.
- No committed secrets. Only `.env.example` files exist; `.gitignore` covers `.env*`.

**Issues:**

| # | Issue | Location | Severity |
|---|---|---|---|
| S1 | JWT in `localStorage` → readable by any XSS. No refresh/rotation, no revocation, no logout invalidation. | `src/services/api.ts:13` | HIGH (accepted trade-off for a SPA, but must be stated) |
| S2 | `PUT /auth/profile` and `PUT /auth/preferences` have **no** express-validator rules. Mongoose enums catch bad values, but the README claims validation on all PUT endpoints. | `routes/auth.routes.ts:37-38` | MEDIUM |
| S3 | `PUT /admin/stations/:id` and `PUT /admin/accessibility/:id` validate only the path param. `updateStation` writes `latitude`/`longitude` with no range check, and `Accessibility` has no min/max — an admin can store `latitude: 999`. | `adminService.ts:106`, `models/Accessibility.ts:33` | MEDIUM |
| S4 | All 5 `/api/evaluation/*` endpoints are unauthenticated, and `/api/evaluation` is computationally heavy (~2 s, 5 route generations + Monte Carlo). Cheap DoS / cost amplification vector. | `routes/evaluation.routes.ts` | MEDIUM |
| S5 | Nominatim is proxied without server-side rate limiting or caching beyond the global limiter; the project's own `User-Agent` could be blocked for policy violation. | `geocodingService.ts` | LOW |
| S6 | `DEMO_PASSWORD = "Demo@1234"` hard-coded in source. | `utils/seedDemoUser.ts:6` | LOW (demo seeder; move to env) |
| S7 | No `helmet` (no CSP, HSTS, `X-Content-Type-Options`, frame options). | `app.ts` | LOW |
| S8 | `npm audit` was reported as 4 moderate backend vulnerabilities in `PHASE_0_BASELINE.md`; not re-run or fixed per instructions. | — | LOW, needs verification |

No secret values are reproduced in this document.

---

## 24. Testing

**No test framework.** 13 files under `backend/src/__tests__/` plus `utils/test-full-pipeline.ts`, each a standalone `ts-node` script with hand-rolled `assert`, chained in `package.json` with `&&`.

### Verified results

```
npm test  →  EXIT CODE 1
```

| # | File | Result |
|---|---|---|
| 1 | `accessibility.test.ts` | ✅ 249 assertions pass |
| 2 | `ml.test.ts` | ✅ pass |
| 3 | `recommendationExplanation.test.ts` | ✅ 19 pass |
| 4 | `reliability.test.ts` | ✅ pass |
| 5 | `multimodalRouting.test.ts` | ✅ pass |
| 6 | `userPreferences.test.ts` | ❌ **6 passed, 2 FAILED → exit 1** |
| 7–13 | `preferenceEndToEnd`, `authPreferencePersistence`, `feedback`, `dashboard`, `continuousImprovement`, `admin`, `test-full-pipeline` | **NEVER RUN** — the `&&` chain aborts at #6 |

Run individually, files 7–13 all exit 0. So the suite is not broken — but **`npm test` has never exercised 7 of its 14 entries**, and nobody would know from the output.

### The two failures are real source behaviour, not test bugs

Both reproduced by hand-computing the score (Section 20). Classification: **source-code / model-design limitation (category 3)**, not environment, dependency, config, external-API or flake.

### Second defect in the test harness

`userPreferences.test.ts` prints `❌ FAILED: <msg>` from `assert()` and then unconditionally prints `✅ ... test passed.` on the next line. The transcript simultaneously reports failure and success for the same test. Only the final tally is trustworthy.

### Coverage

| Area | Coverage |
|---|---|
| Accessibility rules | **Excellent** — 249 assertions |
| Explanation honesty | **Excellent** — 19 assertions |
| Reliability statistics | Good — mean/σ, intervals, coverage, Monte Carlo |
| Date/time safety | Good — 6 hardening tests |
| Routing validation | Good |
| Preferences | Partial — 2 known failures |
| Admin authorisation | Good (middleware only) |
| ML | **Weak** — sigmoid/dot/convergence only; nothing asserts label validity or ranking correctness |
| Auth persistence, feedback service, crowd, saved routes, admin CRUD, Problem-21 service paths | **Honestly skipped** — require `MONGODB_URI` |
| HTTP/API integration | **None** — no supertest, no running-server tests |
| Frontend | **None** — zero tests |
| E2E | **None** |

The DB-dependent suites print an explicit *"This is an honest skip, not a pass"*. That integrity is commendable — but it means a large share of the persistence and admin logic has never actually been executed by a test.

---

## 25. Build Status

| Check | Command | Result |
|---|---|---|
| Backend install | `npm install` (backend) | ✅ 208 packages |
| Backend typecheck | `npx tsc --noEmit` | ✅ **0 errors** |
| Backend build | `npm run build` | ✅ `dist/` produced |
| Backend tests | `npm test` | ❌ **exit 1** at file 6 of 14 |
| Frontend install | `npm install` | ✅ 81 packages |
| Frontend typecheck | `npx tsc --noEmit` | ❌ **5 errors** |
| Frontend build | `npm run build` | ✅ built in 733 ms |
| Dev servers | per phase docs | ✅ 5000 / 5173 |

### The frontend build hides 5 type errors

```
src/pages/PlanTripPage.tsx(399,49): TS2345  string not assignable to SetStateAction<AccessibilityProfile>
src/pages/ProfilePage.tsx(77,9):   TS2322  string not assignable to TransportMode | undefined
src/pages/ProfilePage.tsx(78,9):   TS2322  string not assignable to "low"|"medium"|"high" | undefined
src/pages/ProfilePage.tsx(79,9):   TS2322  string not assignable to "cheapest"|"balanced"|"comfort" | undefined
src/pages/ProfilePage.tsx(80,9):   TS2322  string not assignable to "comfort"|"speed"|"reliability"|"accessibility" | undefined
```

`"build": "vite build"` does **not** invoke `tsc`. Vite transpiles with esbuild and never type-checks, so `npm run build` reports success with 5 outstanding errors. The README's Phase 20 claim of a "TypeScript 0-error build" is false for the frontend. Root cause: `PROFILES` in `PlanTripPage.tsx:30` and the `<select>` handlers in `ProfilePage.tsx` are typed as plain `string` where a union is required.

Build warning (both benign, unchanged per instructions): Vite's native config loader does not support `__dirname` in `vite.config.ts`; main frontend chunk is 459 kB (131 kB gzipped).

---

## 26. Performance

| # | Issue | Location | Impact |
|---|---|---|---|
| P1 | `GET /api/evaluation` runs 5 full route generations + enrichment + Monte Carlo per call, **uncached**, and `DashboardPage` calls it on **every mount**. Measured 2,044 ms offline; with live OSRM each scenario adds several network round-trips. | `evaluationService.ts:67`, `DashboardPage.tsx:84` | **HIGH** |
| P2 | Monte Carlo per request: per transfer, one 1,000-trial run **plus** a duplicate `getHistoricalDelayStats` query, then a further 1,000-trial joint simulation — i.e. up to 2,000+ iterations and 2 DB queries per transfer per route. | `reliabilityService.ts:211-264` | **HIGH** |
| P3 | `tryWalkBusMetroWalk` iterates `METRO_STATIONS × BUS_STOPS` (19×12 = 228) and calls `busSegment()` inside the inner loop — O(n·m) with route-selection work per pair. Fine at this scale, quadratic as data grows. | `multimodalService.ts:667` | MEDIUM |
| P4 | OSRM cache is per-request only. The same access walk is refetched on every search. No cross-request or persistent cache. | `multimodalService.ts:148` | MEDIUM |
| P5 | `getHistoricalStatistics` / `getHistoricalDelayStats` use `JourneyObservation.find()` with **no limit** on the overall-transit fallback, then compute statistics in Node. Unbounded as observations accumulate; belongs in an aggregation pipeline. | `historicalReliabilityService.ts:221,478` | MEDIUM |
| P6 | `Journey` stores `selectedRouteEnriched` + `alternativeRoutesEnriched` as full enriched snapshots (geometry, all stations, all warnings). `GET /trips/history` returns up to 100 such documents. Large payloads. | `models/Journey.ts`, `journeyService.ts:125` | MEDIUM |
| P7 | `DashboardPage` fires 5 independent effects on mount (health, history, destinations, saved routes, evaluation) — 5 round-trips before first paint, no batching. | `DashboardPage.tsx` | LOW |
| P8 | `crowdService.routeSummary` calls `stationEstimate` per station, each issuing its own `CrowdReport.find()`. N+1 query pattern. | `crowdService.ts:161` | LOW |
| P9 | No server-side geocoding cache; every keystroke past the 350 ms debounce reaches Nominatim. | `geocodingService.ts` | LOW |
| P10 | Weather cache is per-process in-memory — lost on restart, not shared across instances. | `weatherService.ts:22` | LOW |
| P11 | Main frontend chunk 459 kB. `MapView` is correctly split; the pages are not. | build output | LOW |

Nothing was optimised during this audit.

---

## 27. Code Quality

### CRITICAL

| Finding | Location |
|---|---|
| `missedConnectionRisk`, `confidenceInterval`, `transferCount`, `sustainabilityScore` are computed, stored, displayed — and excluded from ranking. The expensive simulations cannot influence any decision. | `featureExtractor.ts:5`, `mlPreferenceService.ts:228` |
| Every ML training label is `1`; no mirrored negative pairs. Training set is single-class; accuracy metrics are vacuous. | `models/PreferencePair.ts:58`, `mlPreferenceService.ts:90` |
| `personalizedWeights` loaded from `User.transitDNA` is passed to `scoreRoute` and then discarded by `rankRoutes`. Dead computation on the hot path. | `multimodalController.ts:36-95` |
| Explicit user preferences are silently dropped once the ML model is personalised. | `mlPreferenceService.ts:288` |

### HIGH

| Finding | Location |
|---|---|
| `seedDemoUser` pre-hashes the password, then `pre("save")` hashes it again → demo account can never log in. | `utils/seedDemoUser.ts:29` |
| `Accessibility.active` is written by `deactivateStation`/`updateStation` and **never read anywhere**. Grep-confirmed. Deactivating a station has no effect. | `adminService.ts:123` |
| `resetTransitDna` resets `User.transitDNA` (omitting `crowd`/`weather`) and leaves `UserPreferenceModel` — the weights the ranker actually uses — untouched. | `authService.ts:68` |
| 5 unchecked frontend type errors; `npm run build` never type-checks. | Section 25 |
| `npm test` aborts at file 6; 7 test entries never run. | Section 24 |
| Accessibility evaluation silently skips stations with no record (6 of 12 bus stops), and then *rewards* their absence. | `accessibilityService.ts:30,108` |
| Conditional `useMemo` after an early `return null` — latent Rules-of-Hooks crash. | `MultimodalResults.tsx:56-66` |

### MEDIUM

| Finding | Location |
|---|---|
| Duplicated, **inconsistent** auto fare: `FARE_CONFIG.auto` = ₹25 + ₹13/km vs last-mile ₹30 + ₹15/km. | `transitData.ts:141` / `reliabilityService.ts:369` |
| `formatClockTime` duplicated verbatim in two services. | `reliabilityService.ts:13`, `historicalReliabilityService.ts:673` |
| `DEFAULT_WEIGHTS` duplicated in `transitDnaService.ts:20` and `mlPreferenceService.ts:27`; the former is unused. | — |
| `src/imports/pasted_text/` — 9,440 lines across 12 files, zero references. | — |
| `mlEvaluationService` imports `multimodalService`, `reliabilityService`, `EnrichedRoute` unused; computes `userSamplesCount` and discards it. | `mlEvaluationService.ts:4-7,38` |
| `BusRoute.frequencyMinutes` defined for all 4 routes, never read — wait time is a flat 480 s. | `transitData.ts:34` |
| `UserPreferenceModel.weightsArray` / `featureNames` declared, never written. | — |
| `calculateCoverageEvaluation` always regenerates synthetic observations and never uses stored real ones, while the controller message says "calculated on unseen historical test set". | `historicalReliabilityService.ts:377` |
| Synthetic observations use deterministic `sin`/`cos` noise, not sampled randomness — smooth, autocorrelated, unrealistically easy to cover. Reported 100% coverage at the 90% level is a symptom. | `historicalReliabilityService.ts:607,624` |
| `ProfilePage` reports `"Preferences updated in local session."` on save failure although nothing was persisted. | `ProfilePage.tsx:87` |
| `LandingPage` search form collects 3 fields and discards them. | `LandingPage.tsx:32` |
| 6 unused legacy types (`JourneySegment`, `TravelHistory`, `SavedDestination`, `AuthTokens`, `ApiResponse`, and most of `Route`). | `src/types/index.ts` |
| `AccessibilityReport` records are written and never surfaced in any UI. | — |
| Stale comment: `"Performs Monte Carlo simulation (500 stochastic iterations)"` above a 1,000-trial empirical function, with a malformed nested doc-block. | `reliabilityService.ts:171-175` |
| `multimodalController` holds pipeline orchestration that belongs in a service. | `multimodalController.ts:19-150` |
| Zero-length walking segments with degenerate 2-identical-point geometry and `"Walk 0 m to X"` instructions. | `multimodalService.ts:326` |

### LOW

`as any` / `: any` at ~30 sites (mostly Mongoose dynamic assignment and enum casts); `Search` imported unused in `LocationSearch.tsx`; `getProfileLabel`/`getProfileIcon` omit `reduced_mobility`; `__dirname` in `vite.config.ts`; emoji in API response strings; `test-auth-chain.sh` is a bash script in a Windows-primary repo; no `LICENSE` file; no `.editorconfig`/ESLint config (only `oxfmt`).

**No `TODO`, `FIXME`, `HACK` or `XXX` markers anywhere.** Comment quality is unusually high — many comments explain *why* a decision was made and reference the specific defect they fixed.

---

## 28. Documentation vs Actual Code

**`PHASE_0`–`PHASE_3` documents are accurate and trustworthy.** They record the `npm test` failure, the Node-version warning, the missing git repository, and the un-run `npm audit` honestly. `PHASE_2_API_CONTRACT.md` matches the code endpoint-for-endpoint.

**`README.md` has drifted badly.** 20 substantive mismatches:

| # | Documentation says | Actual code | Status |
|---|---|---|---|
| 1 | §3/§5/§20: "Box-Muller Monte Carlo (500 trials)", "samples random delays from a normal distribution using Box-Muller transform" | **Empirical resampling** from stored historical delays, **1,000** trials. No Box-Muller anywhere in the repo. | **MISMATCH** |
| 2 | §5/§11/§20: "Conservative weight update (lr=0.05)", `new_weight = current + 0.05 × (chosen − average)` | Pairwise logistic regression, batch gradient descent, BCE + L2. That formula does not exist. | **MISMATCH** |
| 3 | §11: "equal weights across **5** dimensions: Time 20%, Cost 20%, Walking 20%, Reliability 20%, Accessibility 20%" | **7** dimensions: time .25, cost .15, walking .20, reliability .25, accessibility .15, crowd .10, weather .10 | **MISMATCH** |
| 4 | §11/§20: "Weights are normalized to always sum to 1.0" | `PairwiseLogisticRegression` never normalises; weights are clamped ≥0.01 and drift freely. Only `getPreferenceAdjustedWeights` normalises. | **MISMATCH** |
| 5 | §11: "Reset: Users can reset their TransitDNA" | Resets `User.transitDNA` only; the ranker's `UserPreferenceModel` is untouched. | **MISMATCH** (bug B2) |
| 6 | §12: profiles `visual_impairment`, `hearing_impairment`, `elderly` | None exist. Actual: `standard`, `wheelchair`, `senior`, `pregnant`, `stroller`, `luggage`, `reduced_mobility` | **MISMATCH** |
| 7 | §13: reliability penalties incl. "Peak-hour travel (−5)" | No peak-hour logic exists. Transfer handling is 0→+5, 1→−5, n≥2→−12n (not "−10 per transfer"). | **MISMATCH** |
| 8 | §13/§20: `std_dev = mean_duration × 0.08`, "8% of mean duration based on urban transit literature" | σ is the **sample standard deviation of historical prediction errors**. The 0.08 constant does not exist. | **MISMATCH** |
| 9 | §9: `POST /api/trips`, `GET /api/trips` | `POST /api/trips/save`, `GET /api/trips/history` | **MISMATCH** |
| 10 | §9: `POST /api/routes/multimodal` auth "Optional" | `requireAuth` — JWT required | **MISMATCH** |
| 11 | §9: API reference lists 13 endpoints | **50** exist. Omits all `/admin/*`, `/accessibility/*`, `/crowd/*`, `/weather*`, `/routes/nearby`, `/trips/saved-routes*`, `/geocoding/search`, 4 `/evaluation/*`. | **INCOMPLETE** |
| 12 | §3: "3 route options (FASTEST / CHEAPEST / MIN_WALKING)" | 4 labels incl. `BALANCED`; typically 2 candidates returned | **MISMATCH** |
| 13 | §14: XAI tag table ("🏆 Best overall score", "🌧️ Less walking in rain", "🛡️ High reliability score") | None of these strings exist in `generateWhyRecommended` | **MISMATCH** |
| 14 | §10: demo weather "based on time-of-day seed" | Seeded on `|latitude + longitude|`; time-independent | **MISMATCH** |
| 15 | §16: "Route geometry: Haversine-interpolated polylines" | OSRM road geometry when available; 2-point straight line on fallback; transit = station-to-station polylines | **MISMATCH** |
| 16 | §17: "express-validator on all POST/PUT endpoints" | `PUT /auth/profile`, `PUT /auth/preferences`, `PUT /admin/stations/:id`, `PUT /admin/accessibility/:id` have no body validation | **MISMATCH** |
| 17 | §5/§17: "bcrypt 5" | `bcryptjs 2.4.3` | **MISMATCH** |
| 18 | §4 Phase 20: "TypeScript 0-error build" | 5 frontend `tsc` errors; `npm run build` doesn't type-check | **MISMATCH** |
| 19 | §15: metric "CI 90% Coverage: % of actual arrivals within predicted window" | `evaluationService` returns `confidenceIntervalCoveragePercent: null` by design | **MISMATCH** |
| 20 | **§18: results table — Reliability 82 vs 71, Walking 580 m vs 820 m, Missed-connection 8% vs 14%, CI Coverage 92%; "improves reliability by ~15% and reduces walking by ~29%"** | My run of the same benchmark: **100% agreement with the shortest-time baseline**, TransitSwap avg reliability 99/100. If TransitSwap picks the *same route* in all 5 scenarios, every differential is exactly **0**. The "92%" is the very figure `evaluationService.ts:6` says was removed as *"the fake 92% hardcoded confidence coverage"*. | **MISMATCH — most serious** |

Mismatch #20 is an academic-integrity hazard: the README publishes comparative performance figures that the project's own benchmark cannot reproduce and that the source code comments explicitly identify as fabricated. §20 "Viva Defence Guide" then scripts answers (Box-Muller, 500 trials, lr=0.05 nudge, 8% σ, 5 dimensions) that an examiner reading the code would immediately contradict.

**Nothing in the source code fabricates results.** Every service labels demo data honestly, and `evaluationService` deliberately returns `null` rather than a fake coverage figure. The dishonesty is confined to `README.md`.

---

## 29. Completed Work

| Feature | Implementation | Files | Evidence | Limitations |
|---|---|---|---|---|
| Multimodal candidate generation | 4 hand-coded pattern generators, parallel, with full validation | `multimodalService.ts` | `multimodalRouting.test.ts` passes; probe returns 1–4 routes | Not a graph search; 13.8% geographic reach |
| Candidate validation | continuity ≤50 m, geometry, dataset cross-check, de-dup | `multimodalService.ts:472-527` | Phase 3 report + tests | — |
| Road routing | OSRM foot/bike/driving + plausibility gate + typed error mapping | `routingService.ts` | Phase 0 live verification | public OSRM, rate-limited |
| Geocoding | Authenticated Nominatim proxy | `geocodingService.ts` | Phase 0 live verification | no cache, no 1 req/s guard |
| Map rendering | Leaflet, lazy-loaded, per-mode polyline styling, station pins, `fitBounds` | `MapView.tsx` | builds; 155 kB split chunk | transit drawn as chords |
| Weather | OWM + 10-min cache + labelled demo fallback + walking-scaled impact rules | `weatherService.ts` | pipeline test | current conditions only, 3-bucket in ranker |
| Crowd | Real user reports + 70/30 rule-based fusion + honest source labels | `crowdService.ts` | pipeline test | 4 coarse slots, ignores departure time |
| **Accessibility engine** | 100-pt station score, 7 per-profile rule sets, hard constraints, warnings, rejection reasons | `accessibilityService.ts` | **249 assertions pass** | synthetic data; 6/12 bus stops unrecorded |
| Reliability score | Rule-based heuristic, honestly labelled | `reliabilityService.ts:73` | `reliability.test.ts` | not calibrated |
| **Prediction intervals** | Sample mean/σ (Bessel), z-intervals, hierarchical fallback, min-5 gate, `isDataDriven` flag | `historicalReliabilityService.ts` | tests pass; refuses fake CI | synthetic seed data |
| **Monte Carlo risk** | Joint 1,000-trial empirical resampling + deterministic variant for reproducible offsets | `reliabilityService.ts:176,39` | pipeline test | **excluded from ranking** |
| Smart departure | Offsets {0,−5,−10,−15}, ≥5-pt improvement gate, `null` when no time given | `reliabilityService.ts:294` | 6 hardening tests pass | — |
| Weighted ranking | 7-feature min-max + profile/preference weights + mode bonus | `featureExtractor.ts`, `mlPreferenceService.ts` | `preferenceEndToEnd` passes | linear; magnitude-blind |
| **Pairwise logistic regression** | σ, dot, BCE+L2, batch GD, non-negativity clamp, persistence | `logisticRegression.ts` | `ml.test.ts` passes | **all labels = 1** |
| **Explanation layer** | Ground-truth-checked tags, honesty gates, ≤4 tags | `transitDnaService.ts:145` | **19 honesty assertions pass** | — |
| Auth | bcrypt 12, JWT, role, fail-closed admin, script-only admin creation | `authService.ts`, `middleware/auth.ts` | `admin.test.ts` passes | token in localStorage |
| Journeys / saved routes / destinations | Full CRUD, ownership-scoped, snapshot storage | `journeyService.ts`, `savedRouteService.ts` | — | DB-dependent tests skipped |
| Feedback loop | Rating + issues + actual duration → `JourneyObservation` (real data) | `journeyService.ts:177` | validation tests pass | needs a real `departureTime` |
| Admin console | Overview, station CRUD, accessibility edit, lift toggle, crowd moderation, feedback, dataset info | `adminService.ts`, `AdminDashboardPage.tsx` | middleware tests pass | `active` flag inert; CRUD untested |
| Graceful degradation | Every service checks `readyState`; demo fallback or clear 503 | throughout | verified — full pipeline runs with no DB | — |
| Data-provenance labelling | `isDemoData`, `isSyntheticDemoData`, `source`, `verificationSource`, `isSimulatedBenchmark` + disclaimers | throughout | consistent, no exceptions found | — |

---

## 30. Partially Completed Work

| Area | Present | Missing | Depends on | Priority | Next action |
|---|---|---|---|---|---|
| ML preference learning | Full training/inference/persistence pipeline | Negative pairs; shuffled split; valid metrics; UI surface | `recordRouteChoice`, `trainUserModel` | **P1** | Emit mirrored `label:0` pairs; shuffle before split |
| Ranking feature set | 7 features | `missedConnectionRisk`, `transferCount`, `confidenceInterval` width, `sustainabilityScore` | `featureExtractor` | **P1** | Add risk + transfers as features (and retrain) |
| Preference application | Weight adjustment + renormalisation | Not applied on the personalised path | `getModelStatus` | **P1** | Apply `getPreferenceAdjustedWeights` to stored weights too |
| Transit dataset | 19 stations, 12 stops, 4 bus routes | City-scale coverage; GTFS; real fares; frequencies | `transitData.ts` + a GTFS loader | **P0** | Import GTFS or extend the seed 5–10× |
| Accessibility data | 25 synthetic records | Records for 6 bus stops; referential integrity; provenance beyond `synthetic_demo` | `accessibilityData.ts` | **P1** | Complete coverage; join by id, not name |
| Candidate generation | 4 fixed patterns | Bus→bus; multi-interchange metro; ≥3 non-dominated candidates | `multimodalService.ts` | **P0** | Generalise to a k-shortest search over a stop graph |
| Evaluation harness | 5 scenarios, 2 baselines, honest `null` | Scenarios that discriminate; ablation; per-metric significance | `evaluationService.ts` | **P1** | New scenario set with genuine trade-offs |
| ML evaluation | Train/test scaffolding | A dataset with variety and both classes | `mlEvaluationService.ts` | **P1** | Generate noisy, two-class synthetic choices |
| Coverage evaluation | 80/20 split, empirical coverage | Uses only synthetic data, deterministic noise | `historicalReliabilityService.ts:377` | P2 | Use stored observations; sample real randomness |
| Admin station management | CRUD + `active` flag | `active` is never honoured by routing | `multimodalService` ↔ `Accessibility` | **P1** | Filter station lookups by `active`, or remove the flag |
| Test suite | 14 files, strong a11y/XAI coverage | Runner; API/integration/frontend/E2E tests; DB-backed CI | `package.json` | **P1** | Adopt Vitest; run all files; add supertest |
| Frontend type safety | Strict `tsconfig` | 5 errors; `build` skips `tsc` | `PlanTripPage`, `ProfilePage` | **P1** | Fix unions; `"build": "tsc -b && vite build"` |
| Community reports | Submission + storage | No display, no moderation, no feed into accessibility status | `AccessibilityReport` | P2 | Surface in admin; optionally downgrade station status |
| Research endpoints | 4 built | Unauthenticated; no UI | `evaluation.routes.ts` | P2 | Add auth; surface on a research page |
| Landing page | Full marketing layout | Search form is inert | `LandingPage.tsx` | P3 | Carry state into `/plan` or remove the form |

---

## 31. Current Bugs

### B1 — Demo account can never log in (HIGH)

- **Problem:** the seeded demo user's password is bcrypt-hashed twice.
- **Root cause:** `seedDemoUser.ts:29` computes `bcrypt.hash(DEMO_PASSWORD, 12)` and passes the digest as `password` to `User.create()`; `userSchema.pre("save")` (`models/User.ts:117`) then hashes that digest again.
- **Files:** `backend/src/utils/seedDemoUser.ts`, `backend/src/models/User.ts`
- **Reproduction (verified):**
  ```
  compare("Demo@1234", hash(hash("Demo@1234")))  → false
  compare("Demo@1234", hash("Demo@1234"))        → true
  ```
- **Impact:** the seeded demo account is unusable; the function's entire purpose is defeated. Directly threatens a live demo or viva walkthrough.
- **Fix:** pass the plaintext to `User.create()` and let the hook hash it once (this is what `seedAdmin.ts:43` already does correctly).

### B2 — "Reset TransitDNA" does not reset what the ranker uses (HIGH)

- **Problem:** after a reset, recommendations are unchanged.
- **Root cause:** `authService.resetTransitDna` (`:68`) rewrites `User.transitDNA.learnedWeights` (and omits `crowd`/`weather`), but ranking weights come from `UserPreferenceModel` via `getModelStatus`, which is never cleared. Compounding this, `multimodalController.ts:48` loads `User.transitDNA.learnedWeights` into `personalizedWeights`, uses it for a `scoreRoute` call at `:95`, and `rankRoutes` at `:118` then overwrites `transitDnaScore` — so the `User`-document weights never affect output at all.
- **Files:** `authService.ts`, `multimodalController.ts`, `mlPreferenceService.ts`
- **Impact:** a documented user-facing control silently does nothing; dead computation on every route request.
- **Fix:** delete or reset the `UserPreferenceModel` document (and optionally the user's `PairwisePreference` rows) in `resetTransitDna`; remove the dead `personalizedWeights` path or make `rankRoutes` accept it.

### B3 — `npm test` silently skips 7 of 14 test entries (HIGH)

- **Problem:** the suite exits 1 at file 6; files 7–13 never execute.
- **Root cause:** `package.json` chains 14 `ts-node` invocations with `&&`; `userPreferences.test.ts:186` calls `process.exit(1)`.
- **Reproduction:** `cd backend && npm test` → exit 1, output stops after "Problem 6".
- **Impact:** `preferenceEndToEnd`, `authPreferencePersistence`, `feedback`, `dashboard`, `continuousImprovement`, `admin` and `test-full-pipeline` are never run by the documented command. All 7 pass individually.
- **Fix:** adopt a real runner (Vitest) or sequence with `;` plus an aggregate exit code.

### B4 — Station deactivation has no effect (HIGH)

- **Problem:** an admin deactivates a station; it continues to appear in routes.
- **Root cause:** `Accessibility.active` is written by `deactivateStation` (`adminService.ts:123`) and `updateStation` (`:111`), but **never read** — grep-confirmed across `backend/src`. Routing reads the static `transitData.ts` arrays, and `accessibilityService.listStations()` applies no `active` filter. The doc-comment at `models/Accessibility.ts:22` claims inactive stations are "excluded from route generation's station lookups".
- **Impact:** an advertised admin capability is inert; the comment is actively misleading.
- **Fix:** filter `active !== false` in `listStations`/`getStation` and exclude inactive stations from `nearestMetro`/`nearestBusStop`; or remove the flag and the claim.

### B5 — Accessibility check silently skips unrecorded stations and rewards them (HIGH)

- **Problem:** a wheelchair-profile route through a stop with no accessibility record is never blocked and receives a *high* score.
- **Root cause:** `extractTransitStations` (`accessibilityService.ts:30`) matches by display name; only 6 of 12 bus stops have records. With no matched stations, `calculateProfileAccessibilityScore` (`:103`) defaults `avgStationScore` to 70 and then adds bonuses because `totalStairs` sums to 0 over an empty list.
- **Reproduction:** route via `b-02 Juhu Beach` / `b-04 Santacruz Station` / `b-07`–`b-09` / `b-11` with `profile=wheelchair`.
- **Impact:** **safety-relevant.** The system can tell a wheelchair user a route is accessible when it holds no data about its stops. Contradicts the "Checks EVERY transit station" doc-comment at `:400`.
- **Fix:** treat an unmatched transit station as `status:"unknown"` with no score credit; for hard-constraint profiles, either block or clearly flag it. Complete the dataset and join by `stationId`.

### B6 — Admin can store out-of-range coordinates (MEDIUM)

- **Root cause:** `PUT /admin/stations/:stationId` validates only the path param (`admin.routes.ts:44`); `updateStation` (`adminService.ts:111-114`) assigns `latitude`/`longitude` unchecked; `models/Accessibility.ts:33` declares them `Number, default: null` with no min/max. `createStation` *does* validate — the update path does not.
- **Impact:** corrupt coordinates propagate into haversine and map rendering.
- **Fix:** add body validators mirroring `createStation`, and `min`/`max` on the schema.

### B7 — Conditional hook after early return (MEDIUM)

- **Root cause:** `MultimodalResults.tsx` — `useMemo` (`:56`), `if (!selected) return null` (`:58`), `useMemo` (`:66`).
- **Impact:** latent "rendered fewer hooks than expected" crash. Unreachable today because the parent gates on `routes.length > 0`.
- **Fix:** move the early return above all hooks.

### B8 — `resetTransitDna` drops two weights (MEDIUM)

- **Root cause:** `authService.ts:75` assigns `learnedWeights` without `crowd`/`weather`, despite the "Problem 1 fix" that added them.
- **Impact:** inconsistent weight vector after reset.
- **Fix:** include all 7.

### B9 — Failing test prints both FAILED and passed (MEDIUM)

- **Root cause:** `userPreferences.test.ts` — `assert()` logs `❌`, then an unconditional `console.log("✅ ... passed")` follows.
- **Impact:** transcripts are self-contradictory; a reader can conclude the suite passed.
- **Fix:** make the pass message conditional.

### B10 — Inconsistent duplicate auto fare (MEDIUM)

- **Root cause:** `FARE_CONFIG.auto` ₹25 + ₹13/km (`transitData.ts:141`) vs last-mile ₹30 + ₹15/km (`reliabilityService.ts:369`).
- **Impact:** the same auto leg is priced differently in the route total and the last-mile panel.
- **Fix:** have last-mile read `FARE_CONFIG`.

### B11 — Failure message claims a save that did not happen (MEDIUM)

- **Root cause:** `ProfilePage.tsx:87` sets `"Preferences updated in local session."` in `catch`.
- **Impact:** user believes preferences were saved; violates the project's own honesty standard.
- **Fix:** report the actual error.

### B12 — Zero-length walking segments (LOW)

- **Root cause:** `walkSegment` emits a 0 m walk with two identical coordinates when an endpoint coincides with a station; `validSegment` permits it for non-transit modes.
- **Impact:** `"Walk 0 m to Versova Metro"` in the UI; degenerate geometry; all 5 benchmark scenarios hit this path.
- **Fix:** omit access/egress walks below a small threshold (e.g. 20 m).

---

## 32. Missing / Pending Work

### Technical
- Real test runner (Vitest), with all files executed and an aggregate exit code.
- `tsc` in the frontend build script; fix the 5 errors.
- Extract the enrichment pipeline out of `multimodalController` into a service.
- `helmet`; server-side geocoding cache; cross-request OSRM cache; response cache for `/api/evaluation`.
- Structured logging + a request id.
- Delete `src/imports/pasted_text/` (9,440 dead lines) and the 6 unused legacy types.
- Referential integrity between `transitData` and `Accessibility` (join by id; startup consistency check).
- `LICENSE`, ESLint config, `.editorconfig`.

### Data
- **GTFS ingestion, or a 5–10× larger seeded network** — the single highest-value change. Current reach: 13.8% of Mumbai; 98.6% of random O/D pairs return nothing.
- Accessibility records for all 12 bus stops (and for every station added).
- Fare schedules with a cited source; use `frequencyMinutes` for wait times.
- Real timetables (or at least per-route headways) instead of flat 300/480 s waits.
- Document provenance and licence for every dataset.

### Routing
- Generalise candidate generation to a graph search (k-shortest paths / RAPTOR-lite) over a stop graph, replacing the 4 fixed patterns and the hard-coded `m1-02` interchange.
- Support bus→bus and multi-interchange metro transfers.
- Guarantee ≥3 **non-dominated** candidates, or state honestly when fewer exist.
- Suppress degenerate zero-length walk segments.

### AI / ML
- **Emit mirrored negative pairs** (`label: 0`) — prerequisite for every ML claim.
- Shuffle before the train/test split; report accuracy only on a genuine held-out set.
- Add `missedConnectionRisk` and `transferCount` to the feature vector.
- Reconsider relative min-max normalisation: it destroys magnitude information over 2–4 candidates. Consider absolute scaling with documented caps, or a monotone transform.
- Apply explicit preferences on the personalised path too.
- Optionally: per-feature weight confidence intervals; a regularisation path.

### Integration
- Surface the 4 research endpoints in the UI (a Research/Evaluation page) and put them behind auth.
- Display `AccessibilityReport` submissions in the admin console.
- Make `active` actually filter routing.
- Carry the landing-page search into `/plan`.

### Testing
- API integration tests with supertest for all 50 endpoints.
- A MongoDB-backed CI job so the 6 honestly-skipped suites actually run (`mongodb-memory-server` is the cheapest route).
- Frontend component tests (Vitest + Testing Library) for `PlanTripPage`, `MultimodalResults`, `ProfilePage`.
- One E2E happy path (Playwright): register → plan → save → feedback.
- Regression tests pinning each bug in Section 31.
- A property test asserting the ranker never puts a Pareto-dominated route first.

### Research
- Restate the contribution precisely: *a validated multi-criteria ranking and explanation layer over a transit routing engine, with honest data-provenance labelling* — not "AI that beats Google Maps".
- Build a scenario set with **genuine trade-offs** (currently the candidate sets are dominated, so no ranker could differ from shortest-time).
- Ablation study: full model vs −reliability, −accessibility, −crowd, −weather, −ML weights.
- Sensitivity analysis over the ~11 magic constants in Section 13.
- Baselines: shortest-time, lowest-cost, least-walking, fewest-transfers, random, and (optionally) a weighted-sum with uniform weights.
- A small human-preference study (even 10–20 participants, N stated) to give the pairwise model real labels — or state clearly that no user study was conducted.

### Evaluation
- Replace the §18 README table with reproducible, dated output from `GET /api/evaluation`.
- Report prediction-interval coverage on **real** stored observations, not regenerated synthetic ones.
- Report latency distribution (p50/p95), not a single total.
- Report dataset coverage honestly (the 13.8% / 98.6% figures).
- State sample sizes and the synthetic/real split for every number published.

### UI / UX
- Fix the 5 type errors and the conditional hook.
- Honest error messaging on `ProfilePage`.
- Show a "why no route?" explanation with the reachable area when generation returns nothing (this will be the common case until the dataset grows).
- Route-splitting for the 459 kB main chunk.
- Accessibility audit of the app itself (keyboard nav, ARIA, contrast) — notable given the project's subject matter.

### Security
- Body validation on the 4 unvalidated PUT endpoints.
- Coordinate range validation on the admin update path.
- Auth + caching on `/api/evaluation/*`.
- `helmet`; re-run `npm audit` and decide explicitly.
- Document the localStorage-token trade-off.
- Move `DEMO_PASSWORD` to an env var.

### Deployment
- No `Dockerfile`, no CI workflow, no `render.yaml`/`vercel.json`, no deployment proof. README §25 describes the intended topology only.
- `GET /api/health` is a proper health check — good.
- Needed: a CI pipeline (typecheck + build + test), one actual deployed environment, and a smoke test against it.

### Documentation
- **Rewrite `README.md` against the code.** All 20 mismatches in Section 28, especially §18's unreproducible results table and §20's incorrect viva answers.
- Add an architecture decision record for: why 4 fixed patterns, why a linear scorer, why relative normalisation, why graceful degradation.
- Keep `PHASE_*.md` — they are accurate and demonstrate process rigour.

### Paper
- Problem statement, related work (RAPTOR/CSA, multi-criteria transit routing, learning-to-rank, accessible routing), method, honest evaluation, limitations, future work.
- Figures: architecture, pipeline, coverage map, ablation chart, latency distribution, example explanation card.
- A limitations section stating: synthetic data, 13.8% coverage, no user study, single-city, current-weather-only, estimation-not-prediction for crowd.

### Presentation
- Live demo script restricted to corridors that work (Versova↔Ghatkopar, Borivali↔Goregaon — Borivali↔Goregaon is the only probe that yields all 4 patterns).
- Show the wheelchair rejection of WEH Metro — the most compelling genuine behaviour.
- Show an explanation card and name which claims are gated on real data.

### Viva
- Rehearsed, truthful answers to: "Is this machine learning?", "Why does the ranker ignore your Monte Carlo result?", "What does 100% baseline agreement mean?", "Is the data real?", "Where are the §18 numbers from?"
- Be ready to state plainly: the data is synthetic, the benchmark is simulated, no user study was run, and the README was out of date (now corrected).

---

## 33. Data Limitations (must be stated in every academic artefact)

| Data | Reality | Must never be presented as |
|---|---|---|
| Metro/bus network | 19 stations, 12 stops, hand-authored, approximate | a real transit feed, or city-scale coverage |
| Geographic reach | **13.8%** of Mumbai within access range; **98.6%** of random O/D pairs return no route | a working city-wide planner |
| Fares | Hard-coded, no cited source | official tariffs |
| Schedules | None. Flat 300 s metro / 480 s bus wait; `frequencyMinutes` unused | timetable-accurate |
| Accessibility | 25 synthetic records, `verificationSource:"synthetic_demo"`, header states no station was surveyed; 6 of 12 bus stops have no record at all | surveyed or authority-verified data |
| Crowd | 12 synthetic baseline records + real user reports; 4 coarse time slots; **estimation, not prediction**; ignores the planned departure time | crowd forecasting |
| Weather | Current observation only, or a coordinate-seeded demo value | a forecast for the journey time |
| Reliability observations | 80 synthetic records with deterministic `sin`/`cos` noise; real ones only accrue from user feedback | an empirical delay dataset |
| ML training data | Real user choices, but **every label is 1** — single-class | a validly labelled preference dataset |
| ML accuracy figures | Degenerate: a constant classifier scores 100% | model performance |
| ML benchmark | 3 distinct vectors × 20 copies; test split contains one archetype only | a train/test evaluation |
| CI coverage | 100% at the 90% level on smooth deterministic synthetic data | empirical calibration |
| Benchmark | 5 scenarios, all using exact station coordinates (degenerate 0 m walks), 100% agreement with shortest-time | evidence of multi-criteria benefit |
| README §18 table | Not reproducible from this code; the 92% is the figure the code calls fabricated | results |

The source code labels all of this correctly. Only `README.md` does not.

---

## 34. Academic / Research Requirements

### The central problem to solve before any evaluation is meaningful

The benchmark reports **100% agreement with the shortest-time baseline** across all 5 scenarios, and TransitSwap's average reliability of 99/100 is simply the shortest-time route's own score. This is not a tuning failure — it is structural:

1. Candidate generation produces **2 routes** for most corridors (0 for 98.6% of random pairs, ≥2 for none on the grid).
2. One of those two is typically **Pareto-dominated on every axis** (e.g. Andheri→Marol Naka: 15 min/₹22/0 m vs 55 min/₹41/1,316 m).
3. Any rational ranker — single- or multi-criteria — must pick the dominating route.

**No ranking algorithm can demonstrate value over a set with no trade-offs.** The research contribution is therefore blocked on candidate generation, not on the ranker. Fixing the ranker first would be wasted effort.

### Honest statement of contribution

> A transparent, auditable multi-criteria ranking and explanation layer for multimodal transit routing, with per-profile accessibility constraints enforced as hard filters, statistically grounded arrival prediction intervals that refuse to report a confidence level without sufficient data, and systematic data-provenance labelling. Evaluated on a synthetic single-corridor dataset; no user study was conducted.

That is defensible and accurate. "AI that beats Google Maps" is not.

### Requirement checklist

| Requirement | Status | Gap |
|---|---|---|
| Working implementation | ✅ substantial | 12 bugs; 5 type errors |
| Real-world data | ❌ | all transit/accessibility data synthetic |
| Non-trivial algorithms | ⚠️ partial | validation and a11y rules are solid; candidate generation is 4 `if` branches, not a search |
| Genuine ML | ⚠️ partial | correct implementation, invalid labels |
| Baselines | ✅ 2 exist | add least-walking, fewest-transfers, random |
| Comparison that discriminates | ❌ | 100% agreement — nothing to compare |
| Ablation | ❌ | none |
| Statistical rigour | ⚠️ | correct σ/intervals; degenerate accuracy metrics |
| Reproducibility | ⚠️ | deterministic engine, but `npm test` aborts and §18 is unreproducible |
| Limitations stated | ✅ in code | ❌ in README |
| Paper | ❌ | not started |
| Deployment | ❌ | no CI, no deployed instance |
| Viva readiness | ⚠️ | README §20 scripts answers the code contradicts |

---

## 35. Evaluation Plan

Only metrics the implemented system can actually support.

### Phase A — Routing capability (prerequisite)
| Metric | Definition | Current |
|---|---|---|
| O/D coverage | % of sampled pairs returning ≥1 route | **1.4%** |
| Candidate richness | mean candidates per successful query | **~2** |
| Non-dominated ratio | % of candidate sets with ≥2 Pareto-optimal routes | **~0%** |
| Validation rejection rate | % of generated candidates dropped by `validateCandidate` | measure |
| Latency | p50 / p95 per `/routes/multimodal`, OSRM live vs stubbed | measure |

**Nothing downstream is worth reporting until coverage and non-dominated ratio are materially above zero.**

### Phase B — Ranking quality (once Phase A passes)
| Metric | Definition |
|---|---|
| Baseline disagreement rate | % scenarios where TransitSwap differs from shortest-time / lowest-cost / least-walking / fewest-transfers |
| Trade-off profile | mean Δ time, Δ fare, Δ walking, Δ transfers, Δ reliability, Δ risk vs each baseline |
| Dominance violations | count of cases where a Pareto-dominated route is ranked first (target: 0) |
| Constraint satisfaction | % of wheelchair-profile recommendations with no blocking station (target: 100%) |
| Rank stability | Kendall's τ across repeated identical requests (should be 1.0 — the engine is deterministic) |

### Phase C — Prediction quality
| Metric | Definition |
|---|---|
| Empirical 90% / 95% interval coverage | on a held-out split of **real** `JourneyObservation` records |
| MAE / RMSE of duration prediction | actual vs predicted |
| Interval sharpness | mean interval width — a wide interval trivially achieves coverage |
| Calibration curve | nominal vs empirical coverage across confidence levels |

### Phase D — Learning-to-rank (only after negative pairs exist)
| Metric | Definition |
|---|---|
| Pairwise accuracy | on a **shuffled** held-out split of a **two-class** dataset |
| Log loss | on held-out data |
| vs uniform-weight baseline | the honest comparison |
| vs profile-preset baseline | does learning beat the hand-tuned presets? |
| Learning curve | accuracy against sample count (5 … 200) |
| Weight-convergence trajectory | per-feature weight over training |

### Ablations (the strongest available academic contribution)
Full model vs: −reliability feature, −accessibility feature, −crowd, −weather, −learned weights (profile presets only), −preference adjustment, −hard accessibility constraints. Report the decision-change rate and the trade-off profile for each.

### Sensitivity analysis
Sweep the magic constants in Section 13 (`MAX_WALK_TO_METRO_M`, `METRO_WAIT_SEC`, `BUS_WAIT_SEC`, mode speeds, distance factors) and report how often the top-ranked route changes. This directly addresses "your constants are arbitrary", which an examiner will ask.

### Figures / tables
1. Architecture diagram. 2. Pipeline sequence with per-stage latency. 3. Coverage map (reachable vs unreachable grid). 4. Pareto scatter of candidates for one corridor. 5. Ablation bar chart (decision-change rate). 6. Calibration curve. 7. Learning curve. 8. Sensitivity tornado chart. 9. Example explanation card with each claim's data source annotated.

### Methodology statement (mandatory)
Dataset provenance and synthetic/real split; seed and determinism; hardware and Node version; OSRM live vs stubbed; sample sizes; explicit statement that no user study was conducted.

---

## 36. Current Completion Assessment

Percentages are expressed as ranges and justified by evidence; `NEEDS VERIFICATION` is used where I cannot justify a number.

| Area | Status | Approx. | Evidence | Remaining |
|---|---|---|---|---|
| Frontend | PARTIAL | 80–85% | 10 pages, all states handled, builds | 5 type errors, hook bug, inert landing form, no tests |
| Backend | COMPLETE | 90–95% | 50 endpoints, 0 tsc errors, builds | 4 unvalidated PUTs, controller holds pipeline logic |
| Database | COMPLETE | 90% | 10 models, indexed, ownership-scoped | no lat/lng validators, 2 dead fields, no referential integrity |
| Authentication | COMPLETE | 90% | bcrypt 12, JWT, fail-closed admin, tested | localStorage token, no refresh/revocation |
| Routing engine | PARTIAL | 55–65% | 4 patterns, strong validation, tests pass | not a graph search; single hard-coded interchange; no bus→bus |
| Multimodal coverage | **BROKEN at scale** | **10–15%** | **13.8% area reach; 98.6% of O/D pairs → 0 routes** | dataset expansion / GTFS |
| Transit data | PARTIAL (demo) | 15–20% | 19 stations, 12 stops, 4 routes, labelled synthetic | city-scale data, fares, frequencies |
| Map / road routing | COMPLETE | 90% | Leaflet + OSRM + Nominatim, live-verified | no cache, transit drawn as chords |
| Weather | COMPLETE (current-only) | 75% | OWM + cache + labelled fallback + rules | no forecast; 3-bucket in ranker |
| Crowd | PARTIAL | 60% | real reports + rule-based fusion + honest labels | 4 coarse slots; ignores departure time; not prediction |
| Accessibility | **COMPLETE (strongest)** | 85% | 249 assertions; hard constraints verified | **B5 silent skip**; 6/12 stops unrecorded; synthetic data |
| Reliability (rules) | COMPLETE | 85% | honest heuristic, tested | not calibrated |
| Reliability (statistics) | COMPLETE | 85% | correct σ/z-intervals, min-sample gate, `isDataDriven` | synthetic seed; **excluded from ranking** |
| Monte Carlo | COMPLETE but inert | 70% | joint 1,000-trial + deterministic variant | **zero influence on ranking** (verified) |
| Preferences | PARTIAL | 65% | stored, applied, renormalised, explained | **dropped on the personalised path**; 2 failing tests |
| AI / ML | PARTIAL | 45–55% | correct pairwise LR, trains, persists, infers | **single-class labels**; invalid metrics; invalid benchmark; no UI |
| Recommendation | PARTIAL | 70% | full pipeline, strong explanations (19 tests) | 7 features omit risk/transfers/sustainability; magnitude-blind normalisation |
| Testing | PARTIAL | 45–55% | 14 files; excellent a11y (249) and XAI (19) coverage | **suite aborts at 6/14**; no runner; no API/frontend/E2E; 6 suites DB-skipped |
| Security | COMPLETE | 80% | no secrets, good auth, rate limits, prod guard | 4 unvalidated PUTs, open `/evaluation/*`, no helmet |
| Performance | PARTIAL | 50% | per-request caches, weather cache, lazy map | uncached 2 s benchmark on dashboard mount, N+1s, unbounded finds |
| Deployment | **NOT STARTED** | 5–10% | health endpoint + README topology only | no CI, no Dockerfile, no deployed instance |
| Documentation | MIXED | 50% | PHASE_0–3 accurate and thorough | **README has 20 mismatches incl. unreproducible results** |
| Research | **NOT STARTED** | 10–15% | 2 baselines + benchmark harness exist | no ablation, no sensitivity, no discriminating scenarios, no paper |
| Evaluation | **INVALID** | 15–20% | harness runs; honest `null` for coverage | **100% baseline agreement**; degenerate ML benchmark; synthetic-only CI coverage |

**Overall: a well-engineered prototype at roughly 60–65% of a defensible final-year project.** The engineering discipline is above average for the category — honest data labelling, graceful degradation, 268 passing assertions, zero backend type errors, no TODO debt, and comments that explain *why*. The deficit is concentrated in three places: **data coverage**, **ML label validity**, and **the gap between what the README claims and what the code does**.

---

## 37. Priority Matrix

### P0 — BLOCKER (nothing downstream is meaningful until these are done)
| ID | Task |
|---|---|
| P0-1 | Expand the transit dataset (GTFS import, or 5–10× the seed) so coverage and candidate richness are non-trivial |
| P0-2 | Generalise candidate generation so corridors yield ≥3 **non-dominated** routes |
| P0-3 | Correct `README.md` §18 (unreproducible results, fabricated 92%) and §20 (viva answers the code contradicts) |

### P1 — CRITICAL
| ID | Task |
|---|---|
| P1-1 | B5 — accessibility silently skips unrecorded stations and rewards them (safety-relevant) |
| P1-2 | B1 — demo account cannot log in |
| P1-3 | B3 — `npm test` skips 7 of 14 entries; adopt a real runner |
| P1-4 | Emit mirrored `label:0` pairs; shuffle before splitting; stop reporting degenerate accuracy |
| P1-5 | Add `missedConnectionRisk` + `transferCount` to the ranking features |
| P1-6 | Apply explicit preferences on the personalised path (`getModelStatus`) |
| P1-7 | B2 — make "Reset TransitDNA" reset `UserPreferenceModel`; remove the dead `personalizedWeights` path |
| P1-8 | B4 — honour `active`, or remove the flag and the claim |
| P1-9 | Fix the 5 frontend type errors; add `tsc` to the build script |
| P1-10 | Rewrite the rest of `README.md` against the code (all 20 mismatches) |
| P1-11 | Complete accessibility records for all 12 bus stops; join by `stationId` |
| P1-12 | Body validation on the 4 unvalidated PUT endpoints; coordinate ranges on the admin update path |

### P2 — IMPORTANT
| ID | Task |
|---|---|
| P2-1 | Build a discriminating scenario set; re-run the benchmark; publish reproducible numbers |
| P2-2 | Ablation study (7 configurations) |
| P2-3 | Sensitivity analysis over the ~11 magic constants |
| P2-4 | Rebuild `mlEvaluationService`'s synthetic dataset with variety and both classes |
| P2-5 | API integration tests (supertest) across all 50 endpoints |
| P2-6 | MongoDB-backed CI so the 6 skipped suites run |
| P2-7 | Cache `/api/evaluation`; add auth to `/evaluation/*`; remove it from the dashboard's mount path |
| P2-8 | Reliability coverage evaluation on **real** observations with properly sampled noise |
| P2-9 | B6–B12 (coordinate validation, hook order, reset weights, test output, duplicate fare, error message, zero-length walks) |
| P2-10 | Surface the research endpoints in the UI; show `AccessibilityReport` in admin |
| P2-11 | Reconsider relative min-max normalisation (magnitude-blindness) |

### P3 — ENHANCEMENT
CI pipeline; one deployed environment; frontend component tests; E2E happy path; `helmet`; geocoding + OSRM caches; delete `src/imports/` and dead types; route-split the 459 kB chunk; honest "why no route?" empty state; app's own accessibility audit; the paper.

### P4 — OPTIONAL
Bus→bus transfers; multi-interchange metro; weather forecast instead of current; crowd *prediction*; real-time GTFS-RT; multi-city; small human-preference study; `LICENSE`; ESLint.

---

## 38. Dependency Graph

```
P0-1 transit data expansion
   └─▶ P0-2 candidate generation (≥3 non-dominated routes)
          ├─▶ P1-5 add risk + transfers to features
          │      └─▶ P1-4 fix ML labels ──▶ P2-4 valid ML benchmark
          │             └─▶ P1-6 preferences on personalised path
          │                    └─▶ P2-1 discriminating benchmark
          │                           ├─▶ P2-2 ablation
          │                           ├─▶ P2-3 sensitivity
          │                           └─▶ P2-8 real coverage evaluation
          │                                  └─▶ paper · presentation · viva
          └─▶ P1-11 complete accessibility records
                 └─▶ P1-1 fix B5 (unrecorded-station skip)

independent, start immediately:
   P1-2 B1 demo login · P1-3 test runner · P1-7 B2 reset · P1-8 B4 active
   P1-9 frontend types · P1-12 validation · P0-3 + P1-10 README
      └─▶ P2-5 API tests ─▶ P2-6 DB-backed CI ─▶ P3 CI pipeline ─▶ P3 deployment
```

**Critical path to a defensible project:**
`transit data → candidate generation → ranking features → ML labels → benchmark → ablation → paper`

Everything else can proceed in parallel. The bug fixes (P1-2, P1-3, P1-7, P1-8, P1-9, P1-12) and the README correction (P0-3, P1-10) have no dependencies and should be done first because they are cheap and they unblock trustworthy measurement.

---

## 39. Complete Future Roadmap

Twelve phases, numbered to continue from the existing Phase 3.

---

### Phase 4 — Stabilisation (truth before features)

**Objective:** every documented command works, every claim in the repo is true, and measurement can be trusted.
**Why required:** the suite silently skips half its files, the frontend ships 5 type errors, and the README publishes results the code cannot reproduce. Measuring anything before this is measuring noise.
**Dependencies:** none.
**Files:** `backend/package.json`, `package.json`, `utils/seedDemoUser.ts`, `authService.ts`, `multimodalController.ts`, `adminService.ts`, `accessibilityService.ts`, `models/Accessibility.ts`, `routes/auth.routes.ts`, `routes/admin.routes.ts`, `MultimodalResults.tsx`, `ProfilePage.tsx`, `PlanTripPage.tsx`, `README.md`.
**Implementation:** fix B1–B12; adopt Vitest and run all 14 entries; add `tsc -b` to the frontend build; add body validators and coordinate ranges; rewrite README against the code.
**Data work:** none.
**Testing:** all suites green; a regression test per bug; `tsc --noEmit` clean on both packages.
**Output:** `npm test` exit 0 with 14/14 executed; 0 type errors; an accurate README.
**Success criteria:** both typechecks clean; full suite green; every README claim traceable to a file; §18 replaced with dated reproducible output or removed.
**Risks:** fixing B5 will correctly reject routes that previously passed — that is the point; update the affected test expectations and say so.
**Priority:** **P0/P1.**

---

### Phase 5 — Transit data expansion

**Objective:** raise coverage from 13.8% of Mumbai to a usable majority, and candidate richness from ~2 to ≥3 non-dominated routes.
**Why required:** the hard blocker. 98.6% of random O/D pairs return nothing; no grid pair returns ≥2 routes. Every research claim depends on fixing this.
**Dependencies:** Phase 4 (trustworthy tests).
**Files:** `data/transitData.ts` (+ a new GTFS loader), `data/accessibilityData.ts`, `multimodalService.ts` (lookups only).
**Implementation:** a GTFS importer (`stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`) producing the existing interfaces, or extend the seed to all Mumbai Metro lines + 30–50 bus routes. Keep the existing shapes so `multimodalService` needs no rewrite. Use `frequencyMinutes` for wait times instead of the flat constants.
**Data work:** source and licence every dataset; accessibility records for **every** stop; fares with a cited source; document provenance in the README.
**Testing:** re-run the coverage probe; assert coverage > 60% and mean candidates ≥ 3; existing routing tests must still pass.
**Output:** a measurably larger network with documented provenance.
**Success criteria:** ≥60% grid coverage; ≥3 candidates on ≥50% of successful queries; every stop has an accessibility record; all Phase 3 validation tests still pass.
**Risks:** O(n·m) in `tryWalkBusMetroWalk` degrades — Phase 6 addresses it. GTFS licensing must be checked. Keep synthetic data clearly labelled if real feeds are unavailable.
**Priority:** **P0.**

---

### Phase 6 — Candidate generation engine

**Objective:** replace the 4 fixed patterns with a real search that produces ≥3 non-dominated candidates.
**Why required:** the current engine cannot generate trade-offs, so no ranker can demonstrate value.
**Dependencies:** Phase 5.
**Files:** `multimodalService.ts` (new path-finding module), `transitData.ts` (graph construction).
**Implementation:** build a stop graph (walk edges within a radius, in-vehicle edges, transfer edges). Run k-shortest-paths or a RAPTOR-lite round-based scan to produce k candidates, then filter to the Pareto frontier over (time, fare, walking, transfers). Remove the hard-coded `m1-02` interchange. Support bus→bus. **Keep `validateCandidate` unchanged** — it is good and becomes more valuable. Suppress sub-20 m access walks.
**Data work:** none beyond Phase 5.
**Testing:** assert every returned set is Pareto-non-dominated; assert bus→bus and multi-interchange metro work; latency p95 under a stated budget; all Phase 3 validation tests still pass.
**Output:** 3–5 genuinely different candidates per query.
**Success criteria:** 0 Pareto-dominated routes returned; ≥3 candidates on ≥50% of queries; p95 latency within budget; no regression in validation tests.
**Risks:** the largest change in the roadmap. Mitigate by keeping the 4 pattern generators behind a flag until the new engine passes every existing test.
**Priority:** **P0.**

---

### Phase 7 — Feature set and ranking correctness

**Objective:** make the ranker see everything the system computes, and make preferences work on every path.
**Why required:** verified today — a 95%-risk / 4-transfer route outranks a 5%-risk / 0-transfer route even when the user prioritises reliability. Sustainability has zero effect.
**Dependencies:** Phase 6 (trade-offs must exist to rank).
**Files:** `ml/featureExtractor.ts`, `ml/mlPreferenceService.ts`, `transitDnaService.ts`, `models/PreferencePair.ts`, `models/UserPreferenceModel.ts`.
**Implementation:** extend the vector to 9 features (add `connectionRisk = 1 − risk/100`, `transfers`); decide explicitly whether `sustainability` is a ranking feature or a display metric and document it. Apply `getPreferenceAdjustedWeights` on the personalised path. Address magnitude-blindness: either absolute normalisation with documented caps, or min-max with a floor on the denominator.
**Data work:** existing `deltaX` rows are 7-D — version the schema and retrain, or pad with a documented migration.
**Testing:** the 2 currently failing preference tests must pass; add a property test that a Pareto-dominated route is never ranked first; assert risk and transfers measurably change the order.
**Output:** a ranker whose output reflects every computed signal.
**Success criteria:** 14/14 test files green including the 2 current failures; dominance violations = 0; risk and transfers demonstrably affect order.
**Risks:** 9 features on few samples increases variance — the L2 term and the ≥5-sample gate already mitigate this; report the learning curve.
**Priority:** **P1.**

---

### Phase 8 — ML validity

**Objective:** make the pairwise logistic regression statistically valid and its metrics meaningful.
**Why required:** every label is 1. The model trains on a single class and its accuracy figures are vacuous — a constant classifier scores 100%.
**Dependencies:** Phase 7.
**Files:** `ml/mlPreferenceService.ts`, `ml/logisticRegression.ts`, `ml/mlEvaluationService.ts`, `models/PreferencePair.ts`.
**Implementation:** in `recordRouteChoice`, for each alternative store **both** `{chosen − rejected, 1}` and `{rejected − chosen, 0}`; extend the unique index accordingly. Shuffle (seeded) before the 80/20 split. Report accuracy only on the held-out set. Rebuild the synthetic benchmark with noisy, varied, two-class samples and a stratified split. Remove the 3 unused imports and the dead `userSamplesCount`.
**Data work:** existing single-class rows must be migrated (mirror them) or discarded with a note.
**Testing:** assert both labels are present; assert a constant classifier does **not** achieve 100%; assert the learned weights recover a known synthetic preference direction; log-loss decreases over iterations.
**Output:** a learning-to-rank model whose reported numbers mean something.
**Success criteria:** balanced labels; held-out accuracy strictly between 50% and 100%; weights recover a planted preference; the benchmark's test split contains all archetypes.
**Risks:** honest accuracy will be *lower* than the current fake 100% — that is the correct outcome and must be presented as such.
**Priority:** **P1.**

---

### Phase 9 — Evaluation harness rebuild

**Objective:** a benchmark that can actually distinguish TransitSwap from its baselines.
**Why required:** 100% agreement with shortest-time today; the README's §18 table is unreproducible.
**Dependencies:** Phases 6–8.
**Files:** `evaluationService.ts`, `ml/mlEvaluationService.ts`, `reliability/historicalReliabilityService.ts`, new ablation and sensitivity scripts.
**Implementation:** build a scenario set (≥20) with genuine trade-offs, using realistic addresses rather than exact station coordinates (avoiding the 0 m-walk degenerate path). Add least-walking, fewest-transfers and random baselines. Add 7 ablation configurations. Add a sensitivity sweep over the ~11 magic constants. Report p50/p95 latency. Compute interval coverage on **real** stored observations. Replace the deterministic `sin`/`cos` seed noise with properly sampled randomness (seeded for reproducibility).
**Data work:** curate and document the scenario set; record the synthetic/real split for every metric.
**Testing:** the harness must be deterministic given a seed; assert baseline disagreement > 0.
**Output:** reproducible tables and figures.
**Success criteria:** baseline disagreement > 0 with a documented trade-off profile; ablation shows per-feature decision-change rates; coverage reported on real data with its sample size; every number regenerable by one command.
**Risks:** results may show the multi-criteria engine differs only modestly. Report that honestly — a well-measured modest effect is a legitimate finding; a fabricated large one is not.
**Priority:** **P1/P2.**

---

### Phase 10 — Test and CI completeness

**Objective:** every endpoint and critical UI path covered, run automatically.
**Dependencies:** Phase 4 (runner).
**Files:** `backend/src/__tests__/**`, new `src/**/*.test.tsx`, new `.github/workflows/ci.yml`.
**Implementation:** supertest integration tests for all 50 endpoints (auth, validation, ownership, error codes); `mongodb-memory-server` so the 6 skipped suites run; Vitest + Testing Library for `PlanTripPage`, `MultimodalResults`, `ProfilePage`; one Playwright happy path; CI running typecheck + build + test on both packages.
**Output:** green CI with stated coverage.
**Success criteria:** 0 honestly-skipped suites in CI; all 50 endpoints have at least a happy-path and an auth-failure test; CI blocks on type errors.
**Risks:** `mongodb-memory-server` adds CI time — acceptable.
**Priority:** **P2.**

---

### Phase 11 — Performance and security hardening

**Objective:** remove the measured bottlenecks and close the validation gaps.
**Dependencies:** Phase 10 (regression safety net).
**Files:** `evaluationService.ts`, `DashboardPage.tsx`, `reliabilityService.ts`, `crowdService.ts`, `historicalReliabilityService.ts`, `geocodingService.ts`, `multimodalService.ts`, `app.ts`, `routes/evaluation.routes.ts`.
**Implementation:** cache `/api/evaluation` (TTL or precompute) and take it off the dashboard's mount path; remove the duplicate `getHistoricalDelayStats` call in the Monte Carlo loop; batch `crowdService` queries; bound the `JourneyObservation` queries and move statistics into an aggregation pipeline; add a cross-request OSRM/geocoding cache; add `helmet`; authenticate `/evaluation/*`; re-run `npm audit` and decide explicitly; route-split the frontend.
**Testing:** before/after latency on `/routes/multimodal` and `/evaluation`; security tests for the newly validated endpoints.
**Success criteria:** `/evaluation` p95 under 200 ms cached; no N+1 in the route path; no unbounded `find()`; `helmet` active; all PUT endpoints validated.
**Priority:** **P2/P3.**

---

### Phase 12 — UX completion

**Objective:** finish the partial screens and make the product honest under failure.
**Dependencies:** Phase 7.
**Files:** `ProfilePage.tsx`, `LandingPage.tsx`, `PlanTripPage.tsx`, `MultimodalResults.tsx`, new research page, `AdminDashboardPage.tsx`.
**Implementation:** honest error messaging on `ProfilePage`; carry the landing search into `/plan` or remove the form; a "why no route?" empty state that shows the reachable area; a research page surfacing the 4 ML/reliability endpoints; show `AccessibilityReport` submissions in admin; an accessibility audit of the app itself (keyboard nav, ARIA, contrast).
**Success criteria:** no screen reports success on failure; no inert controls; the app meets a stated WCAG level on its main flows.
**Priority:** **P3.**

---

### Phase 13 — Deployment

**Objective:** one live, reachable environment.
**Dependencies:** Phases 10–11.
**Implementation:** deploy the frontend (static host) and backend (Node host) per README §25; MongoDB Atlas; env vars set on the platform; `/api/health` as the health check; a post-deploy smoke test in CI.
**Success criteria:** public URL works; `/api/health` returns `database: "connected"`; CORS correct; the production `JWT_SECRET` guard verified; a smoke test passes against the deployed URL.
**Priority:** **P3.**

---

### Phase 14 — Documentation and paper

**Objective:** a complete, accurate written record.
**Dependencies:** Phase 9 (real results).
**Implementation:** final README; ADRs for the four major design decisions; the paper (problem, related work, method, evaluation, limitations, future work) with the 9 figures from Section 35; a `PHASE_4`–`PHASE_13` verification document per phase, in the style of the existing ones.
**Success criteria:** every number in the paper traceable to a command; limitations section covers all of Section 33; no claim unsupported by code.
**Priority:** **P2.**

---

### Phase 15 — Demo, presentation and viva

**Objective:** present the work accurately and confidently.
**Dependencies:** all prior phases.
**Implementation:** a demo script using corridors that work; highlight the wheelchair rejection of WEH Metro and an explanation card with each claim's data source annotated; slides built from the Phase 9 figures; rehearsed truthful answers to the five hard questions in Section 32.
**Success criteria:** the demo runs without a dead end; every spoken claim matches the code; synthetic data, simulated benchmark and the absence of a user study are stated up front.
**Priority:** **P1** (schedule-critical).

---

## 40. Phase-by-Phase Plan — mandatory procedure

Per the development rule, every phase from Phase 4 onward follows:

1. Inspect the existing implementation.
2. Identify the exact files needing change.
3. Make the minimum necessary change.
4. Preserve existing working functionality.
5. Implement the phase.
6. Run `npx tsc --noEmit` on both packages.
7. Run the relevant tests.
8. Run the full regression suite.
9. Verify the affected API endpoints.
10. Verify frontend integration.
11. Verify database behaviour.
12. Confirm no unrelated regressions.
13. Write `PHASE_<n>_VERIFICATION.md` in the style of the existing phase documents.
14. Only then begin the next phase.

**Never implement multiple unrelated phases at once.**

---

## 41. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phase 6 candidate-generation rewrite regresses validated routing | Medium | High | Keep the 4 pattern generators behind a flag until the new engine passes every Phase 3 test; `validateCandidate` stays unchanged as the safety net |
| GTFS data unavailable or unsuitably licensed for Mumbai | Medium | High | Fall back to a 5–10× expanded seed, clearly labelled synthetic; or use a city with open GTFS and say so |
| Honest ML metrics come out unimpressive | **High** | Medium | Frame the contribution as the ranking + explanation + constraint layer (Section 34). A well-measured modest effect is publishable; a fabricated large one is not |
| Benchmark still shows little baseline disagreement after Phase 9 | Medium | Medium | Report it honestly with the trade-off profile; the ablation and sensitivity studies carry the analysis |
| Examiner reads the code and catches a README claim | **High if unfixed** | **Severe** | Phase 4 P0-3 and P1-10. This is the highest-severity, lowest-cost risk in the list |
| B5 fix changes accessibility outputs and breaks test expectations | High | Low | Expected and correct; update expectations and document the change |
| Public OSRM / Nominatim rate-limit or block the project | Medium | Medium | Add caching (Phase 11); honour Nominatim's 1 req/s; set a contact `User-Agent`; self-host OSRM if needed |
| Scope creep into real-time feeds, multi-city or deep learning | Medium | High | Section 42 — hold the scope. Phases 5–9 are the whole critical path |
| Time runs out before the paper | Medium | High | Phase 14 depends only on Phase 9; start writing method and limitations during Phases 5–8 |
| No git repository — no history, no rollback | **Certain (today)** | High | **`git init` and commit before Phase 4.** `PHASE_0_BASELINE.md` already records that the baseline tag could not be created |
| Node 20 vs documented Node 22 | Low | Low | Both builds pass; either align `.mise.toml` or correct the README |

---

## 42. Things We Must NOT Change

**Preserve exactly — these work and are the project's strongest assets:**

1. **The data-provenance labelling system.** `isDemoData`, `isSyntheticDemoData`, `source`, `verificationSource`, `isSimulatedBenchmark`, and the explicit disclaimer strings. Applied consistently with no exceptions found. This is the project's integrity backbone.
2. **`validateCandidate` and the whole Phase 3 validation layer** (`multimodalService.ts:472-527`). Continuity, geometry and dataset cross-checking. It becomes *more* valuable once candidate generation is generalised.
3. **The accessibility rule engine** (`accessibilityService.ts`) — the transparent 100-point score, the 7 per-profile rule sets, the hard-constraint logic, the warning generator, 249 passing assertions. Fix the B5 coverage hole; do not restructure the rules.
4. **`isDataDriven` honesty gating.** `calculatePredictionInterval` returning `confidenceLevelPercent: 0` rather than a fake 90% is exactly right.
5. **`evaluationService`'s `confidenceIntervalCoveragePercent: null`.** The code deliberately refuses to emit a fabricated coverage figure. Never replace it with a number that isn't measured.
6. **The explanation layer** (`generateWhyRecommended`) and its 19 honesty tests. Every claim is checked against the actual candidate set. Best-engineered piece in the pipeline.
7. **Graceful degradation.** `config/db.ts` not exiting on connection failure, and every service checking `readyState`. Verified working with no database.
8. **`parseLocalDateTime` returning `null` instead of "now"**, and `calculateSmartDeparture` returning `null` without a departure time. Correct refusals to invent data.
9. **The deterministic transfer-risk variant** (`calculateDeterministicTransferRiskPercent`) used for Smart Departure instead of the randomised Monte Carlo. A thoughtful, correct reproducibility decision.
10. **Admin authorisation design.** `requireAdmin` after `requireAuth`, fail-closed on a missing `role` claim, script-only admin creation, registration that never reads `role`.
11. **Ownership scoping** on every user-data query.
12. **`PHASE_0`–`PHASE_3` documents.** Accurate, honest (they record the test failure and the Node warning), and evidence of process rigour. Add to them; never rewrite them.
13. **The architecture and stack.** React/Vite/Tailwind + Express/Mongoose/MongoDB, Leaflet/OSM/OSRM/Nominatim, the layered route→controller→service→model structure, the `{success, data, message}` envelope. All appropriate. No framework migration, no database change, no provider swap, no UI redesign.
14. **The comment culture.** Comments explain *why* and reference the specific defect they fixed. Preserve this style in new code.

**Do not:** rewrite the frontend; replace Leaflet/OSRM/Nominatim; change the Mongoose schemas beyond the additive migrations named in Phases 7–8; add deep learning, RL, GNNs, LSTMs, transformers, CV or generative AI; upgrade dependencies without cause; run `npm audit fix` without reviewing it; remove existing features; or broaden the objective.

---

## 43. Definition of Done

**TransitSwap is complete when all of the following hold:**

### Functionality
- [ ] ≥60% of a city-bounding-box grid returns ≥1 route; ≥50% of successful queries return ≥3 candidates
- [ ] 0 Pareto-dominated routes ranked first (property-tested)
- [ ] Bus→bus and multi-interchange metro transfers work
- [ ] Every screen handles loading, error and empty states honestly; no screen reports success on failure
- [ ] No inert controls (landing search, `active` flag)
- [ ] All 12 bugs in Section 31 fixed, each with a regression test

### Routing and data
- [ ] Transit dataset sourced, licensed and documented; every stop has an accessibility record
- [ ] Fares and headways cited, or clearly labelled synthetic
- [ ] `frequencyMinutes` actually used for wait times
- [ ] Referential integrity between the transit dataset and `Accessibility` (joined by id, checked at startup)

### AI / ML
- [ ] Training data contains both labels; a constant classifier cannot score 100%
- [ ] Shuffled held-out split; accuracy reported only on it
- [ ] Learned weights recover a planted synthetic preference direction
- [ ] `missedConnectionRisk` and `transferCount` are ranking features
- [ ] Explicit preferences apply on both the personalised and cold-start paths
- [ ] Learning curve and weight-convergence trajectory reported

### Testing
- [ ] `npm test` exit 0 with all files executed; 0 honestly-skipped suites in CI
- [ ] All 50 endpoints have happy-path and auth-failure integration tests
- [ ] Frontend component tests for the 3 critical pages; 1 E2E happy path
- [ ] `tsc --noEmit` clean on both packages; `build` invokes `tsc`
- [ ] CI blocks on type errors and test failures

### Security
- [ ] Body validation on every POST and PUT
- [ ] Coordinate ranges validated at both route and schema level
- [ ] `/evaluation/*` authenticated and cached
- [ ] `helmet` active; `npm audit` reviewed with an explicit decision
- [ ] No secrets in source; production `JWT_SECRET` guard verified on the deployed instance
- [ ] localStorage-token trade-off documented

### Performance
- [ ] `/routes/multimodal` p95 within a stated budget
- [ ] `/evaluation` p95 under 200 ms (cached) and off the dashboard's mount path
- [ ] No N+1 queries in the route path; no unbounded `find()`
- [ ] Frontend route-split; main chunk materially below 459 kB

### Deployment
- [ ] Live frontend and backend URLs
- [ ] `/api/health` returns `database: "connected"`
- [ ] CI runs typecheck + build + test + post-deploy smoke test

### Evaluation
- [ ] Baseline disagreement > 0 against ≥4 baselines, with a documented trade-off profile
- [ ] Ablation across 7 configurations with decision-change rates
- [ ] Sensitivity analysis over the magic constants
- [ ] Prediction-interval coverage on **real** observations, with sample size and sharpness
- [ ] Every published number regenerable by one documented command
- [ ] Synthetic/real split stated for every metric

### Documentation
- [ ] `README.md` has zero mismatches against the code; §18 holds reproducible dated output or is removed
- [ ] ADRs for the four major design decisions
- [ ] `PHASE_4`–`PHASE_15` verification documents
- [ ] `LICENSE` present

### Paper
- [ ] Problem, related work, method, evaluation, limitations, future work
- [ ] 9 figures from Section 35
- [ ] Limitations cover every item in Section 33
- [ ] No claim unsupported by code

### Presentation and viva
- [ ] Demo script with no dead ends
- [ ] Slides built from real Phase 9 figures
- [ ] Rehearsed truthful answers to: "Is this ML?", "Why did the ranker ignore the Monte Carlo result?", "What does baseline agreement mean?", "Is the data real?", "Where did §18's numbers come from?"
- [ ] Synthetic data, simulated benchmark and the absence of a user study stated up front

---

## 44. Next Immediate Step

**`git init`, commit the current tree as the Phase 3 baseline, then begin Phase 4 by fixing the test runner (B3) so the remaining work can be measured.**

The repository has **no git metadata** — `PHASE_0_BASELINE.md` records that the baseline branch and tag could not be created for this reason. Every subsequent phase modifies working code with no rollback point. Initialising version control costs minutes and is the prerequisite for safely doing anything else.

Immediately after that, fix B3: `npm test` currently exits 1 at file 6 of 14 and silently never runs 7 test entries. Until the suite actually runs, no change can be verified and no regression can be detected.

---

## 45. Next 5 Actions

1. **`git init` + initial commit + tag `v-phase-3-baseline`.** Establishes the rollback point that Phase 0 could not create.
2. **Fix B3 — the test runner.** Adopt Vitest (or sequence with `;` and an aggregate exit code) so all 14 entries run. Confirm the 2 real failures in `userPreferences.test.ts` and the 7 previously-unreached files all report correctly. Fix B9 at the same time (the FAILED-then-passed output).
3. **Fix the 3 highest-severity bugs:** B5 (accessibility silently skips unrecorded stations and *rewards* their absence — safety-relevant), B1 (demo account cannot log in — double-hashed password), B4 (`active` flag written and never read). Add a regression test for each.
4. **Fix the frontend type errors and add `tsc` to the build.** 5 errors in `PlanTripPage.tsx` and `ProfilePage.tsx`; change `"build": "vite build"` to `"build": "tsc -b && vite build"` so they can never ship silently again.
5. **Correct `README.md` §18 and §20.** Remove or replace the unreproducible results table (including the 92% that the code itself calls fabricated) and rewrite the viva answers that the code contradicts (Box-Muller, 500 trials, lr=0.05 nudge, 8% σ, 5 dimensions). This is the single highest-severity, lowest-cost risk in the project.

Then proceed to **Phase 5 — Transit data expansion**, the P0 blocker on the critical path.

---

## 46. Complete Roadmap (summary)

```
Phase 4   Stabilisation ...................... P0/P1  bugs, test runner, types, README truth
Phase 5   Transit data expansion ............. P0     coverage 13.8% → >60%
Phase 6   Candidate generation engine ........ P0     graph search, ≥3 non-dominated routes
Phase 7   Feature set & ranking correctness .. P1     +risk +transfers, prefs on all paths
Phase 8   ML validity ........................ P1     negative pairs, shuffled split, real metrics
Phase 9   Evaluation harness rebuild ......... P1/P2  discriminating scenarios, ablation, sensitivity
Phase 10  Test & CI completeness ............. P2     API + frontend + E2E, DB-backed CI
Phase 11  Performance & security hardening ... P2/P3  caching, validation, helmet
Phase 12  UX completion ...................... P3     honest states, research page, a11y audit
Phase 13  Deployment ......................... P3     live environment + smoke test
Phase 14  Documentation & paper .............. P2     README, ADRs, paper, 9 figures
Phase 15  Demo, presentation & viva .......... P1     rehearsed, truthful
```

**Critical path:** Phase 4 → 5 → 6 → 7 → 8 → 9 → 14 → 15.
Phases 10–13 run in parallel from Phase 4 onward.

---

*Audit performed read-only against the uploaded source tree. All quantitative claims (coverage, route counts, ranking outcomes, test results, build results, hash behaviour) were produced by commands and probes executed during this audit and are reproducible. No source file was modified.*
