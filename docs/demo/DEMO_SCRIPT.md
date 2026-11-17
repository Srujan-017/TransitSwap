# TransitSwap — Demo Script (about 10 minutes)

Live site: <https://transit-swap.vercel.app> · Demo login: on the sign-in page press **Fill in the demo account** (`demo@transitswap.app` / `Demo@1234`).
Everything below was rehearsed against the redesigned interface (UI redesign Phases 0–10).

## Before you start (5 minutes earlier)

1. **Wake the backend.** The free host sleeps when idle and the first request can take about 30 s (measured: 33 s). The site now asks for the backend's health page as soon as it opens, but do not rely on that for a demonstration: open <https://transitswap-backend.onrender.com/api/health> in a spare tab and wait for `"database":"connected"`. (`docs/demo/keep-warm.workflow.yml.example` is an optional GitHub workflow that pings it every 10 minutes; copy it to `.github/workflows/` to use it.)
2. Open the site in one browser window, signed out. Close other tabs. **Zoom to 100 %** (the live-navigation screen is designed for a window at least 700 px high; a laptop in full screen is ideal).
3. Press **F5 once** so the page and its photographs are fresh in the cache.
4. **You do not need to type any place names.** Plan Trip has four **"Try a demo trip"** buttons; they work without the place-search service, so a slow or rate-limited network cannot break the demonstration.

## Say this first (30 seconds)

> "TransitSwap plans Bengaluru metro, bus, auto and walking journeys. Three things up front: the transit, accessibility and crowd data are **synthetic demonstration data**; the benchmark numbers are **simulated**, not measured on real riders; and I have **not run a user study**. Everything you will see is computed by the real engine on that demonstration network."

## Flow

| # | Do | What to point out |
|---|---|---|
| 1 | Land on the home page. Scroll slowly past "How it works" and the six photo tiles. Click **Sign in**, press **Fill in the demo account**, then **Sign in**. | Real photographs, each credited on `/credits`. The seven travel profiles and their rules in plain words, and "1,680 route checks, 0 rule violations". Demo credentials are on the page itself. |
| 2 | **Dashboard.** Walk the page top to bottom without clicking. | Greeting over a photo and the one search bar; **TransitDNA** weights as bars (with the honest note when nothing has been learned yet); recent journeys with mode chips; travel statistics computed from real saved journeys; "Simulated Benchmark" labels. The transit hubs and saved places open Plan Trip with that place already chosen. |
| 3 | **Plan Trip.** Press the demo trip **Hoodi → MG Road**, then **Find Routes**. | Map and journey panel side by side. Ranked candidates as route cards: big duration, fare, the coloured bar of legs (same colours as the map), "Why recommended" tags (only shown when true for this candidate set), arrival prediction interval and Monte Carlo missed-connection risk, "Demo data" labels. Pick another card: the green **Start Journey** button moves under the selected one. |
| 4 | Same trip, press the **Wheelchair** profile, **Find Routes** again. | A route is still recommended, and a collapsed note says "N other routes were excluded for your Wheelchair profile". Open it: *Indiranagar Metro is explicitly not wheelchair accessible*, *Trinity Metro is marked not accessible*. This is the headline: unusable routes are removed **before** ranking and every exclusion has a typed reason. *(Checked by the end-to-end test `demo-trips.spec.ts`.)* |
| 5 | Open **Date and time** (Depart at), pick a **weekday** (for example Monday 16 Nov 2026 — not a Saturday or Sunday), time `08:30`, search again with Wheelchair. | The **crowd rule**: MG Road has a HIGH reading around 08:00, so the only candidate is excluded and the page says that three routes existed and why each was ruled out (two for stations, one for crowd). Change the time to `14:30` and search again: the route comes back — crowd data only covers the hours around each reading, and only on the day type it was recorded for. *(Checked on the live site: weekday 08:30 → no route; weekday 14:30, weekday 21:36 and Saturday 08:30 → one route.)* |
| 6 | Press the demo trip **Silk Board → Majestic** (reload `/plan` first so the buttons are back), **Find Routes**, open **Step-by-step journey**. | **Bus number badges** ("Bus 356"), direction ("Towards …"), next departures and arrival time, per-leg crowd, "Change to the Green Line at RV Road Metro". Buses are from a demonstration timetable and the page says so. |
| 7 | Press **Start Journey**. On a laptop the screen splits: a panel with the next instruction, arrival time and every step of the journey, and a large live map. Press **Simulate journey**; try **10×** and **60×**; then **Go off route**. | Google-Maps-style banner (distance, instruction, "Then …"), voice guidance toggle, arrival estimate. **Go off route** triggers **Rerouting…** and a new route. A bus or metro position is **not** live-tracked and the screen says so ("About live tracking"). The banner turns green on arrival; **Done** returns. |
| 8 | **Save Journey** (before exiting navigation if needed), open **History**, expand the journey, give 4 stars, **Submit Feedback**. | Journeys are grouped by day; the feedback feeds TransitDNA learning (after 5 recorded choices a per-user model is trained). **Profile** shows the learned weights and **Reset Learned Weights**. |
| 9 | **Research** page. | The route-ranking benchmark is **pre-computed**, so it appears instantly: agreement with 5 baseline planners, the ablation (which feature changes the decision), speed. Say the honest part: the learned model scores about **87.5 % vs 91.7 % for the rule baseline** on the synthetic benchmark — it does not beat the rules. |
| 10 | (Optional, needs an admin account) **Admin → Accessibility**: mark a lift broken at a station on your route, search as Wheelchair, then **restore the lift**. | Operator edits take effect on the next query; forms open in dialogs. **Always restore afterwards.** |

If someone asks about accessibility of the app itself (30 seconds): press **Tab** once on any page — the first stop is "Skip to main content"; the place search works with the arrow keys and Enter; Lighthouse accessibility is **100** on the pages measured and an axe-core scan of **87 screens** at phone, tablet and laptop widths has **0 findings**. It has not been tested with a screen reader or on real phones.

## Close (30 seconds)

> "Constraints first, ranking second: a route a rider cannot use is never shown as a recommendation, and every exclusion explains itself. On 520 simulated trips, a fastest-route planner would have given wheelchair users an unusable route on 35.6 % of trips; TransitSwap never does. Limitations: synthetic data, simulated benchmark, no user study — all stated up front."

## Known dead ends — and what to do

| Problem | Fix |
|---|---|
| First request is very slow | Backend was asleep; wait, then retry once. |
| Search box shows no suggestions | Nominatim rate limit or slow network: use a **demo trip** button, a saved destination, or click the map ("What's here?") to set a point. |
| The demo trip buttons are missing | They show only while no start or destination is chosen. Reload `/plan`. |
| A wheelchair search returns no route on a weekday morning | That is the crowd rule working (MG Road, Majestic and a few other stations have HIGH readings around 08:00–09:00; others around 18:00). Show the reasons list, then change the time. |
| A trip far outside Bengaluru | "Outside the demo network" message — the dataset covers one corridor, not the whole city. |
| Voice is silent | Browser blocked speech or is muted; the text instruction on screen is the same; say so. |
| The live-navigation map looks small | The window is very short: it uses the full screen, so press F11 or zoom out once (Ctrl and minus). On a laptop the map takes everything beside the side panel. |
| Photographs look blurry or show only grey | The browser kept an old answer; hard-reload once (Ctrl+Shift+R). The site now versions its picture URLs so this should not happen after the first load. |
| Admin step | Skip if you have no admin account (see the note in `PHASE_15_VERIFICATION.md`). Never leave a lift marked broken. |
