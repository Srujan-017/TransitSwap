You are working on my existing TransitSwap final-year engineering project.

IMPORTANT:
Do NOT rebuild the project from scratch.
Do NOT redesign the UI.
Do NOT change the existing color scheme, layout, architecture, folder structure, or project roadmap unless absolutely required.
Do NOT implement Phase 2+ functionality yet.
We are currently FINALIZING PHASE 1 only.

First inspect the entire existing repository carefully:
- frontend source
- backend source
- package.json files
- tsconfig files
- routes
- controllers
- services
- middleware
- models
- authentication
- API services
- React context
- pages
- README
- test-auth-chain.sh
- environment configuration

Then fix ALL of the following issues in one pass.

==================================================
1. CREATE backend/.env.example
==================================================

Create:

backend/.env.example

with safe placeholder values such as:

PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

NEVER put a real MongoDB password, API key, JWT secret, or other secret into this file.

Ensure .gitignore continues to ignore actual .env files.

==================================================
2. STANDARDIZE DOCUMENTATION ON NPM
==================================================

The project should use npm consistently unless there is an existing technical reason not to.

Update README commands from pnpm to npm where appropriate.

Frontend:

npm install
npm run dev

Backend:

cd backend
npm install
npm run dev

Do not introduce unnecessary package-manager changes.

==================================================
3. FIX README ACCURACY
==================================================

Review README.md completely.

Do not claim that tests/builds passed unless the repository can reproduce those results.

Replace statements such as:

"npx tsc → compiles all 15 source files to dist/ with 0 errors"

with reproducible instructions such as:

"Run npm run build inside backend to verify the TypeScript build."

Clearly distinguish:

✅ Implemented in Phase 1
🟡 Demo/prototype data
🔜 Planned for later phases

Make sure the README accurately reflects the CURRENT implementation.

Do not claim that AI/ML, TransitDNA learning, real route optimization, live transit data, live crowd prediction, weather intelligence, reliability prediction, or accessibility intelligence are already implemented.

==================================================
4. FIX THE TEST SCRIPT
==================================================

Review:

backend/test-auth-chain.sh

Make the automated test robust and professional.

It must verify ACTUAL HTTP STATUS CODES, not merely whether "success":false appears.

Expected status codes:

Validation failure:
POST /api/auth/register
→ HTTP 400

Successful registration:
POST /api/auth/register
→ HTTP 201

Duplicate registration:
POST /api/auth/register
→ HTTP 409

Successful login:
POST /api/auth/login
→ HTTP 200

Wrong password:
POST /api/auth/login
→ HTTP 401

Valid /me:
GET /api/auth/me
→ HTTP 200

Missing token:
GET /api/auth/me
→ HTTP 401

Invalid token:
GET /api/auth/me
→ HTTP 401

Also verify:
- success field
- token exists where expected
- returned email is correct
- accessibilityProfile is preserved
- password is NOT returned
- validation errors contain field-level errors
- duplicate email produces a meaningful error

Use a reliable HTTP-status extraction method with curl.

Do not make the script falsely report PASS.

If a prerequisite test fails, dependent tests should either fail clearly or be skipped with an explanation.

At the end print a clear summary:

PASSED: X
FAILED: Y

and:

PHASE 1 AUTH CHAIN: ALL TESTS PASSED

only when every required test actually passed.

==================================================
5. FIX BACKEND VALIDATION CONSISTENCY
==================================================

Review:

backend/src/routes/auth.routes.ts
backend/src/middleware/validate.ts
backend/src/models/User.ts

Ensure validation is consistent.

Registration:
name:
- required
- trimmed
- minimum 2 characters
- maximum 60 characters

email:
- required
- valid email
- normalized

password:
- required
- minimum 8 characters

accessibilityProfile:
- optional
- must belong to the allowed profile list

Login:
email:
- required
- valid email
- normalized

password:
- required

Do not duplicate unnecessary validation logic across layers, but maintain database-level validation as the final safety layer.

==================================================
6. REMOVE UNNECESSARY "as any"
==================================================

Review TypeScript code for unnecessary "as any", especially:

getMe as any

Replace it with proper TypeScript typing.

Keep strict TypeScript enabled.

Do not weaken TypeScript strictness.

Do not add @ts-ignore or @ts-nocheck.

==================================================
7. FIX JWT SECRET PRODUCTION SAFETY
==================================================

Keep development fallback behavior if useful for local development.

However:

If NODE_ENV === "production" and JWT_SECRET is missing or clearly using the development fallback, the backend should fail fast with a clear configuration error.

Do not expose secrets in logs.

Do not hardcode a real secret.

==================================================
8. DO NOT IMPLEMENT FUTURE PHASE FEATURES
==================================================

Do NOT implement these now:

- Google Maps integration
- live geolocation
- real route generation
- real multimodal routing
- MongoDB trip history
- weather API
- accessibility routing engine
- surveyed accessibility dataset
- crowd intelligence
- TransitDNA learning model
- learned preference weights
- reliability engine
- missed connection prediction
- confidence interval prediction
- smart departure time
- feedback learning
- analytics
- deployment

Those belong to later phases.

Only fix Phase 1 foundation and make the existing demo/prototype behavior honest.

==================================================
9. FIX DEMO CLAIMS IN PLANTRIP PAGE
==================================================

The current PlanTripPage uses hard-coded DEMO_ROUTES and simulated loading.

KEEP the demo routes.

KEEP the current UI.

KEEP the prototype behavior.

But do not label fake/hard-coded results as "Live Analysis".

Replace misleading wording such as:

"Live Analysis"

with something clearly indicating:

"Demo Analysis"
or
"Prototype Analysis"

Also ensure the page clearly indicates that the current route results are demonstration data and are not real-time Google Maps/transit results.

Do not claim that the route recommendation algorithm is already running if it is not.

==================================================
10. FIX PHASE DESCRIPTION CONSISTENCY
==================================================

Ensure the Plan Trip page and README use consistent roadmap terminology.

Current roadmap:

Phase 1 — MERN Foundation + Authentication
Phase 2 — Location & Map System
Phase 3 — Multimodal Route Generation
Phase 4 — Database & Demo Dataset
Phase 5 — Weather Intelligence
Phase 6 — Accessibility Intelligence
Phase 7 — Accessibility Dataset
Phase 8 — Crowd Intelligence
Phase 9 — TransitDNA
Phase 10 — Initial Recommendation Engine
Phase 11 — Reliability Engine
Phase 12 — Missed Connection Prediction
Phase 13 — Arrival Confidence Intervals
Phase 14 — Smart Departure Time
Phase 15 — Feedback Loop
Phase 16 — User Dashboard & Analytics
Phase 17 — Testing & Evaluation
Phase 18 — Deployment

Do not incorrectly state that Google Maps/live transit integration is implemented in Phase 1.

Use "planned for Phase 2/3" where appropriate.

==================================================
11. FIX PROFILE PAGE HONESTY
==================================================

ProfilePage currently allows users to edit:
- name
- email
- accessibility profile
- preferred mode
- walking tolerance
- priority

but Phase 1 does not yet persist these changes through a backend user-preferences API.

DO NOT implement the future API now.

Instead make the UI completely honest.

Clearly show that preference saving is currently prototype/local-state behavior and server persistence will be added in a later phase.

Do not tell the user that MongoDB has been updated when it has not.

Do not make fake API calls.

Do not modify the Phase 1 architecture unnecessarily.

==================================================
12. FIX TRANSITDNA CLAIMS
==================================================

The User model may contain:

transitDNA
learnedWeights
totalTrips
etc.

KEEP this database foundation.

But do NOT claim that TransitDNA is currently learning user preferences.

The UI and README should say:

"TransitDNA data structure is initialized. Preference learning will be implemented in Phase 9."

Do not call the current static/default weights "AI-generated" or "learned".

==================================================
13. REVIEW TRIP SERVICE PLACEHOLDERS
==================================================

The frontend may contain:

/trips/search
/trips/history
/trips/save

These endpoints are future functionality.

KEEP the service definitions if they are useful for future architecture.

Do NOT create fake backend endpoints merely to make the UI appear functional.

Do NOT call those endpoints during Phase 1.

Ensure comments clearly explain that these APIs will be activated in their planned future phases.

==================================================
14. REVIEW FRONTEND TYPES
==================================================

Keep future-facing TypeScript types if they support the planned architecture.

But make sure no Phase 1 UI claims that future fields such as:

arrivalConfidence
transferRisk
reliabilityScore
weatherImpact
accessibilityScore

are produced by a real intelligence engine.

Demo values must be clearly labelled as demo/prototype values.

==================================================
15. SECURITY REVIEW
==================================================

Check that:

- passwords are bcrypt hashed
- passwords are never returned in JSON
- JWT is required for /api/auth/me
- invalid JWT is rejected
- missing JWT is rejected
- .env is ignored
- no secrets are committed
- CORS is configured
- rate limiting remains enabled
- JSON request size limits remain
- errors do not expose sensitive information
- production JWT configuration is safe

Do not replace localStorage JWT authentication with a completely different architecture during Phase 1.

==================================================
16. BACKEND BUILD
==================================================

Run/verify TypeScript compilation using the existing backend configuration.

Do not hide errors.

Do not disable strict mode.

Do not use:
- @ts-ignore
- @ts-nocheck
- any
- disabling compiler checks

unless there is a genuinely unavoidable case, and if one exists, explain it.

==================================================
17. FRONTEND BUILD
==================================================

Verify the frontend builds successfully using:

npm run build

Fix any actual TypeScript/build errors.

Do not alter the UI unnecessarily.

==================================================
18. REVIEW ROUTING
==================================================

Verify:

/
→ Landing

/login
→ guest-only

/register
→ guest-only

/dashboard
→ authenticated

/plan
→ authenticated

/profile
→ authenticated

/history
→ authenticated

unknown route
→ 404 page

Ensure protected routes cannot be accessed when unauthenticated.

Ensure authenticated users are redirected appropriately from guest-only pages.

==================================================
19. REVIEW AUTHENTICATION FLOW
==================================================

Verify:

Register
→ backend validation
→ bcrypt hashing
→ MongoDB
→ JWT
→ frontend storage
→ authenticated state

Login
→ backend validation
→ password verification
→ JWT
→ authenticated state

Refresh
→ stored token
→ /api/auth/me
→ restore authenticated user

Logout
→ token removed
→ user removed
→ protected routes inaccessible

Invalid/expired token
→ remove local token
→ return to unauthenticated state

Do not break this existing flow.

==================================================
20. REVIEW API ERROR HANDLING
==================================================

Make sure all backend failures produce consistent JSON:

{
  "success": false,
  "message": "..."
}

Validation errors may additionally include:

{
  "errors": {
    "field": "message"
  }
}

Keep centralized error handling.

==================================================
21. DO NOT CHANGE PROJECT SCOPE
==================================================

This is Phase 1.

Do not start implementing Phase 2.

Do not add:
- Google Maps
- geolocation
- route engine
- weather
- crowds
- ML
- accessibility graph
- recommendation engine

The goal is to make Phase 1 stable, clean, honest, secure, testable, and professional.

==================================================
22. FINAL VERIFICATION
==================================================

After making all fixes:

1. Run frontend build.
2. Run backend TypeScript build.
3. Check for TypeScript errors.
4. Check for lint/format issues if configured.
5. Verify no secrets are present.
6. Verify backend/.env.example exists.
7. Verify README commands are correct.
8. Verify README doesn't claim future functionality is already implemented.
9. Verify test-auth-chain.sh checks actual HTTP status codes.
10. Verify authentication flow.
11. Verify protected routes.
12. Verify demo data is clearly labelled.
13. Verify no future-phase API calls are accidentally executed.
14. Verify no unnecessary files were created.
15. Verify no existing UI design was unnecessarily changed.

==================================================
IMPORTANT OUTPUT REQUIREMENT
==================================================

After fixing everything, DO NOT simply say "done".

Give me a concise final report containing:

A. Files changed
B. Problems fixed
C. Any remaining genuine issues
D. Frontend build result
E. Backend build result
F. Authentication test result
G. Whether Phase 1 is ready to freeze
H. Anything I personally need to test manually

Do not fabricate test results.

If you cannot execute a particular test, explicitly say:

"Not executed — requires local environment/runtime."

Do not claim that a test passed unless you actually ran it.

Most importantly:
PRESERVE THE CURRENT TRANSITSWAP UI, DESIGN, ARCHITECTURE, AND PHASE 1 SCOPE.
Only make the corrections described above.