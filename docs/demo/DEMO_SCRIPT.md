# TransitSwap — Demo Script (about 10 minutes)

Live site: <https://transit-swap.vercel.app> · Demo login (shown on the login page): `demo@transitswap.app` / `Demo@1234`

## Before you start (5 minutes earlier)

1. **Wake the backend.** The free host sleeps when idle; open <https://transitswap-backend.onrender.com/api/health> and wait for `"database":"connected"` (can take ~30 s).
2. Open the site in one browser window, signed out. Close other tabs. Zoom to 100–110 %.
3. Have a second tab on the **Research** page ready only after you are signed in.
4. If the internet is poor, search suggestions (they come from OpenStreetMap's Nominatim) may be slow: **click the map instead of typing** to set a start and a destination (the map reverse-geocodes the clicked point).

## Say this first (30 seconds)

> "TransitSwap plans Bengaluru metro, bus, auto and walking journeys. Three things up front: the transit, accessibility and crowd data are **synthetic demonstration data**; the benchmark numbers are **simulated**, not measured on real riders; and I have **not run a user study**. Everything you will see is computed by the real engine on that demonstration network."

## Flow

| # | Do | What to point out |
|---|---|---|
| 1 | Open the site, click **Sign in**, use the demo account. | Demo credentials are on the page itself. Dashboard: TransitDNA weights, "Simulated Benchmark" label on the research card (honesty labels everywhere). |
| 2 | **Plan Trip**. Start: type `Hoodi Metro` and pick the first result. Destination: `MG Road Metro Station`. Profile **Standard**. **Find Routes**. | Several ranked candidates, the proportional journey bar, fare, walking, transfers; "Why recommended" tags (only shown when true for this candidate set); arrival prediction interval and Monte Carlo missed-connection risk; demo-data labels. |
| 3 | Same trip, switch profile to **Wheelchair**, **Find Routes**. | A route is still recommended, and a collapsed note says "2 other routes were excluded for your Wheelchair profile — see why". Open it: *Indiranagar Metro is explicitly not wheelchair accessible*, *Trinity Metro is marked not accessible*. This is the headline: unusable routes are removed **before** ranking and every exclusion has a typed reason. |
| 4 | Set **Date** to a **weekday** (for example Monday 16 Nov 2026 — not a Saturday or Sunday) and **Time** `08:30`, and search again with Wheelchair. | The **crowd rule**: MG Road has a HIGH reading around 08:00, so the only candidate is excluded and the page says that three routes existed and why each was ruled out (two for stations, one for crowd). Then change the time to `14:30` and search again to show the route come back — crowd data only covers the hours around each reading, and only on the day type it was recorded for. *(Checked on the live site: weekday 08:30 → no route; weekday 14:30, weekday 21:36 and Saturday 08:30 → one route.)* |
| 5 | Back to a feasible search, click **Start Journey**. Use **Next step** through to arrival; point at the speaker toggle. | Voice-guided navigation (Web Speech API); GPS is optional — the manual button always works; it says plainly that bus and metro positions are not live-tracked. |
| 6 | **Save Journey** (before exiting navigation if needed), open **History**, expand the journey, give 4 stars, **Submit Feedback**. | Feedback feeds TransitDNA learning; after 5 recorded choices a per-user model is trained. Profile page shows the learned weights and **Reset Learned Weights**. |
| 7 | **Research** page → **Run benchmark** (about 20 s the first time; talk while it runs). | Agreement with 5 baseline planners, the ablation (which feature changes the decision), speed. Say the honest part: the learned model scores about **87.5 % vs 91.7 % for the rule baseline** on the synthetic benchmark — it does not beat the rules. |
| 8 | (Optional, needs an admin account) **Admin → Accessibility**: mark a lift broken at a station on your route, search as Wheelchair, then **restore the lift**. | Operator edits take effect on the next query. **Always restore afterwards.** |

## Close (30 seconds)

> "Constraints first, ranking second: a route a rider cannot use is never shown as a recommendation, and every exclusion explains itself. On 520 simulated trips, a fastest-route planner would have given wheelchair users an unusable route on 35.6 % of trips; TransitSwap never does. Limitations: synthetic data, simulated benchmark, no user study — all stated up front."

## Known dead ends — and what to do

| Problem | Fix |
|---|---|
| First request is very slow | Backend was asleep; wait, then retry once. |
| Search box shows no suggestions | Nominatim rate limit or slow network: click the map to set the points, or type a landmark such as `MG Road Metro Station`. |
| A wheelchair search returns no route on a weekday morning | That is the crowd rule working (MG Road, Majestic and a few other stations have HIGH readings around 08:00–09:00; others around 18:00). Show the reasons list, then change the time. |
| A trip far outside Bengaluru | "Outside the demo network" message — the dataset covers one corridor, not the whole city. |
| Voice is silent | Browser blocked speech or is muted; the text instruction on screen is the same; say so. |
| Admin step | Skip if you have no admin account (see the note in `PHASE_15_VERIFICATION.md`). Never leave a lift marked broken. |
