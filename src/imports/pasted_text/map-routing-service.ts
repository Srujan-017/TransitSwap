You are working on my existing final-year engineering project called:

TRANSITSWAP — Intelligent Multimodal Urban Mobility & Accessibility-Aware Journey Planner

IMPORTANT:
This is NOT a new project.
The project already has a completed Phase 1 foundation.

You must work directly on the existing codebase.

CURRENT GIT BRANCH:
phase-2-maps-routing

DO NOT work on main.
DO NOT create a new project.
DO NOT delete or replace the existing project architecture.
DO NOT rewrite Phase 1 unnecessarily.
DO NOT move to Phase 3.

============================================================
PROJECT OBJECTIVE
============================================================

TransitSwap is a professional MERN-based intelligent urban mobility platform.

The eventual system will help users plan journeys using:

- Metro
- Bus
- Walking
- Auto
- Bike
- Other supported last-mile modes

The system will eventually consider:

- Travel time
- Cost
- Crowd conditions
- Accessibility
- Weather
- Transfers
- Last-mile connectivity
- Reliability
- User preferences

However, THIS PHASE is specifically responsible for building the Maps & Routing foundation.

============================================================
PHASE 1 MUST BE PRESERVED
============================================================

Before changing anything, inspect the entire existing repository.

Understand:

Frontend:
- React
- TypeScript
- Tailwind CSS
- React Router
- Axios
- Existing components
- Existing pages
- Existing hooks
- Existing utilities
- Existing API service structure
- Existing authentication context
- Existing protected routes

Backend:
- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- Existing models
- Existing controllers
- Existing routes
- Existing middleware
- Existing services
- Existing authentication
- Existing error handling
- Existing validation
- Existing security configuration

DO NOT break:

- Login
- Registration
- Logout
- JWT authentication
- Protected routes
- User profile
- Accessibility profile
- Existing TransitDNA structure
- MongoDB connection
- Existing API architecture
- Existing UI theme
- Existing responsive layout
- Existing error handling
- Existing environment-variable handling

If Phase 1 already contains functionality required by Phase 2, REUSE IT.

Do not duplicate existing functionality.

============================================================
PHASE 2 GOAL
============================================================

Build the complete Maps & Routing foundation.

By the end of Phase 2, the user should be able to:

1. Open the trip-planning interface.
2. Enter an origin.
3. Enter a destination.
4. Search locations.
5. Select locations from search results.
6. Use the current device location where permission is available.
7. View origin and destination on a map.
8. Request a route between origin and destination.
9. Display the route visually on the map.
10. Calculate/display route distance.
11. Calculate/display estimated travel duration.
12. Show route instructions where supported.
13. Handle routing failures gracefully.
14. Handle invalid locations gracefully.
15. Handle location permission denial gracefully.
16. Handle API/network failures gracefully.
17. Keep API keys secure.
18. Keep the architecture ready for future multimodal routing.
19. Keep the architecture ready for future accessibility-aware routing.
20. Keep the architecture ready for future crowd/weather/cost/reliability scoring.

============================================================
IMPORTANT TECHNOLOGY RULE
============================================================

First inspect package.json and the existing codebase.

DO NOT blindly install a new mapping provider.

If the project already contains a mapping provider or routing abstraction, reuse it.

If no provider exists, implement a clean provider abstraction so the project can use a legitimate map/routing service through environment variables.

The architecture must allow the mapping provider to be changed later without rewriting the whole application.

Do NOT hardcode API keys.

Use environment variables.

Example concept:

Frontend:
VITE_MAP_API_KEY=...

Backend:
MAP_API_KEY=...

Use the actual variable naming convention already present in the project if one exists.

Never expose private backend secrets to the frontend.

============================================================
PHASE 2 ARCHITECTURE
============================================================

Use a clean separation:

Frontend
    ↓
API service
    ↓
Backend REST API
    ↓
Routing service
    ↓
External map/routing provider

The frontend should NOT contain secret server-side API keys.

Create/reuse a service abstraction such as:

frontend:
services/mapService.ts
services/routingService.ts

backend:
services/mapService.ts
services/routingService.ts

Use the project's existing architecture if equivalent files already exist.

Do not create duplicate services unnecessarily.

============================================================
FEATURE 1 — MAP FOUNDATION
============================================================

Implement a professional interactive map.

Requirements:

- Clean map container
- Responsive layout
- Proper loading state
- Proper error state
- Map should resize correctly
- Map should work on desktop and mobile
- No layout overflow
- No unnecessary UI clutter

The map should visually match the existing TransitSwap design.

IMPORTANT:
Do not redesign the entire application.

Use the existing UI design language and the selected professional transit-app visual style.

============================================================
FEATURE 2 — ORIGIN SEARCH
============================================================

Implement origin/location search.

The user should be able to enter:

- Station
- Bus stop
- Landmark
- Address
- Place name

Search should:

- Debounce requests where appropriate
- Avoid unnecessary API calls
- Display useful search suggestions
- Allow selecting a result
- Store selected latitude/longitude
- Store a readable display name

Do not rely only on the text typed by the user.

Once selected, the system must maintain a structured location object.

Conceptually:

{
  name,
  latitude,
  longitude,
  address
}

Use proper TypeScript types.

============================================================
FEATURE 3 — DESTINATION SEARCH
============================================================

Implement destination search using the same professional architecture.

The destination must produce structured coordinates.

The user must be able to change the destination before requesting a route.

Do not duplicate search logic.

Create reusable location-search components/services where appropriate.

============================================================
FEATURE 4 — CURRENT LOCATION
============================================================

Add:

"Use my current location"

Use the browser/device geolocation API where supported.

Handle:

- Permission granted
- Permission denied
- Position unavailable
- Timeout
- Unsupported browser

Do not crash if location permission is denied.

Show a professional message explaining what happened.

Never continuously track the user in Phase 2.

Only obtain the location required for trip planning.

============================================================
FEATURE 5 — ORIGIN/DESTINATION SWAP
============================================================

Add a swap control:

Origin ↔ Destination

When clicked:

- Origin becomes destination
- Destination becomes origin
- Existing map state remains valid
- User interface updates immediately

Do not reload the entire page.

============================================================
FEATURE 6 — LOCATION VALIDATION
============================================================

Before requesting a route, validate:

- Origin exists
- Destination exists
- Coordinates are valid
- Origin and destination are not identical

If invalid:

Do not call the routing API.

Show a clear user-friendly validation message.

============================================================
FEATURE 7 — ROUTING API
============================================================

Implement route calculation.

The backend should accept something conceptually similar to:

POST /api/routes

Request:

{
  "origin": {
    "latitude": number,
    "longitude": number
  },
  "destination": {
    "latitude": number,
    "longitude": number
  }
}

The backend should validate the request.

The routing service should:

1. Validate input
2. Call the configured routing provider
3. Normalize the provider response
4. Return a TransitSwap-specific route structure

Do NOT expose raw provider-specific response structures throughout the frontend.

Create an internal normalized route model.

============================================================
NORMALIZED ROUTE MODEL
============================================================

Create clean TypeScript interfaces/types.

Conceptually:

Route:

{
  id: string,
  distanceMeters: number,
  durationSeconds: number,
  geometry: ...,
  legs: [...],
  steps: [...]
}

Do not blindly copy this structure if the project already has a better architecture.

The important principle is:

External API response
        ↓
TransitSwap normalized model
        ↓
Frontend UI

This will allow future providers to be swapped easily.

============================================================
FEATURE 8 — ROUTE DRAWING
============================================================

After successful route calculation:

- Draw the route on the map
- Show origin marker
- Show destination marker
- Fit map bounds to route
- Display route clearly
- Remove/replace previous route when a new route is requested

Do not leave multiple stale routes on the map.

============================================================
FEATURE 9 — ROUTE SUMMARY
============================================================

Display a clean route summary.

At minimum:

- Estimated travel time
- Total distance
- Origin
- Destination

Use human-readable formatting.

Example:

34 min
8.4 km

Do not show raw seconds/meters to normal users.

============================================================
FEATURE 10 — TURN-BY-TURN INSTRUCTIONS
============================================================

If the routing provider supplies route steps:

Display them in a clean expandable route instruction component.

Each step should be understandable.

Do not expose raw JSON.

Handle cases where instructions are unavailable.

============================================================
FEATURE 11 — ROUTE LOADING STATE
============================================================

When route calculation is running:

Show a professional loading state.

Disable duplicate route requests where appropriate.

Do not freeze the entire application.

The map and surrounding interface should remain usable where possible.

============================================================
FEATURE 12 — ERROR HANDLING
============================================================

Handle all common failures.

At minimum:

- Invalid origin
- Invalid destination
- Same origin and destination
- No route found
- API failure
- Network failure
- Timeout
- Rate limit
- Location permission denied
- Invalid API key
- Routing provider unavailable

Use friendly messages.

Never display raw stack traces to the user.

Do not silently fail.

============================================================
FEATURE 13 — API SECURITY
============================================================

DO NOT:

- hardcode API keys
- commit .env files
- expose private backend secrets
- place secret keys in React source
- log secrets
- return secret configuration through APIs

Verify .gitignore.

If environment configuration is missing, provide a safe configuration example such as:

.env.example

without real secrets.

============================================================
FEATURE 14 — BACKEND VALIDATION
============================================================

Every route request must be validated server-side.

Do not trust frontend validation alone.

Validate:

- latitude
- longitude
- required fields
- data types
- acceptable geographic ranges

Latitude:

-90 to 90

Longitude:

-180 to 180

Return proper HTTP status codes.

============================================================
FEATURE 15 — RATE LIMIT / ABUSE PROTECTION
============================================================

Reuse the existing security middleware.

Do not introduce a second conflicting rate limiter.

Ensure routing requests cannot be abused through unlimited API calls.

Use the project's existing middleware architecture.

============================================================
FEATURE 16 — TYPESCRIPT QUALITY
============================================================

Avoid:

any

unless absolutely unavoidable.

Create proper interfaces/types for:

- Location
- RouteRequest
- Route
- RouteLeg
- RouteStep
- RoutingResponse
- API errors

Do not leave TypeScript errors.

============================================================
FEATURE 17 — REUSABLE COMPONENTS
============================================================

Do not create one giant PlanTripPage component.

Break functionality into clean reusable components where appropriate.

Possible architecture:

components/
    map/
        MapView
        MapMarker
        RoutePolyline

    routing/
        LocationSearch
        RouteSearchForm
        RouteSummary
        RouteInstructions

Use the existing project's component conventions if they differ.

Avoid overengineering.

============================================================
FEATURE 18 — ACCESSIBILITY PREPARATION
============================================================

IMPORTANT:

Phase 2 does NOT implement the complete Accessibility Engine yet.

But the architecture must be ready for it.

Do NOT pretend that Phase 2 already performs accessibility-aware routing.

Prepare clean route data structures so future phases can attach:

- wheelchair accessibility
- ramps
- lifts
- stairs
- tactile paving
- accessible entrances
- accessibility reports

Do not invent accessibility information in Phase 2.

============================================================
FEATURE 19 — MULTIMODAL PREPARATION
============================================================

Phase 2 should establish the foundation for future:

- Metro
- Bus
- Walking
- Auto
- Bike

However:

DO NOT fake multimodal routing.

If the selected routing provider only gives a road/walking route in Phase 2, clearly represent it as such.

The multimodal journey engine belongs to later phases.

Design the normalized model so future legs can contain:

mode:
"walking"
"bus"
"metro"
"auto"
"bike"

but do not claim unsupported modes are already implemented.

============================================================
FEATURE 20 — WEATHER/CROWD PREPARATION
============================================================

DO NOT implement fake weather or crowd intelligence in Phase 2.

The route model should eventually support additional metadata such as:

- weather impact
- crowd level
- accessibility status
- reliability
- cost

But those belong to later phases.

Keep Phase 2 focused.

============================================================
FEATURE 21 — PROFESSIONAL UI
============================================================

Maintain the existing TransitSwap design.

The UI should feel like a professional transportation product.

Requirements:

- Clean spacing
- Consistent typography
- Consistent border radius
- Consistent buttons
- Responsive cards
- Clear hierarchy
- Professional map panel
- Clear route results
- Good empty states
- Good loading states
- Good error states
- Mobile responsiveness

DO NOT introduce random colors.

DO NOT change the established color system.

DO NOT redesign unrelated Phase 1 pages.

============================================================
FEATURE 22 — RESPONSIVE DESIGN
============================================================

Test:

Desktop:
1920px
1440px
1280px

Tablet:
768px

Mobile:
390px
375px

Ensure:

- no horizontal overflow
- map remains usable
- search fields remain accessible
- route cards don't break
- buttons remain clickable
- text doesn't overflow
- instructions remain readable

============================================================
FEATURE 23 — FRONTEND ERROR BOUNDARIES
============================================================

Use the existing error-boundary architecture if present.

If a routing component fails, the whole application must not become unusable.

Provide a professional fallback.

============================================================
FEATURE 24 — API RESPONSE NORMALIZATION
============================================================

This is extremely important.

Never allow provider-specific structures to spread throughout the application.

Create:

Provider Response
        ↓
Adapter / Mapper
        ↓
TransitSwap Route Model
        ↓
UI

If the provider changes later, only the adapter/service should need major changes.

============================================================
FEATURE 25 — CLEAN CODE
============================================================

Follow:

- Single responsibility
- Reusable functions
- Clear naming
- Small components
- Proper async/await
- Proper error handling
- No unnecessary duplicate code
- No dead code
- No console spam
- No commented-out abandoned implementations

Remove temporary debugging statements before completion.

============================================================
FEATURE 26 — DATABASE
============================================================

Do NOT introduce unnecessary database collections in Phase 2.

Only persist routing information if the existing architecture genuinely requires it.

Do not store every route request unnecessarily.

The database should remain clean.

Future phases will add:

- journey history
- accessibility reports
- user preferences
- crowd reports
- route feedback

Do not prematurely implement these unless required for existing Phase 1 functionality.

============================================================
FEATURE 27 — ENVIRONMENT CONFIGURATION
============================================================

Create/update:

.env.example

Document required environment variables.

Do NOT put real keys in:

- source files
- Git
- README
- screenshots
- frontend code
- commits

============================================================
FEATURE 28 — DOCUMENTATION
============================================================

Update README documentation ONLY where appropriate.

Document:

- Phase 2 purpose
- map provider used
- required environment variables
- how to run frontend
- how to run backend
- how to configure map/routing API
- route API endpoint
- expected request/response concept
- troubleshooting
- Phase 2 limitations

Clearly state:

"This phase uses external map/routing services as the routing foundation. Advanced accessibility-aware, crowd-aware, weather-aware, preference-learning and reliability intelligence are implemented in later phases."

Do not claim features that aren't implemented.

============================================================
TESTING REQUIREMENTS
============================================================

Before declaring Phase 2 complete, test everything.

Frontend:

- npm install
- npm run build
- npm run lint if available
- TypeScript compilation

Backend:

- npm install
- npm run build if available
- start server
- verify API

Functional tests:

1. Open application
2. Login
3. Open trip planner
4. Enter valid origin
5. Enter valid destination
6. Select search results
7. Request route
8. Route appears on map
9. Distance appears
10. Duration appears
11. Instructions appear if available
12. Swap locations
13. Request new route
14. Use current location
15. Deny location permission
16. Test invalid destination
17. Test same origin/destination
18. Test network/API failure
19. Refresh page
20. Verify authentication still works
21. Verify existing Phase 1 pages still work
22. Test mobile layout

============================================================
REGRESSION TESTING
============================================================

This is mandatory.

After implementing Phase 2, verify that Phase 1 still works:

- Registration
- Login
- Logout
- Protected routes
- User profile
- Accessibility profile
- TransitDNA
- Existing navigation
- Existing styling
- Backend startup
- MongoDB connection

If any Phase 1 feature breaks:

STOP.

Fix it before declaring Phase 2 complete.

============================================================
GIT SAFETY
============================================================

You are currently on:

phase-2-maps-routing

DO NOT switch to main.

DO NOT delete:

main
phase-1-foundation
v0.1.0-phase-1

DO NOT reset or force-push.

DO NOT run:

git reset --hard
git push --force
git clean -fd

unless explicitly instructed by me.

============================================================
IMPLEMENTATION STRATEGY
============================================================

Even though this is a ONE-SHOT request, internally work in this order:

STEP 1:
Inspect entire project.

STEP 2:
Understand Phase 1.

STEP 3:
Identify existing map/routing code.

STEP 4:
Create a clean implementation plan.

STEP 5:
Implement map foundation.

STEP 6:
Implement location search.

STEP 7:
Implement current location.

STEP 8:
Implement origin/destination handling.

STEP 9:
Implement routing backend.

STEP 10:
Normalize routing response.

STEP 11:
Display route on map.

STEP 12:
Display route summary.

STEP 13:
Display route instructions.

STEP 14:
Implement loading/error/empty states.

STEP 15:
Implement responsive UI.

STEP 16:
Integrate security/environment handling.

STEP 17:
Run frontend tests/build/lint/type checks.

STEP 18:
Run backend tests/build/type checks.

STEP 19:
Run regression checks on Phase 1.

STEP 20:
Fix every error discovered.

STEP 21:
Run the tests again after fixes.

============================================================
CRITICAL RULE — DO NOT STOP AT FIRST ERROR
============================================================

If you encounter:

- TypeScript error
- import error
- dependency error
- API error
- routing error
- map rendering error
- CSS error
- build error
- lint error
- runtime error

DO NOT simply report it to me.

Investigate the root cause.

Fix it.

Run the relevant check again.

Only continue after it is resolved.

============================================================
CRITICAL RULE — DO NOT INVENT FUNCTIONALITY
============================================================

Do not claim:

- live transit feeds
- live bus positions
- real-time crowd prediction
- real-time accessibility status
- live weather intelligence
- AI route prediction
- machine learning
- learned user preferences

unless they are genuinely implemented.

Phase 2 is Maps & Routing foundation.

Future intelligence features will be implemented in later phases.

============================================================
CRITICAL RULE — DEMO DATA
============================================================

This is a final-year student project.

For future features, demo/synthetic datasets may be used where real-world data is unavailable.

However, do not disguise demo data as live real-world data.

If sample/demo data is needed:

Clearly label it:

"Demo Data"

or

"Prototype Data"

Do not fabricate research accuracy numbers.

============================================================
FINAL QUALITY BAR
============================================================

The implementation must be:

- professional
- clean
- maintainable
- modular
- secure
- responsive
- typed
- documented
- testable
- extensible
- consistent with Phase 1
- ready for Phase 3

Do not add unnecessary features merely to make the implementation larger.

Quality > quantity.

============================================================
PHASE 2 DEFINITION OF DONE
============================================================

Phase 2 is complete ONLY when:

[ ] Map works
[ ] Origin search works
[ ] Destination search works
[ ] Current location works
[ ] Origin/destination swap works
[ ] Location validation works
[ ] Routing request works
[ ] Route appears on map
[ ] Distance works
[ ] Duration works
[ ] Route instructions work where supported
[ ] Loading states work
[ ] Empty states work
[ ] Error states work
[ ] API keys are secure
[ ] Environment variables are documented
[ ] Backend validation works
[ ] Frontend validation works
[ ] TypeScript passes
[ ] Frontend builds
[ ] Backend builds/runs
[ ] No obvious console errors
[ ] Responsive layout works
[ ] Phase 1 authentication still works
[ ] Phase 1 protected routes still work
[ ] Phase 1 user/profile functionality still works
[ ] No Phase 1 feature has been unnecessarily removed
[ ] README is updated
[ ] No secrets are committed
[ ] No fake live-data claims are made
[ ] Future Phase 3 features are not falsely presented as implemented

============================================================
FINAL RESPONSE REQUIRED
============================================================

After completing implementation and testing, give me a concise report containing:

1. What was implemented
2. Files created
3. Files modified
4. Dependencies added
5. Environment variables required
6. API endpoints created/modified
7. Tests performed
8. Build results
9. Any limitations
10. Any remaining issues

Do NOT say "completed successfully" unless you actually verified the implementation.

Do NOT fabricate test results.

If an external API cannot be tested because credentials are unavailable, clearly state:

"Implementation completed, external API verification requires a valid API key."

Do not pretend otherwise.

============================================================
MOST IMPORTANT INSTRUCTION
============================================================

Preserve the existing TransitSwap Phase 1 architecture.

Implement Phase 2 completely.

Do not break existing functionality.

Do not move to Phase 3.

Do not invent features.

Do not fabricate data or accuracy.

Inspect first → implement carefully → test → fix → retest → report.

Start now.