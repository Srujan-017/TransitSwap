# Phase 2: real photography

**Date:** 16 Nov 2026 · **Scope:** a real-photo set with full credits, a `<Photo>` component, a public `/credits` page, and removal of every photo that was loaded from another website. No page was redesigned; Landing and the sign-in panel keep their layout and now use the new photos.

## 1. What changed

| Before | Now |
|---|---|
| 4 photos loaded straight from Unsplash's servers (`images.unsplash.com`), the same one reused on Landing and sign-in, no credit shown anywhere | **11 photos served from this site's own files** (`public/images/photos`), each credited |
| One full-size file per photo, whatever the screen | WebP at **640, 1280 and 1920 px** with `srcset`; a phone downloads about 20 to 50 KB per photo |
| No placeholder; the section was blank until the photo arrived | a 24 px blurred copy and the photo's average colour fill the space while it loads |
| Photo authors unknown | author, source page, licence and "what we changed" recorded in `src/data/photoCredits.ts`, shown on `/credits` |

## 2. The photographs

All real photographs by named photographers; none AI-generated. Details, sources and licences are in `docs/ui-redesign/PHOTO_SHORTLIST.md` (approved by the project owner on 16 Nov 2026) and, live, on the `/credits` page.

| Source | Photos | Licences |
|---|---|---|
| Unsplash | 7 | Unsplash License (free, no credit required; credited anyway) |
| Wikimedia Commons | 4 | CC0 (1), CC BY 2.0 (1), CC BY-SA 2.0 (1), CC BY-SA 4.0 (1) |

- Total size of the 33 delivered files: **3.9 MB** (the 11 originals were about 14 MB). The hero is 101 KB at the largest size.
- Metadata (camera, GPS, owner) is not carried into the delivered files; only pixels are.
- The one portrait photo (Vidhana Soudha in rain) is cropped to landscape, and that change is stated in its credit, as the Creative Commons licences require.
- The originals were downloaded to a temporary folder outside the project. Nothing was downloaded before approval.

## 3. New parts

- `src/data/photoCredits.ts`: the register of photos (generated from the conversion step), with `photoUrl()` for file paths.
- `src/components/ui/Photo.tsx`: responsive, lazy-loaded image; alt text is the photo's own description unless overridden; `decorative` gives an empty alt and hides it from screen readers; `priority` loads the hero at once.
- `src/pages/CreditsPage.tsx`, route `/credits` (public, lazy-loaded): every photo with photographer, source link, licence link, what was changed and where it is used, plus credits for map data (OpenStreetMap, Esri), weather (Open-Meteo), Leaflet, Lucide icons and the fonts. Outside links open in a new tab and say so.
- "Photo credits" links in the Landing footer and the sign-in panel.

## 4. Tests added

`photoCredits.test.ts` fails if: a photo has no meaningful alt text, photographer, source page or known licence; a CC BY licence is not marked as needing credit; a size file is missing on disk; the hero exceeds 200 KB; a placeholder is large; **any source file loads an image from Unsplash, Pexels or Wikimedia**; or `index.html` requests Google Fonts. Plus tests for `Photo` (alt text, decorative, srcset, lazy and priority loading) and for `CreditsPage` (every photo credited with working links, outside links safe, other credits present).

## 5. Found and fixed while checking the photos

| Finding | Fix |
|---|---|
| The new hero photo is much darker than the old one, and the headline "Not Just Faster" sat on the sunset glow at about **1.4:1** | The Landing overlays used a colour, `navy-950`, that was never defined in the theme, so the dark ends of the gradient silently did not render (the old pale photo hid it). `navy-950` and `brand-950` (also used by the Dashboard header card) are now defined. The headline background is now about 4.3:1, body text about 14:1 |
| Landing sections fade in only when scrolled into view, so the audit never saw them | New audit screen **landing-revealed**, captured after scrolling the whole page; the audit also now records which elements each violation points to |
| That scrolled capture showed two real contrast failures in the Landing demo card: "Accessible" and "Excluded" at 3.5:1 (these were also the baseline's 768 px Landing finding) | Darker text shades (go-800, red-800) |
| White body text on the bright amber "weather" section measured 3.4 to 4.0:1 against the 4.5:1 needed | Deeper amber-to-burnt-orange wash; now 6.5:1 at the median |

## 6. Choices worth knowing about

- **No photos of people with disabilities, strollers or luggage.** A stranger's photograph should not stand for "a wheelchair user". The "Built for every traveller" section will use the profile icons, plus the real photograph of a Namma Metro platform with its yellow tactile guide strip.
- **Delhi and Mumbai commuter crowds were left out** rather than shown as Bengaluru.
- A few captions on Unsplash do not name the place; the Bengaluru photos were identified by eye (landmarks) and by being found through "Bangalore" searches. The owner was asked to glance at them in the shortlist.
- The share-alike licences (BY-SA) cover the photo and our resized copies of it, not the rest of the project.
