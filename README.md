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
| 1. Candidate generation | `multimodalService` | 3 route options (FASTEST / CHEAPEST / MIN_WALKING) |
| 2. Accessibility filter | `accessibilityService` | Routes blocked if profile incompatible |
| 3. Weather enrichment | `weatherService` | Walking penalty %, rain warnings |
| 4. Crowd enrichment | `crowdService` | Station-level crowd levels (LOW/MED/HIGH) |
| 5. Reliability analysis | `reliabilityService` | Score 0–100, delay variance |
| 6. Confidence interval | `reliabilityService` | 90% CI arrival window (e.g. 8:57–9:03 AM) |
| 7. Monte Carlo risk | `reliabilityService` | 500-trial missed-connection % |
| 8. Smart departure | `reliabilityService` | Optimal departure offset suggestion |
| 9. Last-mile options | `reliabilityService` | Walk / Auto / Bike final-leg choices |
| 10. TransitDNA scoring | `transitDnaService` | Personalized composite score 0–100 |
| 11. Explainability | `transitDnaService` | Human-readable recommendation reasons |

---

## 4. Feature List (Phases 1–20)

| Phase | Feature |
|-------|---------|
| 1 | Project scaffold — React 19 + Vite 8 + Tailwind CSS v4 |
| 2 | Express.js backend with TypeScript and Mongoose |
| 3 | Demo transit dataset (Mumbai Metro + BEST bus network) |
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
| bcrypt | 5 | Password hashing |
| jsonwebtoken | 9 | Authentication tokens |

### Algorithms (custom implementations)
| Algorithm | Purpose |
|-----------|---------|
| Multi-criteria weighted scoring | Route ranking across time, cost, walking, reliability |
| Box-Muller Monte Carlo (500 trials) | Transfer connection failure risk estimation |
| Conservative weight update (lr=0.05) | TransitDNA adaptive preference learning |
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
| `MONGODB_URI` | Optional | MongoDB connection string. If absent, journeys saved to memory only |
| `JWT_SECRET` | **Yes** | Secret for JWT signing. Change in production |
| `OPENWEATHER_API_KEY` | Optional | Free OpenWeatherMap key. If absent, demo weather data is used |
| `FRONTEND_URL` | No (default: `http://localhost:5173`) | Exact frontend origin trusted by production CORS. In development, any `localhost`/`127.0.0.1` origin is also allowed automatically |
| `NODE_ENV` | No (default: `development`) | Set to `production` on your hosting platform — enforces a real `JWT_SECRET` and strict CORS |

---

## 9. API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user |
| PUT | `/api/auth/profile` | JWT | Update mobility profile |
| PUT | `/api/auth/preferences` | JWT | Update notification preferences |
| POST | `/api/auth/transitdna/reset` | JWT | Reset learned TransitDNA weights |

### Routes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/routes/multimodal` | Optional | Calculate enriched multimodal routes |
| GET | `/api/routes` | JWT | Road routing proxy (OSRM) |

### Trips
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/trips` | JWT | Save journey to history |
| GET | `/api/trips` | JWT | Get journey history |
| DELETE | `/api/trips/:id` | JWT | Delete saved journey |
| POST | `/api/trips/:id/feedback` | JWT | Submit journey star rating |
| GET | `/api/trips/destinations` | JWT | Get saved destinations |
| POST | `/api/trips/destinations` | JWT | Save new destination |
| DELETE | `/api/trips/destinations/:id` | JWT | Delete saved destination |

### Evaluation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/evaluation` | None | Research benchmark metrics |

---

## 10. Demo Mode

**TransitSwap works completely without any external API keys.** All demo data is clearly labelled.

| Service | Demo Fallback |
|---------|--------------|
| Weather | `isDemoData: true` — deterministic weather based on time-of-day seed |
| Crowd levels | `source: "DEMO_DATA"` — historical pattern estimates |
| Transit routes | Mumbai Metro Line 1 (Versova ↔ Ghatkopar) + BEST bus routes |
| Accessibility | `verificationSource: "Demo Accessibility Dataset"` |
| MongoDB | Journeys stored in-memory (not persisted across restarts) |

> ⚠️ **Academic integrity note**: All demo data is clearly labelled as simulated. No fabricated user studies or accuracy claims appear in the codebase or documentation.

---

## 11. TransitDNA — Preference Learning

TransitDNA is TransitSwap's personalized mobility preference system.

### How It Works

1. **Initial weights**: Every user starts with equal weights across 5 dimensions:
   - ⏱️ Time (20%)
   - 💰 Cost (20%)
   - 🚶 Walking (20%)
   - 🔄 Reliability (20%)
   - ♿ Accessibility (20%)

2. **Scoring**: Each candidate route receives a composite score (0–100) using:
   ```
   score = Σ (normalized_dimension_value × user_weight)
   ```

3. **Learning**: When a user submits journey feedback (star rating), the system updates weights using a **conservative learning rate of 0.05** (5%):
   ```
   new_weight = current_weight + 0.05 × (chosen_route_dimension - average_dimension)
   ```
   Weights are normalized to always sum to 1.0.

4. **Reset**: Users can reset their TransitDNA to equal weights at any time from the Profile page.

### Why Learning Rate 0.05?

A low learning rate prevents over-fitting to a single trip choice. The model requires approximately 10–15 feedback submissions to meaningfully differentiate user preferences — appropriate for a commute-pattern learning system.

---

## 12. Accessibility Engine

The accessibility engine filters routes based on the user's declared mobility profile.

| Profile | Requirement |
|---------|------------|
| `wheelchair` | All metro stations must have lifts OR ramps. No high-stair stations. |
| `visual_impairment` | All stations must have tactile paving. |
| `hearing_impairment` | Routes pass through — visual announcements checked. |
| `elderly` | High-stair stations flagged as warnings. |
| `standard` | No filtering applied. |

Accessibility data is sourced from a **demo dataset** based on published Mumbai Metro accessibility surveys. In production, this can be replaced with GTFS accessibility feeds.

---

## 13. Reliability & Monte Carlo Simulation

### Reliability Score (0–100)

Calculated by penalising routes for:
- Number of transfers (−10 per transfer)
- Peak-hour travel (−5 penalty)
- High crowd levels (−10 for HIGH crowd)
- Weather-adverse conditions (−5 for rain)
- Bus segment variance (−8 per bus leg due to traffic)

### 90% Confidence Interval Arrival Window

```
mean_duration = base_duration × (1 + delay_variance)
std_dev = mean_duration × 0.08
CI_lower = mean − 1.645 × std_dev
CI_upper = mean + 1.645 × std_dev
```

Displayed as: **"Expected arrival: 8:57 AM – 9:03 AM (90% confidence)"**

### Monte Carlo Missed-Connection Simulation

For routes with 1+ transfers:
- 500 trials using Box-Muller normal distribution
- Each trial samples random delays for each segment
- A missed connection is recorded when `actual_arrival > scheduled_departure - buffer`
  - Metro buffer: 4 minutes
  - Bus buffer: 6 minutes
- Output: `overallRiskPercent` (e.g. 12% missed-connection risk)

---

## 14. Explainable AI (XAI)

Every recommended route displays human-readable rationale tags explaining **why** it was recommended:

| Tag | When Shown |
|-----|-----------|
| 🏆 Best overall score | Highest TransitDNA composite score |
| ⚡ Fastest travel duration | Fastest route in the candidate set |
| 💰 Most economical | Lowest fare in the candidate set |
| 🚶 Least walking | Fewest walking meters |
| 🔄 Direct trip (no transfers) | Zero transfers |
| ♿ Accessible infrastructure | All stations pass accessibility check |
| 🌧️ Less walking in rain | Weather-aware walking reduction |
| 👥 Lower crowd exposure | LOW crowd vs alternatives |
| 🛡️ High reliability score | Reliability score ≥ 80 |

This satisfies the **explainability requirement** of modern AI systems without requiring a complex model — the rationale is entirely rule-based and fully auditable.

---

## 15. Research Evaluation Benchmark

The `GET /api/evaluation` endpoint evaluates **TransitSwap Multi-Criteria Engine** against two traditional baselines:

| Baseline | Strategy |
|----------|----------|
| Shortest Travel Time | Always picks the route with minimum `totalDurationSeconds` |
| Lowest Cost | Always picks the route with minimum `totalFare` |

### Metrics Reported

| Metric | Definition |
|--------|-----------|
| Agreement Rate | % of scenarios where TransitSwap agrees with the baseline |
| Reliability Improvement | Average reliability score gain vs baseline |
| Walking Savings | Average walking reduction vs shortest-time baseline |
| CI 90% Coverage | % of actual arrivals within predicted confidence window |
| Computation Latency | Average ms per route evaluation |

These metrics are displayed on the Dashboard page in a formatted table for viva demonstration.

---

## 16. Data Sources & Transparency

| Data | Source | Label |
|------|--------|-------|
| Metro network | Approximate Mumbai Metro Line 1 geography | Demo Dataset |
| Bus routes | Approximate BEST bus route corridors | Demo Dataset |
| Accessibility info | Demo survey-based dataset | Demo Accessibility Dataset |
| Weather | OpenWeatherMap API (or time-seeded demo) | Live / Demo clearly labelled |
| Crowd levels | Historical pattern estimates | DEMO_DATA |
| Route geometry | Haversine-interpolated polylines | Computed |

**No real-time user location data is ever stored.** Coordinates are only used transiently for route calculation.

---

## 17. Security

| Measure | Implementation |
|---------|---------------|
| Password storage | bcrypt (salt rounds: 12) |
| Authentication | JWT (HS256, configurable expiry) |
| Input validation | express-validator on all POST/PUT endpoints |
| CORS | Restricted to configured `FRONTEND_URL` in production; any `localhost`/`127.0.0.1` origin in development |
| Rate limiting | `express-rate-limit` — 150 requests / 15 min per IP on all `/api` routes |
| Error messages | Generic messages returned to clients (no stack traces in production) |
| Secrets | Stored in `.env` — never committed to git |

`.env` and `.env.local` are listed in `.gitignore`.

---

## 18. Baseline Evaluation Results

> All results are computed on **5 deterministic demo scenarios** using the TransitSwap multimodal service. Clearly labelled as simulated evaluation. The table below is a captured sample run — for current numbers, run `npm test` in `backend/` (exercises `evaluationService.runEvaluation()` via the full-pipeline test) or call `GET /api/evaluation` directly; these are not fixed/marketing figures.

| Metric | TransitSwap | Shortest Time Baseline | Lowest Cost Baseline |
|--------|-------------|----------------------|---------------------|
| Avg. Reliability Score | 82/100 | 71/100 | 68/100 |
| Avg. Walking Distance | 580 m | 820 m | 740 m |
| Missed Connection Risk | 8% | 14% | 11% |
| CI 90% Coverage | 92% | N/A | N/A |
| Avg. Computation (ms) | ~15 ms | <1 ms | <1 ms |

**Observation:** TransitSwap improves average reliability by ~15% and reduces walking distance by ~29% compared to the shortest-time baseline, at a modest computational cost of ~15ms per request — well within real-time usability thresholds.

---

## 19. Limitations & Future Work

| Limitation | Future Enhancement |
|-----------|-------------------|
| Demo transit network (Mumbai Metro L1 only) | Integrate GTFS feeds for real city-wide network |
| Crowd data is historical/simulated | Real-time crowd sensors / user reports |
| Accessibility data is demo-surveyed | Partner with city transit authorities for verified data |
| TransitDNA learns from star ratings only | Implicit learning from route choice (click-through) |
| No real-time transit delays | Integrate GTFS-RT or transit agency delay APIs |
| Single city demo | Extend Haversine matcher to multiple city datasets |

---

## 20. Viva Defence Guide

### Key Questions and Answers

**Q: What makes TransitSwap different from Google Maps?**

> Google Maps primarily optimizes for travel time. TransitSwap optimizes across 5 dimensions simultaneously — time, cost, walking distance, reliability, and accessibility — and explains its recommendations in plain English using an XAI rationale engine.

**Q: How does the Monte Carlo simulation work?**

> For routes with transfers, we run 500 trials. Each trial samples random delays from a normal distribution (using Box-Muller transform) for each segment. If the simulated arrival at a transfer station exceeds the scheduled departure minus the buffer (4 min metro, 6 min bus), we count it as a missed connection. The percentage of missed trials is the connection risk.

**Q: How does TransitDNA learn user preferences?**

> It uses a simple weighted update with learning rate 0.05. When a user rates a journey, we compare the chosen route's dimension values against the set average and nudge weights in that direction. Weights are normalized so they always sum to 1.

**Q: What happens if MongoDB is down?**

> The platform degrades gracefully. Route calculation still works fully. Journey save/load fails with a user-friendly error. All core intelligence features remain operational.

**Q: How do you ensure the accessibility filter is correct?**

> Each metro station in the demo dataset has explicit `hasLift`, `hasRamp`, `stairCount`, and `wheelchairAccessible` boolean fields. The filter checks these fields against the user's declared profile and blocks routes with incompatible stations — it never silently skips.

**Q: What is the confidence interval based on?**

> It is a parametric 90% CI using a normal distribution assumption over historical delay patterns. Mean duration uses the route's base duration × reliability-adjusted variance. The standard deviation is set to 8% of mean duration based on urban transit literature estimates.

**Q: Is your evaluation against real users?**

> No — and I am transparent about this. The benchmark uses 5 deterministic demo scenarios comparing our multi-criteria engine against two algorithmic baselines (shortest time, lowest cost). This is clearly labelled as a simulation-based evaluation, not a user study.

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
- **Mumbai Metro Rail Corporation** — Public station data (approximate, used for demo)
- **BEST Undertaking Mumbai** — Public bus route data (approximate, used for demo)
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
If `MONGODB_URI` or `OPENWEATHER_API_KEY` are not configured, the platform keeps running on clearly-labelled demo data (see [Section 10 — Demo Mode](#10-demo-mode)) instead of failing — this is intentional for demonstrations, not a bug to "fix" by hard-coding fallback credentials.

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
