🚍 TransitSwap — PHASE 1 COMPLETE PLAN
1. What Phase 1 actually accomplishes

At the end of Phase 1, we want this:

                    TRANSITSWAP
                         │
          ┌──────────────┴──────────────┐
          │                             │
       FRONTEND                       BACKEND
       React + TS                    Node + Express
          │                             │
          │                         REST API
          │                             │
          └──────────────┬──────────────┘
                         │
                      MongoDB
                         │
                    MongoDB Atlas

And the application should already have:

Professional TransitSwap UI foundation
Responsive layout
Navigation
React routing
Frontend/backend separation
API communication
MongoDB connection
Mongoose models
Environment variables
Proper project structure
Error handling foundation
Loading states
Basic authentication foundation
Git/GitHub-ready structure

But no advanced route recommendation yet.

2. Technology stack for Phase 1

We will use:

Frontend
React
TypeScript
Vite
Tailwind CSS
React Router
Axios
Lucide React or another consistent icon library
Backend
Node.js
Express.js
TypeScript
REST API
CORS
dotenv
Database
MongoDB
MongoDB Atlas
Mongoose
Development tools
VS Code
Git
GitHub
Postman/Thunder Client
npm
Later phases

We will eventually add:

Google Maps / Directions
Weather API
Accessibility data
Crowd data
Route scoring
Preference learning
Confidence prediction
Missed-connection prediction

Do not add those to Phase 1.

3. First decision — project architecture

I strongly recommend this structure:

TransitSwap/
│
├── frontend/
│
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── routes/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   │
│   ├── package.json
│   └── ...
│
├── backend/
│
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── package.json
│   └── ...
│
├── .gitignore
├── README.md
└── package.json

This is better than putting everything directly into one folder.

It gives us room to expand the project without turning it into a mess.

4. Frontend setup

We start by creating the React application.

Use:

React
+
TypeScript
+
Vite

Why?

Because this gives us a modern, fast development environment and TypeScript helps us prevent many mistakes as the project grows.

The frontend will eventually handle:

User
 ↓
UI
 ↓
Route search
 ↓
Route recommendations
 ↓
Accessibility
 ↓
Weather
 ↓
Crowd information
 ↓
Journey details

But in Phase 1 it will only establish the foundation.

5. Tailwind CSS

We will configure Tailwind CSS.

This will allow us to build the interface consistently.

Instead of randomly writing styles everywhere, we'll establish a design system.

For example:

Primary
Secondary
Background
Surface
Text
Muted Text
Border
Success
Warning
Danger
Important

We should not blindly copy the exact colours from the Behance project.

We'll take inspiration from its visual style and create a TransitSwap-specific palette.

The goal is:

Inspired by Smart Transit, but clearly branded as TransitSwap.

6. TransitSwap design system

Before creating many screens, we should establish:

Typography

For example:

Heading
Subheading
Body
Caption
Button
Spacing

Use consistent spacing rather than:

margin: 13px
margin: 27px
margin: 19px
margin: 41px

Instead use a consistent spacing scale.

Border radius

Use a consistent radius for:

cards
buttons
inputs
modals
Shadows

Use subtle shadows rather than heavy effects.

Icons

Use one icon family consistently.

Buttons

Define:

Primary Button
Secondary Button
Outline Button
Danger Button
Icon Button

This is what makes the application feel like a real product rather than a collection of student pages.

7. Basic frontend pages

In Phase 1, we'll create the structural pages.

Public pages
/
├── Landing/Home
├── Login
└── Register
Application pages
/dashboard
/plan-trip
/history
/profile

We don't need to make all of these fully functional yet.

We are establishing the UI architecture.

8. Navigation

We need a professional navigation system.

Something conceptually like:

TransitSwap

Home
Plan Trip
History
Accessibility
Profile

Later we'll add:

Reports
Saved Places
Analytics

But don't overload the navbar now.

9. Dashboard

The Phase 1 dashboard should already look professional.

Something like:

┌─────────────────────────────────────────────┐
│ TransitSwap             Profile   Settings │
├─────────────────────────────────────────────┤
│                                             │
│ Good morning!                               │
│ Where would you like to go?                 │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📍 Current location                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🎯 Destination                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│             [ Plan My Journey ]             │
│                                             │
├─────────────────────────────────────────────┤
│ Recent journeys                             │
│                                             │
│ MG Road → DBIT                              │
│ Bengaluru → Majestic                        │
└─────────────────────────────────────────────┘

The actual intelligent recommendations don't exist yet.

10. Plan Trip page

We should create the foundation for our most important page.

The UI will eventually become:

Origin
     ↓
Destination
     ↓
Accessibility profile
     ↓
Travel preferences
     ↓
Find routes

Phase 1 only creates the interface.

Later phases will connect the actual routing engine.

11. Accessibility profile foundation

Because accessibility is going to be one of TransitSwap's main differentiators, we should establish its data structure early.

Possible options:

Standard
Wheelchair
Senior Citizen
Stroller
Luggage
Reduced Mobility

For example:

Accessibility Preference

○ Standard
○ Wheelchair
○ Senior
○ Stroller
○ Heavy Luggage

Important: We're not implementing accessibility routing in Phase 1.

We're just preparing the system so Phase 3/4 can use these preferences.

12. Backend setup

Now we create:

Node.js
+
Express.js
+
TypeScript

The backend will eventually become the brain connecting:

Frontend
   ↓
Express API
   ↓
Route Engine
   ↓
Google Maps
   ↓
Weather API
   ↓
Accessibility Database
   ↓
Crowd Database
   ↓
MongoDB

But Phase 1 establishes only the API foundation.

13. Express server

We'll create a clean Express application.

Conceptually:

Request
   ↓
Express
   ↓
Middleware
   ↓
Route
   ↓
Controller
   ↓
Service
   ↓
Database
   ↓
Response

This separation is important.

Don't put all business logic inside server.js.

14. API structure

We will establish API routes such as:

/api/auth
/api/users
/api/trips
/api/accessibility

Later:

/api/routes
/api/weather
/api/crowd
/api/reports
/api/preferences

Again, Phase 1 doesn't need all of them to be functional.

15. Health-check API

Our first backend endpoint should be extremely simple:

GET /api/health

It should return something like:

{
  "success": true,
  "message": "TransitSwap API is running"
}

This gives us a simple way to confirm that our backend works.

16. MongoDB Atlas

Then we create the MongoDB database.

The structure will eventually contain collections such as:

users
trips
routes
accessibilityReports
stations
crowdReports
weatherData
preferences
journeyHistory

But initially we don't need all of them.

Phase 1 can start with:

users

and perhaps:

trips

as a foundation.

17. Mongoose

Mongoose will allow us to define schemas.

For example:

User
│
├── name
├── email
├── password
├── accessibilityProfile
├── preferences
└── createdAt

Later:

Trip
│
├── origin
├── destination
├── selectedRoute
├── travelTime
├── cost
├── accessibility
└── createdAt
18. Environment variables

This is extremely important.

Never put secrets directly into GitHub.

We'll have:

frontend/.env
backend/.env

For example:

MONGODB_URI=...
PORT=5000

Later:

GOOGLE_MAPS_API_KEY=...
WEATHER_API_KEY=...
JWT_SECRET=...

And:

.env

must be included in:

.gitignore
19. Frontend ↔ Backend connection

Now we connect React to Express using Axios.

Conceptually:

React
   │
   │ Axios
   ↓
Express API
   │
   ↓
MongoDB

We'll create:

frontend/src/services/api.ts

instead of scattering Axios calls throughout components.

That's a professional practice.

20. Authentication foundation

Phase 1 should establish basic authentication.

The workflow:

Register
   ↓
Backend validates information
   ↓
Password securely hashed
   ↓
User stored in MongoDB
   ↓
Login
   ↓
Authentication token/session
   ↓
Protected pages

We can use JWT-based authentication.

However, don't spend weeks building elaborate authentication.

It's infrastructure, not the main research contribution.

21. Error handling

We should establish a centralized backend error handler.

Instead of every controller doing completely different things:

Controller
   ↓
Error
   ↓
Central error middleware
   ↓
Consistent response

Example:

{
  "success": false,
  "message": "Something went wrong"
}
22. Loading states

The frontend should never look broken while waiting for an API.

For example:

Loading...

or skeleton UI.

Later, when Google Maps or the route engine takes time:

Finding the best route...
Analyzing accessibility...
Checking weather...
Calculating reliability...

That will become important in later phases.

23. Responsive design

The interface should work on:

Desktop
Laptop
Tablet
Mobile

Because your project is a web application.

Don't design only for your laptop screen.

24. Git/GitHub

From Day 1, maintain Git properly.

Suggested workflow:

main
 │
 └── development
       │
       ├── feature/frontend
       ├── feature/backend
       └── feature/database

For a student team, even a simpler workflow is enough:

main
development
feature/*

Commit meaningful changes:

feat: initialize React frontend
feat: configure Express backend
feat: connect MongoDB Atlas
feat: add authentication foundation
style: establish TransitSwap design system

Avoid:

final
final2
final-final
final-working
final-real

😂

25. Phase 1 folder responsibility

This is important.

components/

Reusable UI:

Navbar
Button
Input
Card
Modal
Loader
pages/

Full screens:

Home
Dashboard
Login
Register
PlanTrip
History
Profile
services/

API communication:

authService
tripService
hooks/

Reusable React logic.

context/

Global state such as:

Authentication
User
Accessibility profile
types/

TypeScript definitions.

utils/

Helper functions.

26. What we specifically DO NOT build in Phase 1

This is extremely important.

Do not try to implement:

❌ Google Maps routing
❌ Weather API
❌ Crowd prediction
❌ Accessibility graph
❌ ML preference learning
❌ Monte Carlo reliability model
❌ Missed-connection prediction
❌ Route scoring
❌ Live transport data
❌ Real-time crowd data
❌ Advanced analytics
❌ Sustainability calculation

Those belong to later phases.

If you try to build everything simultaneously, the project will become difficult to debug.

27. Phase 1 final workflow

The complete Phase 1 development sequence should be:

STEP 1
Create GitHub repository
        ↓
STEP 2
Create project structure
        ↓
STEP 3
Set up React + TypeScript + Vite
        ↓
STEP 4
Configure Tailwind CSS
        ↓
STEP 5
Create TransitSwap design system
        ↓
STEP 6
Build basic UI components
        ↓
STEP 7
Build Navbar / Layout
        ↓
STEP 8
Build Home/Dashboard
        ↓
STEP 9
Build Login/Register UI
        ↓
STEP 10
Build Plan Trip UI
        ↓
STEP 11
Build Profile/Accessibility UI foundation
        ↓
STEP 12
Create Node + Express backend
        ↓
STEP 13
Configure TypeScript backend
        ↓
STEP 14
Create REST API structure
        ↓
STEP 15
Create health-check API
        ↓
STEP 16
Create MongoDB Atlas database
        ↓
STEP 17
Connect MongoDB using Mongoose
        ↓
STEP 18
Create User schema
        ↓
STEP 19
Create authentication API foundation
        ↓
STEP 20
Connect frontend → backend using Axios
        ↓
STEP 21
Add error/loading handling
        ↓
STEP 22
Add environment variables
        ↓
STEP 23
Test APIs using Postman/Thunder Client
        ↓
STEP 24
Test frontend
        ↓
STEP 25
Test MongoDB
        ↓
STEP 26
Test responsiveness
        ↓
STEP 27
Clean code
        ↓
STEP 28
Git commit
        ↓
                 PHASE 1 COMPLETE ✅
28. Phase 1 definition of DONE

We should not move to Phase 2 until all of these are working:

Frontend
 React working
 TypeScript working
 Tailwind configured
 TransitSwap visual system established
 Navbar working
 Routing working
 Dashboard created
 Login page created
 Register page created
 Plan Trip page created
 Profile page created
 Accessibility preferences UI created
 Responsive layout working
Backend
 Node.js configured
 Express configured
 TypeScript configured
 REST API structure created
 Health endpoint working
 Middleware structure created
 Controller structure created
 Routes structure created
 Error handling created
Database
 MongoDB Atlas created
 Mongoose installed
 Database connection working
 User model created
 Data successfully stored/retrieved
Integration
 React → Axios → Express working
 Express → MongoDB working
 Environment variables working
 .env protected
 API tested
Quality
 No unnecessary code
 No duplicated components
 No hard-coded secrets
 Responsive UI
 Clean folder structure
 Meaningful Git commits
 README started
29. What Phase 1 gives us

When we're finished, TransitSwap won't yet be an intelligent mobility system.

Instead, we'll have something much more important:

A professional, clean, scalable foundation on which we can safely build the intelligent TransitSwap system.

The later architecture will become:

                    TRANSITSWAP
                         │
                         ▼
                  React Frontend
                         │
                    Axios / REST
                         │
                         ▼
                  Express Backend
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
   Route Engine     Intelligence      User Data
        │                │                 │
        │                ├─ Preferences    │
        │                ├─ Reliability    │
        │                ├─ Accessibility  │
        │                └─ Scoring        │
        │                                  │
        └────────────────┬─────────────────┘
                         ▼
                      MongoDB

And eventually we'll connect:

Google Maps
Weather
Accessibility Dataset
Crowd Reports
Transport Data

to create the complete system.

🎯 Our rule for Phase 1

Don't rush into advanced features.

We will build it one layer at a time:

Foundation → UI → Backend → Database → Integration → Testing → Phase 1 complete.

And for the UI, we'll use the Smart Transit Behance project you selected as visual inspiration for the overall clean transit-app aesthetic, while creating an original TransitSwap design system. The reference itself is explicitly presented as a clean, user-friendly transit app with route planning and real-time tracking.

So Phase 1 is now locked. We should complete this entire checklist first before touching Phase 2.