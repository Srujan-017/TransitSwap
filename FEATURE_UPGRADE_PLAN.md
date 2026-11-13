# TransitSwap — Feature Upgrade Master Plan

**Written:** 13 Nov 2026 · **Deadline:** about 19 Nov 2026 · **Status:** Phases 1–3 done; Phase 4 next

This plan covers everything you asked for on 13 Nov. It is split into 8 phases. Each phase:

- ends with the app working,
- is tested (backend + frontend tests, a browser check, CI green),
- is pushed and checked on the live site before the next phase starts.

Nothing is left half-built between phases.

---

## 1. Everything you asked for, and the phase that does it

| # | Your request | Phase |
|---|---|---|
| 1 | Remove the "Research Benchmark Metrics" card that shows "timeout of 60000ms exceeded" | 1 |
| 2 | Map opens on Mumbai → open on Bengaluru | 1 |
| 3 | Accessibility profiles always show "Multimodal route unavailable" → always suggest the **one best option** for that person | 3 |
| 4 | Wheelchair: autos and metros only, autos preferred, **no walking** | 3 |
| 5 | Senior citizen: walking limit; autos and metros; buses only if the bus is **not crowded** | 3 |
| 6 | Pregnant: **no buses**; only low-crowd metros; **never** high-crowd metros | 3 |
| 7 | Stroller: same as pregnant | 3 |
| 8 | Heavy luggage: **autos first** | 3 |
| 9 | All accessibility profiles: autos and metros first; a bus only when needed and only if not crowded; **autos for the first and last mile** | 3 |
| 10 | Cross-check every accessibility profile and fix all the bugs | 3 (and the test matrix in 7) |
| 11 | Routes only use walk / metro / auto → **include buses**, with the **bus number**, where to board, and **bus arrival times** | 4 |
| 12 | **Weather**: in bad weather, don't make people walk | 5 |
| 13 | Station crowd almost always shows "unavailable" → **crowd data for every station** (synthetic is fine) | 2 |
| 14 | "Start Journey" only lists steps → **live map navigation like Google Maps**: live location, route on the map, turn-by-turn directions | 6 |
| 15 | Plan first, then do it step by step without breaking the project | this file |

---

## 2. What is actually wrong in the code (root causes)

| Problem you saw | Cause in the code |
|---|---|
| Benchmark card times out | The card runs 22 benchmark scenarios **live** on the free Render server. Each scenario calls the online road router (OSRM). After a cold start this takes longer than the 60-second limit (`src/services/intelligenceService.ts:167`). The Research page calls the same endpoint, so it can time out too. |
| Map opens on Mumbai | `src/components/map/MapView.tsx:341`: `defaultCenter = [19.076, 72.877]`, left over from the original Mumbai version. |
| Search can return places in other cities | Place search (OpenStreetMap Nominatim) is not limited to the Bengaluru area. |
| Accessibility profiles end in "unavailable" | 1. The only first-mile option is **walking up to 2 km** to a metro station (`ROUTING_CONSTANTS.MAX_WALK_TO_METRO_M = 2000`). That walk counts toward the 1,200 m wheelchair/stroller limit, so most routes are rejected (your screenshot: 1,359 m and 2,084 m). 2. An auto is only allowed for the **last** mile, and only from a few stations. There is **no auto for the first mile** and **no door-to-door auto**. 3. If every transit route fails a rule, nothing is left, so the page says "unavailable". |
| Other profile bugs found so far | Senior, pregnant and luggage have **no walking limit** at all. The crowd rule uses the **average** crowd of a route, so one packed station can be averaged away. No profile has any **mode preference**: a crowded bus is treated like a metro, and pregnant and stroller users can be sent on buses. Weather never removes a walking leg. |
| Buses rarely appear | The bus network is tiny: 24 stops, 10 routes of 2–5 stops each, with made-up numbers "1"–"10" (`backend/src/data/transitData.ts:188`). Most trips have no bus stop within reach. Every bus also runs at one flat frequency all day. |
| Weather barely matters | Weather only changes a route's score; it never changes which routes are built. Without an OpenWeather key the "weather" is fake and depends only on coordinates (`weatherService.ts:31`), so a third of all places always show "Demo light rain". |
| Crowd is "unavailable" | The crowd table has readings for only **14 of 65** stations, one or two hours each (`backend/src/data/crowdData.ts`). After the time-of-day fix, any other hour correctly shows "unavailable". So almost every search does. |
| No live navigation map | `ActiveNavigationView.tsx` shows a list of steps and a small map. There is no following camera, no turn arrows, no distance-to-turn and no re-routing. Location tracking (`useLiveTracking.ts`) and voice (`useSpeechNarration.ts`) already exist and will be reused. |

---

## 3. The travel rules for each profile (the core of Phase 3)

These are your rules. Where you didn't specify something, I filled the gap with real-world knowledge; those cells are marked **(added)**. Change anything you disagree with before Phase 3 starts.

| Profile | Modes it uses | Walking | Metro crowd | Buses | First and last mile | If nothing else works |
|---|---|---|---|---|---|---|
| **Wheelchair** | Metro (only step-free stations with working lifts) + auto/cab | **No walking legs.** Only the unavoidable roll from auto drop-off to station gate, at most 150 m **(added)** | LOW or MEDIUM; a HIGH-crowd metro is replaced by an auto | **Never** | Auto/cab | Door-to-door auto/cab |
| **Senior citizen** | Metro, auto, bus | At most **500 m in total**, no single walk longer than 300 m **(added: exact limits)** | HIGH avoided | Only when the bus is **LOW crowd** | Auto whenever a walk would be longer than 300 m | Door-to-door auto |
| **Pregnant** | Metro + auto | At most 500 m in total **(added)** | Only **LOW or MEDIUM**, LOW ranked first; **HIGH never** | **Never** | Auto | Door-to-door auto |
| **Stroller** | Metro (step-free, lift) + auto | At most 500 m in total **(added)** | Same as pregnant | **Never** | Auto | Door-to-door auto |
| **Heavy luggage** | **Auto first**; metro with lift or escalator | At most 400 m in total **(added)** | HIGH avoided | Only LOW crowd, always ranked below auto and metro | Auto | Door-to-door auto (often the best choice) |
| **Reduced mobility** | Metro (lift/escalator) + auto; bus only if LOW crowd | At most 400 m in total **(added)** | HIGH avoided | Only LOW crowd | Auto | Door-to-door auto |
| **Standard** | All modes, including buses with numbers and times | Normal | Shown, not filtered | Yes | Walk or auto | Several options, as now |

**Bad weather (all profiles, Phase 5).** Bad weather means rain, a thunderstorm, or a feels-like temperature of 35 °C or more **(added: the definition)**. In bad weather, any walk longer than 300 m becomes an auto. For the standard profile, walking-heavy routes are ranked lower and get a warning.

**How the "one best option" is chosen for an accessibility profile:**
1. No rule broken (modes, walking caps, no HIGH-crowd metro, buses only where allowed, metro hours).
2. A route another suitable route beats on time, fare, walking *and* crowd is dropped.
3. Preferred modes: metro-based first, then a door-to-door auto, then anything with a bus (heavy luggage: a door-to-door auto ties with metro).
4. Lowest crowd (LOW above MEDIUM) — only for pregnant, stroller and senior; for the others only HIGH matters, and HIGH is excluded anyway.
5. Fewest metro/bus changes (autos at the ends are not counted as changes).
6. Least walking.
7. Lowest cost, where cost = fare + Rs 2 per minute (heavy luggage: quickest first).

The page shows **one "Best for you" route** with a short *"Why this suits a wheelchair user"* list. Two more suitable options sit behind *"Show other suitable options"*. The routes that were ruled out stay available behind *"Why other routes weren't suggested"*. The red "Multimodal route unavailable" box goes away: because a door-to-door auto always exists, there is always an answer inside Bengaluru.

**Real-world details I would add (tell me if you don't want them):**
- **Wheelchair:** the auto is labelled **"Auto / accessible cab"**, because a normal Bengaluru auto is not wheelchair-accessible unless the rider can transfer out of the wheelchair. The route card adds the tip "Metro stations have lifts and staff assistance at the customer-care counter."
- **Service hours:** metro is not suggested outside its operating hours (about 05:00–23:00, synthetic), and buses respect first and last bus times. A 23:30 search therefore suggests an auto instead of a metro that isn't running.
- **Pregnant and senior:** if the crowd is HIGH now but lower 15–30 minutes later, the existing Smart Departure feature suggests leaving a little later.

---

## 4. The phases

### Phase 1 — Quick fixes (about half a day)
- **Remove** the "Research Benchmark Metrics" card from the Dashboard.
- **Research page:** stop running the benchmark live. It will show the **pre-computed** benchmark results (the same numbers as the paper and README, labelled "pre-computed"), so it loads instantly and can never time out. *(If you want it removed from the Research page as well, say so — it's a one-line change.)*
- **Map** opens on Bengaluru (12.9716, 77.5946), zoom 12. The "locate me" button still moves the map to the user's location.
- **Place search** limited to the Bengaluru area, so "MG Road" returns Bengaluru's MG Road.

**Done when:** the Dashboard has no benchmark card; the Research page loads in under 2 s on the live site; the map opens on Bengaluru; searching "MG Road" suggests Bengaluru results first.

### Phase 2 — Crowd data for every station, every hour (about half a day)
- Generate a **synthetic hourly crowd profile** for **all 41 metro stations and every bus stop**:
  - covers weekdays and weekends, 05:00–23:00
  - each station gets a type: interchange (Majestic), city centre (MG Road), IT corridor (Whitefield, Electronic City), residential or quiet
  - each type follows the typical shape of morning (8–10) and evening (17–20) peaks, with busier weekend afternoons near shopping areas
  - documented and labelled synthetic
- Bus crowd is modelled **per route and hour** (bus number + time), not just per stop.
- Crowd is worked out **for each metro and bus leg**: crowd where you board and where you get off. A route's crowd is its **most crowded leg**, not the average.
- Inside the network, crowd is never "unavailable" again. Rider crowd reports keep blending in (70/30), as now.

**Done when:** every metro and bus leg on a route card shows LOW, MEDIUM or HIGH; MG Road shows HIGH on a weekday at 08:30 and LOW at 22:00; tests cover the peak and night cases.

### Phase 3 — Profile-aware routing: always one best option (about 1.5 days, the biggest phase)
1. **Reproduce first.** Run a test matrix: 7 profiles × about 12 trips around Bengaluru × 3 times (morning peak, afternoon, night). Record exactly what each profile gets today, including every bug, before changing anything.
2. **New route types:**
   - **auto → metro** (first mile)
   - **metro → auto** (from every station, not just a few)
   - **auto → metro → auto**
   - **door-to-door auto/cab**
   - **bus legs** where the profile allows them
3. **Profile rules from §3 as code**, in one place (`profilePolicy`): allowed modes, walking limits, crowd limits per mode, bus rules, auto preferences.
4. **"Best for you" choice** (§3 order) with plain-language reasons; up to two more suitable options; excluded routes still explained.
5. **New UI:** "Best for you" card, *Show other suitable options*, *Why other routes weren't suggested*. The red "unavailable" box is removed.
6. **Fix every bug the matrix finds**, with a regression test for each.

**Done when:**
- every profile gets a route for every test trip inside Bengaluru;
- a wheelchair route never contains a walking leg longer than 150 m and never a bus;
- a pregnant or stroller route never contains a bus or a HIGH-crowd metro;
- a senior route contains a bus only when the bus is LOW crowd;
- luggage gets an auto-first route;
- the standard profile still shows several options;
- all tests pass.

### Phase 4 — Buses with numbers, stops and arrival times (about 1 day)
- **Bigger bus network:** about 50–60 stops and 15–20 routes along the main Bengaluru corridors (Outer Ring Road, Old Airport Road, Hosur Road, Bellary Road, Mysuru Road, Kanakapura Road, Majestic ↔ Shivajinagar). They use **real BMTC-style route numbers** (for example 500D, 335E, 356, 201, KBS-1), labelled "route numbers modelled on BMTC; stops, coordinates and timings are synthetic".
- **Timetables:**
  - first and last bus per route
  - a bus every 6–8 min at peak and every 12–15 min off-peak
  - for the chosen departure time, the **next 3 buses** ("08:42, 08:50, 08:58")
  - the **arrival time** at the stop where you get off
- **Make buses actually appear:** dedicated walk → bus → walk, bus → metro and bus → auto routes. The standard profile always shows **at least one bus option** when a sensible one exists, even if it isn't the fastest.
- **Bus leg on the route card:** a coloured **route-number badge**, *"towards Kadugodi"*, board at stop X, get off at stop Y after N stops, next buses, arrival time, bus crowd (from Phase 2).

**Done when:** a standard search such as Silk Board → Marathahalli or Majestic → Shivajinagar shows a bus option with a number, direction, next three departures and arrival time; a senior search shows the bus only when its crowd is LOW.

### Phase 5 — Weather (about half a day)
- **Real current weather** for Bengaluru from Open-Meteo. It's free and needs no API key, so it works on the live site. If the request fails, the page shows "weather unavailable" instead of fake rain.
- **Bad-weather rule** (§3): walks over 300 m become autos for every profile. The standard profile ranks walking-heavy routes lower and shows a banner: *"Rain now — routes with less walking are shown first."*
- **Demo weather switch** on Plan Trip (Live / Clear / Rain / Heavy rain / Heat), clearly labelled "demo". The viva day may be sunny, and this lets you show the rule anyway.

**Done when:** with "Rain" selected, no profile's route has a walk longer than 300 m, and the banner shows; with "Clear", routes are unchanged from Phase 4.

### Phase 6 — Live navigation like Google Maps (about 1.5 days)
- **Full-screen map** while navigating:
  - live **blue location dot** with an accuracy circle and a direction arrow
  - the route drawn in mode colours, with the part already travelled greyed out
  - the camera **follows you**, and a **Re-centre** button appears if you move the map
- **Top banner:** the next instruction with a turn arrow and distance, e.g. *"In 150 m, turn right onto 80 Feet Road"*. For walking and auto legs these come from the road router's real turn data.
- **Bottom panel:**
  - **arrival time** (clock), time and distance left, and the current leg
  - **Bus:** *"Bus 500D arrives in 4 min — board at Silk Board"*, then *"3 stops left"*, then **"Get off at the next stop"**
  - **Metro:** stop-by-stop progress and which line to change to
- **Voice prompts** at about 200 m, 50 m and at the turn (mute button).
- **Automatic progress** as you reach each point. **Re-routing** if you go more than about 50 m off the route ("Rerouting…").
- **Screen stays awake** during navigation.
- **Simulate journey** button (labelled demo): moves the blue dot along the route at a realistic speed (sped up), so the navigation can be demonstrated **indoors**, where GPS doesn't move.

Honest limit, stated in the app: a website cannot track location while the phone screen is off or the browser is in the background. Bus and metro positions are not live (no real-time feed).

**Done when:** on a phone over the live HTTPS site, the dot follows your real position and the camera follows it; turn instructions and voice work on a walking leg; going off-route triggers a reroute; Simulate journey runs the whole route to "You have arrived"; on a laptop the simulation works without GPS.

### Phase 7 — Full verification (about half a day)
- Re-run the Phase 3 test matrix: 7 profiles × 12 trips × 3 times × 2 weathers. Every result is checked against the §3 rules automatically.
- All backend and frontend tests, type-check and build pass; CI is green.
- Accessibility scan (axe-core, WCAG 2.1 A/AA) of the new screens: "Best for you" card, bus legs, the navigation screen.
- Live-site check on a laptop and a phone.

### Phase 8 — Documents (about half a day)
- Update README, the project report (new chapters for profile routing, buses, weather, navigation), the demo script, slides and viva answers.
- **IEEE paper:** see decision D2 below.

---

## 5. Schedule

| Day | Work |
|---|---|
| Fri 13 Nov | Phase 1, start Phase 2 |
| Sat 14 Nov | Finish Phase 2, Phase 3 |
| Sun 15 Nov | Finish Phase 3, Phase 4 |
| Mon 16 Nov | Phase 5, start Phase 6 |
| Tue 17 Nov | Finish Phase 6 |
| Wed 18 Nov | Phase 7, Phase 8 |
| Thu 19 Nov | Buffer / deadline |

It is tight but fits. If time runs short, the parts of Phase 6 most safely cut are voice and re-routing. The map, live dot, follow camera, turn banner and simulation stay.

---

## 6. Decisions (the defaults I'll use unless you say otherwise)

- **D1. Research page benchmark:** show the pre-computed results (instant), rather than deleting the page section. The Dashboard card is deleted, as you asked.
- **D2. IEEE paper:** the new auto legs, buses and crowd data would change every number in the paper. **Recommended:** keep the paper's experiment as a fixed, versioned setup, so its numbers stay exactly reproducible and the paper doesn't need rewriting days before the deadline. The paper then gets one or two sentences saying the deployed app adds door-to-door auto fallback, denser crowd data and buses, which the paper's experiment did not evaluate. *(The alternative is re-running everything and rewriting the results, about one extra day.)*
- **D3. "Low crowd" for buses** means LOW only. For metros, LOW or MEDIUM is allowed (LOW ranked first) and HIGH is excluded. Reason: a bus means standing, steps at the door and sudden braking, so its rule is stricter.
- **D4. Wheelchair autos** are labelled "Auto / accessible cab" (see §3).

---

## 7. Risks and how each is handled

| Risk | Handling |
|---|---|
| A change breaks something that worked | Every phase runs all tests; each phase is pushed alone and checked on the live site; any phase can be reverted on its own |
| The free Render server is slow | The new route types use the offline road model as a fallback, as now; the benchmark becomes pre-computed |
| GPS can't be shown indoors at the viva | Simulate journey (Phase 6) |
| Fake data presented as real | Everything synthetic stays labelled: crowd, bus timings, bus stops, demo weather |
| The phone browser blocks location or voice | Clear messages, plus the manual "Next step" button stays |

---

## 8. Progress log

| Phase | Status | Notes |
|---|---|---|
| 1. Quick fixes | ✅ done 13 Nov | Dashboard benchmark card removed. Research page shows a pre-computed snapshot (`src/data/benchmarkSnapshot.json`, regenerate with `backend/scripts/generate-benchmark-snapshot.ts`; re-run after Phases 3–5). Map opens on Bengaluru (12.9716, 77.5946, zoom 12). Place search prefers Bengaluru (`viewbox`, `countrycodes=in`; results elsewhere in India still available but ranked lower). 37 frontend tests, geocoding API test, both type-checks pass |
| 2. Crowd data | ✅ done 13 Nov | Complete synthetic hourly crowd profile for all 41 metro stations and 24 bus stops, weekday and weekend, 24 h (`backend/src/data/crowdData.ts`; four station types with documented load curves; the original 16 spot readings kept as anchors in `LEGACY_CROWD_DATA`). Bus crowd per route and hour. Crowd per metro/bus leg, judged where the rider boards and gets off at the time they will be there; route crowd = most crowded leg (was the average). Each leg shows "Crowd: LOW/MEDIUM/HIGH" on the route card. Walk/auto-only routes: LOW, not applicable. Also fixed: user reports could never push a quiet station above MEDIUM (blend cut-offs now 1.6/2.4). Paper stays pinned to commit `3f36ef6` (decision D2). 29/29 backend files strict, 39 frontend tests |
| 3. Profile-aware routing | ✅ done 14 Nov | `profilePolicy.ts` (the rules, one place), `tripPlanner.ts` (planning pipeline moved out of the controller so the API and the test matrix run the same code). New candidates: door-to-door auto, auto/walk first and last mile at the 4 nearest stations each end, short walk-only. Accessibility profiles: pool → station/walking rules → profile rules (buses, walking caps, crowd, metro hours) → drop dominated routes → best per option, top 3, "Best for you" + reasons + tips. Every Bengaluru trip now has an answer (standard profile too: auto fallback). Matrix (7 profiles x 12 trips x 3 times = 252): before 153 problems (wheelchair had no answer in 20 of 36); after 0. Also fixed: reduced-mobility exempt from crowd rule, no walking cap for senior/pregnant/luggage, buses for wheelchair/pregnant/stroller. 30/30 backend files strict, 45 frontend tests |
| 4. Buses | pending | — |
| 5. Weather | pending | — |
| 6. Live navigation | pending | — |
| 7. Verification | pending | — |
| 8. Documents | pending | — |
