# UI redesign: verification record

**Date:** 17 Nov 2026 · **Scope:** the whole redesign, Phases 0 to 10 (the plan is `UI_REDESIGN_PLAN.md`; each phase has its own record next to this file). This is what was checked at the end, what the numbers were at the start, and what was **not** checked.

## 1. Before and after

| | Before (Phase 0, `4b33eb8`) | After (Phase 10) |
|---|---|---|
| Frontend tests | 122 | **333** (every earlier test kept; two deliberate contract changes, both recorded in Phases 5) |
| End-to-end tests | 1 (register, plan, save, feedback) | **2** (that one, unchanged, and a keyboard-only version of the same journey) |
| Audit: screens scanned (axe-core WCAG 2.1 A/AA + sideways-scroll check) | 45 (15 screens × 3 widths) | **87** (29 × 3: adds the empty, filled, bus, wheelchair-in-rain, all seven admin tabs and the admin dialog) |
| Audit findings | **5** (not-found contrast ×3 widths, landing contrast at 768 px, admin sideways scroll at 768 px) | **0** |
| Contrast check (design-token pairs) | none | **41 / 41** pass |
| Photos | none | 11 real photographs, all credited on `/credits`; a test fails on an uncredited or hotlinked image |
| Map share of a 375×812 phone while navigating | not measured | **52%** (50% with the demo controls up), asserted by the audit |
| Main JavaScript chunk | 320 kB (102 kB gzip) | 338 kB (105 kB gzip), with the same lazy-loaded pages |
| Backend | unchanged | **unchanged** (no backend file was edited by the redesign) |

Side-by-side pictures of 11 screens at 1280 and 375 px are in [`compare/`](compare/) (`<screen>-<width>.png`, before on the left, after on the right). The full-page "before" set is in `before/`; each phase's `results.json` is kept for comparison.

## 2. Checks run in Phase 10

| Check | Result |
|---|---|
| Type-check | clean |
| Frontend tests | 333 pass |
| Build | builds |
| Contrast check, 41 pairs | 41 / 41 |
| End-to-end, both specs, real backend on an in-memory database | pass |
| Audit, 87 screens at 375, 768 and 1280 px | **0 findings** |
| Continuous integration on `main` | **green on every phase's commit, Phases 1 to 10** |

### Keyboard-only run
`e2e/keyboard-journey.spec.ts` signs up, picks both places, plans, saves and sends feedback with **no mouse and no programmatic focus**: every control is reached by pressing Tab and used with Enter, Space or the arrow keys. It found and fixed three real problems:

1. **No skip link on five pages** (landing, sign in, sign up, credits, not found); only the signed-in layout had one. Now one shared `SkipLink` is the first stop everywhere, and each page's `<main>` can take focus (a unit test pins it for all five).
2. **The place search had no keyboard handling at all.** The suggestions were buttons you could only reach by tabbing past the input. It is now a WAI-ARIA combobox: ArrowDown/ArrowUp move through the suggestions (wrapping), Enter picks the highlighted one (and never picks for you when none is highlighted), Escape closes, and screen readers hear "expanded/collapsed" and the active option.
3. **Show-password buttons were 24 px** (Lighthouse's target-size check, which axe's 2.1 rules do not include). Now 44 px.

### Lighthouse (lab, Chrome 153 attached through its DevTools port)

**On the live site** (`transit-swap.vercel.app`, after the Phase 10 deploy; three runs on a phone for the landing page):

| Page | Mobile P / A / BP / SEO | Desktop P / A / BP / SEO |
|---|---|---|
| Landing | **96, 99, 96** / 100 / 100 / 100 (LCP 1.0 to 1.2 s) | 100 / 100 / 100 / 100 |
| Sign in | 100 / 100 / 100 / 100 | not run |
| Sign up | 99 / 100 / 100 / 100 | not run |

Before the Phase 10 deploy the live landing page scored 71 on a phone (blocking time 1000 ms) and 92 on SEO; `/robots.txt` now returns a real file.

**Local production build** (served without compression, so slower than the live site), mobile = Lighthouse's default throttling (4× CPU, slow 4G), desktop = its desktop preset:

| Page | Mobile P / A / BP / SEO | Desktop P / A / BP / SEO |
|---|---|---|
| Landing | **~85** / 100 / 100 / 100 | 99 / 100 / 100 / 100 |
| Sign in | 95 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Sign up | 98 / 100 / 100 / 100 | 100 / 100 / 100 / 100 |
| Credits | 82 / 100 / 100 / 100 | 99 / 100 / 100 / 100 |

(P = performance, A = accessibility, BP = best practices.) **Accessibility is 100 and SEO is 100 on every page measured.** Before this phase, sign in scored 95 accessibility (the 24 px button) and every page 91 to 92 SEO (the missing `robots.txt`: the host answered `/robots.txt` with the app's HTML).

The landing page on a phone scored 64 to 72 at the start, almost all of it **total blocking time** (about 700 to 1000 ms), not loading speed. The below-the-fold sections now use `content-visibility: auto`, so the browser skips laying them out until they are near the screen: five repeated runs gave 83 to 86, with blocking time about 100 ms. Lighthouse's phone score swings by about 10 points between identical runs, so treat "about 85" as a range, not a promise.

The plan's target was 90+ for performance and accessibility on Landing and Plan Trip. **Landing: met on the live site** (performance 96 to 99 on a phone, 100 on desktop; accessibility 100). The local figure of about 85 is the same code served uncompressed, so it is the more pessimistic of the two.

**Plan Trip was not measured by Lighthouse**: it needs a signed-in session, and Lighthouse's own browser cannot hold one here. Its behaviour is covered by the audit (axe at three widths, the map-share assertion) and both end-to-end tests.

## 3. Consistency sweep

Removed every `text-[9px]`, `text-[10px]` and `text-[11px]` (now 12 px, the smallest size used), every hand-written `shadow-[…]` (now the `shadow-card` token), and every `rounded-2xl`/`rounded-3xl` (now `rounded-panel`); small grey text on white moved from `navy-400` to `navy-600`. Under `prefers-reduced-motion`, pulses stop and transitions become instant (the loading spinner keeps turning, since it is information, not decoration).

## 4. Decisions

* **Dark mode: dropped.** The plan called it optional. It would touch every token and every one of 87 screens, and each would need contrast re-checking; a half-checked dark theme is worse than none. The tokens are in one place (`src/index.css`), so it can be added later without rewriting components.
* **Cross-browser:** see §5.

## 5. What was not checked (read this before the viva)

* **Real phones.** Nothing here was run on a physical phone: the safe-area padding under the tab bar, the sticky Save bar on Profile, touch dragging of the planner sheet, real GPS and real voice guidance are all verified only in a desktop browser at phone width.
* **Other browsers.** Only Chromium was used (Chrome and Edge share its engine). **Firefox and Safari were not run**: their browsers are not installed on this machine and fetching them is a download I did not make without asking. Features most likely to differ: `content-visibility`, `backdrop-blur`, `100dvh`, and the `max-lg:` and `min-[…]:` CSS.
* **Screen readers.** The structure is checked by axe and by tests (roles, names, `aria-pressed`, `aria-expanded`, live regions, dialogs with focus kept inside), but nobody listened to it in NVDA, JAWS or VoiceOver.
* **Plan Trip performance** (above) and the **CARTO map style** (it needs a free key that was not available; OpenStreetMap tiles are used).
* **WCAG 2.2 and beyond axe.** axe-core 4.8.4 checks the WCAG 2.1 A/AA rules it can test automatically; that is roughly a third of the criteria. Manual criteria (reading order, meaningful sequence, error suggestion wording) were reviewed by reading, not by an audit.

## 6. Live site

The Phase 10 commit (`1945d25`) passed CI and is deployed: the live bundle changed, `/robots.txt` is served, and the Lighthouse numbers above were taken from it. The Render backend was not touched by the redesign.

## 7. After release: what the live site showed that the local checks did not

The first look at the **live** site (17 Nov) found problems that no local check could have, because every check ran against the local build. They are fixed, and each now has a guard.

| Found on the live site | Cause | Fix and guard |
|---|---|---|
| **Every photograph showed as a broken image** (only the blurred placeholder behind it was visible) | `.gitattributes` tracked `*.webp` in **Git LFS**. Vercel does not fetch LFS content, so each photo was served as the 130-byte pointer text. All earlier phases were "confirmed live" by checking the JavaScript bundle, not the pictures. | `public/` is now excluded from LFS and the 33 photos are committed as real files; the picture URLs carry `?v=2` so browsers drop the broken answers they cached; **`publicAssets.test.ts` fails if a pointer file ever appears under `public/`**. A script now visits the live pages in a fresh browser and checks every picture decodes. |
| The live-navigation map was small on a short laptop window (about 200 px of a 650 px window) | Banner, map and card were stacked in one column. | On a laptop the banner and card are a **side panel** (instruction, arrival, every step of the journey) and the map takes the rest of the screen at full height. |
| A band of white above and below the "Ready to travel smarter?" photo | My performance change (`content-visibility`) was first put on an inner wrapper; containment made the wrapper the containing block of the absolutely positioned photo. | Set on the section itself (verified by scrolling the page with the mouse wheel: every section fades in and the photo fills its band). The audit now forces everything to render for its screenshots and scans, since a full-page capture would otherwise skip those sections. |
| The first request after a quiet period took **33 seconds** | The free host puts the backend to sleep. | The site asks for the backend's health page as soon as it opens; `docs/demo/keep-warm.workflow.yml.example` is an optional 10-minute ping. |
| A place search that depends on a slow public service is a risk in a live demonstration | Place suggestions come from OpenStreetMap's Nominatim. | **Four one-tap demo trips** on Plan Trip (no place search at all); transit hubs and saved places on the dashboard open Plan Trip pre-filled. `demo-trips.spec.ts` drives all four on the real backend, including the Hoodi to MG Road wheelchair story. |
| Running the three end-to-end specs at once made two of them time out | One backend, one database, three browsers. | The end-to-end config runs one at a time. |

### The navigation screen that did not fill the window (found by the owner on the live site, 17 Nov)

On a laptop the live navigation screen showed the top bar above it and the footer below it, a map only about 140 px tall and a panel cut off after one line. **Cause:** the page's entrance animation (`animate-page-in`) used fill mode `both`, so its last keyframe, `transform: translateY(0)`, stayed applied for ever. An element with a transform becomes the containing block of its `position: fixed` descendants, so the full-screen overlay was sized to the page's content instead of the window. The same fault would have hit every dialog (the "More" travel profiles sheet, the admin dialogs, toasts). It had been there since Phase 3.

**Why nothing caught it:** the screenshot audit runs with *reduced motion* switched on (so pictures are stable), and that switches these animations off. The unit tests have no layout. Every earlier check looked at an app that was not animating, which is not how a visitor sees it.

**Fix and guards:**
* Every entrance animation now uses fill mode `backwards` and ends on `transform: none`.
* `src/styles/animations.test.ts` reads the stylesheet and fails if any one-shot animation uses `both`/`forwards` or a keyframe ends on a transform.
* `e2e/navigation-fullscreen.spec.ts` runs **with motion on** at 1280×720, 1280×640 and 375×812: it starts a real journey and asserts the overlay's box equals the window, the map is at least 95% (laptop) or 45% (phone) of the window height, and the overlay is the topmost element at its corners and centre. It fails on the old stylesheet (checked) and passes on the new one.
* The screenshot audit can now run with real animations (`UI_MOTION=on`), and its map-share assertion applies at every width, not only 375 px.

### Walking drawn as a straight line through buildings (found by the owner on the live site, 17 Nov)

The walking part of a journey was a dotted straight line across a hospital compound and its buildings. **Cause (in the backend, not the redesign):** road legs are fetched from OSRM, and the server used by default, `router.project-osrm.org`, **only carries the car network**: asked for the `foot` profile it answers with a *driving* route (measured: 1.56 km in 189 s, 8.3 m/s). The engine's walking-speed check (at most 2.5 m/s) correctly rejected that as implausible, and every walking leg then fell back to a straight line. It had been so since road routing was first added; it only became obvious with the redesigned map and live navigation, which draw the legs large.

**Fix:** each mode now asks the OSRM server that carries its network: the FOSSGIS community servers `routed-foot`, `routed-bike` and `routed-car` (the same query on `routed-foot` gives 1.60 km in 1281 s, 1.25 m/s). A custom `OSRM_API_URL` still wins; the public demo server is ignored if configured. Requests send a User-Agent that names the project, as the community servers ask.

**Checked against the real server:** a Majestic to Jayamahal search now returns walking legs with 87, 25 and 19 coordinates (the street shape) and 9, 6 and 5 turn-by-turn steps at 1.25 m/s, where before they had 2 coordinates and none. **Guard:** `backend/src/__tests__/osrmEndpoints.test.ts` (19 assertions: which server each mode asks, the User-Agent, real geometry reaching the route, and that a car-speed answer is still never shown as a walking time). It runs offline against a stand-in for the servers.

**Making the dependency safe.** The free community servers proved to be slow (about 1 s a request from here) and, under a burst, to answer 429 or not at all; they went unreachable for several minutes while this was being tested. So the road client now:
* sends requests **two at a time** and **retries** a 429 or a busy-server answer after the server's own `Retry-After`;
* **falls back** to the public demo server if the right-network server is down, using its street geometry with the **time recomputed at walking pace** (a walk along streets is far better than a line through buildings; the steps are slowed in the same way);
* **skips a server that failed for a minute** instead of letting every leg wait for its timeout (6 s);
* gives each search a **road budget** (8 s to find routes, 4 s to snap metro and bus legs to the road); a leg not answered in time keeps its straight-line estimate, so a search never takes longer than that however slow the servers are;
* keeps successful legs for **six hours** (they were kept for ten minutes), so the second search of a trip, the demo trips included, is instant and keeps its street path;
* never asks about a leg that starts where it ends.

If every server is down the app still answers, and **says so**: a long walking or auto leg that could not be routed is labelled **"Approximate path"** in the step-by-step list, and the navigation screen says the line on the map is a straight-line estimate, not a path to follow (`isStraightLineEstimate`). Measured against the real servers, with them reachable: Majestic to Jayamahal, 5 of 5 walking and auto legs along streets in 2.9 s; Hoodi to MG Road, 1 of 1 in 2.6 s. When they were throttled, the longest search ended at its 8 s budget with some legs approximate and labelled. For anything heavier, run your own OSRM and set `OSRM_API_URL`. `osrmEndpoints.test.ts` has 37 assertions covering all of the above offline.

The lesson recorded here: **a deployment check must look at what the visitor sees** (the pictures, the first screen on a phone), not only at a successful build.
