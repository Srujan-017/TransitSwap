You are working on my TransitSwap final-year engineering project.

IMPORTANT:
This is the FINAL Phase 1 cleanup and verification.

Your job is to inspect the ENTIRE existing repository, fix every remaining Phase 1 issue listed below, verify the project as far as the environment allows, and leave the project in a clean, stable, professional state READY TO BEGIN PHASE 2.

DO NOT implement Phase 2.

DO NOT add new project features.

DO NOT redesign the UI.

DO NOT change the existing design system, colors, layout, pages, routing, architecture, folder structure, or roadmap unless specifically required by the fixes below.

DO NOT rewrite working code unnecessarily.

DO NOT fabricate test/build results.

If something cannot be verified because of the environment, clearly report it instead of pretending it passed.

============================================================
PROJECT
============================================================

Project name:
TransitSwap

Current stage:
PHASE 1 — Project Foundation + Authentication

Phase 1 purpose:

Frontend foundation:
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios

Backend foundation:
- Node.js
- Express.js
- TypeScript
- REST API
- Controllers
- Routes
- Services
- Middleware

Database foundation:
- MongoDB
- Mongoose
- MongoDB Atlas configuration

Authentication:
- Registration
- Login
- bcrypt password hashing
- JWT authentication
- Protected /me endpoint
- Validation
- Error handling
- Rate limiting
- CORS

Prototype UI:
- Dashboard
- Profile
- Plan Trip
- History
- Prototype route results
- Accessibility profile foundation
- TransitDNA foundation

============================================================
CRITICAL RULE
============================================================

FIRST inspect the entire repository.

Do not blindly modify files.

Understand the existing implementation and preserve everything that is already correct.

Then make ONLY the required changes.

============================================================
FIX #1 — CREATE backend/.env.example
============================================================

Create:

backend/.env.example

with exactly this type of structure:

PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_development_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

IMPORTANT:

- Never put real credentials in .env.example.
- Never put a real MongoDB password in the repository.
- Never put a real JWT secret in the repository.
- Keep actual .env files ignored by Git.
- Do not expose secrets in source code or logs.

Verify .gitignore protects:

.env
.env.*
!.env.example

If the existing .gitignore already safely handles this, do not unnecessarily modify it.

============================================================
FIX #2 — REMOVE ALL UNNECESSARY `any`
============================================================

Perform a complete TypeScript search through the project.

Look specifically for:

as any
:any
@ts-ignore
@ts-nocheck

Do NOT blindly remove legitimate third-party typing workarounds if truly necessary.

But fix the known issue in:

src/pages/RegisterPage.tsx

The current code contains something similar to:

accessibilityProfile: form.accessibilityProfile as any

Do NOT leave this unnecessary `as any`.

Create/use the correct TypeScript type for accessibilityProfile so the object is type-safe.

Also verify the previously fixed backend route remains:

router.get("/me", requireAuth, getMe)

and does NOT contain:

getMe as any

Do not replace `any` with @ts-ignore.

The goal is strict, clean TypeScript.

============================================================
FIX #3 — VALIDATION CONSISTENCY
============================================================

Review frontend validation, backend Express validation, and Mongoose validation.

For user registration name:

Minimum:
2 characters

Maximum:
60 characters

The Express validator and Mongoose model must agree.

Do not weaken the database validation.

Verify other registration fields are also validated correctly.

Do not introduce validation that conflicts with the current project requirements.

============================================================
FIX #4 — PRODUCTION JWT SECURITY
============================================================

Review:

backend/src/config/env.ts

Development may continue using the existing development fallback if the project currently requires it.

BUT production must NEVER silently use a development fallback JWT secret.

Required behavior:

If:

NODE_ENV=production

and JWT_SECRET is:

- missing
OR
- empty
OR
- equal to the development fallback

then the application must fail fast with a clear error.

Do not log the actual secret.

Do not hardcode a production secret.

Development behavior may remain convenient.

Production behavior must be secure.

============================================================
FIX #5 — PLAN TRIP MUST BE HONEST ABOUT DEMO DATA
============================================================

The current Phase 1 route results are prototype/demo data.

Do NOT claim that live routing intelligence is implemented.

The UI must use:

Prototype Analysis

NOT:

Live Analysis

Do not implement Google Maps or real route generation now.

Do not implement weather intelligence now.

Do not implement crowd prediction now.

Do not implement the accessibility engine now.

Do not implement reliability prediction now.

Do not implement TransitDNA learning now.

These belong to future phases.

============================================================
FIX #6 — DEMO LOADING MESSAGES MUST BE HONEST
============================================================

Do not display messages that falsely imply real backend intelligence is running.

Avoid messages such as:

Fetching live candidate routes...
Analyzing live weather...
Calculating live reliability...
Predicting live crowd...
etc.

Use honest Phase 1 prototype wording such as:

Preparing demonstration routes...
Applying prototype accessibility preferences...
Generating sample route comparison...
Preparing prototype recommendation...

Keep the existing visual design and loading animation.

Do not change the UI unnecessarily.

============================================================
FIX #7 — README MUST BE ACCURATE
============================================================

Review the entire README.

Remove any statement that claims a build/test passed unless the build/test was actually executed and verified.

If README currently says something like:

"npx tsc compiles all files with 0 errors"

do NOT present that as a permanent guaranteed fact.

Instead document reproducible commands such as:

Frontend:

pnpm install
pnpm build

Backend:

cd backend
npm install
npm run build

If the project actually uses a different existing package-manager convention, preserve the existing convention rather than unnecessarily changing package managers.

============================================================
FIX #8 — AUTH TEST SCRIPT
============================================================

Review:

backend/test-auth-chain.sh

It MUST verify actual HTTP status codes, not merely search for:

"success": false

The authentication test must check the HTTP response status AND response body.

Required checks:

1. Invalid registration
Expected HTTP:
400

2. Health endpoint
Expected HTTP:
200

3. Successful registration
Expected HTTP:
201

4. Duplicate email
Expected HTTP:
409

5. Successful login
Expected HTTP:
200

6. Wrong password
Expected HTTP:
401

7. Valid authenticated /me
Expected HTTP:
200

8. Missing token
Expected HTTP:
401

9. Invalid token
Expected HTTP:
401

The test must verify:

- registration succeeds
- registration returns JWT
- accessibility profile is preserved
- password is NOT returned
- duplicate email is rejected
- login succeeds
- login returns JWT
- wrong password is rejected
- /me returns the expected authenticated user
- /me does not expose password
- missing token is rejected
- invalid token is rejected
- validation errors are correctly returned

If registration fails, do not blindly continue with an empty token.

The script must clearly print PASS/FAIL for each check.

At the end print a summary such as:

PASSED: X
FAILED: Y

Only print:

PHASE 1 AUTH CHAIN: ALL TESTS PASSED

when every required test actually passes.

Do not fake results.

============================================================
FIX #9 — PROFILE PAGE HONESTY
============================================================

Keep the current Phase 1 behavior:

User preferences/profile data can be stored locally/session-side as currently implemented.

If the UI says persistent backend saving will be implemented later, keep that wording.

DO NOT implement:

PUT /api/users/me

unless it already exists and is part of the current Phase 1 design.

Do not falsely claim that preferences are persisted to MongoDB if they are not.

============================================================
FIX #10 — TRANSITDNA HONESTY
============================================================

TransitDNA is currently only the foundation.

Keep it as a future intelligent preference-learning feature.

Do NOT claim that machine learning or actual preference learning is currently active.

It is acceptable for the database model to contain TransitDNA-related fields.

The actual learning algorithm belongs to a later phase.

============================================================
FIX #11 — DO NOT IMPLEMENT FUTURE FEATURES
============================================================

DO NOT implement any of the following now:

- Google Maps API
- Google Directions API
- real geolocation routing
- real multimodal route engine
- real metro routing
- real bus routing
- real walking routing
- auto routing
- bike routing
- real-time weather
- crowd prediction
- crowd intelligence
- accessibility graph
- physical station survey dataset
- learned preference weights
- machine learning ranking
- logistic regression
- RankNet
- TransitDNA learning
- reliability prediction
- confidence intervals
- missed-connection prediction
- Monte Carlo journey simulation
- user choice learning
- feedback learning
- analytics engine
- real-time transit APIs

These are Phase 2+ features.

Do not accidentally start Phase 2 while fixing Phase 1.

============================================================
FIX #12 — COMPLETE SECURITY REVIEW
============================================================

Search the entire repository for:

- API keys
- MongoDB passwords
- JWT secrets
- tokens
- credentials
- private URLs containing credentials
- committed .env files
- hard-coded production secrets

Ensure no real secrets are committed.

Check:

.gitignore

and ensure environment secrets are protected.

Do not delete legitimate example placeholders.

============================================================
FIX #13 — COMPLETE TYPESCRIPT REVIEW
============================================================

Search all source code for:

- TypeScript errors
- unused imports
- broken imports
- incorrect types
- unnecessary any
- @ts-ignore
- @ts-nocheck
- unreachable code
- obvious null/undefined issues

Fix only genuine issues.

Do not refactor working code unnecessarily.

============================================================
FIX #14 — COMPLETE API REVIEW
============================================================

Verify these endpoints remain correctly wired:

Authentication:

POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Health:

GET /api/health

Verify:

- correct HTTP methods
- correct status codes
- validation
- authentication middleware
- error handling
- JWT behavior
- password hashing
- password never returned
- duplicate email handling

Do not change the API design unnecessarily.

============================================================
FIX #15 — DATABASE REVIEW
============================================================

Verify the User model.

Ensure:

- name
- email
- password
- accessibilityProfile
- preferences
- transitDNA
- savedDestinations

remain correctly structured according to the existing project.

Ensure password is not selected/returned by default where intended.

Ensure password hashing occurs correctly.

Do not introduce unrelated schema changes.

============================================================
FIX #16 — FRONTEND ROUTING REVIEW
============================================================

Verify existing routes/pages work correctly.

Do not redesign them.

Check:

- navigation
- protected pages
- login flow
- registration flow
- logout flow
- authentication state
- profile page
- plan trip page
- history page
- dashboard
- error states
- loading states

Fix broken navigation only if found.

============================================================
FIX #17 — DO NOT CHANGE THE DESIGN
============================================================

IMPORTANT:

The existing TransitSwap UI is already approved for Phase 1.

DO NOT:

- redesign pages
- change color palette
- change typography unnecessarily
- change layouts
- replace components
- introduce a different CSS framework
- redesign navigation
- change the overall visual identity

Only change UI text when required to prevent false claims such as:

Live Analysis → Prototype Analysis

============================================================
PHASE 1 VERIFICATION
============================================================

After all fixes, perform a full static review.

Then, IF the environment allows it, run:

Frontend:

pnpm install
pnpm build

Backend:

cd backend
npm install
npm run build

Then start the backend:

npm run dev

Then execute the authentication test.

If the environment does NOT allow installation/build/testing:

DO NOT pretend that it passed.

Report:

NOT VERIFIED — environment limitation

instead.

============================================================
MANUAL TEST CHECKLIST
============================================================

Provide me a checklist I can manually execute:

1. Start MongoDB/Atlas connection
2. Start backend
3. Start frontend
4. Open application
5. Register new account
6. Verify registration
7. Login
8. Verify dashboard
9. Verify protected routes
10. Open profile
11. Verify accessibility profile
12. Open Plan Trip
13. Verify prototype route results
14. Verify Prototype Analysis label
15. Logout
16. Verify protected route cannot be accessed
17. Run authentication test script
18. Verify no password is shown
19. Verify no secrets are exposed

============================================================
GIT/GITHUB PREPARATION
============================================================

IMPORTANT:

Do NOT claim GitHub is configured unless you can actually verify it.

Do not invent:

- repository URL
- remote origin
- branch
- commit hash
- GitHub status

If Git is available and the user has already initialized a repository, inspect:

git status
git branch
git remote -v
git log --oneline --decorate -10

If no GitHub repository exists, DO NOT create or assume one without the user's explicit repository URL/account details.

Instead, provide the exact commands the user must execute.

The desired branch strategy is:

main
│
├── phase-1-foundation
│
└── later:
    phase-2-maps-routing
    phase-3-multimodal-routing
    phase-4-accessibility
    etc.

Before Phase 2, Phase 1 should be frozen as:

phase-1-foundation

and eventually merged into:

main

Recommended Phase 1 tag:

v0.1.0-phase-1

DO NOT create Phase 2 branch yet.

============================================================
FINAL QUALITY GATE
============================================================

Phase 1 can be declared READY only if:

[ ] .env.example exists
[ ] no real secrets committed
[ ] no unnecessary `any`
[ ] no @ts-ignore
[ ] validation is consistent
[ ] production JWT secret protection exists
[ ] demo UI is honest
[ ] README is accurate
[ ] authentication tests check real HTTP status codes
[ ] authentication flow is correctly implemented
[ ] password is protected
[ ] MongoDB model is correct
[ ] frontend routing works
[ ] backend routes work
[ ] frontend build verified OR clearly marked not verified
[ ] backend build verified OR clearly marked not verified
[ ] authentication test verified OR clearly marked not verified
[ ] no Phase 2 feature accidentally implemented
[ ] Phase 1 architecture remains clean
[ ] project is ready to freeze

============================================================
VERY IMPORTANT FINAL RULE
============================================================

DO NOT SAY:

"Everything is fixed"
"Phase 1 is complete"
"All tests passed"
"Build passed"

unless you actually verified it.

If something remains broken, explicitly tell me.

If everything is genuinely fixed and verified, clearly state:

PHASE 1 CODE REVIEW: PASSED

PHASE 1 BUILD: PASSED
(or NOT VERIFIED if environment prevents execution)

PHASE 1 AUTH TESTS: PASSED
(or NOT VERIFIED if environment prevents execution)

PHASE 1 SECURITY REVIEW: PASSED

PHASE 1 READY TO FREEZE: YES

PHASE 2 READY: YES

If anything fails, state exactly what failed and where.

============================================================
FINAL RESPONSE FORMAT
============================================================

After completing everything, give me:

1. SUMMARY OF CHANGES
2. FILES MODIFIED
3. BUGS FIXED
4. SECURITY CHECK
5. TYPESCRIPT CHECK
6. FRONTEND BUILD RESULT
7. BACKEND BUILD RESULT
8. AUTHENTICATION TEST RESULT
9. MANUAL TESTS I MUST PERFORM
10. GIT/GITHUB STATUS
11. REMAINING ISSUES
12. FINAL PHASE 1 VERDICT

Do not start Phase 2.

The only objective is:

MAKE PHASE 1 CLEAN, STABLE, HONEST, SECURE, TESTABLE, AND READY TO FREEZE BEFORE PHASE 2.