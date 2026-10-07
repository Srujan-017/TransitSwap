# TransitSwap — AI-Powered Urban Mobility Intelligence Platform

> **"Travel Smarter, Safer, and More Reliably."**

TransitSwap is a full-stack, AI-assisted urban mobility web application built as a final-year engineering project. It helps commuters choose the **smartest, safest, most reliable, and most accessible** journey — not simply the shortest route — by evaluating multiple real-world factors simultaneously.

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [Architecture Overview](#2-architecture-overview)
3. [Intelligence Engine](#3-intelligence-engine)
4. [Feature List (Phases 1–20)](#4-feature-list-phases-1-20)
5. [Tech Stack](#5-tech-stack)
6. [Project Structure](#6-project-structure)
7. [Quick Start — Local Setup](#7-quick-start--local-setup)
8. [Environment Variables](#8-environment-variables)
9. [API Reference](#9-api-reference)
10. [Demo Mode](#10-demo-mode)
11. [TransitDNA — Preference Learning](#11-transitdna--preference-learning)
12. [Accessibility Engine](#12-accessibility-engine)
13. [Reliability & Monte Carlo Simulation](#13-reliability--monte-carlo-simulation)
14. [Explainable AI (XAI)](#14-explainable-ai-xai)
15. [Research Evaluation Benchmark](#15-research-evaluation-benchmark)
16. [Data Sources & Transparency](#16-data-sources--transparency)
17. [Security](#17-security)
18. [Baseline Evaluation Results](#18-baseline-evaluation-results)
19. [Limitations & Future Work](#19-limitations--future-work)
20. [Viva Defence Guide](#20-viva-defence-guide)
21. [Screenshots & Demo](#21-screenshots--demo)
22. [Contributing](#22-contributing)
23. [License](#23-license)
24. [Acknowledgements](#24-acknowledgements)
25. [Deployment](#25-deployment)

---

## 1. Project Vision

Traditional navigation apps (Google Maps, Apple Maps) optimize for a **single dimension** — usually travel time. Real-world commuters, however, must balance:

- ⏱️ Travel time
- 💰 Cost
- 🚶 Walking distance
- ♿ Accessibility needs
- ☁️ Weather impact
- 👥 Crowd levels
- 🔄 Transfer risk

**TransitSwap** is an intelligent platform that evaluates **all of these factors simultaneously** and explains its recommendations in plain language. It is designed to be understandable, justifiable, and technically impressive for a final-year engineering viva.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React 19 Frontend                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ PlanTrip │ │Dashboard │ │ History  │ │  Profile  │  │
│  └────┬─────┘ └──────────┘ └──────────┘ └───────────┘  │
│       │  Axios REST calls                                │
└───────┼─────────────────────────────────────────────────┘
        │ HTTP / JSON
┌───────▼─────────────────────────────────────────────────┐
│              Express.js REST API  (Node.js)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Transit Intelligence Engine             │   │
│  │  multimodalService → accessibilityService        │   │
│  │  → weatherService → crowdService                 │   │
│  │  → reliabilityService (Monte Carlo)              │   │
│  │  → transitDnaService (scoring + XAI)             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │   Auth / JWT     │  │  Evaluation Service (Phase16) │ │
│  └──────────────────┘  └──────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ Mongoose
┌──────────────────────────▼──────────────────────────────┐
│                  MongoDB (Atlas or Local)                │
│   users · journeys · savedDestinations                  │
└─────────────────────────────────────────────────────────┘
```

**Key design principle:** If MongoDB or external APIs are unavailable, the platform **automatically degrades gracefully** to deterministic demo datasets. Every demo data source is clearly labelled `isDemoData: true` in API responses.

---

## 3. Intelligence Engine

The Transit Intelligence Engine runs the following pipeline on every route request:

| Step | Service | Output |
|------|---------|--------|
| 1. Candidate generation | `multimodalService` | Up to 4 fixed journey patterns (walk-metro-walk, walk-bus-walk, walk-metro-auto, walk-bus-metro-walk), labelled FASTEST / CHEAPEST / MIN_WALKING / BALANCED — typically 1-2 candidates survive for any given origin/destination in the current seeded dataset |
| 2. Accessibility filter | `accessibilityService` | Routes blocked if profile incompatible |
| 3. Weather enrichment | `weatherService` | Walking penalty %, rain warnings |
| 4. Crowd enrichment | `crowdService` | Station-level crowd levels (LOW/MED/HIGH) |
| 5. Reliability analysis | `reliabilityService` | Score 0–100, delay variance |
| 6. Confidence interval | `reliabilityService` | 90% CI arrival window (e.g. 8:57–9:03 AM) when enough historical observations exist; an honestly-labelled rule-of-thumb estimate otherwise |
| 7. Monte Carlo risk | `reliabilityService` | 1,000-trial empirical-resampling missed-connection % — computed and displayed, but not currently one of the ranking engine's input features (see §13) |
| 8. Smart departure | `reliabilityService` | Optimal departure offset suggestion |
| 9. Last-mile options | `reliabilityService` | Walk / Auto / Bike final-leg choices |
| 10. TransitDNA scoring | `transitDnaService` / `mlPreferenceService` | Weighted-linear composite score 0–100 over 7 features; weights are either a profile preset or a per-user trained Pairwise Logistic Regression model |
| 11. Explainability | `transitDnaService` | Human-readable recommendation reasons, each checked against the actual candidate set before being shown |

---

## 4. Feature List (Phases 1–20)

| Phase | Feature |
|-------|---------|
| 1 | Project scaffold — React 19 + Vite 8 + Tailwind CSS v4 |
| 2 | Express.js backend with TypeScript and Mongoose |
| 3 | Demo transit dataset (Bengaluru Namma Metro + BMTC bus network) |
| 4 | Geolocation & location search (Nominatim OSM geocoding) |
| 5 | Road routing via OSRM (Walk / Drive / Cycle) |
| 6 | Interactive Leaflet map with route polylines |
| 7 | Multimodal route engine (Metro + Bus + Auto + Walk) |
| 8 | Weather integration (OpenWeatherMap or fallback demo) |
| 9 | Crowd intelligence with station-level estimates |
| 10 | Accessibility engine (Wheelchair / Visual / Hearing profiles) |
| 11 | JWT authentication, user registration & login |
| 12 | Journey history save/delete and saved destinations |
| 13 | Full integration: all services wired end-to-end |
| 14 | Data validation (`express-validator`) + graceful API fallbacks |
| 15 | Arrival confidence intervals, Monte Carlo connection risk, smart departure, last-mile options |
| 16 | Research benchmark evaluation vs shortest-time and lowest-cost baselines |
| 17 | Profile management: mobility profile, preferences, TransitDNA reset |
| 18 | Explainable AI — "Why Recommended?" rationale cards |
| 19 | Journey feedback UI with star ratings + TransitDNA preference learning |
| 20 | Full QA, TypeScript 0-error build, README documentation |

---

## 5. Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19 | UI framework |
| Vite | 8 | Build tool & dev server |
| TypeScript | 5.7 | Type safety |
| Tailwind CSS | v4 | Utility-first styling |
| Leaflet | latest | Interactive maps |
| Lucide React | latest | Icon library |
| Axios | latest | HTTP client |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 22 | Runtime |
| Express.js | 4 | REST API framework |
| TypeScript | 5 | Type safety |
| MongoDB | 7 | Database |
| Mongoose | 8 | ODM |
| express-validator | 7 | Request validation |
| bcryptjs | 2.4 | Password hashing |
| jsonwebtoken | 9 | Authentication tokens |

### Algorithms (custom implementations)
| Algorithm | Purpose |
|-----------|---------|
| Multi-criteria weighted-linear scoring (7 features) | Route ranking across time, cost, walking, reliability, accessibility, crowd, weather |
| Pairwise Logistic Regression (batch gradient descent) | Learns a per-user weight vector from recorded route choices, feeding the scoring above |
| Empirical-resampling Monte Carlo (1,000 trials) | Transfer connection failure risk estimation — resamples directly from stored historical delay observations, not a parametric distribution |
| Sample mean / standard deviation with hierarchical fallback | Data-driven 90%/95% arrival prediction intervals, refusing to report a confidence level without enough observations |
| Haversine distance | GPS-to-station nearest-match routing |

---

## 6. Project Structure

```
TransitSwap-main/
├── src/                          # React frontend
│   ├── components/
│   │   ├── multimodal/           # MultimodalResults, route cards
│   │   ├── map/                  # MapView, RouteLayer
│   │   └── ui/                   # Card, Badge, Button, Spinner
│   ├── pages/
│   │   ├── DashboardPage.tsx     # Overview + TransitDNA + evaluation metrics
│   │   ├── PlanTripPage.tsx      # Route planner (multimodal + road)
│   │   ├── HistoryPage.tsx       # Journey history + star-rating feedback
│   │   └── ProfilePage.tsx       # Profile + accessibility preferences + DNA reset
│   ├── services/
│   │   ├── multimodalService.ts  # POST /routes/multimodal
│   │   ├── intelligenceService.ts # evaluation, feedback, profile API calls
│   │   └── tripService.ts        # save/delete journeys & destinations
│   └── types/
│       └── multimodal.ts         # Frontend enriched route types
│
├── backend/
│   └── src/
│       ├── controllers/          # Express request handlers
│       ├── services/
│       │   ├── multimodalService.ts   # Candidate route generation
│       │   ├── accessibilityService.ts # Profile-aware filtering
│       │   ├── weatherService.ts      # OpenWeather + demo fallback
│       │   ├── crowdService.ts        # Station crowd estimation
│       │   ├── reliabilityService.ts  # CI + Monte Carlo + last mile
│       │   ├── transitDnaService.ts   # Scoring + explainability + learning
│       │   └── evaluationService.ts   # Research benchmark metrics
│       ├── models/               # Mongoose schemas (User, Journey)
│       ├── routes/               # Express routers
│       ├── data/                 # Demo datasets (transit, accessibility, crowd)
│       └── types/                # Shared backend TypeScript interfaces
│
├── .env.example                  # Frontend env template
├── backend/.env.example          # Backend env template
└── README.md                     # This file
```

---

## 7. Quick Start — Local Setup

### Prerequisites
- **Node.js** ≥ 22
- **MongoDB** running locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **pnpm** (or npm) package manager

### Step 1 — Clone & install

```bash
git clone <your-repo-url>
cd TransitSwap-main

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### Step 2 — Configure environment

```bash
# Frontend
cp .env.example .env.local

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and fill in MONGODB_URI and JWT_SECRET
```

### Step 3 — Start development servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# API running at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
npm run dev
# UI running at http://localhost:5173
```

### Step 4 — Open in browser

Navigate to **http://localhost:5173** and use demo mode (no API keys required).

---

## 8. Environment Variables

### Frontend (`/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend REST API base URL |

### Backend (`/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default: 5000) | Express server port |
| `MONGODB_URI` | Optional for route demos; required for authentication, profiles, saved journeys, saved destinations, saved routes, feedback, and user reports. If absent, database-backed endpoints return clear 503 errors while route intelligence continues on demo/fallback data |
| `JWT_SECRET` | **Yes** | Secret for JWT signing. Change in production |
| `OPENWEATHER_API_KEY` | Optional | Free OpenWeatherMap key. If absent, demo weather data is used |
| `OSRM_API_URL` | No (default: `http://router.project-osrm.org`) | Optional OSRM routing server override |
| `FRONTEND_URL` | No (default: `http://localhost:5173`) | Exact frontend origin trusted by production CORS. In development, any `localhost`/`127.0.0.1` origin is also allowed automatically |
| `NODE_ENV` | No (default: `development`) | Set to `production` on your hosting platform — enforces a real `JWT_SECRET` and strict CORS |

---

## 9. API Reference

> Phase 4 correction — this table previously listed 13 endpoints with several
> wrong paths (e.g. `POST /api/trips` instead of the real `POST /api/trips/save`)
> and an incorrect auth requirement on `/routes/multimodal`. All 50 endpoints
> that actually exist are listed below; this is kept in sync with
> `PHASE_2_API_CONTRACT.md`, which documents the exact frontend-service-to-route
> mapping.

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | None | Status, timestamp, DB connectivity — no DB queries or computation, used as the deployment health check |

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| PUT | `/api/auth/profile` | JWT | Update name / accessibility profile |
| PUT | `/api/auth/preferences` | JWT | Update travel preferences (preferred mode, walking tolerance, budget, priority) |
| POST | `/api/auth/transitdna/reset` | JWT | Reset learned TransitDNA weights — clears both the profile baseline on the user document and the trained UserPreferenceModel the ranker actually reads |

### Geocoding
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/geocoding/search` | JWT | Proxies OpenStreetMap Nominatim (`?q=`) |

### Routes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/routes` | JWT | Road routing via OSRM (driving / walking / cycling) |
| POST | `/api/routes/multimodal` | JWT | Calculate enriched, ranked multimodal routes |
| GET | `/api/routes/nearby` | JWT | Nearest metro station and bus stop to a coordinate |

### Trips
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/trips/save` | JWT | Save a planned journey to history |
| GET | `/api/trips/history` | JWT | Get journey history (up to 100 most recent) |
| GET | `/api/trips/:id` | JWT | Get one journey |
| DELETE | `/api/trips/:id` | JWT | Delete a saved journey |
| POST | `/api/trips/:id/feedback` | JWT | Submit rating, issue tags, and optional actual duration |
| GET | `/api/trips/destinations` | JWT | List saved destinations |
| POST | `/api/trips/destinations` | JWT | Save a destination |
| DELETE | `/api/trips/destinations/:id` | JWT | Delete a saved destination |
| POST | `/api/trips/saved-routes` | JWT | Save a reusable route snapshot (distinct from a completed journey) |
| GET | `/api/trips/saved-routes` | JWT | List saved route snapshots |
| GET | `/api/trips/saved-routes/:id` | JWT | Get one saved route snapshot |
| DELETE | `/api/trips/saved-routes/:id` | JWT | Delete a saved route snapshot |

### Weather
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/weather` | JWT | Current weather + walking-impact rules for a coordinate |
| GET | `/api/weather/current` | JWT | Alias of the above |

### Accessibility
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/accessibility/stations` | JWT | List all accessibility records |
| GET | `/api/accessibility/stations/:stationId` | JWT | Get one station's accessibility record |
| GET | `/api/accessibility/stations/:stationId/reports` | JWT | Community-submitted reports for a station |
| POST | `/api/accessibility/report` | JWT | Submit a community accessibility report |

### Crowd
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/crowd/report` | JWT | Submit a crowd-level report |
| GET | `/api/crowd/station/:stationId` | JWT | Current crowd estimate for a station |
| GET | `/api/crowd/history/:stationId` | JWT | Recent user reports + demo baseline for a station |

### Evaluation
> These 5 endpoints are currently **unauthenticated** and not called by the
> frontend (see §17 Security) — a future phase should add auth and caching.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/evaluation` | None | Multi-criteria engine vs. shortest-time / lowest-cost baselines, 5 demo scenarios |
| GET | `/api/evaluation/ml` | None | Synthetic Pairwise Logistic Regression benchmark |
| GET | `/api/evaluation/ml/status` | None | Current ML model status and learned weights |
| GET | `/api/evaluation/reliability/evaluation` | None | 80/20 prediction-interval coverage check |
| GET | `/api/evaluation/reliability/stats` | None | Historical prediction-error statistics |

### Admin
> All 13 routes below require a valid JWT **and** `role: "admin"` — there is no
> public way to create an admin account; see `backend/src/utils/seedAdmin.ts`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/overview` | Real record counts across every collection |
| GET | `/api/admin/stations` | List stations |
| POST | `/api/admin/stations` | Create a station |
| PUT | `/api/admin/stations/:stationId` | Update a station |
| PUT | `/api/admin/stations/:stationId/deactivate` | Deactivate a station |
| DELETE | `/api/admin/stations/:stationId` | Delete a station |
| GET | `/api/admin/accessibility` | List accessibility records |
| PUT | `/api/admin/accessibility/:stationId` | Update accessibility fields |
| PUT | `/api/admin/accessibility/:stationId/lift` | Mark a lift working / broken |
| GET | `/api/admin/crowd` | List crowd reports |
| DELETE | `/api/admin/crowd/:reportId` | Remove a crowd report |
| GET | `/api/admin/feedback` | List journey feedback (optional rating/issue filters) |
| GET | `/api/admin/dataset` | Dataset provenance summary |

---

## 10. Demo Mode

**TransitSwap works completely without any external API keys.** All demo data is clearly labelled.

| Service | Demo Fallback |
|---------|--------------|
| Weather | `isDemoData: true` — deterministic weather seeded from the requested coordinate (current conditions only — never a forecast) |
| Crowd levels | `source: "DEMO_DATA"` — historical pattern estimates |
| Transit routes | Bengaluru Namma Metro (Purple/Green/Yellow Lines) + BMTC bus routes |
| Accessibility | `verificationSource: "Demo Accessibility Dataset"` |
| MongoDB | If absent, database-backed features return clear 503 errors; routing, weather fallback, accessibility, crowd estimates, reliability, TransitDNA scoring, and evaluation remain available where they do not require persistence |

> ⚠️ **Academic integrity note**: All demo data is clearly labelled as simulated. No fabricated user studies or accuracy claims appear in the codebase or documentation.

---

## 11. TransitDNA — Preference Learning

> Phase 4 correction — this section previously described a "conservative
> weight update, lr=0.05" nudge rule and 5 equally-weighted dimensions. That
> formula does not exist anywhere in the codebase. The actual mechanism —
> Pairwise Logistic Regression trained by batch gradient descent over 7
> features — is described below.

TransitDNA is TransitSwap's personalized mobility preference system. It combines two things:

- **Explicit preferences** — preferred mode, walking tolerance, budget preference and priority, set on the Profile page, applied as weight multipliers (see `transitDnaService.getPreferenceAdjustedWeights`).
- **Learned weights** — a per-user **Pairwise Logistic Regression** model (`backend/src/services/ml/logisticRegression.ts`), trained on the user's own recorded route choices.

### How It Works

1. **7-dimensional feature vector**: every candidate route is normalized (relative min-max across the candidate set) into `[time, cost, walking, reliability, accessibility, crowd, weather]`, each in `[0, 1]` where 1.0 is best.

2. **Cold start**: before a user has enough data, scoring uses a fixed profile-preset weight vector (e.g. the `wheelchair` profile weights accessibility at 0.50; `fastest` weights time at 0.60 — see `mlPreferenceService.getProfileWeights`), adjusted by that user's explicit preferences.

3. **Recording a choice**: when a user saves a journey, the chosen route and its rejected alternatives are converted into pairwise feature-difference samples (`chosen_features − rejected_features`) and stored.

4. **Training**: once a user has at least 5 recorded samples, a Pairwise Logistic Regression model is trained by batch gradient descent (learning rate 0.05, 200 iterations, L2 regularization 0.01) to predict `P(chosen ≻ rejected) = σ(w · Δfeatures)`. The trained 7-weight vector replaces the profile preset for that user's future route rankings.

5. **Scoring**: `compositeScore = round(100 × (w · features + preferred_mode_bonus))`, where `w` is either the trained model (once personalized) or the profile preset (otherwise).

6. **Reset**: resetting TransitDNA from the Profile page clears the trained model and its training samples, returning that user to the profile-preset baseline.

### Known limitation (tracked for a future phase)

The pairwise training samples currently only record the *chosen-over-rejected* direction (label = 1); the mirrored *rejected-over-chosen* (label = 0) pair is not yet recorded. This makes the training set single-class, so the model's reported training/test accuracy is not currently a meaningful metric. The ranking mechanism itself (scoring routes with the trained weight vector) still works and is covered by the test suite — this limitation affects how trustworthy the *reported accuracy numbers* are, not whether personalization runs at all.

---

## 12. Accessibility Engine

> Phase 4 correction — the profile list below previously named
> `visual_impairment`, `hearing_impairment` and `elderly`, none of which exist
> in the code. The 7 real profiles are listed below.

The accessibility engine (`accessibilityService.ts`) filters routes based on the user's declared mobility profile. Every profile gets a transparent 0–100 station score (step-free entrance, lift, ramp, escalator, tactile paving, accessible toilet, stair count, wheelchair-accessible — each contributing a fixed number of points); five profiles additionally enforce **hard constraints** that reject a route outright rather than just scoring it lower.

| Profile | Requirement |
|---------|------------|
| `standard` / `fastest` / `cheapest` / `comfort` | No hard filtering — soft scoring only |
| `wheelchair` | **Hard-blocked** if a station is marked not accessible, explicitly not wheelchair-accessible, or has stairs with no lift and no ramp |
| `senior` / `pregnant` / `luggage` | Hard-blocked only for extreme cases (marked not accessible AND >35 stairs); otherwise soft-scored on stairs, walking distance and transfers |
| `stroller` | Hard-blocked if marked not accessible, or >20 stairs with no lift/ramp |
| `reduced_mobility` | Hard-blocked if marked not accessible, or no step-free alternative with >15 stairs |

Accessibility data is a **synthetic prototype dataset** (`backend/src/data/accessibilityData.ts` — the file's own header states "No stations were physically surveyed"), not a real survey. It is designed so a real field-surveyed or transit-authority dataset can replace it without changing the scoring/filtering logic above.

---

## 13. Reliability & Monte Carlo Simulation

> Phase 4 correction — this section previously described a Box-Muller
> normal-distribution Monte Carlo simulation and a `std_dev = mean × 0.08`
> confidence interval. Neither exists in the code. The actual mechanisms —
> a rule-based heuristic score, a data-driven statistical interval, and an
> empirical-resampling Monte Carlo — are described below.

### Reliability Score (0–100) — rule-based heuristic

Starts at 90 and adjusts (`reliabilityService.calculateReliability`):
- 0 transfers: +5. 1 transfer: −5. 2+ transfers: −12 per transfer.
- Bus segment present: −8. Metro segment present: +4. Auto segment present: −4.
- Weather walking-penalty >30%: −10; >15%: −4.
- HIGH crowd: −10. MEDIUM crowd: −3.

Clamped to [20, 99]. The code explicitly documents this as "a rule-based prototype estimate, not a calibrated ML model."

### 90% / 95% Arrival Prediction Interval — data-driven statistics

Computed from the **sample mean and sample standard deviation** of real historical `error = actual_duration − predicted_duration` observations (`historicalReliabilityService.calculatePredictionInterval`), with a hierarchical fallback (route-specific → mode-specific → overall) and a minimum of 5 observations:

```
interval = (predicted_duration + mean_error) ± z × sample_std_dev
z_90 = 1.645, z_95 = 1.96
```

When fewer than 5 historical observations exist, the endpoint returns a rule-of-thumb `×0.9…×1.15` band with `confidenceLevelPercent: 0` and `isDataDriven: false` — it never presents an unearned confidence level as real.

Displayed as: **"Expected arrival: 8:57 AM – 9:03 AM (90% confidence)"** once enough data exists.

### Monte Carlo Missed-Connection Simulation — empirical resampling

For routes with 1+ transfers (`reliabilityService.calculateMissedConnectionRisk`):
- 1,000 trials, each sampling a **real historical delay value** (not a synthesized normal distribution) independently for every transfer in the route.
- A trial counts as a missed connection if any sampled delay exceeds that transfer's buffer (bus: 6 min, metro: 4 min, other: 5 min — demo assumptions, not real schedule data).
- `overallRiskPercent = missed_trials / 1000`.
- A separate deterministic variant of the same calculation (no random sampling) is used only to rank Smart Departure candidate offsets against each other, so repeated requests for the same route always rank them the same way.

This risk score is computed and shown to the user on every route, but — as of this phase — is **not yet one of the 7 features the ranking engine scores routes on** (see §11); it does not currently change which route is recommended first, even when a route's risk is very high.

---

## 14. Explainable AI (XAI)

> Phase 4 correction — the tag strings below previously listed (e.g. "🏆 Best
> overall score", "🌧️ Less walking in rain") do not exist in the code. The
> table below gives representative examples of the real tags, each produced
> by `transitDnaService.generateWhyRecommended`.

Every recommended route displays up to 4 human-readable rationale tags explaining **why** it was recommended. Every tag is checked against the actual candidate set before being shown — e.g. "fastest" is only claimed when this route's duration genuinely equals the minimum across all candidates — and 19 dedicated tests assert exactly this honesty property.

| Example tag | When shown |
|-----|-----------|
| 🧠 Personalized based on your previous route choices | Only when a genuinely trained per-user model was used to rank this route |
| 🚇 / 🚌 / 🛺 Matches your preferred X mode | User's explicit `preferredMode` preference is present on this route |
| 🔄 Low transfer & missed-connection risk | Transfer risk ≤ 15% and this route has at least one transfer |
| 📊 Nominal X% arrival prediction interval | Only when the interval was genuinely computed from historical data (`isDataDriven: true`) — never shown for the rule-of-thumb fallback |
| ♿ Step-free access & elevator available | `wheelchair` profile, and this route's stations pass the accessibility check |
| ⚡ Fastest travel time among options | This route's duration equals the minimum in the candidate set |
| 💰 Lowest estimated fare | This route's fare equals the minimum in the candidate set |
| 🚶 Minimum walking distance | This route's walking distance equals the minimum in the candidate set |
| 🌱 Higher relative sustainability | This route's (non-emissions) sustainability score strictly beats at least one alternative |

This satisfies the **explainability requirement** without a complex model — the rationale is entirely rule-based, grounded against real route data, and fully auditable.

---

## 15. Research Evaluation Benchmark

The `GET /api/evaluation` endpoint evaluates **TransitSwap's ranking engine** against two baselines:

| Baseline | Strategy |
|----------|----------|
| Shortest Travel Time | Always picks the route with minimum `totalDurationSeconds` |
| Lowest Cost | Always picks the route with minimum `totalFare` |

### Metrics Reported

| Metric | Definition |
|--------|-----------|
| Agreement Rate | % of scenarios where the ranked-first route matches the baseline's pick |
| Reliability Improvement | Average reliability score gain vs the shortest-time baseline |
| Walking Savings | Average walking reduction vs the shortest-time baseline |
| Missed-Connection Risk | Average Monte Carlo risk %, engine vs shortest-time baseline |
| CI 90% Coverage | **Always `null`** — deliberately not reported. The code's own comment states this replaced "the fake 92% hardcoded confidence coverage" that was here before; computing a genuine coverage figure needs real held-out historical observations (see §13), which this 5-scenario demo benchmark does not have |
| Computation Latency | Total ms for all 5 scenarios |

These metrics are displayed on the Dashboard page, clearly labelled `isSimulatedBenchmark: true`, for viva demonstration — not as evidence of real-world performance. See §18 for why the specific numbers from any one run should not be treated as fixed results.

---

## 16. Data Sources & Transparency

| Data | Source | Label |
|------|--------|-------|
| Metro network | Real Bengaluru Namma Metro line names/station names (Purple, Green, Yellow); coordinates approximate, not surveyed (41 stations) | Seeded demo dataset |
| Bus routes | Real BMTC-served locality names; route numbers illustrative, not an official feed (24 stops, 10 routes) | Seeded demo dataset |
| Accessibility info | Synthetic prototype dataset — no station was physically surveyed (see §12) | `synthetic_demo` |
| Weather | OpenWeatherMap API, or a coordinate-seeded deterministic value when no API key is set | Live / Demo clearly labelled |
| Crowd levels | Real authenticated user reports, blended with a small synthetic historical baseline | `RECENT_USER_REPORT` / `DEMO_DATA` |
| Route geometry | OSRM road geometry for walk/auto legs when reachable, else a straight-line fallback; metro/bus legs are drawn as straight lines between stations, not the real track/road shape | Computed |

**No real-time user location data is ever stored.** Coordinates are only used transiently for route calculation.

---

## 17. Security

| Measure | Implementation |
|---------|---------------|
| Password storage | bcryptjs (salt rounds: 12) |
| Authentication | JWT (HS256, configurable expiry) |
| Input validation | express-validator on all POST/PUT endpoints |
| CORS | Restricted to configured `FRONTEND_URL` in production; any `localhost`/`127.0.0.1` origin in development |
| Rate limiting | `express-rate-limit` — 150 requests / 15 min per IP on all `/api` routes |
| Error messages | Generic messages returned to clients (no stack traces in production) |
| Secrets | Stored in `.env` — never committed to git |

`.env` and `.env.local` are listed in `.gitignore`.

---

## 18. Baseline Evaluation Results

> **Phase 4 correction, re-verified in Phase 5 after the Bengaluru data
> migration** — this table previously (before Phase 4) showed a fabricated
> ~15%/~29%/92% improvement. Phase 4 replaced it with a real captured run on
> the (then Mumbai-based) network, which showed 0% difference on every
> metric. Phase 5 migrated the network to Bengaluru and substantially
> expanded it; the numbers below are a fresh real captured run on the new
> network — re-run `GET /api/evaluation` yourself for a live number.

Actual captured run (`evaluationService.runEvaluation()`, OSRM unreachable so all road legs used the haversine fallback):

| Metric | TransitSwap | Shortest-Time Baseline | Lowest-Cost Baseline |
|--------|-------------|------------------------|-----------------------|
| Agreement rate | — | **100%** | **60%** (was 100% pre-Phase-5) |
| Avg. Reliability Score | 99/100 | 99/100 | — |
| Avg. Walking Distance | 0 m | 0 m | — |
| Missed-Connection Risk | 0% | 0% | — |
| CI 90% Coverage | `null` (never fabricated — see §15) | — | — |
| Avg. Computation (total, 5 scenarios) | 16 ms | — | — |

**Honest observation, and why:** TransitSwap still agrees with the shortest-time baseline on every one of these 5 scenarios (duration, walking and reliability differences are all exactly 0). It now **disagrees with the lowest-cost baseline on 2 of 5** (Majestic→Vidhana Soudha and Silk Board→Electronic City, where the cheapest candidate isn't the one TransitSwap/shortest-time pick) — a genuinely new, non-fabricated signal that the larger Phase 5 network has started producing real cost/speed trade-offs, where the pre-Phase-5 network had none at all. The underlying cause of the *remaining* 100% agreement with shortest-time is the same as before Phase 5, just less severe:

1. These 5 scenarios use exact metro station coordinates as origin/destination, so access/egress walks are 0m (see §13's walking-segment note) — unchanged by Phase 5.
2. Candidate generation (§3) is still 4 fixed patterns, not a path search, so most corridors still produce only 1-2 candidates, often Pareto-dominated — Phase 5 only expanded the *data* those patterns run against, not the pattern-generation logic itself (that's Phase 6).

A benchmark scenario set deliberately chosen for genuine trade-offs (rather than this demonstration set, inherited from the original Mumbai seed) is tracked as future work (see §19).

---

## 19. Limitations & Future Work

| Limitation | Future Enhancement |
|-----------|-------------------|
| Seeded demo transit network covers ~30% of the Bengaluru area by straight-line distance to the nearest stop/station (up from ~14% pre-Phase-5, over a 2x improvement); ~93% of random origin/destination pairs still return no route | Integrate GTFS feeds, or substantially expand the seeded network further — closing the remaining gap by hand-authored data alone would need 50-100+ more stations |
| Candidate generation is 4 fixed journey patterns, not a path search — see §3 | A real multimodal shortest-path / k-shortest-paths search over a stop graph |
| The current benchmark shows 0% difference from both baselines (see §18) because the candidate sets it tests have no genuine trade-off | A scenario set, and underlying network, with real trade-offs to rank |
| Missed-connection risk and transfer count are computed and shown, but not yet part of the ranking engine's scoring | Add them to the 7-feature vector |
| Pairwise training samples currently record only the chosen-over-rejected direction (see §11) | Record the mirrored pair so reported model accuracy is meaningful |
| Crowd data is a blend of real user reports and a small synthetic baseline, bucketed into 4 fixed time slots, independent of the journey's planned departure time | Real-time crowd sensors; time-of-departure-aware estimates |
| Accessibility data is a synthetic prototype dataset (see §12) | Partner with city transit authorities for verified data |
| TransitDNA learns from explicit route choices only | Implicit learning from additional signals (e.g. dwell time, repeat searches) |
| No real-time transit delays | Integrate GTFS-RT or transit agency delay APIs |
| Single city demo | Extend to multiple city datasets |

---

## 20. Viva Defence Guide

> Phase 4 correction — every answer below was rewritten against the actual
> code after the previous version was found to describe formulas (Box-Muller
> Monte Carlo, a 5% nudge rule, an 8%-of-mean standard deviation) that do not
> exist anywhere in the codebase. An examiner who reads the source would have
> immediately contradicted the old answers.

### Key Questions and Answers

**Q: What makes TransitSwap different from Google Maps?**

> Google Maps primarily optimizes for travel time. TransitSwap scores candidate routes across 7 features — time, cost, walking distance, reliability, accessibility, crowd and weather — with per-mobility-profile hard accessibility constraints, and explains every recommendation in plain language, checked against the actual candidate set before being shown.

**Q: How does the Monte Carlo simulation work?**

> For a route with transfers, we run 1,000 trials. Each trial samples a delay for every transfer **directly from stored historical delay observations** (empirical resampling — not a parametric normal distribution, no Box-Muller transform anywhere in the code). If any sampled delay exceeds that transfer's buffer (metro 4 min, bus 6 min, other 5 min — demo assumptions), the trial counts as a missed connection. I'll also be upfront that this risk score is currently computed and displayed but **not yet one of the features the ranking engine scores routes on** — that's tracked as near-term future work.

**Q: How does TransitDNA learn user preferences?**

> It trains a Pairwise Logistic Regression model per user: a user's chosen route and each rejected alternative become a 7-dimensional feature-difference sample, and once a user has 5+ samples, batch gradient descent (lr 0.05, 200 iterations, L2 regularization) fits a weight vector predicting which route they'll prefer. I'll also flag a real limitation: training currently only records the chosen-over-rejected direction, not the mirrored pair, so the model's *reported accuracy number* isn't meaningful yet — the ranking mechanism itself still works and is covered by tests, but I wouldn't defend the accuracy figure under questioning.

**Q: What happens if MongoDB is down?**

> The platform degrades gracefully by design — `config/db.ts` never exits the process on a failed connection, and every service checks `mongoose.connection.readyState` independently. Route calculation, weather, crowd estimates, accessibility filtering, reliability scoring and the research evaluation endpoints all keep working on seeded/demo data. Authentication, saved journeys, saved destinations, saved routes, and user-submitted reports correctly return a 503 instead of pretending to persist.

**Q: How do you ensure the accessibility filter is correct?**

> Each station has explicit nullable `hasLift`/`hasRamp`/`stairCount`/`wheelchairAccessible`/etc. fields, and 5 of the 7 profiles enforce these as hard constraints that reject a route outright (249 test assertions cover this). A station with **no accessibility record at all** is treated as status "unknown" with an explicit warning naming it — not silently dropped from scoring, which was a bug fixed in this phase.

**Q: What is the confidence interval based on?**

> A genuine statistical interval: the sample mean and sample standard deviation of real historical `actual − predicted` duration errors, with a z-based margin (90%: z=1.645, 95%: z=1.96) and a hierarchical fallback (route → mode → overall). Below 5 historical observations, it returns an honestly-labelled rule-of-thumb band with `confidenceLevelPercent: 0` rather than presenting an unearned number.

**Q: Is your evaluation against real users?**

> No. The benchmark uses 5 deterministic demo scenarios comparing the ranking engine against two algorithmic baselines (shortest time, lowest cost), clearly labelled `isSimulatedBenchmark: true`. No user study was conducted.

**Q: If the ranker ignores the Monte Carlo risk score, what's the point of computing it?**

> Right now its value is purely informational — it's shown to the user on every route (and used to rank Smart Departure offset candidates against each other), but it doesn't change which route is ranked first. That's a known gap, not a hidden one: making it a real ranking feature is the immediate next step, sequenced after expanding the transit dataset enough that candidate sets actually have a risk/time trade-off to resolve.

**Q: Your benchmark shows 100% agreement with the shortest-time baseline — doesn't that mean the multi-criteria engine adds nothing?**

> On these specific 5 scenarios it does still agree with shortest-time every time — but after the Phase 5 network expansion it now disagrees with the lowest-cost baseline on 2 of 5, which it didn't before. That's a real, if small, signal that a richer network starts giving the ranker genuine trade-offs to resolve. The remaining 100% agreement with shortest-time has a concrete, explainable cause: most of these candidate sets still have at most one route that isn't Pareto-dominated by another, since candidate generation is still 4 fixed journey patterns, not a path search (that's the next phase of work, not a property of the ranker itself).

---

## 21. Screenshots & Demo

The application includes the following main views:

- **Dashboard** — TransitDNA profile card, quick stats, research benchmark table
- **Plan Trip** — Multimodal route planner with Explainability cards, confidence intervals, Monte Carlo risk, smart departure, last-mile options
- **History** — Saved journeys with star-rating feedback panel and TransitDNA learning trigger
- **Profile** — Mobility profile editor, preference toggles, TransitDNA weight display and reset

---

## 22. Contributing

This is a final-year engineering project. Contributions are welcome for:

- Adding new city GTFS datasets
- Improving the crowd estimation model
- Adding real-time transit agency API integrations
- UI/UX improvements

Please open an issue before submitting a pull request.

---

## 23. License

This project is submitted as part of a Bachelor of Engineering final-year project. Code is for academic and demonstration purposes.

---

## 24. Acknowledgements

- **OpenStreetMap / Nominatim** — Geocoding API
- **OSRM** — Open Source Routing Machine for road routing
- **OpenWeatherMap** — Weather data API
- **Bangalore Metro Rail Corporation (BMRCL) / Namma Metro** — Public line and station names (approximate coordinates, used for demo)
- **BMTC (Bangalore Metropolitan Transport Corporation)** — Public corridor/locality names (illustrative route numbers, used for demo)
- **Leaflet.js** — Open source interactive maps
- **Lucide** — Icon library
- React, Vite, Tailwind CSS, Express.js, MongoDB open source communities

---

## 25. Deployment

TransitSwap is prepared for a simple, standard deployment: a static frontend host, a Node backend host, and MongoDB Atlas. No Docker/Kubernetes/Terraform is required or used.

```
Frontend (Vercel / Netlify)
        │  VITE_API_URL
        ▼
Backend (Render / Railway) — Express, npm run build → dist/, npm start → dist/server.js
        │  MONGODB_URI
        ▼
MongoDB Atlas
```

### 25.1 Prerequisites
- A MongoDB Atlas cluster (or any reachable MongoDB instance) and its connection string.
- Accounts on your chosen static host (e.g. Vercel/Netlify) and Node host (e.g. Render/Railway).
- (Optional) An OpenWeatherMap API key — the app runs fine without one, using clearly-labelled demo weather.

### 25.2 Local setup
See [Section 7 — Quick Start](#7-quick-start--local-setup) for cloning, installing, and running both servers locally before deploying.

### 25.3 Environment variables
See [Section 8 — Environment Variables](#8-environment-variables) for the full table. In short:
- Backend needs `MONGODB_URI`, `JWT_SECRET` (a real, strong secret in production — the server refuses to start in `NODE_ENV=production` with the default dev secret), and `FRONTEND_URL` set to your deployed frontend's exact origin.
- Frontend needs `VITE_API_URL` set to your deployed backend's `/api` base URL — never `localhost` in production.
- `OPENWEATHER_API_KEY` stays optional; omitting it keeps the app on demo weather data, which is intentional for the final-year demo.
- Never commit a real `.env` file, MongoDB credentials, or API keys — `.env`/`.env.local` are already git-ignored, and only `.env.example` files (with placeholder values) are committed.

### 25.4 Frontend build & deployment (Vercel / Netlify)
```bash
npm install
npm run build      # outputs static assets to dist/
```
On your host: set the build command to `npm run build`, the output directory to `dist`, and add the `VITE_API_URL` environment variable pointing at your deployed backend (e.g. `https://your-backend.onrender.com/api`). Framework/provider choice is not hard-coded into the app.

### 25.5 Backend build & deployment (Render / Railway or equivalent)
```bash
cd backend
npm install
npm run build       # tsc → dist/
npm start            # node dist/server.js
```
On your host: set the build command to `npm run build` and the start command to `npm start`. Configure `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`, and (optionally) `OPENWEATHER_API_KEY` as environment variables on the platform — never in source code.

### 25.6 MongoDB Atlas
Create a free-tier Atlas cluster, add a database user, allow network access from your backend host (or `0.0.0.0/0` for a demo deployment), and copy the connection string into `MONGODB_URI`. Do not commit the username, password, or full connection string anywhere in the repository.

### 25.7 CORS
The backend only trusts the exact `FRONTEND_URL` origin in production (see [Section 17 — Security](#17-security)) — update it if your deployed frontend URL changes, and redeploy the backend.

### 25.8 Health check
`GET /api/health` is the deployment health-check endpoint. It returns immediately (no database queries or ML computation) with a status, timestamp, and database connectivity flag — point your hosting platform's health check at this path.

### 25.9 Demo mode / API fallbacks
If `OPENWEATHER_API_KEY` is not configured, the platform keeps weather on clearly-labelled demo data (see [Section 10 — Demo Mode](#10-demo-mode)). If `MONGODB_URI` is not configured, non-persistent route intelligence still runs, while authentication, saved journeys, saved destinations, saved routes, feedback, and user-submitted reports return controlled 503 errors instead of pretending to persist data.

### 25.10 Pre-deployment checklist
- [ ] `.env` / `.env.local` are not committed (already `.gitignore`d)
- [ ] `JWT_SECRET` is a real secret, not the default dev value, and set only via the hosting platform's environment variables
- [ ] MongoDB Atlas credentials are not committed anywhere in the repo
- [ ] `OPENWEATHER_API_KEY` (if used) is not committed
- [ ] `FRONTEND_URL` on the backend matches the deployed frontend's exact origin
- [ ] `VITE_API_URL` on the frontend points at the deployed backend, not `localhost`
- [ ] `GET /api/health` responds correctly from the deployed backend URL
- [ ] Rate limiting, authentication, and journey/saved-route ownership checks are all still active (unchanged from local — nothing in this section disables them)

---

*Built with ❤️ as a final-year engineering project — TransitSwap, 2026*
