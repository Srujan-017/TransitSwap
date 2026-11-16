# Feature upgrade — verification record (Phase 7)

**Date:** 16 Nov 2026 · **Scope:** the 14 requests in `FEATURE_UPGRADE_PLAN.md` (phases 1–6) · **Method:** automated tests, a rule-checking matrix, an accessibility audit of the new screens, and checks against the live deployment.

## 1. Automated tests

| Check | Result |
|---|---|
| Backend test files, strict mode (a skipped database test counts as a failure) | **33 / 33 pass**, 0 skipped |
| Frontend tests | **122 pass**, stable over 5 consecutive full runs |
| Type-check, frontend and backend | clean |
| Production build | builds |
| GitHub Actions on the latest commit | green (type-check, build, tests) |

New test files in this upgrade: crowd model, profile rules (870 checks), bus network and timetable (133), weather (300), navigation data (24), the navigation engine, prompts and guidance, the live navigation screen with a fake GPS and a simulated journey (62 together), plus component tests for the best-for-you card, bus legs, weather banner and demo weather switch.

## 2. The rules, checked across every combination

`backend/scripts/profile-matrix.ts` runs the real planning pipeline for **7 profiles × 12 Bengaluru trips × 5 times of day** (weekday 08:30, 14:30, 22:00, 23:30, Saturday 11:00) in **4 weathers** (clear, rain, heavy rain, heat): **1,680 cases**. For each, *every* returned route (not only the best) is checked by a checker written separately from the policy code.

| Rule | Checked |
|---|---|
| Every trip inside Bengaluru gets an answer | ✅ 1,680 / 1,680 |
| Walking caps (wheelchair 150 m per leg and 300 m total; senior, pregnant, stroller 300 / 500; luggage, reduced mobility 300 / 400) | ✅ |
| No bus for wheelchair, pregnant, stroller; for the others only a LOW-crowd bus | ✅ |
| No HIGH-crowd metro leg for any accessibility profile | ✅ |
| No metro boarded outside about 05:00–23:00 | ✅ |
| In rain, heavy rain or heat: no walk over 300 m in any route, for any profile | ✅ |
| At most 3 options for an accessibility profile | ✅ |
| Each route is one connected journey from the right start to the right end, totals add up | ✅ |

**Result: 0 violations.** The same checker found **153 problems in 252 cases before Phase 3** (wheelchair had no answer in 20 of 36), so it can detect these failures.

Other measurements: 78% of 1,644 standard trips are offered at least one bus option and none are left without a route (`bus-coverage.ts`); seniors are offered a LOW-crowd bus in about 15% of trips.

## 3. Accessibility audit (axe-core 4.8.4, WCAG 2.1 A and AA)

Screens scanned: Plan form with the weather switch · results in demo rain (weather banner, bus legs) · wheelchair results with everything expanded (best-for-you card, other options, excluded routes, step-by-step timeline) · live navigation (opening, simulation running with demo controls, arrival) · Research · Dashboard · live landing page and login page on desktop and at 375 px.

**Final result: 0 violations on every screen.** For the new components, contrast was also measured directly (axe cannot judge text over gradients or map tiles).

Found and fixed during the audit:

| Finding | Fix |
|---|---|
| Bus-number badge used `aria-label` on a plain `<span>` (not reliably announced) | real screen-reader text "Bus number 356" |
| Metro line names drawn in the line's own colour on tinted cards (yellow line failed 4.5:1) | dark text with a colour dot |
| Selected simulation speed button white on amber-600 (3.2:1) | amber-800 |
| Bus and Auto mode chips at the exact 4.5:1 limit | darker text for margin |
| Phone layout: bottom panel took 51% of a 375×812 screen | Exit moved into the banner, tracking note folded away: map now ~49% of the screen (was 37%) |

Not covered: axe is an automated check; no screen-reader or keyboard-only usability study was done. The admin console was not scanned.

## 4. Live deployment

| Check | Result |
|---|---|
| Live backend, 17 checks through the public API with the demo account | ✅ 17 / 17: real Open-Meteo weather and the forecast for the chosen hour; bus 356 with direction, next buses and arrival; navigation data (stop points, ISO times, departure time); per-leg crowd; demo rain with no walk over 300 m; unknown weather mode rejected; all six accessibility profiles get a "Best for you" route obeying the rules at 08:30; pregnant at 23:30 gets an auto, not the metro; a trip outside Bengaluru is still a plain 404; weather endpoint; database connected |
| Live frontend bundle | contains the navigation screen, demo controls, weather switch, bus numbers, "other suitable options" and the pre-computed benchmark; the removed dashboard benchmark button is gone |
| Live landing and login pages | no accessibility violations, no sideways scroll at 375 px, no console errors |

## 5. Flaky tests found and fixed

Running the frontend suite repeatedly exposed tests that failed only under load (a trivial component test taking 9 s against a 5 s limit; the simulated-journey test running a slow DOM query on every tick). Fixed with a project-wide 20 s timeout and a cheaper loop; 5 consecutive full runs now pass. The in-memory MongoDB occasionally fails to start within its 10 s limit on a busy machine; the runner reports that as skipped (never as passed) and a rerun passes.

## 6. What was NOT verified

- **Real GPS.** The navigation was exercised with the simulated journey and a fake GPS. Following a real phone's location needs the live HTTPS site on a phone; browsers only allow location on HTTPS, which the live site has.
- **Signed-in screens on the live site in a browser.** The authenticated screens were verified on a local copy of the same build, and the live API was verified directly. Signing in on the live site was left to the owner.
- **Real transit and accessibility data.** All of it is synthetic and labelled so.
- **People.** No user study; no rehearsal of the demo.
