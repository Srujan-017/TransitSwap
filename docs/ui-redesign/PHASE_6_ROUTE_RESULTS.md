# Phase 6: Plan Trip, part B: the route results

**Date:** 16 Nov 2026 · **Scope:** how a search's answer looks: route cards, the "best for you" view, the step-by-step journey, the actions, and the weather and excluded-route messages. What the planner returns, and every text and role the tests pin, is unchanged.

## 1. What changed

| Before | Now |
|---|---|
| A route card that opened with small chips, a text-chip row, then the time | **Citymapper-style card:** the headline is **how long it takes** (a 30 px figure) and, once a departure time is chosen, **"Arrive by 2:56 PM"** (never invented: shown only when the route has a departure time); the fare on the right |
| Leg names as coloured text chips ("Metro", "Bus 356") | A **strip of leg chips with icons**: the metro line by name with its colour as a dot (dark text, so every line, including yellow, stays readable), a bus as a teal **number badge** ("Bus 356"), an auto in auto yellow, walking in grey |
| A bar of each leg's share of the time in colours that differed from the map | The same bar, now in **the map's own colours** (a metro leg in its line colour, bus teal, auto yellow, walking grey) |
| Which option is chosen: a thin left bar | A **blue ring and a check with "Selected"**, announced as a toggle (`aria-pressed`); the best option has a **star** beside its label |
| Start, Save Route and Save Journey in a row of three small buttons at the top, away from the options | The actions sit **directly under the chosen card** and move when another option is chosen: **Start Journey** is the one large **green** button, Save Route and Save Journey side by side below it |
| A top banner repeating the demo-engine note (it also appears at the bottom) | Replaced by a one-line "from → to" with a **"Demo data"** tag |
| The step-by-step list had fully coloured rows with white text (white on a line's own colour can fail contrast) | A **vertical rail**: each leg has a dot ringed in its colour with its mode icon, and a **white card** (dark text) with the bus number badge and direction, boarding and next times, where to get off and when the bus arrives, the crowd level, **"Change to the Green Line at RV Road Metro"** where the route says so, and the stops folded under "All N stops" |
| Information panels in 2 and 3 columns (sized for a wide page) | One column, to fit the new 28 rem journey panel and a phone |
| Reasons from the backend that begin with an emoji (🎯 📊 🌱) | The words only: a leading emoji is dropped on display (`stripLeadingEmoji`); the text itself is unchanged |

The "best for you" box (accessibility profiles) is now green with check icons; the weather banner, the excluded-routes list and the information cards use the shared radius and shadow tokens.

## 2. Nothing the tests pin was changed

All 29 existing tests of these components pass **unmodified**: `RouteCard` (bus number read out, "Towards …", "at ~8:36 AM", "after 6 stops", "Crowd: HIGH", "Bus 356"), `SegmentTimeline` (starts folded, exactly two crowd chips), `MultimodalResults` (the card is one button containing "Route N"), `BestForYou` (the region, "Show other suitable options (N)", "Candidate Journeys Ranked by Preference", "Why TransitSwap Recommends This Route"), `ExcludedRoutes`, `WeatherBanner`. The end-to-end test passes too. No test or contract text was edited in this phase.

A line I had added to the timeline ("Step-free route", for wheelchair legs) was removed again before it shipped: nothing in the route data says a path is step-free, so the interface does not claim it.

## 3. Audit extended: the cases this phase is about

The audit used to plan one metro trip. It now also runs, at each width, **a bus trip with a departure time** (Silk Board to Majestic: bus 356, boarding and arrival times, the step-by-step journey open) and **the same trip as a wheelchair user in demo rain** (weather banner, "Best for a wheelchair user" with reasons and tips, the other suitable options, the timeline open). The panel is stretched to full height for the screenshot (hiding the map on a phone) and put back afterwards. Two bugs in my own first version of this are worth recording: the stretch was left in place, so the map covered the form and the next click failed at 375 and 768 px; and on a phone the map painted over the stretched panel in the picture. Both are in the harness only, not the app.

## 4. Checks

| Check | Result |
|---|---|
| Type-check | clean |
| Frontend tests | **263 pass** (239 before: +18 for cards, actions, timeline and +6 for the emoji utility; the 29 existing ones untouched) |
| Build, contrast check (41 pairs) | builds, 41 / 41 |
| End-to-end happy path | passes |
| Audit at 375, 768 and 1280 px, now 19 screens per width (57 in all), including the bus and wheelchair-in-rain results with everything expanded | none worse than Phase 5; **0 violations on all 6 new results screens**; the same 4 existing findings remain (not-found contrast at three widths, admin sideways scroll at 768 px), both on pages scheduled for Phase 9 |

## 5. Not covered

Real phones; a screen-reader pass over the new timeline and the card toggles; the step-by-step journey is still folded by default (a test pins that), so a rider opens it with one tap.
