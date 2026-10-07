I have an existing TransitSwap final-year engineering project.

I have already completed Phase 1:
MERN foundation + authentication.

DO NOT rebuild the project.
DO NOT redesign the UI.
DO NOT change the existing visual design, colors, layout, architecture, folder structure, or roadmap.
DO NOT implement Phase 2 or any later phase.

Inspect the entire existing repository first and make ONLY the corrections below.

==================================================
1. CREATE backend/.env.example
==================================================

Create:

backend/.env.example

with:

PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_development_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

Do not put real secrets into this file.

Keep actual .env files ignored by git.

==================================================
2. FIX AUTH TEST SCRIPT TO CHECK REAL HTTP STATUS
==================================================

Review:

backend/test-auth-chain.sh

This is mandatory.

The current script checks only:
"success":false

That is NOT enough.

Modify it so it captures BOTH:
1. HTTP status code
2. response body

Use curl in a reliable way.

Required statuses:

Validation failure:
POST /api/auth/register
→ 400

Successful registration:
POST /api/auth/register
→ 201

Duplicate email:
POST /api/auth/register
→ 409

Successful login:
POST /api/auth/login
→ 200

Wrong password:
POST /api/auth/login
→ 401

Authenticated /me:
GET /api/auth/me
→ 200

Missing token:
GET /api/auth/me
→ 401

Invalid token:
GET /api/auth/me
→ 401

The script must NOT say PASS merely because success=false.

It must verify the actual HTTP status.

Also verify:
- registration returns JWT
- accessibilityProfile is preserved
- login returns JWT
- /me returns correct email
- password is never exposed
- validation returns field-level errors
- duplicate email returns expected error
- missing token is rejected
- invalid token is rejected

If registration fails, do not continue blindly with an empty TOKEN.

At the end print:

PASSED: X
FAILED: Y

and only print:

PHASE 1 AUTH CHAIN: ALL TESTS PASSED

when every required test actually passed.

==================================================
3. REMOVE `as any` FROM AUTH ROUTE
==================================================

Current code contains:

router.get("/me", requireAuth, getMe as any)

Do NOT use `as any`.

Do NOT use @ts-ignore.

Properly type the Express middleware/controller so this works:

router.get("/me", requireAuth, getMe)

Keep strict TypeScript enabled.

==================================================
4. FIX VALIDATION MAX LENGTH
==================================================

In:

backend/src/routes/auth.routes.ts

Registration name validation must enforce:

minimum 2
maximum 60

It should match the Mongoose model.

Do not weaken the Mongoose validation.

==================================================
5. FIX PRODUCTION JWT SECURITY
==================================================

In:

backend/src/config/env.ts

Development may use the existing fallback secret if necessary.

BUT:

If NODE_ENV=production and JWT_SECRET is missing or equals the development fallback, the application must fail fast with a clear error.

Do not expose the secret in logs.

Do not hardcode a production secret.

==================================================
6. FIX PLANTRIP DEMO LABEL
==================================================

PlanTripPage currently uses hard-coded DEMO_ROUTES.

It currently displays:

Live Analysis

This is misleading.

Change it to:

Prototype Analysis

or:

Demo Analysis

Prefer:

Prototype Analysis

Do not change the route UI design.

Do not implement real route generation yet.

==================================================
7. FIX MISLEADING DEMO LOADING TEXT
==================================================

The current loading messages imply that real engines are running:

Fetching candidate routes…
Checking accessibility data…
Analyzing weather impact…
Calculating reliability scores…

These are not real engines yet.

Replace them with honest prototype wording, for example:

Preparing demonstration routes…
Applying prototype accessibility preferences…
Generating sample route comparison…
Preparing prototype recommendation…

Keep the existing loading animation/design.

Do not implement weather, crowd, reliability, or route intelligence yet.

==================================================
8. FIX README BUILD CLAIM
==================================================

README currently claims:

"npx tsc → compiles all 15 source files to dist/ with 0 errors."

Remove this unverified claim.

Replace it with a reproducible instruction:

Backend TypeScript build:
cd backend
npm run build

Frontend build:
pnpm build

Do not claim that the builds passed unless they are actually executed successfully.

==================================================
9. DO NOT TOUCH THESE WORKING FEATURES
==================================================

Preserve:

- existing React UI
- Tailwind styling
- color scheme
- layouts
- routing
- authentication flow
- JWT
- bcrypt
- MongoDB model
- accessibility profile
- TransitDNA database foundation
- centralized error handler
- rate limiter
- CORS
- Axios layer
- ProfilePage local-save behavior
- demo routes
- Phase roadmap

Do not implement:
- Google Maps
- geolocation
- real route engine
- weather API
- crowd intelligence
- accessibility graph
- surveyed station dataset
- TransitDNA learning
- machine learning
- learned weights
- reliability engine
- confidence intervals
- missed connection prediction
- feedback learning
- analytics
- deployment

Those belong to future phases.

==================================================
10. VERIFY PROFILE PAGE REMAINS HONEST
==================================================

Keep the current wording that preferences are stored locally/session-only.

Do NOT implement PUT /api/users/me yet.

Do not pretend MongoDB was updated.

==================================================
11. VERIFY TRANSITDNA REMAINS HONEST
==================================================

Keep TransitDNA as a database foundation.

Do NOT claim that actual preference learning is active.

The learning algorithm belongs to Phase 9.

==================================================
12. FINAL STATIC REVIEW
==================================================

After changes, inspect the complete repository for:

- TypeScript errors
- unnecessary any
- @ts-ignore
- @ts-nocheck
- hard-coded secrets
- accidentally committed .env files
- broken imports
- broken routes
- inconsistent validation
- misleading claims
- future functionality accidentally presented as implemented

Do not make unrelated changes.

==================================================
13. RUN BUILDS IF THE ENVIRONMENT ALLOWS
==================================================

Run:

pnpm build

for frontend.

Then:

cd backend
npm run build

for backend.

If dependencies are not installed or the environment prevents execution, do NOT fabricate results.

Clearly report:

NOT EXECUTED — requires local environment

instead.

==================================================
14. FINAL REPORT
==================================================

After completing the changes, report:

A. Every file changed
B. Every issue fixed
C. Any remaining issue
D. Frontend build result
E. Backend build result
F. Authentication test result
G. Whether Phase 1 is ready to freeze
H. What I must manually test

Do not claim anything passed unless you actually verified it.

The goal is:
Phase 1 = stable + clean + professional + honest + testable.

Do NOT move into Phase 2.