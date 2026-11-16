# Phase 7: live navigation

**Date:** 16 Nov 2026 · **Scope:** the look and layout of the live navigation screen. The navigation engine, the GPS and speech hooks and the simulator are untouched; every test ID, button name and text the 11 existing tests pin is unchanged.

## 1. What changed

| Before | Now |
|---|---|
| A banner with a 56 px arrow, a 24 px distance and the Exit button in its corner; "Then ..." in the bottom card | A **Google Maps-style banner**: a 64 px arrow tile, a 30 px distance, the instruction, and a **"Then ... [mode icon] next leg"** line under it. It turns **green on arrival** |
| Exit in the banner | **Exit moved to the left of the bottom card**, a 44 px round button beside the arrival time and what is left (the map-app arrangement). Still one "Exit navigation" button |
| Next step and Simulate on two rows, 36 px high | One row, both **44 px high**; the label reads "Simulate journey" with "(demo)" kept for screen readers and the DEMO tag that appears once it runs |
| The speed controls and "Go off route" inside the bottom card, taking about 55 px of map | A tray **floating over the bottom of the map**, so running the demo does not shrink it; the zoom buttons and the Re-centre button step up above it |
| Route lines in colours that differed from the rest of the app | The same colours as the planner map and the route cards: a **metro leg in its own line colour**, bus teal, auto yellow, walking grey; stop markers match |
| Fixed OpenStreetMap URL | The shared tile choice (`mapTiles.ts`): OpenStreetMap by default, CARTO Voyager only if a key is supplied |
| Arrival: the banner said "You have arrived" | The banner is green, the card says "You have arrived at Home" with a large green **Done** |
| Wide screens: banner and card stretched edge to edge | The banner text, card and tray sit in a centred reading width; the map stays full width |

Rerouting, the alert when no new route is found, the step counter, "About live tracking" and the honesty notes are unchanged.

## 2. The promise about the map, now measured

The plan said the map should keep at least half of a 375×812 phone screen. The first version of this phase measured **42%**, so the audit now **fails if the map falls below 50% at 375 px**. Fixes that got it there: one row of buttons, tighter padding, and moving the demo tray onto the map. Measured on the real screen in the audit:

| Width | Navigating | With the demo controls showing |
|---|---|---|
| 375 px | **52%** | **50%** |
| 768 px | 68% | 67% |
| 1280 px | 59% | 57% |

(The audit's browser has no GPS, so its status line is the longer "location permission denied" message; with a real fix the line is shorter and the map slightly larger.)

## 3. Tests added (+8)

`NavigationLayout.test.tsx`: the banner holds the arrow, distance, instruction and the "Then" line; Exit is in the journey card and nowhere else; the banner is dark while travelling and **green on arrival** with the arrived message and a green Done; the card shows arrival, duration, distance, the step and the controls; the buttons are at least 44 px; the demo controls float over the map (not in the card), tell the map to leave room, and go away when the simulation stops; rerouting shows the spinner and no "Then" line. All 11 existing navigation tests pass without changes.

## 4. Checks

| Check | Result |
|---|---|
| Type-check | clean |
| Frontend tests | **271 pass** (263 before, +8) |
| Build, contrast check (41 pairs) | builds, 41 / 41 |
| End-to-end happy path | passes |
| Audit, 57 screens at 375, 768 and 1280 px, with the map-share assertion | none worse than Phase 6; 0 violations on both navigation screens; the same 4 existing findings remain (not-found contrast at three widths, admin sideways scroll at 768 px), both on pages scheduled for Phase 9 |

## 5. Not covered

Real GPS following (as before, only the fake GPS and the simulated journey are exercised), voice guidance on a real device, the safe-area padding on a real phone, and a screen-reader pass over the banner and the floating tray.
