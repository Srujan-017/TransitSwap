You are working on my existing final-year engineering project called:

TransitSwap — Smart Urban Mobility Assistant

IMPORTANT:
This is NOT a new project.
Phase 1 has already been completed and verified.
You must continue from the existing codebase.

CURRENT GIT BRANCH:
phase-2-maps-routing

DO NOT create a new project.
DO NOT replace the existing architecture.
DO NOT rewrite the application unnecessarily.
DO NOT remove working Phase 1 functionality.
DO NOT break authentication, user profiles, accessibility profiles, TransitDNA, database configuration, existing UI, routing, or existing project structure.

Your task is to COMPLETELY IMPLEMENT PHASE 2 — MAPS & ROUTING FOUNDATION.

==================================================
1. FIRST: INSPECT THE EXISTING PROJECT
==================================================

Before changing ANY code:

1. Inspect the complete repository.
2. Inspect the frontend structure.
3. Inspect the backend structure.
4. Inspect package.json files.
5. Inspect TypeScript configuration.
6. Inspect Tailwind configuration.
7. Inspect React Router configuration.
8. Inspect Axios/API service configuration.
9. Inspect MongoDB/Mongoose configuration.
10. Inspect authentication and protected routes.
11. Inspect existing components and pages.
12. Inspect environment-variable handling.
13. Inspect .gitignore.
14. Inspect existing Phase 1 demo/prototype data.
15. Identify exactly how Phase 1 currently works.

Do not assume file names.
Do not blindly create duplicate files.
Reuse existing components/services/types wherever appropriate.

Before implementing, create an internal implementation plan based on the ACTUAL repository.

==================================================
2. PHASE 1 MUST REMAIN WORKING
==================================================

The following must continue working after Phase 2:

- Application startup
- Frontend startup
- Backend startup
- React routing
- Login
- Registration
- Logout
- Authentication state
- Protected routes
- User profile
- Accessibility profile
- Existing TransitDNA structure
- Existing API architecture
- MongoDB configuration
- Existing UI design
- Existing responsive behavior
- Existing error handling
- Existing loading states
- Existing demo/prototype functionality

Do not remove existing functionality simply because Phase 2 introduces a better implementation.

If a Phase 1 component needs modification, modify it carefully rather than replacing the entire application.

==================================================
3. PHASE 2 OBJECTIVE
==================================================

The objective of Phase 2 is to build the real Maps and Routing foundation of TransitSwap.

The user should be able to:

1. Open the trip-planning interface.
2. See an interactive map.
3. Allow location access.
4. See their current location.
5. Search for an origin.
6. Search for a destination.
7. Select locations accurately.
8. Swap origin and destination.
9. Request a route.
10. Receive route information.
11. Display the route visually on the map.
12. See route distance.
13. See estimated travel time.
14. See route alternatives when available.
15. Handle routing errors gracefully.
16. Continue using the application even when external APIs are unavailable by using clearly labelled demo/mock data.

Phase 2 must establish the foundation required for future multimodal routing and intelligence features.

==================================================
4. MAP PROVIDER / API INTEGRATION
==================================================

Use the map provider already selected/configured by the existing project.

If Google Maps APIs are already intended by the project, integrate:

- Google Maps JavaScript API
- Google Places / Autocomplete where appropriate
- Google Directions API / Routes API according to the existing architecture

IMPORTANT:

Do NOT hardcode API keys.

Use environment variables.

Frontend secrets must use the correct frontend environment-variable convention.

Backend secrets must remain server-side.

Never commit:

- API keys
- MongoDB credentials
- JWT secrets
- private credentials
- .env files

If the repository already contains an API abstraction, extend it rather than creating a second unrelated API system.

If API credentials are unavailable during development:

DO NOT break the application.

Provide a clearly labelled DEMO MODE / MOCK MODE using deterministic local data.

Never pretend mock route data is live API data.

The UI must clearly distinguish:

LIVE ROUTING
and
DEMO / PROTOTYPE ROUTING

==================================================
5. ENVIRONMENT CONFIGURATION
==================================================

Create/update environment configuration only if required.

Use clear variable names such as:

Frontend:
VITE_GOOGLE_MAPS_API_KEY

Backend:
GOOGLE_MAPS_API_KEY

Use the actual naming convention already present in the repository if different.

Update .env.example with placeholder values only.

Example:

VITE_GOOGLE_MAPS_API_KEY=your_key_here
GOOGLE_MAPS_API_KEY=your_key_here

Never insert real secrets into source code.

Ensure .gitignore protects all .env files.

==================================================
6. MAP UI
==================================================

Create a professional, clean, elegant TransitSwap map interface.

The visual design MUST remain consistent with the project's existing UI direction.

Use the previously selected design inspiration from the referenced Behance transit UI, but DO NOT copy proprietary assets or exact designs.

Maintain:

- clean layout
- modern transit-app appearance
- professional typography
- consistent spacing
- polished cards
- clear hierarchy
- responsive design
- accessible controls
- mobile-friendly behavior

The map should not dominate the entire screen unnecessarily.

Use an appropriate layout such as:

--------------------------------------------------
Header / Navigation
--------------------------------------------------
Origin + Destination Search
--------------------------------------------------
Map                         Route Summary
                            / Route Cards
--------------------------------------------------
Optional route details
--------------------------------------------------

Adapt responsively for desktop and mobile.

==================================================
7. CURRENT LOCATION
==================================================

Implement browser geolocation.

When the user selects:

"Use my current location"

request browser permission.

If permission is granted:

- obtain latitude
- obtain longitude
- show current position on map
- use it as origin when appropriate
- reverse-geocode if required to show a readable location

If permission is denied:

show a professional message:

"Location access is unavailable. Please search for your starting location manually."

Do not crash.

Handle:

- permission denied
- location unavailable
- timeout
- browser unsupported

gracefully.

==================================================
8. ORIGIN SEARCH
==================================================

Implement origin search.

The user should be able to search:

- address
- landmark
- station
- bus stop
- metro station
- locality
- known place

Use autocomplete where supported.

After selection:

- store coordinates
- store readable name
- place marker on map
- update the origin field

Do not rely only on text strings.

Internally maintain structured location data.

Use a model similar to:

Location:
{
  name,
  address,
  latitude,
  longitude,
  placeId
}

Use appropriate TypeScript interfaces/types.

==================================================
9. DESTINATION SEARCH
==================================================

Implement destination search using the same architecture.

After selection:

- store coordinates
- store readable name
- place destination marker
- update destination field

The system must prevent route calculation if origin or destination is missing.

Show an appropriate validation message.

==================================================
10. SWAP ORIGIN / DESTINATION
==================================================

Add a clear swap button.

When clicked:

Origin becomes Destination.

Destination becomes Origin.

Markers must update accordingly.

The map state must remain consistent.

Do not merely swap the displayed text while leaving the coordinates unchanged.

==================================================
11. ROUTE REQUEST
==================================================

Create a clean routing service abstraction.

Do not put API calls directly inside large React components.

Use something similar to:

services/
    mapsService.ts
    routingService.ts

or adapt the existing project's service architecture.

The routing service should accept:

origin
destination
travel mode / options

and return structured route information.

Create proper TypeScript types.

Example conceptual structure:

Route:
{
  id,
  distance,
  duration,
  startLocation,
  endLocation,
  polyline,
  legs,
  steps,
  mode,
  summary
}

Do not blindly copy this structure if the existing project already has a better architecture.

==================================================
12. ROUTE DISPLAY
==================================================

Display the calculated route on the map.

The user must be able to visually understand:

- origin
- destination
- route path
- route alternatives if available

Use a visually clear route line.

Fit the map viewport automatically so the entire route is visible.

Do not force the user to manually zoom out.

==================================================
13. ROUTE SUMMARY
==================================================

For every available route, display useful information such as:

- estimated duration
- distance
- route summary
- travel mode
- number of transfers where available
- walking distance where available

Example:

Route A
32 min
8.4 km
2 transfers
650 m walking

Do not fabricate values.

Live values must come from the routing provider.

Demo values must come from clearly labelled mock data.

==================================================
14. ROUTE ALTERNATIVES
==================================================

If the routing provider returns alternative routes:

display them.

The user should be able to select an alternative.

When the user selects an alternative:

- visually highlight the selected route
- update the route summary
- update map display
- maintain origin/destination

If the provider does not return alternatives:

do not invent fake live alternatives.

Demo mode can provide deterministic alternatives.

==================================================
15. TRANSPORT MODES
==================================================

Phase 2 should establish the foundation for TransitSwap's multimodal architecture.

Support the architecture for:

- Walking
- Driving / road travel
- Public transit where supported by the API/provider

Do NOT pretend that every transport mode is already available through a live provider.

For modes unavailable through the selected API:

keep the architecture extensible for future implementation.

TransitSwap's future mobility modes include:

- Metro
- Bus
- Walking
- Auto
- Bike
- E-rickshaw
- Last-mile options

Phase 2 should prepare the data model and routing abstraction for these future modes without incorrectly claiming they are already fully live.

==================================================
16. PUBLIC TRANSIT FOUNDATION
==================================================

Where the routing provider supports public transit:

support transit route information such as:

- transit line
- vehicle type
- station/stop
- departure/arrival information where available
- transfers
- walking portions
- route duration

The architecture should be extensible for:

Metro
Bus

and future local transport integrations.

Do not implement advanced crowd prediction, learned route ranking, Monte Carlo reliability, accessibility intelligence, or preference learning in Phase 2.

Those belong to later phases.

==================================================
17. LAST-MILE FOUNDATION
==================================================

Phase 2 should prepare the system to eventually support last-mile transportation.

Represent route legs in a way that can distinguish:

- main transit journey
- walking connection
- last-mile journey

Do not implement the complete intelligent last-mile recommendation engine yet.

That will be added in a later phase.

==================================================
18. MAP MARKERS
==================================================

Use clear map markers for:

- origin
- destination
- current location

Where appropriate, prepare marker types for:

- metro station
- bus stop
- transfer point
- accessibility point

Do not clutter the map.

==================================================
19. LOADING STATES
==================================================

Every asynchronous operation must have a proper loading state.

Examples:

"Finding location..."

"Searching places..."

"Calculating route..."

"Loading map..."

Do not leave the interface frozen.

Use appropriate loading indicators consistent with the existing design.

==================================================
20. ERROR HANDLING
==================================================

Handle all important failures gracefully.

Examples:

- missing API key
- invalid API key
- API quota exceeded
- network failure
- route unavailable
- invalid origin
- invalid destination
- location permission denied
- geolocation timeout
- malformed API response
- provider error
- backend unavailable
- MongoDB unavailable where relevant

Never expose raw stack traces to users.

Never expose API keys.

Use human-readable messages.

Example:

"We couldn't calculate a route right now. Please check your locations and try again."

Provide retry actions where appropriate.

==================================================
21. DEMO / MOCK MODE
==================================================

Because this is a final-year student project and real-world data/API access may not always be available during demonstration:

Create a safe demo fallback.

Demo mode must:

- use deterministic data
- clearly identify itself as DEMO / PROTOTYPE
- never pretend to be live
- not affect production API behavior
- not require a real API key

The demo data should represent realistic:

- origin
- destination
- route
- distance
- duration
- transit mode
- transfers
- walking segment

Do not use random values every time because that makes testing difficult.

==================================================
22. FRONTEND ARCHITECTURE
==================================================

Keep the frontend modular.

Prefer reusable components such as:

MapView
LocationSearch
OriginSearch
DestinationSearch
CurrentLocationButton
SwapLocationsButton
RoutePanel
RouteCard
RouteAlternatives
MapControls
LoadingState
ErrorState

Only create components that are actually necessary.

Do not create unnecessary abstractions.

Use TypeScript properly.

Avoid:

any

unless absolutely unavoidable.

==================================================
23. BACKEND ARCHITECTURE
==================================================

Do not unnecessarily route every Google Maps operation through the backend.

Use the appropriate architecture based on API security requirements.

If server-side API calls are needed:

create clean controllers/services/routes.

Keep responsibilities separated:

routes
controllers
services
models
middleware
utils

Do not put business logic inside route definitions.

==================================================
24. DATABASE
==================================================

Do not add unnecessary database collections just for Phase 2.

Only persist information that is actually required.

If route history is intentionally included later, do not implement it prematurely unless the existing architecture requires a foundation for it.

Do not store sensitive API keys in MongoDB.

==================================================
25. ACCESSIBILITY PREPARATION
==================================================

TransitSwap will eventually become accessibility-first.

Phase 2 should therefore keep route data extensible for:

- wheelchair
- senior
- stroller
- luggage
- pregnancy / reduced mobility

But DO NOT claim that Phase 2 already solves complete accessibility-aware routing.

Preserve the Phase 1 accessibility profile and ensure the routing architecture can consume it later.

==================================================
26. RESPONSIVE DESIGN
==================================================

The complete Maps & Routing interface must work on:

- desktop
- laptop
- tablet
- mobile

Test:

approximately 320px width
approximately 375px width
approximately 768px width
desktop widths

Avoid:

- horizontal overflow
- overlapping map controls
- inaccessible buttons
- unreadable route cards
- broken search fields

==================================================
27. ACCESSIBILITY / UX
==================================================

Use:

- semantic HTML
- keyboard-friendly controls
- visible focus states
- accessible labels
- sufficient contrast
- proper button semantics
- meaningful error messages

Do not sacrifice usability for visual effects.

==================================================
28. PERFORMANCE
==================================================

Avoid unnecessary:

- API requests
- map reinitialization
- React rerenders
- duplicate autocomplete calls

Use debouncing where appropriate for search input.

Do not initialize the map repeatedly.

Do not make route requests on every keystroke.

Only calculate routes when valid origin and destination are selected.

==================================================
29. SECURITY
==================================================

Check the entire implementation for:

- exposed API keys
- secrets committed in source
- unsafe environment handling
- injection risks
- insecure API calls
- unnecessary sensitive data exposure

Never place secrets directly in:

React components
TypeScript source
JSON files
README
Git history

==================================================
30. CODE QUALITY
==================================================

Follow professional standards.

Use:

- meaningful names
- small reusable components
- typed API responses
- centralized error handling
- clean imports
- no unused imports
- no dead code
- no duplicated code
- no unnecessary console logs
- no commented-out abandoned implementations

Do not rewrite working code merely to make it look different.

==================================================
31. DO NOT IMPLEMENT THESE IN PHASE 2
==================================================

These are intentionally reserved for future phases:

DO NOT implement yet:

- machine-learning learned route weights
- preference-learning model
- RankNet
- logistic preference model
- Monte Carlo connection-risk model
- confidence intervals
- deadline-first arrival prediction
- full crowd prediction
- EWMA crowd prediction
- weather-aware intelligence
- advanced accessibility graph
- accessibility crowdsourcing
- safety routing
- fare optimization
- sustainability optimization
- advanced AI route ranking
- digital twin
- IoT passenger counting
- LSTM
- reinforcement learning
- blockchain
- event prediction
- city-scale live data

Do not turn Phase 2 into the entire project.

Phase 2 is the stable Maps + Routing foundation upon which these future features will be built.

==================================================
32. TESTING — MANDATORY
==================================================

After implementation, do not simply say "done."

Actually inspect and test the implementation.

Check:

Frontend:
- npm install
- npm run build
- npm run dev

Backend:
- npm install
- npm run build
- npm run dev

Use the project's ACTUAL package scripts.

If scripts do not exist, inspect package.json and use the appropriate existing commands.

Test:

1. Application loads.
2. Login works.
3. Registration works.
4. Protected routes work.
5. Map loads.
6. Current location works where browser permissions allow.
7. Manual origin search works.
8. Manual destination search works.
9. Origin marker appears.
10. Destination marker appears.
11. Swap works.
12. Route calculation works.
13. Route polyline appears.
14. Distance appears.
15. Duration appears.
16. Alternative route selection works where available.
17. Loading state appears.
18. Errors are handled.
19. Demo mode works without API credentials.
20. No API key is exposed.
21. Existing Phase 1 features still work.
22. Desktop layout works.
23. Mobile layout works.
24. Browser console has no avoidable errors.
25. Backend has no avoidable runtime errors.

==================================================
33. BUILD / TYPE / LINT VERIFICATION
==================================================

Before considering Phase 2 complete:

Run the available:

- TypeScript checks
- production build
- lint
- tests

Fix actual errors.

Do NOT hide errors by:

- disabling TypeScript
- using @ts-ignore everywhere
- setting everything to any
- removing failing functionality
- suppressing lint globally
- commenting out broken code

If an external API cannot be tested because credentials are unavailable, verify the mock/demo path and clearly report that live API verification requires credentials.

==================================================
34. FINAL CODE AUDIT
==================================================

After implementation perform a final repository audit.

Check for:

- broken imports
- circular dependencies
- unused files
- duplicate components
- unused dependencies
- missing dependencies
- incorrect environment variables
- hardcoded credentials
- incorrect API endpoints
- incorrect TypeScript types
- broken routes
- console errors
- UI overflow
- missing loading states
- missing error states
- broken fallback behavior

Clean only what is safe to clean.

==================================================
35. IMPORTANT GIT RULE
==================================================

The current branch is:

phase-2-maps-routing

DO NOT switch to main.

DO NOT modify main.

DO NOT reset or delete branches.

DO NOT run destructive Git commands.

DO NOT execute:

git reset --hard
git clean -fd
git push --force
git branch -D

Do not modify Git history.

You are allowed to modify project files only.

DO NOT commit automatically unless explicitly requested.

==================================================
36. FINAL REPORT
==================================================

When finished, provide a clear report with:

A. Files created
B. Files modified
C. Features implemented
D. Features intentionally not implemented because they belong to later phases
E. APIs integrated
F. Environment variables required
G. Demo/mock mode instructions
H. Commands to run frontend
I. Commands to run backend
J. Build result
K. TypeScript result
L. Lint result
M. Tests performed
N. Any remaining issues
O. Exact manual testing steps
P. Exact Git commands I should execute next

Do not claim something is working if you could not verify it.

If something cannot be verified, explicitly say:

"NOT VERIFIED — REQUIRES LOCAL TESTING"

==================================================
37. DEFINITION OF DONE
==================================================

Phase 2 is considered COMPLETE only if:

✓ Phase 1 still works
✓ Interactive map works
✓ Location search works
✓ Current location works
✓ Origin selection works
✓ Destination selection works
✓ Swap works
✓ Route calculation works
✓ Route visualization works
✓ Route summary works
✓ Alternative routes work where provider supports them
✓ Transit foundation is extensible
✓ Last-mile foundation is extensible
✓ Demo mode works
✓ API credentials are protected
✓ Loading states work
✓ Error states work
✓ Responsive design works
✓ TypeScript has no avoidable errors
✓ Production build succeeds
✓ No avoidable console errors
✓ No Phase 1 regression
✓ Code is clean and modular
✓ Documentation is updated
✓ No future-phase features are falsely claimed as implemented

==================================================
38. MOST IMPORTANT INSTRUCTION
==================================================

DO NOT rush.

Do not implement everything blindly in one giant rewrite.

Work systematically:

INSPECT
↓
PLAN
↓
IMPLEMENT
↓
TYPE CHECK
↓
BUILD
↓
TEST
↓
FIX
↓
RECHECK
↓
FINAL AUDIT

If you encounter an existing implementation that already satisfies a requirement, KEEP IT and integrate with it.

If you encounter a conflict between this prompt and the existing codebase, prefer preserving working Phase 1 functionality and explain the conflict rather than destroying existing code.

If a required API is unavailable, implement a clean abstraction and deterministic DEMO fallback rather than inventing live data.

If you discover a potentially breaking change, stop and explain it before making a destructive change.

Do not claim 100% success without verification.

The final objective is:

A professional, clean, stable, production-structured Phase 2 Maps & Routing foundation for TransitSwap that preserves Phase 1 and is ready for the later intelligent mobility features.

START NOW BY INSPECTING THE EXISTING REPOSITORY.
DO NOT WRITE CODE UNTIL YOU HAVE UNDERSTOOD THE EXISTING ARCHITECTURE.