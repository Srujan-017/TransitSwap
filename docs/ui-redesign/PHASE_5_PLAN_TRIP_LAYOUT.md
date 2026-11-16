# Phase 5: Plan Trip, part A: the map-first layout and the search

**Date:** 16 Nov 2026 · **Scope:** the planner's layout, search card and map. The results components (route cards, details, "best for you") are untouched and come in Phase 6. Every handler, state variable, message and request in `PlanTripPage` is the same.

## 1. What changed

| Before | Now |
|---|---|
| A form on the left, a 480 px map card on the right, results below the map; on a phone one long page with the map far from the form | **Desktop:** a journey panel on the left and a **full-height map** on the right (the Google Maps pattern). **Phone:** the map fills the screen and the same panel is a **bottom sheet over it** with three heights (peek, half, nearly full), above the tab bar |
| Origin and destination as two pills with a swap button between | **One route card** (ring for the start, pin for the end), the swap button beside it, 44 px tap targets, real labels tied to the fields (read by screen readers; the placeholders say it on screen) |
| Date and Time always shown | **Leave now / Depart at**. "Depart at" shows the two fields, starting from today and the current time; going back to "Leave now" clears them, so a forgotten date can never change a search |
| 10 profile buttons in a 3-column grid | **Icon chips** for the five common profiles and a **More** button that opens all ten with their descriptions; a profile chosen from there joins the row |
| The weather switch always on show | Behind a **"Demo options"** line that always says which weather is chosen. The group inside is unchanged: same labels, same explanations |
| Find Routes at the very bottom of a long form | In an **action bar stuck to the bottom of the panel**, so it is reachable even in a half-open phone sheet |
| A white spinner card covering the map while searching | The map stays usable; the panel shows **grey placeholder cards** in the shape of the real route cards, with the same three progress steps, announced once |
| Humanitarian map style | Standard OpenStreetMap tiles; metro legs drawn in **their own line colour**; bus teal, auto yellow, walking dotted; station pins in the leg's colour; the **other route options in grey** under the chosen one (click one to choose it); controls moved to the top right (a phone's sheet covers the bottom) |
| "Demo Transit" tag at the top right | Top left, clear of the map controls |
| Results appeared below, off screen | The panel **scrolls itself to the results** when a search finishes (the panel only; an early version scrolled the whole page and pushed the header off screen, found in the screenshots and fixed) |

On a phone, a new route is fitted into the part of the map the sheet leaves uncovered, so it is never hidden behind it.

### The map style decision

The plan was CARTO's Voyager tiles. CARTO's own page now says its tiles need a free API key (issued against an email address). The planner therefore does **not** call CARTO unless a key is supplied through `VITE_CARTO_KEY`; by default it uses standard OpenStreetMap tiles (as the navigation screen does), credited as the OSM tile policy asks. With a key it uses Voyager and falls back to OpenStreetMap if CARTO's tiles fail to load. To switch it on: get a free key from CARTO and set `VITE_CARTO_KEY` in the Vercel project's environment variables.

## 2. Contract changes (the only two, both deliberate)

1. **`PlanTripPage.test.tsx`, the weather test:** the weather switch is now behind "Demo options", so the test opens it first. Every assertion in it is unchanged (same labels, same `aria-pressed` states, same explanation texts). The other three tests pass untouched.
2. **`e2e/happy-path.spec.ts`, the save step:** it waited for `/saved/i`, whose first match is the always-visible "Saved Routes" navigation link, so it could move on to History before the save request had finished; once, on a busy machine, History then loaded without the journey. It now waits for the real message "Journey saved to your history." This is **stricter**, not looser, and the end-to-end test passed four times in a row afterwards.

Everything the end-to-end test relies on is kept: the placeholders *Search start location…* and *Search destination…*, the suggestions list with its `absolute top-full` classes, the *Find Routes* and *Save Journey* buttons, and the *Plan Your Journey* heading.

## 3. Structure worth knowing

- The panel is **one element** restyled by screen width (a column from 1024 px up, a sheet below), so every label exists once and nothing is duplicated for phones.
- The sheet's height is changed three ways: tap the handle, drag it, or press the arrow keys on it. Using the form opens it to at least half (so suggestions have room); a search starting or finishing does the same; it never closes itself.
- New parts in `src/components/planner/`: `PlannerSheet`, `ProfilePicker`, `DepartureControl`, `DemoOptions`, `ResultsSkeleton`; `src/components/map/mapTiles.ts`.

## 4. Checks

| Check | Result |
|---|---|
| Type-check | clean |
| Frontend tests | **239 pass** (206 before, +33: sheet heights and the three ways to change them, profile picker and More sheet, departure control, demo options, skeleton, tile choice, page layout, the Landing hand-off still pre-filling the planner) |
| Build, contrast check (41 pairs) | builds, 41 / 41 |
| End-to-end happy path | passes (4 consecutive runs after the wait was made exact) |
| Audit, 51 screens at 375, 768 and 1280 px | none worse than Phase 4; 0 violations on the planner; the same 4 existing findings remain (not-found contrast at three widths, admin sideways scroll at 768 px), both on pages scheduled for Phase 9 |

## 5. Not covered

Dragging the handle on a real touch screen (it is tested with simulated pointer events), the safe-area padding on a real phone, the CARTO path (no key was available, so it is tested as a URL choice only), and the results cards, which still look as before until Phase 6.
