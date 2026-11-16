# Phase 2: photo shortlist

**Date:** 16 Nov 2026 · **Status:** approved by the project owner on 16 Nov 2026 (all 11; the optional 12th was not requested). Downloaded, converted and wired in; see `PHASE_2_PHOTOS.md`.

Every photo below is a **real photograph** by a named photographer (no AI images). Each was looked at on a contact sheet, and its author, licence and original size were read from its own page (Unsplash photo pages, Wikimedia Commons file data).

## How they were chosen

- Photos that must be recognisably **Bengaluru** (Vidhana Soudha, Cubbon Park station, BMTC buses, the green-line train) come first. Unsplash's captions rarely name a place, so a few were checked by eye against landmarks and found through "Bangalore" searches; **please glance at the links**, you know the city better than a caption does.
- Searches for commuter crowds returned Delhi and Mumbai metros. They are left out rather than shown as Bengaluru.
- **No photos of people with disabilities, strollers or luggage.** Using a stranger's photo to stand for "a wheelchair user" is not appropriate, so the "Built for every traveller" section will use the profile icons, plus a real photo of a Namma Metro platform with its yellow tactile guide line.
- The 4 Unsplash photos the site currently loads straight from Unsplash's servers are replaced; none of their authors could be confirmed from the site.

## The list (11 photos, plus 1 optional)

| # | Used for | Photo | Source and page | Author | Licence | Original size |
|---|---|---|---|---|---|---|
| 1 | Landing hero | Metro platform at sunset | [Unsplash](https://unsplash.com/photos/train-tracks-with-a-sunset-in-the-background-prb20cE4fvk) | Jithin Vijayamohanan | Unsplash License | 4096 × 2304 |
| 2 | Landing: Metro; dashboard header | Green-line train at an elevated station | [Unsplash](https://unsplash.com/photos/a-green-and-white-train-pulling-into-a-train-station-N8bQPdaZ2iU) | Asif Ahmed | Unsplash License | 4096 × 2831 |
| 3 | Landing: accessible stations | Empty platform with yellow tactile guide line | [Unsplash](https://unsplash.com/photos/a-train-is-pulling-into-a-train-station-mn01pDwT_uI) | Deepak Thakur | Unsplash License | 4000 × 3003 |
| 4 | Landing: buses with numbers | A BMTC bus on a leafy road | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:A_BMTC_bus_Public_Transport_Bangalore_Karnataka_India_2014.jpg) | Ramesh NG | CC BY-SA 2.0 | 2612 × 1662 |
| 5 | Landing: autos for the last mile | Autos in front of Vidhana Soudha | [Unsplash](https://unsplash.com/photos/tuk-tuks-drive-past-a-grand-government-building-HJrZwkwa1ww) | Letian Zhang | Unsplash License | 4903 × 3263 |
| 6 | Landing: weather-aware | Vidhana Soudha under a wet grey sky (portrait, cropped wide) | [Unsplash](https://unsplash.com/photos/a-city-street-with-a-large-building-in-the-background-samuY3nlzSY) | Chinmay Dhope | Unsplash License | 2322 × 4128 |
| 7 | Sign-in and sign-up side panel | Vidhana Soudha, clear sky | [Unsplash](https://unsplash.com/photos/a-large-building-with-a-lot-of-people-around-it-ZB9Mad3xL8Q) | zablanca_clicks | Unsplash License | 6882 × 5505 |
| 8 | Not-found page; dark sections | Train at dusk, silhouette | [Unsplash](https://unsplash.com/photos/a-train-on-the-railway-tracks-VOYoKmp_zTA) | Jithin Vijayamohanan | Unsplash License | 4096 × 2304 |
| 9 | Empty states; "How it works" | Cubbon Park Metro station interior | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cubbon_Park_Metro_station_interior.jpg) | Wilhelm Tell DCCXLVI | **CC0** (public domain) | 3264 × 1836 |
| 10 | Dashboard header band | Tree-lined Bengaluru street with an auto | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_Streets_of_Bangalore.jpg) | Eirik Refsdal | CC BY 2.0 | 3395 × 2263 |
| 11 | Landing: "for the city's commuters" band | Street scene with autos and pedestrians | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Street_view_in_Bangalore,_India.jpg) | Pasztilla aka Attila Terbócs | CC BY-SA 4.0 | 4730 × 3134 |
| 12 (optional) | A second bus photo | Blue bus at dusk | [Unsplash](https://unsplash.com/photos/a-blue-bus-parked-on-the-side-of-the-road-3V_zo2NnBnc) | A M | Unsplash License | 5459 × 3636 |

## What the licences mean for us

- **Unsplash License:** free for commercial and non-commercial use, no credit required. We credit anyway.
- **CC0:** public domain.
- **CC BY / CC BY-SA:** free to use **if we credit the author and link the licence**, which the `/credits` page and the photo captions will do. "Share-alike" applies to the photo itself and to our resized or cropped copies of it (they stay under the same licence); it does not reach the rest of the project's code.
- Photos 4, 10 and 11 are the only ones needing a visible credit by law. I would still show credits for all of them.

## What happens if you approve

1. Download each photo once, at about 2400 px wide (about 0.3 to 0.9 MB each, 6 to 8 MB in all), from the source pages above, into a temporary folder outside the project.
2. Look at each downloaded file, then crop and convert to WebP at 640, 1280 and 1920 px. The hero stays under about 200 KB. The final files in `public/images/` come to roughly 2 to 3 MB for all 11.
3. Add `src/data/photoCredits.ts`, a `<Photo>` component (responsive sizes, lazy loading, required alt text) and the public `/credits` page; replace the four hotlinked photos; add a test that fails if an image is missing its credit or alt text.
4. Run the same checks as Phase 1 (tests, build, end-to-end, accessibility audit at 375, 768 and 1280 px), commit, push, and check the live site.

If you would rather choose a photo yourself, give me the link or file and I will use it instead.
