# Phase 4: Landing, sign-in and sign-up

**Date:** 16 Nov 2026 · **Scope:** the three screens a visitor sees first. All form behaviour, labels and messages are unchanged; the Landing page was rebuilt around what the product does today.

## 1. The Landing page

| Before | Now |
|---|---|
| Dark hero so heavily darkened that the photo barely showed | The Bengaluru metro-platform photo is **visible**; a soft dark glow behind the headline and subtitle only keeps them readable (subtitle 9.4:1 median, 6.6:1 for its brightest tenth; headline 8.5:1) |
| Sections labelled "Phase 4" and "Phase 7" (internal project phases shown to visitors) | Removed |
| "Built with: Google Maps Platform, OpenWeatherMap", which the app does not use | Accurate: React, TypeScript, Node.js, MongoDB, OpenStreetMap and Leaflet, Open-Meteo |
| A made-up "Next metro 3 min" card and mock "Wheelchair check" cards with sample station names | Removed; the real photographs carry the story |
| Feature copy from before buses, live weather and navigation existed | **Six feature tiles with real photos**, each describing what the app really does: accessibility-first, buses with their numbers, autos for the first and last stretch, weather before you leave (Open-Meteo, no walk over 300 m), how busy it will be (demonstration data, labelled), live navigation (with the honest note that bus and metro positions are not tracked live) |
| One accessibility block | **"One best option for every traveller"**: the six profiles with their real rules in plain words (for example wheelchair: autos and metro only, at most 150 m of walking in a stretch; pregnant: no buses, only quiet metro trains) |
| No evidence | "**1,680** route checks, **0** rule violations", the real result of the profile-matrix run (7 profiles x 12 trips x 5 times of day x 4 weathers) |
| Header links only to sign in | Section links (How it works, Features, Every traveller); a signed-in visitor sees "Open TransitSwap" and goes **straight to the planner** from the search box |
| Search inputs had placeholders only | Labelled "From" and "To", the profile chips are a labelled group with `aria-pressed` |

The search still hands what the visitor typed (and the chosen profile) to sign-up through the same `ts_landing_search` key and shape that the planner reads once and clears.

## 2. Sign-in and sign-up

- **Split screen** on a desktop: the Vidhana Soudha photograph with what TransitSwap does on the left (darker glass cards and a bottom shade so the small text stays readable over any part of the photo), the form on the right with a "Back to home" link. On a phone the same photograph is a banner above the form.
- Errors are announced as alerts (`role="alert"`) with an icon; the password-strength word is announced politely; the sign-up profile choices are a labelled group with `aria-pressed` and two columns on the narrowest phones.
- Sign-in adds a **"Fill in the demo account"** button next to the demo credentials, which saves typing during a demonstration.
- Unchanged and covered by tests: labels *Full name*, *Email address*, *Password*, *Confirm password*; buttons *Sign In*, *Create Account*; every validation message; returning to the page the visitor was sent away from.

## 3. Checks

| Check | Result |
|---|---|
| Type-check | clean |
| Frontend tests | **206 pass** (180 before: +12 Landing, +14 sign-in and sign-up) |
| Production build, contrast check (41 pairs) | builds, 41 / 41 |
| End-to-end happy path (register, plan, save, feedback) | passes |
| Audit, 51 screens at 375, 768 and 1280 px (the Landing page captured scrolled, so every section is seen) | none worse than Phase 3; 0 violations on Landing, sign-in and sign-up; the same 4 existing findings remain (not-found page contrast at three widths, admin sideways scroll at 768 px), both on pages scheduled for Phase 9 |
| Text over photos, measured on the screenshots | hero subtitle, hero headline, sign-up panel text: all pass; see section 1 |

## 4. Found while checking

- At 375 px the header's "Sign In" and "Get Started" wrapped onto two lines and the search placeholder was cut off: fixed (no wrapping, shorter placeholder).
- With the photo made visible, the subtitle first dropped to about 4.5:1 median over the bright sky; the local dark glow and a pure-white subtitle fixed that.
- `LandingIllustrations.tsx` (the unused mock-up components) was deleted.

## 5. Not covered

A real phone and other browsers; a screen-reader pass; the Landing page's behaviour when JavaScript is blocked.
