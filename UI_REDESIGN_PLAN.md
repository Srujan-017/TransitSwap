# TransitSwap — UI & Design Redesign: Master Plan

**Status:** plan written 16 Nov 2026 · Phases 0–3 done; Phase 4 next · **Deadline:** 19 Nov 2026
**Rule above all others:** the redesign changes how the app *looks and feels*, never what it *does*. Every feature from the completion plan and the feature upgrade (profiles, buses, weather, crowd, live navigation, saving, history, feedback, research, admin) must work exactly as it does now after every single phase.

---

## 1. Where we are starting from (audit of the current UI)

| Area | Today |
|---|---|
| Screens | 11 pages (Landing, Login, Register, Dashboard, Plan Trip, Profile, History, Saved Routes, Research, Admin, Not found), about 4,700 lines; Plan Trip (847) and Admin (843) are the largest |
| Look | Sky-blue brand (`brand-*`) on slate greys (`navy-*`), Plus Jakarta Sans + Inter from Google Fonts, rounded cards with hand-written shadows |
| Consistency | Each page writes its own classes (`rounded-2xl` here, `rounded-3xl` there, about 10 different inline shadows); only 5 shared UI components (Button, Card, Input, Badge, Spinner) |
| Icons | Mostly lucide, but the 10 travel profiles use **emoji** (🚶 ♿ 🧓 🤰 👶 🧳 🦯 ⚡ 💰 🛋️), plus 🗺️ and 💡 elsewhere. Emoji look different on every phone and read as unprofessional |
| Planner | Form on the left, map in a card on the right, results below the map. On a phone everything stacks into one long page: the map is not the main thing and results are far down |
| Map | OSM "Humanitarian" tiles (busy, saturated) on the planner, standard OSM tiles in navigation |
| Phone layout | A hamburger menu, no bottom navigation, no bottom sheet; works, but feels like a shrunken website rather than an app |
| Photos | 4 Unsplash photos, loaded directly from Unsplash's servers (hotlinked); the same photo is used on the landing page and the login page |
| Loading | Spinners only (no skeleton screens) |

**Already good and kept:** WCAG AA contrast work from Phase 7 (0 axe violations), keyboard focus rings, honest "demo" labels, reduced-motion support, lazy-loaded map, code splitting per page.

---

## 2. What we borrow from real travel apps

These are **patterns** (layout, interaction and visual grammar) used by the best-known travel apps. We copy no logos, brand colours, screenshots, icons or other assets from any of them.

| App | Pattern we borrow | Where it goes in TransitSwap |
|---|---|---|
| **Google Maps** | Map-first layout: a side panel on desktop and the map filling the rest; a big **Start** button; the turn-by-turn banner (big arrow, distance, then the street); grey alternatives next to a highlighted chosen route; a re-centre button | Plan Trip layout, route display on the map, live navigation |
| **Citymapper** | Journey cards: big duration on the left, arrival time, a strip of mode icons and line chips, then the fare; very readable step lists; a big friendly "where to?" entry | Results list, route detail timeline, dashboard search |
| **Transit app** | Big, legible line and bus-number badges; "next departures" chips (8:36 · 8:44 · 8:52) | Bus legs (`356 → Electronic City`), metro line chips |
| **Moovit** | Step lists with stop counts, "get off in 2 stops" prompts, accessibility shown as a first-class filter | Timeline, navigation prompts, profile picker |
| **Uber / Rapido / Namma Yatri** | One "Where to?" box as the main action; saved places as chips (Home, Work); a bottom sheet over the map on phones; the auto option shown with its fare | Dashboard, phone planner, auto legs |
| **Apple Maps** | Bottom sheet with three snap heights; floating, slightly translucent map controls; strong typographic hierarchy | Phone planner and navigation |
| **Airbnb / Booking.com** | Landing pages built on real photography, clear "how it works", trust sections, tidy footer | Landing, sign-in and sign-up |
| **Namma Metro (BMRCL)** | The real line colours (Purple, Green, Yellow, Pink, Blue) | Metro badges and route lines (the data already carries the line colour) |

---

## 3. Design direction: calm, map-first, confident

**Principles**

1. **One main action per screen.** Landing: plan a trip. Planner: find routes, then Start. Navigation: the next instruction.
2. **The map is the hero** on the planner and in navigation. Photos are the hero everywhere else.
3. **Time, cost and effort readable at a glance:** big duration, arrival time, fare, walking metres, crowd. Numbers use tabular figures so they line up.
4. **Accessibility is visible, not hidden:** the travel profile sits next to the search, and the "why this suits you" reasons sit on the card.
5. **Honest, but quiet:** the demo-data labels stay on screen, styled as neat small tags instead of alarm boxes.

### 3.1 Colour

- **The token names stay** (`brand-50…900`, `navy-50…900`, `success`, `warning`, `danger`). Only their values change. Every page re-colours at once in Phase 1, and code that relies on these names keeps working; for example a test checks that the selected profile button has `bg-brand-500`.
- **Proposed palette** (exact values are checked in Phase 1 with a contrast script, never by eye):

  | Role | Proposal |
  |---|---|
  | Primary, "Transit Blue" | `brand-500` about `#1F5BD8` (≈5.9:1 on white); `brand-600` darker for hover |
  | Go / Start / Best, "Go Green" | new `go-600` about `#087A41` (≈5.4:1 on white) |
  | Ink | about `#0B1220` for text; `navy-*` stays the neutral grey scale |
  | Metro | the line's own colour, shown as a dot or stripe with dark text beside it (the rule from the Phase 7 contrast fix) |
  | Bus | teal |
  | Auto | Bengaluru auto yellow, with dark text |
  | Walking | slate, drawn as a dotted line |
  | Crowd LOW / MEDIUM / HIGH | green / amber / red, always with an icon and a word, never colour alone |
  | Weather | blue for rain, amber for heat |

- **Surfaces:** a white panel on a very light grey canvas, with hairline borders instead of heavy shadows. Three elevation levels only (flat, raised card, floating sheet).

### 3.2 Typography

- **Inter** for the interface and **Plus Jakarta Sans** for headings. Both are kept for continuity, but **self-hosted** as variable woff2 fonts (Latin only) through `@fontsource-variable`. This removes the Google Fonts request, which is faster and keeps visitors' details away from a third party.
- **One type scale:** 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48 · 60 px. Times, fares and distances use tabular numbers.

### 3.3 Shape, space, motion

- 4-pixel spacing grid.
- Corner radius: 8 px (inputs), 12 px (buttons, chips), 16 px (cards), 24 px (sheets and the hero search).
- Motion: 150, 250 and 350 ms ease-out, used only for sheets, expanding cards and page entry. Everything turns off under "reduce motion".

### 3.4 Icons

- lucide only, one stroke width.
- Every emoji is replaced:

  | Profile | Icon |
  |---|---|
  | Standard | `Footprints` |
  | Wheelchair | `Accessibility` |
  | Senior | `PersonStanding` |
  | Pregnant | `HeartPulse` |
  | Stroller | `Baby` |
  | Luggage | `Luggage` |
  | Reduced mobility | `Hand` |
  | Fastest | `Zap` |
  | Cheapest | `IndianRupee` |
  | Comfort | `Armchair` |

  The final choice is made in Phase 1. Each profile keeps its **text label**, so screen readers and tests read the same names as now.

### 3.5 Map style

- **Planner:** CARTO **Voyager** tiles, a clean, Google-like basemap made from OpenStreetMap data, with the required attribution. The satellite toggle stays. If CARTO tiles fail to load, the map falls back to standard OSM tiles. CARTO's free-use terms are checked in Phase 5 before switching.
- **Route lines:**
  - each line has a white casing plus a colour per mode; walking is dotted
  - the chosen route is bold and the alternatives are grey
  - metro stations get pins in the line colour, and bus stops get small dots
  - origin and destination markers are styled like Google's (a filled dot for the start, a pin for the end)
- **Navigation:** the same Voyager style, with a "night" dark map (CARTO Dark Matter) as an optional extra in Phase 10.

### 3.6 Real photography (no AI images)

- **Sources:**
  - Unsplash and Pexels: free licences, attribution not required, but we credit anyway.
  - Wikimedia Commons, which has the best Bengaluru-specific photos: Namma Metro, BMTC buses, autos. These are usually CC BY or CC BY-SA, which **require** attribution and a licence link.
  - Every photo is checked on its source page: real photograph, licence, author.
- **Handling:**
  - downloaded once and **self-hosted** in `public/images/`, not hotlinked
  - converted to WebP in 3 widths (640, 1280, 1920) and served with `srcset` and `loading="lazy"`; the hero image stays under about 200 KB
  - a dark gradient over any photo that has text on it, with the contrast measured
  - meaningful `alt` text for every photo
- **Credits:**
  - a register in `src/data/photoCredits.ts` (file, title, author, source URL, licence)
  - a public **/credits** page, linked from the footer
- **Shot list (about 14 photos):**

  | # | Photo | Used on |
  |---|---|---|
  | 1 | Namma Metro train on the elevated track | Landing hero |
  | 2 | Metro station platform | Landing "How it works" |
  | 3 | BMTC bus on a Bengaluru road | Landing feature "Buses with numbers and timings" |
  | 4 | Auto-rickshaw on a Bengaluru street | Landing feature "Autos for the first and last mile" |
  | 5 | Rainy street with umbrellas | Landing feature "Weather-aware" |
  | 6 | Wheelchair user using public transport | Landing "Built for every traveller" |
  | 7 | Parent with a stroller | Same section |
  | 8 | Older traveller | Same section |
  | 9 | Traveller with luggage | Same section |
  | 10 | Commuters walking at a station | Dashboard header band |
  | 11 | Bengaluru cityscape (MG Road, Vidhana Soudha or skyline) | Sign-in and sign-up side panel |
  | 12 | Metro at night | Not-found page; dark-mode hero |
  | 13 | Phone with a map in hand | Landing feature "Live navigation" |
  | 14 | Empty platform or road | Empty states (no history, no saved routes) |

- **Not on working screens:** the planner and navigation show the map, not photos, as Google Maps does.
- **Your approval:** downloading files needs your OK. In Phase 2 I will list every photo (file, source page, licence, size) and download only after you approve the list. You are also welcome to pick photos yourself.

---

## 4. New layout

All URLs stay the same: `/`, `/login`, `/register`, `/dashboard`, `/plan`, `/profile`, `/history`, `/saved-routes`, `/research`, `/admin`, plus a new public `/credits`.

**App shell**

- **Desktop:** a slim top bar with the logo, the nav links (*Dashboard, Plan Trip, History, Saved Routes, Research*, plus *Admin* for admins) and an account menu.
- **Phone (below 768 px):** a compact top bar plus an **app-style bottom tab bar** (Home, Plan Trip, Saved, History, Profile). Research and Admin move into the account menu.
- The link names stay exactly as now, because the end-to-end test clicks the "Plan Trip" and "History" links. Only one set of links is visible at a time: the other is `display:none`, so it never appears twice to tests or screen readers.

**Plan Trip on desktop (Google Maps style)**. The emoji in these sketches are only shorthand; the real screens use lucide icons.
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◉ TransitSwap   Dashboard  Plan Trip  History  Saved  Research    (👤)   │
├───────────────────────────┬──────────────────────────────────────────────┤
│ Plan Your Journey         │                                              │
│ ┌───────────────────────┐ │                                              │
│ │ ● Search start…       │⇅│                 M A P                        │
│ │ ◆ Search destination… │ │        (full height, chosen route bold,      │
│ └───────────────────────┘ │         alternatives grey, station pins)     │
│ [Leave now ▾] [Profile ▾] │                                              │
│ [ Find Routes          ]  │                                 [◎] [⛶] [+-] │
│ ───────────────────────── │                                              │
│ ☔ Rain: walks > 300 m … │                                              │
│ ★ BEST FOR YOU            │                                              │
│ 42 min  · arrive 9:12     │                                              │
│ 🚶3 › [Purple] › 🛺 ₹62    │                                              │
│ Why this suits you ▾      │                                              │
│ [ Start ]  [Save Journey] │                                              │
│ 48 min · 🚌356 › 🚶 ₹25   │                                              │
└───────────────────────────┴──────────────────────────────────────────────┘
```
**Plan Trip on a phone (Citymapper / Apple Maps style):** the map fills the screen and a **bottom sheet** sits over it with three heights: peek (search only), half (results) and full (details). The sheet has a visible handle and a button to resize it, so it works without swiping and with a keyboard.

**Live navigation (Google Maps style):** a big dark instruction banner at the top (arrow, distance, then the street, and the next step underneath); the map in the middle with a re-centre button; a bottom card with the arrival time, minutes left, distance left and Exit; and the demo-simulation controls in a small tucked-away tray. Every existing control and label stays.

---

## 5. How we make sure nothing breaks

### 5.1 What may change and what may not

| May change | Must NOT change |
|---|---|
| Markup and classes in `src/pages`, `src/components`, `src/layouts` | Anything in `backend/` (planning, profiles, buses, weather, crowd, auth, admin) |
| `src/index.css` (tokens and base styles) | `src/services` (API calls and payloads), `src/context`, `src/types` |
| New presentational components in `src/components/ui` | `src/navigation` (engine, prompts, simulator: pure and tested) |
| New presentation-only hooks (for example `useMediaQuery`, `useBottomSheet`) | The existing hooks' behaviour (`useNavigationSession`, auth, trip planning) |
| Photos in `public/images`, the map tile URL and route line styling | URLs, localStorage keys, the data shown (every number, label and reason a feature produces) |

Big pages are split into smaller **presentational** pieces (for example `PlanSearchPanel`, `ResultsList`, `RouteDetail`). The state stays in the page component, so the logic does not move.

### 5.2 The UI contract (kept word for word)

Tests find the app by visible text, roles, labels and test IDs. These stay exactly as they are:

- **End-to-end (register → plan → save → feedback):**
  - labels *Full name*, *Email address*, *Password*, *Confirm password*
  - buttons *Create Account*, *Find Routes*, *Save Journey*, *Submit Feedback*
  - links *Plan Trip*, *History*
  - heading *Plan Your Journey*
  - placeholders *Search start location…* and *Search destination…*
  - the suggestions dropdown's `absolute top-full` classes
  - the journey-details button's `title="Open journey details"`
- **Plan form:**
  - *Origin*, *Destination*, *Wheelchair* (with `bg-brand-500` when selected)
  - the message *Please select an origin location.*
  - the weather group (*Live weather*, *Rain*, "Uses the real weather", "walks over 300 m become autos")
- **Results:**
  - region *Why this route suits you*
  - *Show other suitable options (N)*
  - *Candidate Journeys Ranked by Preference*
  - *Why TransitSwap Recommends This Route*
  - *Not suitable for you*
  - *Not running then*
  - bus leg texts *Bus number*, *Towards …*, *at ~8:36 AM*, *after 6 stops*, *Crowd: HIGH*
  - weather banner `role="status"`, *Live · Open-Meteo*, *Forecast for 18:00*
- **Navigation:**
  - test IDs `guidance-primary`, `guidance-distance`, `guidance-icon` (with `data-icon`), `nav-status`, `eta-*`
  - buttons *Simulate journey*, *60×*, *Stop simulation*, *Go off route*, *Mute voice guidance* / *Turn voice guidance on*, *Exit navigation*, *Next step*, *Done*
  - group *Simulation controls*
  - texts *Step N of M*, *DEMO · simulated journey*, *Bus and metro positions are not tracked live*
- **Research and Profile:** *Pre-computed*, the region *Agreement with baseline planners*, and the strings in `ProfilePage.test`.
- **Honesty labels** (*Demo Transit*, *Demo Route*, the synthetic-data notes) stay visible.

If a design ever truly needs one of these to change, the test changes **in the same commit** and the progress log says why. A test is never deleted or weakened to make a phase pass.

### 5.3 Feature checklist per screen (ticked at the end of each phase)

- **Plan Trip:**
  - Multimodal / Road Routing switch
  - origin and destination search with suggestions; swap
  - date and time; demo weather switch
  - all 10 profiles with descriptions; the preferences summary and *Edit Preferences*
  - Find Routes, validation messages, loading steps
  - weather banner; "Best for you" with reasons; other suitable options; ranked candidates
  - "Why TransitSwap recommends this route"; excluded routes ("Not suitable for you" / "Not running then")
  - bus legs with number, direction, next buses and arrival; per-leg crowd; nearby transit
  - map: routes, markers, satellite, fullscreen, locate me
  - Save Journey, Save destination, Start navigation
  - error states, the demo-route fallback, "Why no route"
  - road routing summary and instructions
- **Live navigation:**
  - GPS following with accuracy, the next instruction and distance, Step N of M, Next step
  - voice and mute, reroute after going off route ("Rerouting…", and the alert when none is found)
  - simulation at 1, 10, 30 and 60×, Go off route, arrival and Done, Exit
  - the wake lock and the honest limits notes
- **Dashboard:**
  - Plan Journey (origin and destination), Mobility Profile, Personalized TransitDNA
  - Travel Statistics and This Month, Sustainability
  - Recent Journeys, Saved Destinations, Saved Routes, Demo / Quick Transit Hubs
  - the benchmark card stays removed
- **History:** list, refresh, journey details, rating, Submit Feedback, delete journey, delete destination.
- **Saved Routes:** list, plan again, delete.
- **Profile:** profile details, travel preferences, mobility profile.
- **Research:** pre-computed benchmark, agreement table, diagnostics.
- **Admin:** stats; stations create, edit, deactivate and delete; users. Everything currently there.
- **Auth:** register, login, validation, the redirect to the dashboard; guest-only and admin-only routing.

### 5.4 The gate every phase must pass before it is pushed

| Check | Pass mark |
|---|---|
| Type-check, frontend and backend | clean |
| Frontend tests | all pass; the count may grow, never shrink (122 today) |
| Backend tests, strict | 33 / 33 (untouched code, which proves the backend is unaffected) |
| End-to-end happy path (Playwright, real backend) | passes |
| Accessibility: axe on every changed screen at 1280 px and 375 px | 0 violations |
| Phone check | no sideways scrolling at 375 px; tap targets at least 44 px |
| Keyboard | every control on the changed screens reachable and usable, with focus visible |
| Production build | builds; bundle size checked (no unexplained growth over 10%) |
| Before/after screenshots of the changed screens | saved in `docs/ui-redesign/` |
| After the push | GitHub Actions green, then a live check (the live API script plus a check of the live bundle and pages) |

### 5.5 Rolling back

Each phase is its own commit (or a few commits) on `main`, so `git revert` undoes a phase cleanly and Vercel redeploys the previous look. Pages not yet redesigned keep working the whole time, and from Phase 1 on they already pick up the new colours, fonts and components, so the app never looks half-broken between phases.

---

## 6. The phases

Size: **S** ≈ a couple of hours, **M** ≈ half a day, **L** ≈ most of a day.

### Phase 0: Safety net and baseline (S)
- Run the full gate on today's app and record the results.
- Take "before" screenshots of every screen at 375, 768 and 1280 px.
- Make one checklist file from the UI contract (5.2) and the feature checklist (5.3).
- Add a small Playwright script that screenshots every route, used again after each phase.
- **Done when:** baseline recorded, screenshots saved, gate green.

### Phase 1: Design system foundation (M)
- **Tokens in `src/index.css`:**
  - re-tune the `brand-*` and `navy-*` values
  - add the mode colours, the Go green, radii, three shadows and the motion durations
  - check contrast with a script for every text/background pair
- **Fonts:** self-host Inter and Plus Jakarta Sans; remove the Google Fonts import.
- **Rebuild the shared kit in `src/components/ui`:**
  - restyle Button, Card, Input, Badge and LoadingSpinner, keeping their props
  - add Chip, SegmentedControl, IconButton, Skeleton, Toast, Sheet (bottom sheet), Tabs, EmptyState, StatTile, ModeIcon, LineBadge (metro line and bus number), CrowdPill, Avatar
  - add `ProfileIcon`, which maps each profile to its lucide icon, replacing the emoji everywhere
- **Done when:** the whole app shows the new colours, fonts and icons with no layout change; gate green.

### Phase 2: Real photography set (S to M, needs your approval to download)
- Pick about 14 real photos for the shot list (3.6) from Unsplash, Pexels and Wikimedia Commons.
- Send you the list (file, source page, licence, author, size). After your OK, download, crop and convert them to WebP at 3 widths into `public/images/`.
- Add the `photoCredits.ts` register, a `<Photo>` component (srcset, lazy loading, blurred placeholder, required alt text) and the public `/credits` page.
- Replace the 4 hotlinked Unsplash URLs.
- **Done when:** no image is loaded from a third-party server; every photo is credited with its licence; gate green.

### Phase 3: App shell (M)
- New top bar, account menu and phone **bottom tab bar** (with the same link names).
- Add a "Skip to content" link, a page-header pattern (title, subtitle, actions) and a footer (credits, research, about).
- Add the page container with consistent widths, and a smooth page entry.
- **Done when:** navigation works on desktop, tablet and phone; the end-to-end test still clicks "Plan Trip" and "History"; gate green.

### Phase 4: Landing page, sign-in and sign-up (M)
- **Landing:**
  - a full-width metro photo hero, a headline, and a big **"Where to?"** search; for a guest this leads to sign-up, then to the planner with the places filled in
  - "How it works" in 3 steps
  - feature tiles with photos (metro, BMTC bus numbers and times, autos, weather, live navigation)
  - "Built for every traveller" with the profile photos
  - credibility from Research (the agreement with the baseline planners)
  - a final call to action and the footer
- **Login and Register:** a split screen with the cityscape photo, a clean form, a password show/hide toggle, and the same labels and buttons.
- **Done when:** both look finished at 375 and 1280 px; the end-to-end registration still passes; axe 0; gate green.

### Phase 5: Plan Trip, part A: map-first layout and search (L)
- **Layout:** a full-height desktop layout (side panel plus the map), and the phone bottom sheet with 3 heights. The map is resized whenever the panel or sheet changes size.
- **Search card:**
  - origin and destination stacked with the swap button
  - time as "Leave now / Depart at"
  - the profile picker as icon chips with a "more" sheet
  - the demo weather switch tucked into a "Demo options" disclosure, with the same group, labels and texts
  - the preferences summary
  - a big Find Routes button
- **Map:**
  - Voyager tiles with the OSM fallback
  - styled route lines (casing, mode colours, dotted walking)
  - pins in the line colour, Google-style start and end markers
  - floating, re-styled map controls
  - "Demo Transit" as a neat tag
- **Loading:** a skeleton of the result cards, plus the existing progress messages.
- **Done when:** the whole search flow works on desktop and phone; every Plan Trip test and the end-to-end test pass; gate green.

### Phase 6: Plan Trip, part B: results, route details, every state (L)
- **Route cards (Citymapper style):**
  - big duration and arrival time
  - a strip of mode icons and line badges (`[Purple]`, `[🚌 356]`)
  - fare, walking metres, crowd pill and weather note
  - "Best for you" highlighted with its reasons
  - other suitable options and the ranked candidates in collapsible sections
- **Route details:** a vertical timeline coloured by mode, with:
  - bus number and direction, and the next departures as chips
  - a collapsible list of stops
  - boarding and arrival times
  - crowd per leg
- **Actions:** a big **Start** button (Go green), Save Journey and save destination.
- **States:** "Not suitable for you" and "Not running then" in a tidy collapsible list; the weather banner, "Why no route", errors and the demo fallback re-styled.
- Road-routing results get the same card style.
- **Done when:** every results test (BestForYou, RouteCard, SegmentTimeline, MultimodalResults, ExcludedRoutes, WeatherBanner) passes unchanged; all 7 profiles are checked by eye in clear weather and in demo rain; gate green.

### Phase 7: Live navigation (M)
- Google-Maps-style instruction banner (big arrow, distance, the street, the next step).
- A bottom card with ETA, minutes and distance left, and Exit.
- A re-centre button and the Voyager map.
- The demo tray (Simulate, speeds, Go off route).
- Clear "Rerouting…" and "Arrived" screens.
- Phone-first: the map takes at least 50% of a 375×812 screen.
- **Done when:** all ActiveNavigationView tests pass unchanged; a full simulated journey runs to the end on desktop and phone; gate green.

### Phase 8: Dashboard, Saved Routes, History (M)
- **Dashboard:**
  - a greeting header with the commuter photo band and the "Where to?" search
  - saved places as chips, quick transit hubs
  - recent journeys as compact route cards
  - the mobility profile card, TransitDNA insights, statistics and sustainability as stat tiles
- **Saved Routes:** cards with the mode strip, *Plan again* and delete.
- **History:**
  - journeys grouped by date, with the details drawer, star rating and feedback
  - delete actions with a confirm step
  - an empty state with a photo
- **Done when:** every feature in 5.3 for these screens works; the end-to-end feedback step passes; gate green.

### Phase 9: Profile, Research, Admin, Not found (M)
- **Profile:** a grouped settings list (iOS-settings style), and the mobility profile as icon cards with descriptions.
- **Research:** stat tiles, a clean comparison table and charts (following the dataviz guide), with the existing texts kept.
- **Admin:** stat tiles, a proper data table (search, sort, inline actions), modals for create and edit.
- **Not found:** the night-metro photo and "Go Home".
- **Done when:** every feature in 5.3 for these screens works; axe 0 on all four, the admin console included (it was not scanned in Phase 7); gate green.

### Phase 10: Polish and verification (M)
- **Consistency sweep:** spacing, radii, colours. No stray classes; leftover hand-written shadows replaced with tokens.
- **Motion:** sheet and card transitions, all off under reduced motion.
- **Optional dark mode:** a token-based dark theme and a dark map at night; it can be dropped if time is short.
- **Performance:** image sizes, font subsetting, lazy loading; Lighthouse on Landing and Plan Trip, aiming for 90+ in Performance and Accessibility.
- **Full audit:**
  - axe on every screen at both widths
  - a keyboard-only run through the main journey
  - Chrome, Edge and Firefox, plus a real phone on the live site
- **Record:** "after" screenshots next to the "before" ones, and `UI_REDESIGN_VERIFICATION.md`.
- **Done when:** the verification record is written and the live site is checked.

**After the redesign:** Feature-upgrade **Phase 8 (documents)**: README, report, demo script, slides, viva answers and the paper note, using the **new** screenshots. It can start as soon as Phase 7 is done, because the report's key screenshots (planner, results, navigation) come from Phases 4–7.

---

## 7. Schedule and the cut line for 19 November

| When | Phases |
|---|---|
| 16–17 Nov | 0, 1, 2, 3, 4 |
| 17–18 Nov | 5, 6, 7 |
| 18–19 Nov | 8, 9, 10, then the documents |

This is tight. To keep the deadline safe:

- **Must have for the demo:** 0, 1, 3, 4, 5, 6, 7. These are what an examiner sees.
- **Phase 2** feeds Phase 4. If photo approval is slow, Phase 4 goes ahead with the current photos and swaps them later.
- **Should have:** 8, 9.
- **Could have:** dark mode and the deeper polish in 10.
- If time runs out, the unfinished pages still work and already wear the new design system from Phase 1, so nothing looks broken.

---

## 8. Decisions (defaults I will use unless you say otherwise)

| Decision | Default |
|---|---|
| Brand colour | New Transit Blue plus Go Green (3.1). The alternative is to keep today's sky blue and only refine it |
| Fonts | Keep Inter and Plus Jakarta Sans, self-hosted |
| Map tiles | CARTO Voyager, with OSM as the fallback |
| Photos | Unsplash, Pexels and Wikimedia Commons with full credits; downloaded only after you approve the list |
| Dark mode | Optional, in Phase 10 |
| Pushing to `main` | After each phase passes the gate (this redeploys the live site, as in the earlier phases) |

---

## 9. Risks and how they are handled

| Risk | Handling |
|---|---|
| The end-to-end test finds the suggestions list by its `absolute top-full` classes | Keep those classes on the dropdown (or add a test ID and update the test in the same commit) |
| Nav links shown twice (top bar plus bottom tabs) | Only one set is rendered visible per breakpoint (`display:none` on the other); checked by the end-to-end test |
| The bottom sheet fights with panning the map on touch screens; Leaflet draws grey tiles after a resize | Drag only by the handle; call `invalidateSize` after every panel or sheet change; test at 375 px |
| Tile provider limits or downtime | Attribution plus an automatic fallback to OSM tiles |
| Photo licences; people in photos | Licence checked per photo; credits page; no photo implies a real person's medical condition; prefer photos where faces are not the focus for sensitive categories |
| Big pages (Plan Trip 847 lines, Admin 843) | Split into presentational pieces only; state and handlers stay in the page |
| Self-hosted fonts add weight | Latin-only variable woff2, about 100 KB in total, cached |
| Text over photos fails contrast | Gradient scrims; contrast measured on the actual photo (as in Phase 7) |
| Scope versus deadline | The cut line in section 7; each phase ships on its own |

---

## Progress log

| Phase | Status | Commit | Notes |
|---|---|---|---|
| 0 Safety net and baseline | ✅ done | see git log | Baseline in `docs/ui-redesign/BASELINE.md`: frontend 122, backend 33/33, end-to-end passes; 45 screenshots with axe. 5 existing findings (not-found contrast ×3, landing 768 contrast ×2, admin 768 sideways scroll). Audit: `npm run ui:audit`. Contract checklist: `docs/ui-redesign/UI_CONTRACT.md` |
| 1 Design system foundation | ✅ done | see git log | New tokens (Transit Blue, Go Green, bus/auto colours, 3 shadows, radii, motion); self-hosted fonts; 14 new shared components + 5 restyled; ~80 emoji → lucide icons; 41/41 contrast pairs (`npm run ui:contrast`); tests 144 (was 122, +22 for the kit); end-to-end passes; audit: 45 screens, none worse than baseline. Record: `docs/ui-redesign/PHASE_1_DESIGN_SYSTEM.md`. One regression found and fixed by the audit (Profile page sideways scroll at 375 px) |
| 2 Real photography | ✅ done | see git log | 11 real photos (7 Unsplash, 4 Wikimedia Commons) approved by the owner; self-hosted WebP at 640/1280/1920 (3.9 MB total), `<Photo>` component, `/credits` page, tests that fail on an uncredited photo or any hotlinked image. No people-with-disabilities photos by choice. Also fixed: undefined `navy-950`/`brand-950` (hero overlay), 3 Landing contrast failures found by a new scrolled audit capture. Tests 160; audit 51 screens, none worse than baseline. Record: `docs/ui-redesign/PHASE_2_PHOTOS.md` |
| 3 App shell | ✅ done | see git log | Compact phone top bar + 5-tab bottom bar (never shown together with the desktop links), account menu with Escape/focus return, skip link, footer, page fade-in, `PageHeader` in the kit. Tests 180 (+20); end-to-end passes; audit 51 screens none worse. Record: `docs/ui-redesign/PHASE_3_APP_SHELL.md` |
| 4 Landing and auth | ⏳ | | |
| 5 Plan Trip A: layout and search | ⏳ | | |
| 6 Plan Trip B: results and details | ⏳ | | |
| 7 Live navigation | ⏳ | | |
| 8 Dashboard, Saved, History | ⏳ | | |
| 9 Profile, Research, Admin, 404 | ⏳ | | |
| 10 Polish and verification | ⏳ | | |
