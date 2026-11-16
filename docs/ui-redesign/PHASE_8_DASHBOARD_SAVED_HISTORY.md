# Phase 8: Dashboard, Saved Routes and History

**Date:** 17 Nov 2026 · **Scope:** the look and layout of three pages. Every data call, handler, text and control the contract lists is unchanged; the end-to-end test passes without edits.

## 1. What changed

| Page | Before | Now |
|---|---|---|
| Dashboard | A plain header, a dark gradient search card with two read-only text boxes, a cartoon skyline, two-letter mode codes | A **photo header** (`streets-of-bangalore`) with the greeting, the API status and one **search bar** that opens Plan Trip ("From Current Location, To Where to?" and a green **Explore Routes**); four quick-action tiles; **Recent Journeys** as links to History with mode chips, fare, time and a rated / "Awaiting feedback" badge; **TransitDNA weights as labelled bars** (the percentage is always written); statistics, this-month tiles, mobility profile as a proper list, saved places and routes, sustainability gauge in Go Green |
| Saved Routes | Small cards, two-letter text badges, a 28 px delete icon | A card per route with a **mode-colour strip** along the top (same colours as the map), named mode chips, a 44 px delete button, "Use Route"; the origin and destination are shown only when the name is not already "A → B". Empty state: **photo + "Plan a trip"** button; loading skeleton; error with **Try again** |
| History | One long list; two-letter mode badges; 20 px stars | Journeys **grouped by day** (Today, Yesterday, the date); same mode strip and chips; the details toggle says `aria-expanded`; **44 px stars** and tag buttons that announce their state; labelled duration field; empty state with photo, "no match" state with **Clear search**, skeletons, **Try again** |

New small shared pieces: `ModeStrip` / `ModeChips`, `RouteEnds` (names wrap on a phone instead of being cut to "Whitefiel…"), and `groupByDay` (with tests).

## 2. A real bug the audit found

The new "dashboard with data" screen showed **"/5" on a journey that had no feedback** and "1 feedback submitted · avg rating 0/5". The server returns `userFeedback: { issues: [] }` for journeys that were never rated (the History page already handled this quirk); the dashboard only checked that the object existed. It now counts a journey as rated only when it has a rating. A test pins it. This was in the old dashboard too: the numbers shown there were wrong whenever a journey was saved without feedback.

## 3. Contract

Unchanged: `button[title="Open journey details"]`, "Submit Feedback" / "Update Feedback", the "Journey rating" group with "N out of 5 stars", "Delete journey", "Delete destination …", "Delete saved route …", "Use Route" with its router state, the confirm dialogs, "Refresh", "Search journeys", all dashboard section headings and the three demo hubs. The dashboard's two read-only "Origin"/"Destination" text boxes are gone: nothing pinned them, and a bar that looks like input but cannot be typed into misleads; the whole bar is now one link.

## 4. Audit changes

The audit now also captures the **empty** History and Saved Routes (before anything is saved), saves a route as well as a journey, and captures the **dashboard with data**: 22 screens per width, 66 in all.

## 5. Checks

| Check | Result |
|---|---|
| Type-check | clean |
| Frontend tests | **302 pass** (271 before: +27 for the three pages, +4 for `groupByDay`) |
| Build, contrast (41 pairs) | builds, 41 / 41 |
| End-to-end happy path | passes |
| Audit, 66 screens | none worse than Phase 7; **0 violations on all 9 new or changed screens**; the same 4 known findings remain (not-found contrast ×3, admin sideways scroll at 768 px), both for Phase 9 |

## 6. Not covered

Real phones; a screen-reader pass over the grouped history; the saved-destination list on the dashboard with real data in the audit (no destination is saved there; it is covered by a unit test); dark mode (Phase 10).
