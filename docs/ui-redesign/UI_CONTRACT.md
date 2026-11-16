# UI contract and feature checklist

The redesign changes how TransitSwap looks, never what it does. This file is the checklist every phase of
`UI_REDESIGN_PLAN.md` is held to. Sections 1 and 2 are copied from the plan (sections 5.2 and 5.3) so they can be ticked
per phase without opening the plan.

## How to run the gate for a phase

```bash
npx tsc --noEmit && (cd backend && npx tsc --noEmit)      # type-checks
npx vitest run                                            # frontend tests (122 at the Phase 0 baseline)
(cd backend && node scripts/run-tests.js)                 # backend, strict (33 at the baseline)
npx vite build                                            # production build
npx playwright test                                       # the real end-to-end happy path
UI_SHOTS=phase-N npx playwright test -c playwright.screens.config.ts   # screenshots + axe, every screen, 375/768/1280 px
```

Then compare `docs/ui-redesign/phase-N/results.json` with `docs/ui-redesign/before/results.json`: no screen may have more
violations than it had before, every screen the phase changed must have 0, and no screen may scroll sideways.

## 1. Text, roles and test IDs that must not change

**End-to-end (register → plan → save → feedback)**
labels *Full name*, *Email address*, *Password*, *Confirm password* · buttons *Create Account*, *Find Routes*,
*Save Journey*, *Submit Feedback* · links *Plan Trip*, *History* · heading *Plan Your Journey* · placeholders
*Search start location…*, *Search destination…* · the place-suggestions dropdown keeps the classes `absolute top-full` ·
the journey-details button keeps `title="Open journey details"`.

**Plan form**
*Origin*, *Destination*, *Wheelchair* (selected = class containing `bg-brand-500`) · *Please select an origin location.* ·
weather group *Live weather*, *Rain* · texts "Uses the real weather", "walks over 300 m become autos".

**Results**
region *Why this route suits you* · *Show other suitable options (N)* · *Candidate Journeys Ranked by Preference* ·
*Why TransitSwap Recommends This Route* · *Not suitable for you* · *Not running then* · bus leg texts *Bus number*,
*Towards …*, *at ~8:36 AM*, *after 6 stops*, *Crowd: HIGH* · weather banner `role="status"`, *Live · Open-Meteo*,
*Forecast for 18:00* · *Start Journey* button.

**Live navigation**
test IDs `guidance-primary`, `guidance-distance`, `guidance-icon` (attribute `data-icon`), `nav-status`, `eta-*` ·
buttons *Simulate journey*, *60×*, *Stop simulation*, *Go off route*, *Mute voice guidance* / *Turn voice guidance on*,
*Exit navigation*, *Next step*, *Done* · group *Simulation controls* · texts *Step N of M*, *DEMO · simulated journey*,
*Bus and metro positions are not tracked live*.

**Research and Profile**
*Pre-computed* · region *Agreement with baseline planners* · the strings checked in `ProfilePage.test.tsx`.

**Honesty labels** (*Demo Transit*, *Demo Route*, the synthetic-data notes) stay visible.

If a design truly needs one of these to change, the test changes in the same commit and the progress log says why. A test
is never deleted or weakened to make a phase pass.

## 2. Feature checklist per screen

Tick at the end of each phase for the screens it touched.

- **Plan Trip:** Multimodal / Road Routing switch · origin and destination search with suggestions, swap · date and time ·
  demo weather switch · all 10 profiles with descriptions, the preferences summary and *Edit Preferences* · Find Routes,
  validation messages, loading steps · weather banner · "Best for you" with reasons, other suitable options, ranked
  candidates · "Why TransitSwap recommends this route" · excluded routes ("Not suitable for you" / "Not running then") ·
  bus legs (number, direction, next buses, arrival), per-leg crowd, nearby transit · map (routes, markers, satellite,
  fullscreen, locate me) · Save Journey, save destination, Start Journey · error states, the demo-route fallback,
  "Why no route" · road routing summary and instructions.
- **Live navigation:** GPS following with accuracy, next instruction and distance, Step N of M, Next step · voice and mute ·
  reroute after going off route ("Rerouting…", and the alert when none is found) · simulation at 1, 10, 30, 60×, Go off
  route, arrival and Done, Exit · wake lock and the honest-limits notes.
- **Dashboard:** Plan Journey (origin and destination), Mobility Profile, Personalized TransitDNA · Travel Statistics,
  This Month, Sustainability · Recent Journeys, Saved Destinations, Saved Routes, Demo / Quick Transit Hubs · the benchmark
  card stays removed.
- **History:** list, refresh, journey details, rating, Submit Feedback, delete journey, delete destination.
- **Saved Routes:** list, plan again, delete.
- **Profile:** profile details, travel preferences, mobility profile.
- **Research:** pre-computed benchmark, agreement table, diagnostics.
- **Admin:** stats · stations create, edit, deactivate, delete · users.
- **Auth:** register, login, validation, redirect to the dashboard; guest-only and admin-only routing.

## 3. May change / must not change

| May change | Must not change |
|---|---|
| Markup and classes in `src/pages`, `src/components`, `src/layouts` | `backend/` |
| `src/index.css` (tokens, base styles) | `src/services`, `src/context`, `src/types` |
| New presentational components in `src/components/ui` | `src/navigation` (engine, prompts, simulator) |
| New presentation-only hooks | The behaviour of existing hooks |
| Photos in `public/images`, the map tile URL and route-line styling | URLs, localStorage keys, and every number, label and reason a feature produces |
