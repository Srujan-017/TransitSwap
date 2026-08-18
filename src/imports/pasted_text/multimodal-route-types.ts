You are working on my existing final-year engineering project:

PROJECT NAME:
TransitSwap — Smart Urban Mobility Assistant

IMPORTANT:
This is an EXISTING project. Do NOT rebuild it from scratch.
Do NOT delete working functionality.
Do NOT replace the existing architecture unnecessarily.
Do NOT introduce random libraries or technologies.
First inspect the COMPLETE existing repository and understand the current implementation before changing anything.

==================================================
PROJECT DEVELOPMENT STATUS
==================================================

The project is being developed in multiple controlled phases.

PHASE 1 — Foundation + Authentication
STATUS: COMPLETED

PHASE 2 — Maps + Routing Foundation
STATUS: COMPLETED

PHASE 3 — Multimodal Route Generation
STATUS: CURRENT PHASE

PHASE 4 — Database + Journey History
STATUS: NOT STARTED

Your task RIGHT NOW is to COMPLETELY IMPLEMENT AND FINISH PHASE 3.

DO NOT IMPLEMENT PHASE 4.
DO NOT implement future AI, crowd, weather, accessibility intelligence, TransitDNA, reliability, recommendation learning, etc. unless they are strictly required as placeholders/interfaces for Phase 3.

==================================================
PRIMARY OBJECTIVE
==================================================

Transform the current basic point-to-point road-routing system into a clean, extensible MULTIMODAL ROUTE GENERATION SYSTEM.

The user must be able to enter:

Origin
Destination
Travel profile / preferences

and receive multiple realistic route alternatives containing different combinations of:

• Walking
• Bus
• Metro
• Auto / last-mile
• Bike where supported by the current architecture
• Other currently supported modes only if they can be implemented reliably

The implementation may use DEMO / SEEDED / MOCK transportation datasets for now.

THIS IS INTENTIONAL.

Do NOT pretend that real-time government transit feeds or real-world live transit data exist if they are not available.

The architecture must be designed so real transit APIs / GTFS / live feeds can be integrated later.

==================================================
STEP 1 — AUDIT THE EXISTING PROJECT FIRST
==================================================

Before modifying anything:

1. Inspect the complete repository.
2. Inspect frontend and backend.
3. Inspect package.json files.
4. Inspect TypeScript configuration.
5. Inspect routing types.
6. Inspect routing services.
7. Inspect API routes.
8. Inspect controllers.
9. Inspect components.
10. Inspect pages.
11. Inspect hooks.
12. Inspect utilities.
13. Inspect environment configuration.
14. Inspect README.
15. Inspect existing authentication.
16. Inspect existing map implementation.
17. Inspect existing geocoding.
18. Inspect existing OSRM routing.
19. Inspect current Git-related files.
20. Search for TODOs, broken imports, unused code, duplicated logic, placeholder implementations and TypeScript errors.

Do NOT blindly modify files.

First understand the existing architecture.

==================================================
STEP 2 — PRESERVE PHASE 1 AND PHASE 2
==================================================

The following must continue working after Phase 3:

• React application
• TypeScript
• Tailwind CSS
• React Router
• Axios
• Node.js
• Express.js
• Existing REST API structure
• MongoDB/Mongoose configuration if already present
• Authentication
• Login
• Registration
• Protected routes
• Existing navigation
• Existing dashboard
• Existing map
• OpenStreetMap/Leaflet
• Origin selection
• Destination selection
• Location search
• Current-location detection
• Origin/destination swap
• Geocoding
• Existing OSRM road-routing functionality
• Route display
• Route distance
• Route duration
• Route instructions
• Existing error handling
• Existing loading states

Do NOT break these.

If an existing component already performs a function correctly, extend it rather than creating a conflicting duplicate implementation.

==================================================
STEP 3 — DEFINE A PROPER MULTIMODAL DATA MODEL
==================================================

Create clean TypeScript types/interfaces for multimodal routing.

The architecture should support:

TransportMode:

• WALK
• BUS
• METRO
• AUTO
• BIKE

Only expose modes that are actually supported by the current implementation.

Create a RouteSegment model containing, where applicable:

• id
• mode
• start location
• end location
• start coordinates
• end coordinates
• distance
• duration
• estimated fare
• instructions
• geometry
• route/line name
• stop/station information
• transfer information
• accessibility placeholder if the current architecture already supports it
• metadata

Create a MultimodalRoute model containing:

• route id
• origin
• destination
• segments
• total distance
• total duration
• total estimated fare
• total walking distance
• number of transfers
• transport modes used
• route summary
• route geometry if available
• recommendation metadata where appropriate

Keep the data model extensible for future phases.

==================================================
STEP 4 — CREATE A CLEAN TRANSIT DATA LAYER
==================================================

Because live transit data is NOT required for this phase, create a clean demo-data abstraction.

DO NOT hard-code transit logic directly inside React components.

Create a dedicated backend service/data layer.

Example conceptual structure:

backend/
  data/
    transit/
  services/
    routing/
    transit/
    multimodal/
  models/
  controllers/
  routes/

The exact structure may be adapted to the existing project.

Create demo transportation data containing realistic examples of:

• Metro stations
• Bus stops
• Metro connections
• Bus routes
• Approximate schedules
• Fare information
• Transfer points
• Walking connections
• Last-mile Auto connections

Use clean, structured JSON/TypeScript data.

Do NOT scatter fake values throughout components.

Clearly label this as DEMO / SEEDED transportation data.

==================================================
STEP 5 — IMPLEMENT MULTIMODAL ROUTE GENERATION
==================================================

Implement a backend multimodal routing service.

The system should:

1. Receive origin and destination.
2. Validate coordinates.
3. Identify nearby transit stops/stations.
4. Generate candidate transport combinations.
5. Calculate walking access/egress.
6. Combine transit segments.
7. Calculate transfer points.
8. Calculate total travel duration.
9. Calculate estimated fare.
10. Calculate total walking distance.
11. Count transfers.
12. Build route segments.
13. Return multiple route alternatives.

Possible route patterns:

Route A:
WALK → METRO → WALK

Route B:
WALK → BUS → WALK

Route C:
WALK → METRO → AUTO

Route D:
WALK → BUS → METRO → WALK

Route E:
WALK → AUTO → METRO → WALK

Only generate combinations that are logically valid according to the demo dataset.

==================================================
STEP 6 — RETAIN EXISTING ROAD ROUTING
==================================================

Do NOT remove OSRM.

OSRM can continue to provide:

• Walking/road geometry
• Distance
• Estimated road travel time
• Navigation instructions

Where appropriate, use it as a routing provider for road-based legs.

Do NOT pretend OSRM itself provides real public-transit routing.

Separate:

ROAD ROUTING

from

TRANSIT ROUTING

and combine them at the multimodal orchestration layer.

==================================================
STEP 7 — IMPLEMENT ACCESS / TRANSFER / EGRESS LOGIC
==================================================

For every transit route:

Origin
 ↓
Walking access
 ↓
Transit
 ↓
Transfer
 ↓
Transit
 ↓
Walking / Auto last-mile
 ↓
Destination

The system must correctly represent every segment.

Calculate:

• Walking distance
• Transit distance where available
• Total distance
• Walking duration
• Transit duration
• Transfer duration
• Last-mile duration
• Total duration

Do NOT simply add random values.

Use deterministic calculations from the demo dataset.

==================================================
STEP 8 — FARE CALCULATION
==================================================

Implement a basic, transparent demo fare calculation.

Each transport mode may have a defined demo fare model.

Example:

Metro:
base fare / distance slab

Bus:
demo fare based on route or distance

Auto:
base fare + estimated distance component

Walking:
₹0

The exact values must be centralized in configuration/data.

Do NOT hard-code fare values inside UI components.

The UI must clearly label fares as:

"Estimated fare"

because they are demo estimates.

==================================================
STEP 9 — MULTIPLE ROUTE ALTERNATIVES
==================================================

Do NOT return only one route.

The system should return several valid alternatives when possible.

Each route should be distinguishable by:

• Total time
• Estimated cost
• Walking distance
• Transfers
• Modes used

Example:

FASTEST
32 min
₹45
1 transfer

LOWEST COST
41 min
₹25
2 transfers

LOWEST WALKING
36 min
₹40
1 transfer

BALANCED
35 min
₹35
1 transfer

Do NOT claim these labels are AI-generated.

They are rule-based labels for this phase.

==================================================
STEP 10 — ROUTE SCORING
==================================================

Implement ONLY a simple transparent Phase-3 comparison/scoring mechanism if needed.

Possible factors:

• travel time
• estimated cost
• walking distance
• transfers

Do NOT implement the final TransitDNA learned-weight recommendation engine yet.

Do NOT claim machine learning.

Do NOT claim artificial intelligence if the implementation is deterministic.

The architecture should allow the future recommendation engine to replace this logic.

==================================================
STEP 11 — TRAVEL PROFILE SUPPORT
==================================================

If the current UI already supports travel profiles, preserve it.

Profiles may include:

• Standard
• Wheelchair
• Senior
• Stroller
• Luggage

For Phase 3:

DO NOT pretend full accessibility intelligence has been implemented.

You may use the profile to influence basic route presentation only if the data actually supports it.

If full accessibility routing is not yet implemented, clearly keep it as a future extension.

Do not fabricate accessibility data.

==================================================
STEP 12 — FRONTEND ROUTE RESULTS
==================================================

Create a professional route-results interface.

The user should see:

Origin
Destination

then:

Available Routes

Each route card should show:

• Route type
• Modes
• Total time
• Estimated fare
• Walking distance
• Number of transfers
• Major transit stations/stops
• Route summary

Example:

----------------------------------
Route 1 — Balanced
🚶 Walk → 🚇 Metro → 🚶 Walk

35 min
₹35 estimated
Walking: 650 m
Transfers: 1
----------------------------------

Route cards must be clean and consistent.

Avoid clutter.

==================================================
STEP 13 — ROUTE DETAILS
==================================================

When the user opens a route:

show:

Step 1
Walk 450 m to MG Road Metro Station

Step 2
Take Metro toward destination

Step 3
Exit at Majestic

Step 4
Walk 300 m to destination

If Auto is used:

Step:
Take Auto from station to destination

Show each segment distinctly.

==================================================
STEP 14 — MAP VISUALIZATION
==================================================

Extend the existing map without breaking it.

The map should display:

• Origin
• Destination
• Walking segments
• Transit stations
• Transfer points
• Route geometry where available
• Last-mile segment
• Selected route

Do NOT attempt impossible precision for demo transit geometry.

If transit geometry is unavailable, clearly visualize the segment using station-to-station coordinates and label it as demo transit routing.

Maintain a clean visual hierarchy.

==================================================
STEP 15 — ROUTE SELECTION
==================================================

When the user selects a route:

• Highlight that route
• Show it on the map
• Display detailed segments
• Display summary
• Display estimated fare
• Display walking distance
• Display transfers
• Display travel time

Other route options should remain accessible.

==================================================
STEP 16 — LOADING / EMPTY / ERROR STATES
==================================================

Implement professionally:

Loading:
"Finding the best available routes..."

No route:
"No suitable multimodal route was found for this journey."

Transit data unavailable:
"Transit data is currently unavailable. Demo transit data is being used."

API failure:
"Unable to calculate this route right now."

Invalid origin:
"Please select a valid origin."

Invalid destination:
"Please select a valid destination."

Do not expose raw backend stack traces to users.

==================================================
STEP 17 — BACKEND API
==================================================

Create a clean endpoint for multimodal routing.

For example:

GET/POST:

/api/routes/multimodal

Use the project's existing API conventions if another structure is already established.

Request should contain:

origin coordinates
destination coordinates
optional profile
optional preferences

Response should contain:

routes[]

Each route must contain:

segments[]
totalDuration
totalDistance
estimatedFare
walkingDistance
transferCount
modes

Use proper HTTP status codes.

Validate all inputs.

==================================================
STEP 18 — SECURITY
==================================================

Do not expose secrets.

Do not place API keys inside frontend source code.

Use environment variables.

Validate backend input.

Do not trust frontend coordinates blindly.

Do not introduce security vulnerabilities.

==================================================
STEP 19 — CODE QUALITY
==================================================

Maintain:

• TypeScript strictness
• Reusable components
• Clean service boundaries
• No duplicated routing logic
• No giant React components
• No business logic buried inside JSX
• No random console.log statements
• No dead imports
• No unused variables
• No duplicated API calls
• No unnecessary dependencies

Follow the existing coding conventions.

==================================================
STEP 20 — UI QUALITY
==================================================

The project must maintain the professional TransitSwap design.

Use the already-established visual language.

Do NOT redesign the whole application.

Keep:

• consistent spacing
• typography
• cards
• buttons
• responsive layouts
• map layout
• navigation
• desktop support
• mobile responsiveness

The UI should look like a professional final-year project rather than a raw prototype.

==================================================
STEP 21 — DO NOT IMPLEMENT FUTURE PHASES
==================================================

DO NOT implement:

❌ MongoDB journey history
❌ Journey persistence
❌ Weather intelligence
❌ Crowd prediction
❌ Crowd reporting system
❌ TransitDNA
❌ Machine-learning preference learning
❌ Learning-to-rank
❌ Reliability engine
❌ Monte Carlo missed-connection prediction
❌ Arrival confidence intervals
❌ Smart departure prediction
❌ Advanced accessibility dataset
❌ Advanced accessibility graph
❌ Full real-time transit data
❌ IoT
❌ LSTM
❌ Reinforcement learning
❌ Digital twin
❌ Blockchain
❌ Event scraping

Those belong to later phases.

DO NOT accidentally turn Phase 3 into the entire project.

==================================================
STEP 22 — TESTING
==================================================

After implementation, test:

1. Origin search
2. Destination search
3. Current location
4. Swap
5. Map display
6. Road route
7. Multimodal route
8. Walking → Metro → Walking
9. Walking → Bus → Walking
10. Walking → Metro → Auto
11. Multiple route alternatives
12. Fare calculation
13. Walking distance
14. Transfer count
15. Route details
16. Route selection
17. Invalid coordinates
18. No route
19. Backend failure
20. Transit data unavailable
21. Mobile layout
22. Desktop layout

==================================================
STEP 23 — BUILD VALIDATION
==================================================

Run:

• frontend build
• backend build if applicable
• TypeScript checks
• lint
• tests if available

Fix:

• compilation errors
• TypeScript errors
• broken imports
• runtime errors
• API errors
• incorrect route data
• UI crashes

Do NOT declare completion while errors remain.

==================================================
STEP 24 — FINAL AUDIT
==================================================

Before saying Phase 3 is complete, verify:

[ ] Phase 1 still works
[ ] Authentication still works
[ ] Phase 2 maps still work
[ ] Geocoding still works
[ ] Current location still works
[ ] OSRM routing still works
[ ] Multimodal routing works
[ ] Multiple route alternatives work
[ ] Walking works
[ ] Bus demo routing works
[ ] Metro demo routing works
[ ] Auto last-mile works
[ ] Route segments are represented correctly
[ ] Fare is calculated
[ ] Walking distance is calculated
[ ] Transfers are calculated
[ ] Route details work
[ ] Map visualization works
[ ] Route selection works
[ ] Loading states work
[ ] Error states work
[ ] No secrets exposed
[ ] No TypeScript errors
[ ] No build errors
[ ] No broken existing features
[ ] Future-phase functionality has NOT been falsely implemented

==================================================
STEP 25 — IMPORTANT DEMO DATA RULE
==================================================

This is a FINAL-YEAR STUDENT PROJECT.

For this phase, DEMO / SEEDED / MOCK transportation data is acceptable.

However:

NEVER represent mock data as real-time live data.

Use clear terminology:

"Demo Transit Data"

"Estimated Fare"

"Simulated Transit Schedule"

when appropriate.

Design the architecture so that later we can replace:

Demo Transit Data
        ↓
GTFS / official transit API / real-time feed

without rewriting the entire frontend.

==================================================
STEP 26 — DOCUMENTATION
==================================================

Update README ONLY with what is actually implemented.

Include:

Phase 3 — Multimodal Route Generation

Status:
Completed

Document:

• supported modes
• demo-data approach
• multimodal architecture
• API endpoint
• route data model
• route alternatives
• fare calculation
• transfer calculation
• current limitations
• future real-data integration

Do NOT claim:

real-time public transit data
real-world accuracy
AI
ML
live crowd data
real-time accessibility

unless genuinely implemented.

==================================================
CRITICAL DEVELOPMENT RULES
==================================================

1. Inspect before editing.
2. Reuse existing architecture.
3. Do not rewrite working code.
4. Do not delete features.
5. Do not fake functionality.
6. Do not claim unsupported functionality.
7. Do not add unnecessary dependencies.
8. Keep frontend/backend separation.
9. Keep business logic on backend where appropriate.
10. Keep types synchronized between frontend/backend.
11. Keep the UI professional.
12. Keep the implementation understandable to a final-year engineering student.
13. Make every feature actually work.
14. Do not stop after creating UI placeholders.
15. Do not leave TODO implementations.
16. Do not silently skip requirements.
17. If something cannot be implemented using the current architecture, adapt it cleanly and document the limitation.
18. Do not ask me unnecessary questions. Make reasonable engineering decisions based on the existing project.
19. Do not move to Phase 4.
20. Phase 3 must be fully complete before declaring success.

==================================================
FINAL RESPONSE REQUIRED FROM YOU
==================================================

After completing the work, report:

1. Files created
2. Files modified
3. Features implemented
4. API endpoints added/modified
5. Data structures added
6. Multimodal modes implemented
7. Demo-data structure
8. Tests performed
9. Build result
10. Any remaining warnings
11. Any remaining limitations
12. Exact instructions to run frontend
13. Exact instructions to run backend
14. Exact manual test procedure
15. Confirmation that Phase 1 was preserved
16. Confirmation that Phase 2 was preserved
17. Confirmation that Phase 3 is complete
18. Confirmation that Phase 4 has NOT been implemented

MOST IMPORTANT:

Do not merely tell me what should be implemented.

ACTUALLY INSPECT THE REPOSITORY AND IMPLEMENT THE COMPLETE PHASE 3.

Do not stop until the project builds successfully and all Phase-3 requirements above have been verified.

The final implementation must be clean, professional, maintainable, extensible, and suitable for a final-year engineering project.