# Phase 1: the design system foundation

**Date:** 16 Nov 2026 · **Scope:** colours, fonts, shape and shadow tokens, the shared component kit, and lucide icons in place of emoji. **No page layout was changed**: every page keeps its structure and picks up the new look through the tokens and the shared components.

## 1. What changed

### Tokens (`src/index.css`)

The token **names** stayed (`brand-*`, `navy-*`, `success`, `warning`, `danger`), so every page re-coloured at once without being rewritten; only the values moved.

| Token | Before | Now |
|---|---|---|
| `brand-500` (primary) | `#0b7caf` sky blue | `#1f5bd8` "Transit Blue", 5.9:1 on white |
| `brand-600` | `#026599` | `#1a4ec0`, 7.3:1 on white |
| `navy-900` (ink) | `#0f172a` | `#0b1220`; `navy-800` `#172033`; the other greys are unchanged |
| `success` / `warning` / `danger` | `#10b981` / `#f59e0b` / `#dc1313` (the first two failed 4.5:1 as text) | `#087a41` / `#b45309` / `#c81e1e` (5.4 / 5.0 / 5.7:1) |
| new `go-*` | none | "Go Green" for Start and Best, `go-600` 5.4:1 |
| new `bus-*`, `auto-*` | none | teal for buses, Bengaluru auto yellow (always with dark text) |
| new shadows | about 10 hand-written ones | `shadow-card`, `shadow-float`, `shadow-pop` |
| new radii | `rounded-2xl` and `-3xl` everywhere | `rounded-field` 8, `-control` 12, `-panel` 16, `-sheet` 24 px |
| new motion | one fade-in | 150, 250, 350 ms, one easing, all off under "reduce motion" |

The leftover hard-coded sky and blue colours (`sky-*` and `blue-*` classes, `#0ea5e9`, `rgba(14,165,233,…)` glows) in 17 files now use the brand tokens or `shadow-card`.

### Fonts

Inter and Plus Jakarta Sans are now **self-hosted** variable fonts (`@fontsource-variable`), Latin and Latin-extended only. Latin-extended is needed for the rupee sign; the browser downloads each file only if a character in its range is on the page. The Google Fonts request is gone, so no visitor's details go to a third party and the first paint no longer waits on a font server.

### Component kit (`src/components/ui`)

| Restyled, same props | New |
|---|---|
| `Button` (adds a `go` variant; `md` is now 44 px high, the touch-target guideline), `Card`, `Input`, `Badge`, `LoadingSpinner` (unchanged) | `ProfileIcon`, `ModeIcon`, `LineBadge` (bus number, metro line dot), `CrowdPill`, `Chip`, `SegmentedControl`, `IconButton` (name required), `Skeleton`, `Sheet` (modal, Escape, focus kept inside and restored), `Tabs` (arrow keys), `Toast`, `EmptyState`, `StatTile`, `Avatar` |

22 new tests cover the kit: icons, toggles, the sheet's keyboard behaviour, tabs, toasts, badges.

### Emoji replaced by icons

About 80 emoji in 11 files (profiles, modes, hubs, badges, headings) are now lucide icons through `ProfileIcon` and `ModeIcon`. Every profile still has its text label, so screen readers and the tests read the same names as before. Two unused emoji helper functions in `formatters.ts` were deleted. The text symbols ✓ ✕ ★ (not emoji) stay for now; they belong to the Landing page rebuild.

| Profile | Icon |
|---|---|
| Standard · Wheelchair · Senior · Pregnant | Footprints · Accessibility · PersonStanding · HeartPulse |
| Stroller · Luggage · Reduced mobility | Baby · Luggage · HandHelping |
| Fastest · Cheapest · Comfort | Zap · IndianRupee · Armchair |
| Modes: walking · metro · bus · auto | Footprints · TrainFront · BusFront · CarTaxiFront |

## 2. Contrast check: `npm run ui:contrast`

`ui-audit/contrast.mjs` reads the colours from `src/index.css` and checks 41 text and non-text pairs the system uses (every button, badge, pill, toast and link combination). **41 / 41 pass.** It exits with an error if a token is ever changed to something that fails, so it can run in CI later.

## 3. What did not change

No file in `backend/src`, `src/services`, `src/context`, `src/types`, `src/navigation` or any hook. No test was edited, deleted or loosened. No page layout moved.
