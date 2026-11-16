# Phase 3: the app shell

**Date:** 16 Nov 2026 · **Scope:** the frame around every signed-in page: top bar, account menu, a phone bottom tab bar, a skip link, a footer, and a short page fade-in. No page content changed.

## 1. What changed

| Before | Now |
|---|---|
| Top bar with a hamburger menu on phones that opened a list of links | **Phone (below 768 px):** a compact top bar (logo and account menu) plus a fixed **bottom tab bar** with five tabs: Home, Plan Trip, Saved, History, Profile. Each tab is at least 64 px tall |
| Account menu: a plain dropdown, no Escape key, announced as a "menu" without being one | Account menu with an avatar, `aria-expanded` and `aria-controls`; **Escape closes it and returns focus** to its button; following a link closes it; every item is at least 44 px high |
| Research and Admin reachable on a phone only through the hamburger | In the account menu on a phone (the tab bar has no room); in the top bar on a desktop |
| No skip link, no footer | **"Skip to main content"** as the first thing a keyboard user reaches; a quiet footer with the project note and a link to the photo credits |
| Nav colours hand-written | Tokens: `shadow-card`, `rounded-panel`, `Avatar` from the new kit |
| Pages appeared instantly | A 250 ms fade-in on each new page (switched off under "reduce motion") |

- The two navigations never appear together: the top-bar links are `hidden md:flex` and the tab bar is `md:hidden` (display: none from 768 px up), so a link is never offered twice at the same time and the end-to-end test still finds exactly one "Plan Trip" and one "History" link.
- The live navigation screen sits above the tab bar (z-index 60 against 40), so the bar never covers it.
- The planner's map is now isolated (`isolate`), so Leaflet's own high z-indexes cannot poke through the fixed bars.
- Room is reserved under the footer on a phone so the tab bar never hides it.
- `PageHeader` (eyebrow, one h1, subtitle, actions) is added to the kit. Pages adopt it in their own phases, so no page heading changed here.

## 2. Tests added (+20)

`Navbar.test.tsx` and `MainLayout.test.tsx`: the desktop links and their addresses; the current page marked with `aria-current`; Admin only for admins; the account menu opens, closes with Escape (focus returns), closes when a link is followed, keeps Research and Admin for the phone, signs out and goes home; a signed-out visitor sees Sign In and Get Started; the tab bar's five tabs, current-tab marking, 64 px targets and navigation; the layout's banner, main, footer and both navigations; the skip link is the first focus and points at `main`; the footer credits link; the spacer under the footer; `PageHeader`.

## 3. Checks

| Check | Result |
|---|---|
| Type-check | clean |
| Frontend tests | **180 pass** (160 before) |
| Production build, contrast check (41 pairs) | builds, 41 / 41 |
| End-to-end happy path (register, plan, save, feedback) | passes |
| Audit, 51 screens at 375, 768 and 1280 px | none worse than Phase 2; the same 4 existing findings remain (not-found contrast at three widths, admin sideways scroll at 768 px), both on pages scheduled for Phase 9 |

## 4. Not covered

Real phone safe-area insets (the home-indicator padding uses `env(safe-area-inset-bottom)` and was not seen on a real device), and a screen-reader pass over the new menu.
