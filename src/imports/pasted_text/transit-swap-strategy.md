Absolutely. For TransitSwap, I strongly recommend that you do not try to build everything at once. Build it as a sequence of independent but connected phases.

The best strategy is:

First make basic route planning work → then add intelligence → then add accessibility → then add reliability/prediction → then personalization → finally integrate everything and evaluate it.

This way, even if an advanced feature takes longer than expected, you will still have a working project.

TransitSwap — Complete Multi-Phase Development Strategy
Final objective

TransitSwap: AI-Powered Urban Mobility Intelligence Platform

The final system should help a user answer:

"Given where I am, where I want to go, my personal requirements, weather, accessibility, cost, walking distance, crowd conditions, and transfer risks, which journey is actually best for me?"

It should not simply say:

"This route is 5 minutes faster."

Instead, it should say something like:

Recommended Route

Metro → Walking
38 min | ₹35 | 620 m walking
1 transfer
Low crowd
Wheelchair accessible
🌧️ Rain impact: Low
Arrival: 8:57–9:03 AM
Arrival confidence: 90%
Transfer risk: Low
Why recommended: Reliable + accessible + low walking

That is the final vision.

PHASE 0 — Planning and Requirements
Goal

Before writing code, freeze exactly what you're building.

Create a document containing:

User types
Normal commuter
Fastest-route user
Cheapest-route user
Comfort-focused user
Wheelchair user
Senior citizen
Pregnant user
Parent with stroller
User carrying luggage

You don't need separate applications for these users.

You need profiles inside the same application.

Define the inputs

The system should accept:

Current location
Destination
Travel date/time
Preferred transport
User profile
Maximum walking distance
Budget
Preference for speed/comfort/reliability
Define the outputs

The system should return:

Recommended route
Alternative routes
ETA
ETA confidence interval
Cost
Walking distance
Number of transfers
Crowd level
Weather
Accessibility
Transfer risk
Reliability
Comfort
Sustainability
Explanation of why the route was selected
Freeze the scope

This is extremely important.

Do not suddenly add:

Blockchain
IoT
Digital twins
LSTM
Reinforcement learning
Complex deep learning
Citywide live passenger tracking

unless you genuinely have the required data and time.

PHASE 1 — Project Foundation
Goal

Build the basic MERN application.

Frontend

Set up:

React
TypeScript
Tailwind CSS
React Router
Axios
Backend

Set up:

Node.js
Express.js
REST APIs
Database

Set up:

MongoDB
Mongoose
MongoDB Atlas
Basic project structure
TransitSwap/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   └── utils/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── middleware/
│
└── README.md
PHASE 2 — Authentication and User Management

Build:

Registration

User enters:

Name
Email
Password
Login

Use:

JWT
bcrypt
User profile

Store:

User
 ├── name
 ├── email
 ├── travel preferences
 ├── accessibility profile
 ├── walking tolerance
 └── preferred transport
PHASE 3 — Location and Map System

Now make TransitSwap understand geography.

Implement:

Current location

Use browser Geolocation API.

Destination

User enters destination.

Map

Display:

Current location
Destination
Stations
Bus stops
Route
Google Maps integration

Use appropriate Google Maps services/APIs for:

Map display
Places/station discovery
Directions
Distance
travel-time estimates

At this stage, don't worry about the intelligence.

Just make:

A → B routing work.

PHASE 4 — Multimodal Transportation

Now introduce your actual TransitSwap concept.

Candidate modes:

Metro
Bus
Walking
Auto

The system should generate different possible combinations.

Example:

Route A:
Metro → Walk

Route B:
Bus → Metro → Walk

Route C:
Metro → Auto

Route D:
Bus → Walk

Each route should have structured information:

Route
 ├── totalTime
 ├── totalCost
 ├── walkingDistance
 ├── transfers
 ├── transportModes
 └── segments

This is important because later algorithms will operate on these values.

PHASE 5 — Database and Demo Dataset

This is where you should be smart.

You have already clarified that this is a final-year student prototype, so you can initially use clearly labelled simulated/demo data.

Do not pretend it is live data.

Create datasets for:

Stations
Station ID
Station Name
Latitude
Longitude
Transport Type
Crowd data
Station
Date
Time Slot
Crowd Level

Example:

Majestic
08:00
High
Historical delays
Route
Time Slot
Average Delay
Accessibility
Station
Lift
Ramp
Escalator
Tactile Path
Accessible Toilet
Stairs
Last Verified
Weather

Initially this can come from the actual weather API.

PHASE 6 — Weather Intelligence

Integrate OpenWeatherMap.

Collect:

Temperature
Rain
Wind
Weather condition

Then determine how weather affects journeys.

For example:

Normal weather

Walking penalty:

0
Heavy rain

Walking penalty:

High

Therefore:

Route A
Metro + 1 km walking

Route B
Metro + 200 m walking

During heavy rain:

Route B becomes more attractive.

This is weather-aware routing, rather than merely displaying weather.

PHASE 7 — Accessibility Intelligence ⭐

This should be one of your most important phases.

Instead of accessibility being just:

Accessibility = 5/10

make it a hard constraint.

For example:

A wheelchair user selects:

♿ Wheelchair

The system checks every candidate route.

Suppose:

Route A:
Metro Station X
Lift = Available
Ramp = Available

✅ Valid.

But:

Route B:
Metro Station Y
Lift = Unavailable
Stairs required

❌ Remove it.

The system should not recommend an impossible journey just because it is faster.

PHASE 8 — Accessibility Dataset

This is where your project becomes much more interesting.

Your team can physically inspect a manageable number of stations.

For example:

20–25 stations in a selected Bengaluru corridor/area.

Record:

Lift availability
Ramp
Escalator
Stairs
Tactile paving
Accessible toilet
Wheelchair suitability
Last verification date
Important

Don't claim:

"We have mapped all Bengaluru."

Instead say:

"The prototype was evaluated using a surveyed accessibility dataset covering selected transit stations."

That is academically honest.

Later:

Dataset can be expanded to citywide coverage.

PHASE 9 — Crowd Intelligence

Now add your existing crowd concept.

Users can report:

Crowd level
Low
Medium
High

Example:

Station: Majestic
Time: 8:30 AM
Crowd: High

Store it in MongoDB.

For the demo

Use:

Simulated historical dataset

You can create realistic demo records.

But clearly state in the paper:

"The prototype currently uses simulated/historical demonstration data for crowd estimation due to the absence of a large-scale live user base."

Then explain:

"The architecture is designed to accept real user-generated data in future deployment."

That is completely reasonable for a final-year prototype.

PHASE 10 — TransitDNA

Now introduce personalization.

TransitDNA represents the user's travel behaviour.

It can learn things like:

User:
 ├── prefers Metro
 ├── dislikes long walking
 ├── prefers fewer transfers
 ├── accepts slightly higher cost
 └── prefers reliable routes

Suppose:

Route A

35 min
₹25
1 km walking

Route B

40 min
₹35
300 m walking

A generic system may choose A.

But TransitDNA may recognize:

This user strongly dislikes walking.

So it recommends B.

PHASE 11 — Initial Recommendation Engine

Now create your first intelligent scoring system.

For every candidate route, calculate normalized values for:

Time
Cost
Walking
Transfers
Crowd
Weather
Reliability
Comfort

Then combine them using a multi-criteria scoring model.

The important thing is:

Do not claim the manually selected weights are machine learning.

If you use fixed weights, call it:

Multi-Criteria Decision-Making / weighted scoring

not AI/ML.

PHASE 12 — Preference Learning ⭐

Now improve TransitDNA.

Instead of permanently assigning:

Time = 20%
Cost = 15%
Walking = 20%
...

observe user choices.

Example:

System presents:

Route A
30 min
₹20
900m walking

Route B
35 min
₹30
300m walking

User chooses B.

The system learns:

This user appears to prioritize reduced walking over saving 5 minutes.

Over multiple choices, the weights can adapt.

For a final-year project, you do not need a huge neural network.

You can implement:

Adaptive weights
Pairwise preference learning
Logistic regression

depending on your team's capability.

PHASE 13 — Reliability Engine ⭐

This is another major feature.

Instead of asking:

"Which route is fastest?"

ask:

"Which route is most likely to get me there reliably?"

Analyze:

Historical delays
Transfer time
Number of transfers
Walking time
Weather
Crowd
Connection buffer

Then produce:

Reliability:
High
Medium
Low
PHASE 14 — Missed Connection Prediction ⭐

This is an extension of reliability.

Imagine:

Bus
↓
6 minute transfer
↓
Metro

If historical bus delays are around 5–8 minutes, then:

Missed connection risk is high.

TransitSwap can show:

⚠️ 31% estimated transfer risk

and explain:

"The connection has a short transfer buffer and the incoming bus frequently experiences delays during this time period."

Then recommend another route.

PHASE 15 — Arrival Confidence ⭐

Now make ETA more realistic.

Don't simply show:

ETA = 9:00 AM

Use historical travel variation.

For example:

Expected arrival:
9:00 AM

Likely range:
8:57–9:04 AM

Confidence:
90%

This requires historical/simulated journey data.

Later, when real data becomes available, the same mechanism can use actual journey records.

PHASE 16 — Smart Departure Time

Now reverse the problem.

Instead of:

"I am leaving at 8:00. When will I arrive?"

allow:

"I must reach college by 9:00 AM."

TransitSwap evaluates different departure times.

Example:

Leave 8:20
Arrival 9:04
Risk: High

Leave 8:05
Arrival 8:48
Risk: Low

Then:

Recommended departure: 8:05 AM

This is a very useful feature.

PHASE 17 — Last-Mile Intelligence

After the main public transport route:

Metro
↓
Station
↓
Destination

TransitSwap evaluates:

Walk
Auto

Example:

Walk:
12 min
₹0

Auto:
4 min
₹40

For a wheelchair user or heavy luggage:

Walking may be unsuitable.

For someone trying to save money:

Walking may be preferable.

Again, personalization matters.

PHASE 18 — Final Transit Intelligence Engine

Now bring everything together.

The engine should process:

User
    ↓
Origin + Destination
    ↓
Travel Profile
    ↓
Candidate Routes
    ↓
Accessibility Filtering
    ↓
Weather Analysis
    ↓
Crowd Information
    ↓
Fare
    ↓
Walking
    ↓
Transfers
    ↓
Reliability
    ↓
Missed Connection Risk
    ↓
Arrival Confidence
    ↓
TransitDNA
    ↓
Preference Learning
    ↓
Final Ranking

This is the heart of TransitSwap.

PHASE 19 — Recommendation Explanation

Don't just say:

Route A is recommended.

Explain why.

For example:

🏆 Recommended Route

Metro → Walk

38 minutes | ₹35

Why this route?

♿ Fully accessible
🚶 420 m walking
👥 Low crowd
🌧️ Low weather impact
🔄 One transfer
🟢 Low transfer risk
🎯 Matches your preference for shorter walking
📊 90% arrival confidence

This is extremely important for your research presentation because the recommendation becomes explainable.

PHASE 20 — User Feedback Loop

After completing the journey:

Ask:

How was your journey?

Options:

Accurate
Delayed
Too crowded
Accessibility issue
Walking distance incorrect
Transfer problem
Weather impact
Other

This information gets stored.

PHASE 21 — Continuous Improvement

Now the loop becomes:

User
 ↓
Search Journey
 ↓
TransitSwap recommends
 ↓
User chooses route
 ↓
User travels
 ↓
User provides feedback
 ↓
Data stored
 ↓
TransitDNA updated
 ↓
Reliability statistics updated
 ↓
Future recommendations improve

This is your learning loop.

PHASE 22 — User Dashboard

Build a dashboard containing:

Travel history
Previous journeys
Saved destinations
College
Home
Office
Personal preferences
Walking tolerance
Preferred mode
Budget
Accessibility profile
Travel statistics
Trips completed
Average travel time
Money spent
Walking distance
Sustainability

Show approximate environmental benefit where your data/model supports it.

PHASE 23 — Admin Dashboard

This is optional but useful.

Admin can manage:

Stations
Accessibility information
Reports
Crowd records
Dataset
User feedback

Admin can also mark:

Lift:
Working → Broken

This immediately affects route filtering.

PHASE 24 — Testing

Do not skip this.

Test each module separately.

Authentication
Login
Logout
Invalid password
Maps
Location
Destination
Routes
Accessibility
Wheelchair + accessible route
Wheelchair + inaccessible route
Weather
Normal weather
Heavy rain
Crowd
Low
Medium
High
Recommendation

Different users should receive different recommendations when their preferences differ.

Reliability

Test different delay scenarios.

Missed connections

Test:

Low delay
Medium delay
High delay
PHASE 25 — Integration Testing

After every module works independently:

Authentication
      ↓
Location
      ↓
Routes
      ↓
Accessibility
      ↓
Weather
      ↓
Crowd
      ↓
Fare
      ↓
Reliability
      ↓
TransitDNA
      ↓
Recommendation

Test the entire journey from login to recommendation.

PHASE 26 — Evaluation

This is extremely important for your research paper.

Don't create impressive numbers just because they look good.

Instead, design experiments.

For example:

Experiment 1 — Route recommendation

Compare:

Baseline

Shortest travel time.

versus

TransitSwap

Multi-factor recommendation.

Experiment 2 — Accessibility

Test how many unsuitable routes are successfully filtered.

Experiment 3 — Arrival prediction

Compare predicted arrival intervals with known/simulated ground truth.

Experiment 4 — Transfer risk

Test whether the system correctly identifies routes with insufficient transfer buffers.

Experiment 5 — User preference

Compare:

Fixed weights
vs
Adaptive preferences
PHASE 27 — Handle Demo Data Properly

This is especially important for you.

You can absolutely use simulated data for the prototype/demo, but maintain a clear distinction between:

Real data
API weather information
Actual map coordinates
Your team's surveyed accessibility data

and

Simulated/demo data
Crowd history
Historical delays
Journey records
User behaviour

In your project documentation, write something similar to:

"Due to the limited availability of large-scale real-time transit datasets and the prototype nature of the final-year project, simulated datasets are used for controlled evaluation of crowd levels, historical delays, and user behaviour. The system architecture is designed so that these data sources can later be replaced or augmented with real-time data streams."

That is much better than pretending your demo dataset represents actual citywide conditions.

PHASE 28 — Deployment

When everything works locally:

Frontend

Deploy through:

Vercel

Backend

Deploy through:

Render / Railway

Database

Use:

MongoDB Atlas

Then connect:

User
 ↓
Vercel
 ↓
Express Backend
 ↓
MongoDB Atlas
 ↓
External APIs
PHASE 29 — Final UI Polish

Only after functionality is stable.

Create:

Home
Where do you want to go?
Search
From:
To:
When:
Profile:
Route Results
🏆 Recommended
🥈 Alternative
🥉 Alternative
Route Details

Show all factors.

Accessibility

Clear icons.

Reliability

Use understandable labels.

Dashboard

Travel history and preferences.

PHASE 30 — Research Paper Evaluation

Finally, use your actual implemented system for the paper.

Your paper should describe:

Problem

Traditional route planning doesn't consider enough real-world factors.

Existing research

Your 12 selected papers.

Research gap

What those systems don't adequately address.

Proposed system

TransitSwap.

Methodology

Explain:

Multimodal routing
Accessibility filtering
Weather integration
Crowd data
Preference learning
Reliability
Confidence prediction
Missed connection analysis
Experimental setup

Explain exactly:

Dataset
Number of scenarios
Data source
Baseline
Metrics
Results

Only report results that your experiments actually support.

Complete Architecture

Your final system can be visualized as:

                    ┌─────────────────────┐
                    │       USER          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    React Frontend   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
              ▼                ▼                 ▼
       Google Maps       Weather API        MongoDB
       / Directions                        Database
              │                │                 │
              └────────────────┼─────────────────┘
                               ▼
                  ┌────────────────────────┐
                  │ Candidate Route Engine │
                  └────────────┬───────────┘
                               ▼
                  ┌────────────────────────┐
                  │ Accessibility Filter   │
                  └────────────┬───────────┘
                               ▼
                  ┌────────────────────────┐
                  │ Transit Intelligence   │
                  │       Engine           │
                  └────────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   Weather Analysis      Crowd Analysis      Fare Analysis
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                    Reliability Analysis
                               │
                               ▼
                   Missed Connection Risk
                               │
                               ▼
                    Arrival Confidence
                               │
                               ▼
                         TransitDNA
                               │
                               ▼
                     Preference Learning
                               │
                               ▼
                    Final Route Ranking
                               │
                               ▼
                   ┌─────────────────────┐
                   │  Recommended Route  │
                   └──────────┬──────────┘
                              │
                              ▼
                         User Journey
                              │
                              ▼
                      Feedback / Reports
                              │
                              ▼
                       Database Update
                              │
                              └─────────────► Future Recommendations
How I Would Divide the Project Among Team Members

If you have 4 members, this is a very good division.

Member 1 — Frontend
React
UI
Maps
Route comparison
Dashboard
Member 2 — Backend
Node
Express
Authentication
REST APIs
MongoDB
Member 3 — Intelligence
Recommendation engine
Accessibility filtering
Reliability
Missed connection
Arrival confidence
Preference learning
Member 4 — Data & Research
Accessibility survey
Demo datasets
Data processing
Testing
Evaluation
Research paper

But everyone should understand the whole system, not only their assigned module.

Recommended Development Order

This is the part I want you to follow most carefully.

Don't build according to the order of the features in your paper.

Build according to dependency:

PHASE 0
Requirements
   ↓
PHASE 1
MERN Foundation
   ↓
PHASE 2
Authentication
   ↓
PHASE 3
Maps + Location
   ↓
PHASE 4
Basic Routing
   ↓
PHASE 5
Multimodal Routes
   ↓
PHASE 6
Database + Demo Dataset
   ↓
PHASE 7
Weather
   ↓
PHASE 8
Accessibility Dataset
   ↓
PHASE 9
Accessibility Filtering
   ↓
PHASE 10
Crowd Intelligence
   ↓
PHASE 11
Fare + Last Mile
   ↓
PHASE 12
TransitDNA
   ↓
PHASE 13
Recommendation Engine
   ↓
PHASE 14
Reliability
   ↓
PHASE 15
Missed Connection Prediction
   ↓
PHASE 16
Arrival Confidence
   ↓
PHASE 17
Preference Learning
   ↓
PHASE 18
Smart Departure
   ↓
PHASE 19
Feedback Loop
   ↓
PHASE 20
Dashboard
   ↓
PHASE 21
Testing
   ↓
PHASE 22
Evaluation
   ↓
PHASE 23
Deployment
   ↓
PHASE 24
Research Paper
The Most Important Strategy

I strongly recommend a three-level implementation strategy.

Level 1 — MUST WORK

These are your foundation:

MERN
Authentication
Maps
Location
Multimodal routes
Database
Weather
Fare
Last mile
Accessibility
Level 2 — YOUR DIFFERENTIATORS

These make the project stand out:

Accessibility-first routing
Accessibility dataset
TransitDNA
Reliability analysis
Missed connection prediction
Arrival confidence
Level 3 — ADVANCED

Only build after everything above works:

Adaptive preference learning
Smart departure time
Advanced confidence modeling
More sophisticated route optimization

Never start Level 3 before Level 1 is stable.

And one very important correction

I would not call the entire TransitSwap application "AI-powered" just because it has a scoring algorithm.

If your implementation uses:

rules,
weighted scoring,
filtering,
statistical calculations,

call it an intelligent decision-support/recommendation system.

If you actually implement a trained learning model for preference learning, then you can legitimately describe that component as machine-learning-based personalization.

That distinction will protect you during your viva.

The final development philosophy

Your project should evolve like this:

Basic application

"Here are some routes."

↓

Smart application

"Here are the routes ranked according to time, cost, walking, crowd and weather."

↓

Personalized application

"This route is better specifically for you."

↓

Accessibility-aware application

"This route is actually feasible for your mobility requirements."

↓

Reliability-aware application

"This route is less likely to fail because of delays and transfers."

↓

Predictive application

"You will probably arrive between 8:57–9:03, with a 90% confidence level."

↓

Learning application

"Based on your previous choices, we understand what kind of journey you prefer."

↓

Final TransitSwap

"Here is the journey you can realistically complete, not merely the route that looks shortest on a map."

That is the direction I recommend you follow. It gives you a clear development roadmap, a working fallback at every phase, and a strong research story without requiring you to build an impossible Google-Maps-scale system.