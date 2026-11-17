# Phase 9: Profile, Research, Admin and Not found

**Date:** 17 Nov 2026 · **Scope:** the look and layout of four pages, plus the two findings that had been open since the baseline. Every data call, handler, text and control the tests and the contract list is unchanged; the end-to-end test passes without edits.

## 1. What changed

| Page | Before | Now |
|---|---|---|
| Profile | Hand-written 2xl cards, choices as plain buttons with no state announced, weights as a text list | `PageHeader`; an **avatar card**; TransitDNA weights as **labelled bars** (shared `WeightBar`, also used on the dashboard); the accessibility profile as **icon cards with a check on the chosen one**; each travel preference a named `fieldset` of **toggle buttons (`aria-pressed`)**; 44 px targets; a note under the read-only email saying why it cannot change; a **Save bar that stays in reach** above the phone tab bar and announces its result politely |
| Research | Small 10–11 px grey text, spinners, mixed colours | `PageHeader`; 14 px body text in AA greys; **stat tiles** for the ML, coverage and history numbers; skeletons with one spoken "Loading …"; each card's error announced on its own; the benchmark bars unchanged in meaning but readable; camelCase feature names split ("connection risk") |
| Admin | One long line for heading and notice (the sideways scroll), hand-made tabs, tables with plain headers, forms opened inside table rows | `PageHeader`; the notice on its own line; real **ARIA tabs** (arrow keys, Home, End; the row scrolls sideways inside itself); **stat tiles** on the overview; stations table with **search, sortable Station column (`aria-sort`), 25 per page with "Show more"**, a caption and `scope` headers; **Add / Edit station and Edit accessibility in a dialog** (focus kept inside, Escape closes); results announced; native `alert()` replaced by an in-page message |
| Not found | A pale "404" (the contrast finding) on grey | The night-metro photo behind a white **404**, "Route not found", **Go Home** (green) and **Go Back** |

## 2. The two open findings, closed

* **Not-found contrast, at all three widths:** gone. The text is white on the dark photo with a gradient, not navy-200 on navy-50.
* **Admin sideways scroll at 768 px:** my first guess (the heading row) was wrong; the screenshot showed the real cause was the **top navigation**, which for an admin has six links and wrapped past the screen edge between 768 and 1023 px. Fix: the links no longer wrap (`whitespace-nowrap`, tighter padding below `lg`) and the wordmark is read aloud but not shown below `lg`, which frees the room. The same would have hit any admin on a tablet.

## 3. The admin console is now scanned

Until now the audit only saw the admin overview. It now opens **all seven tabs and the Add Station dialog** at each width: 29 screens per width, **87 in all**.

## 4. Contract

Unchanged: all texts the Profile, Research and Admin tests pin ("Save Mobility Profile", "Reset Learned Weights", the real-error-on-failure messages, "Route Ranking Benchmark", "Pre-computed", the agreement region, …) and the confirm dialogs for deactivate, delete and "mark lift broken". One structural change worth recording: the admin forms moved from inside a table row to a dialog (the plan's "modals for create and edit"); the buttons and fields keep their names. "Add Station" lost its "+" and "Cancel" toggle, because the dialog has its own Cancel and Close.

## 5. Checks

| Check | Result |
|---|---|
| Type-check | clean |
| Frontend tests | **323 pass** (302 before: +21 for these four pages, the station paging included) |
| Build, contrast (41 pairs) | builds, 41 / 41 |
| End-to-end happy path | passes |
| Audit, 87 screens at 375, 768 and 1280 px | **0 findings on every screen**: no axe violations, no sideways scroll, the admin console included. (Phase 8 had 4: not-found contrast at three widths, admin scroll at 768 px.) |

## 6. Not covered

Real phones (the sticky Save bar over the safe area), a screen-reader pass over the admin dialogs and tabs, and a keyboard-only run of the admin console beyond the unit tests (Phase 10).
