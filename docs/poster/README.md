# TransitSwap competition poster

An A3 landscape poster in the department's poster format: the college header, the title block, three columns of section boxes (Problem statement, Objectives, Methodology · System architecture, Workflow, AI & algorithms · Results, Application, Conclusion) and the team at the bottom. It is built so it can be **printed on A4, cut out and pasted onto an A3 sheet**.

## Files to print (`out/`)

| File | What it is |
|---|---|
| `TransitSwap_Poster_A4_cutouts.pdf` | **Print this.** Page 1 is the assembly guide; pages 2–4 hold all 15 pieces at their final size, each with a dashed cut line and its number |
| `TransitSwap_Poster_A3.pdf` | The whole poster on one A3 page, for a print shop or an A3 printer |
| `TransitSwap_Poster_A3_preview.png` | The whole poster as an image (200 dpi), for sharing or slides |
| `a4-sheets/sheet-1.png` … `sheet-4.png` | The same A4 pages as images (300 dpi), if a printer wants images instead of a PDF |
| `pieces/01-…png` … `15-…png` | Every piece on its own (300 dpi, transparent corners), at its exact final size |

## Printing and assembling

1. Print `TransitSwap_Poster_A4_cutouts.pdf` on A4 in colour at **100 % / "Actual size"** (turn off "Fit to page"). The striped bar on page 1 must measure exactly **100 mm**; if it does not, the printer scaled the page.
2. Cut every piece along its dashed grey line (it runs 1.5 mm outside each box's border).
3. Lay an A3 sheet in landscape (420 × 297 mm). Keep 10 mm free at the left and right and 8 mm at the top.
4. Paste in number order, following the map on page 1: header row **1–2–3**, title **4** centred under it, the columns **5–7**, **8–10**, **11–13**, and the team boxes **14–15** along the bottom. Leave about 4 mm between pieces.

Before printing many copies, **scan both QR codes with a phone** (the live demo and the GitHub repository): they were generated with ReportLab's QR encoder, but could not be scan-tested on this machine.

## Where the content comes from

* **Numbers:** `docs/paper/ieee/data/accessibility-paper-data.json` (520 origin–destination pairs, 7 profiles; the chart and the tiles use the infrastructure rules at weekday 14:30) and the project's verification records (tests, the 87-screen accessibility audit, Lighthouse). The learned-ranker accuracy (87.5 % against a 91.7 % rule baseline) is the same honest figure as in the paper and the viva answers.
* **Screenshots:** the real app on a throwaway local stack, taken by `shots.spec.ts` (weekday-morning clock, fake GPS fix at Silk Board, demo trips).
* **Photos:** the site's own credited photographs (Asif Ahmed, Letian Zhang and Deepak Thakur on Unsplash; Ramesh NG, CC BY-SA 2.0, Wikimedia Commons). The credit line is printed under them.
* **College header:** taken from the department's reference poster (`AI_Complaint_Prioritization_Poster_v2`), unchanged.
* **Team and course details:** Srujan V [1DB23IS156], Shreyas M [1DB23IS144], B Anand [1DB23IS025], A L Abhishek [1DB23IS001]; Major Project (BCS786), guide Ms. Swathi B Patil, 2026-2027.

## Changing it

* Text and figures: `poster.html` (one copy of every piece). Diagrams and the chart are drawn by `layout.js` (`buildWorkflow`, `buildPipeline`, `buildChart`, …).
* Box sizes: `SIZE` in `layout.js` (millimetres). Each column's boxes must add up to 197 mm (205 mm minus two 4 mm gaps); the A4 sheets re-pack themselves.
* Look: `poster.css` (serif type and navy boxes, as in the department template).

Rebuild after any change:

```bash
node docs/poster/tools/build.mjs
```

It writes everything in `out/` and **fails if any box's content does not fit** or an image does not load. To refresh the inputs:

```bash
npx playwright test -c docs/poster/playwright.poster.config.ts
```

```bash
node docs/poster/tools/make-icons.mjs
```

```bash
python docs/poster/tools/make_qr.py
```

(screenshots from the real app, the Lucide icons, and the two QR codes).
