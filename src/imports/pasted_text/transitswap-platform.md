I think this is the right direction. After everything we've discussed over the last few weeks, I would not throw away TransitSwap. Instead, I would evolve it into a much stronger project by adopting only the reviewer's best research ideas while keeping the strengths you've already built.

The key is to avoid becoming "a project with too many features." Every feature must support one central goal:

Helping users choose the smartest, safest, most reliable, and most accessible journey—not simply the shortest route.

Below is the version I would personally build if I were in your position.

TransitSwap
AI-Powered Urban Mobility Intelligence Platform
Tagline

"Travel Smarter, Safer, and More Reliably."

1. Project Vision

TransitSwap is an intelligent web-based urban mobility platform that helps commuters make better travel decisions by considering multiple real-world factors rather than simply recommending the shortest route.

Unlike traditional navigation systems that mainly optimize travel time, TransitSwap evaluates the entire journey experience by integrating:

Public transportation
Weather conditions
Route reliability
Accessibility
Walking effort
Transfer risk
Personalized preferences

into a single Transit Intelligence Engine.

The objective is to recommend the journey that best fits each user's needs.

2. Problem Statement

Existing navigation systems successfully find routes but often overlook practical travel challenges.

They usually do not provide:

Personalized journey recommendations
Accessibility-aware route planning
Reliable transfer-risk estimation
Confidence-based arrival prediction
Intelligent departure-time suggestions
Practical journey reliability analysis

As a result, users frequently experience unnecessary delays, uncomfortable transfers, long walking distances, or inaccessible routes.

TransitSwap addresses these challenges through an integrated decision-support platform.

3. Main Objective

TransitSwap aims to help commuters choose the best overall journey by analyzing:

Travel Time
Travel Cost
Walking Distance
Number of Transfers
Weather Conditions
Crowd Information
Accessibility
User Preferences
Route Reliability

instead of optimizing only travel time.

4. System Architecture

The project consists of four major layers.

Layer 1 – User Interface

Built using React.js.

Allows users to:

Register/Login
Detect current location
Enter destination
Select travel profile
Compare routes
View analytics
Save favourite destinations
Report accessibility and crowd information
Layer 2 – Data Collection

The platform collects information from:

Google Maps Platform

Provides:

Routes
Distance
Travel Time
Metro Stations
Bus Stops
Google Directions API

Provides:

Navigation paths
Transfer information
Estimated travel duration
OpenWeatherMap API

Provides:

Weather
Rain
Temperature
Wind
MongoDB

Stores:

User Accounts
Travel History
TransitDNA
Accessibility Dataset
Crowd Reports
Station Information
User Preferences
Custom Accessibility Dataset

This becomes one of the strongest contributions.

Instead of relying entirely on public datasets, the team surveys a limited set of metro and bus stations (for example, 20–25 stations in one corridor) and records:

Lift availability
Ramp availability
Escalator availability
Stair count
Wheelchair accessibility
Tactile paving
Accessible toilets

Unlike crowd data, these infrastructure details change slowly, making them practical for a student project.

5. Transit Intelligence Engine

This is the core of the project.

Instead of using separate modules, one intelligent engine evaluates all candidate journeys.

It considers:

Travel Time
Travel Cost
Walking Distance
Number of Transfers
Weather Conditions
Accessibility
Historical Crowd Data
User Preferences

Rather than fixed weights alone, the system gradually adapts to user choices through preference learning, so recommendations become more personalized over time.

6. Complete Workflow
Step 1

User logs in.

Step 2

Current location is detected automatically.

Destination is entered.

Step 3

User selects a travel profile.

Examples:

Standard
Fastest
Cheapest
Comfort
Wheelchair
Senior Citizen
Pregnant
Stroller
Luggage
Step 4

TransitDNA loads previous travel behaviour.

The system remembers:

Preferred transport mode
Walking tolerance
Frequently visited locations
Preferred departure times
Step 5

TransitSwap requests data from:

Google Maps
Google Directions
Weather API
MongoDB
Accessibility Dataset
Step 6

Multiple candidate journeys are generated.

Example:

Route A

Metro → Walk

Route B

Bus → Metro

Route C

Metro → Auto

Route D

Bus → Walk

Step 7

Accessibility Filtering

This is a new feature.

If the selected profile is:

Wheelchair

the system removes routes that contain:

Broken lifts
No ramps
Long staircases

Those routes are never recommended.

Accessibility becomes a hard constraint, not just a small scoring factor.

Step 8

Reliability Analysis

TransitSwap estimates:

Transfer difficulty
Missed connection probability
Walking effort
Weather impact

This helps identify journeys that are more dependable.

Step 9

Confidence-Based Arrival Prediction

Instead of saying:

Arrival

9:00 AM

TransitSwap displays:

Expected Arrival

8:57–9:03

Confidence

90%

This gives users a realistic expectation rather than a single exact number.

Step 10

Missed Connection Prediction

The system estimates whether delays in one transport segment could cause the user to miss the next connection.

Example:

Bus delayed

↓

Metro missed

↓

Additional wait

22 minutes

If the risk is high, the application recommends a safer alternative.

Step 11

Preference Learning

Instead of permanently using manually selected weights, the system gradually adjusts recommendations based on previous user choices.

For example,

if a user consistently chooses less crowded routes, the recommendation engine increases the importance of crowd avoidance for that user.

Step 12

Journey Recommendation

Users receive:

Best Route
Alternative Routes
Estimated Cost
Estimated Time
Walking Distance
Number of Transfers
Weather Information
Accessibility Status
Arrival Confidence
Missed Connection Risk
Comfort Score
Step 13

Navigation Starts

Users begin travelling.

Step 14

Journey Ends

Users can submit:

Accessibility Updates
Crowd Reports
Journey Feedback

This improves future recommendations.

Step 15

TransitDNA Updates

The system learns from the completed journey and refines future recommendations.

7. Core Features
Multimodal Route Planning

Supports:

Metro
Bus
Walking
Auto
Nearby Transit Detection

Nearest:

Metro Station
Bus Stop
Last-Mile Connectivity

Suggests:

Walking
Auto

for the final part of the trip.

Fare Estimation

Compares journey costs.

Weather-Aware Routing

Avoids routes made less practical by weather.

Crowd Reporting

Users report crowd levels after journeys.

Historical Crowd Estimation

Uses seeded demo data initially, with the ability to transition to real reports in future deployments.

TransitDNA

Learns user preferences gradually.

Accessibility Mode ⭐ (Major Innovation)

Supports:

Wheelchair Users
Senior Citizens
Pregnant Women
Parents with Strollers
Travelers with Heavy Luggage

Routes violating accessibility constraints are filtered out.

Accessibility Dataset ⭐

Team-collected information including:

Lift status
Ramp availability
Staircases
Accessible facilities

One of the project's most distinctive contributions.

Arrival Confidence ⭐

Displays prediction intervals rather than only a single ETA.

Missed Connection Prediction ⭐

Warns users about transfer risks before travel begins.

Journey Reliability Analysis ⭐

Evaluates the stability of each journey based on transfer complexity, weather, accessibility, and historical conditions.

Smart Departure Suggestion

Suggests leaving earlier or later if it improves reliability.

Comfort Recommendation

Prioritizes:

Less Walking
Fewer Transfers
Better Accessibility
Travel History

Stores previous journeys.

Saved Destinations

Quick access to common trips.

Sustainability Score

Highlights environmentally friendly journeys.

8. Technologies
Frontend
React.js
TypeScript
Tailwind CSS
React Router
Axios
Backend
Node.js
Express.js
Database
MongoDB
Mongoose
APIs
Google Maps Platform
Google Directions API
OpenWeatherMap API
Browser Geolocation API
Authentication
JWT
bcrypt
Data Storage

MongoDB Collections:

Users
Stations
Accessibility
Travel History
Preferences
Crowd Reports
Saved Routes
Recommendation Engine
Multi-Criteria Decision Model (initial version)
Preference Learning based on user choices
Transfer Reliability Analysis
Confidence Interval Estimation
Rule-based decision logic
Deployment
Vercel (Frontend)
Render or Railway (Backend)
MongoDB Atlas (Database)
9. Why This Version Is Better

Compared with your earlier concept, this version has a much stronger research identity without becoming unrealistic.

It keeps the practical strengths of TransitSwap while adding four meaningful innovations:

Accessibility-aware routing with a real surveyed dataset (a unique, defensible contribution).
Confidence-based arrival prediction, giving users realistic arrival windows rather than a single ETA.
Missed connection prediction, helping users avoid journeys likely to fail because of transfer delays.
Preference learning, allowing recommendations to evolve from actual user behaviour instead of relying entirely on manually assigned priorities.

These additions improve the originality of the project without requiring an unrealistic amount of data or advanced infrastructure.

Final Project Summary

TransitSwap is an AI-powered Urban Mobility Intelligence Platform that transforms traditional route planning into intelligent journey planning. By combining multimodal transportation, accessibility-aware routing, weather analysis, historical crowd information, personalized preference learning (TransitDNA), confidence-based arrival prediction, missed connection prediction, last-mile connectivity, and journey reliability analysis into a unified Transit Intelligence Engine, the system recommends the most suitable journey for each user rather than simply the shortest path.

For a final-year engineering project, this scope is ambitious, technically coherent, and realistically achievable. It demonstrates full-stack development, API integration, data modeling, decision-support algorithms, user-centered design, and practical software engineering while remaining focused enough to build within an undergraduate timeline.