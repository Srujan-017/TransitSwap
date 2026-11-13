# TransitSwap — college project report

LaTeX source of the project report (`report.tex`, ~40 pages: Introduction, Literature Survey, System Requirements, System Design, Implementation, Testing, Results, Conclusion, References).

## Compile

Upload the whole `docs/report/` folder (including `figures/`) to Overleaf and compile `report.tex` with pdfLaTeX (run it twice so the table of contents and cross-references resolve). Locally: `pdflatex report.tex` twice.

## Fill in before submitting

The title page, certificate, declaration and acknowledgement already contain the students, guide, department and college. These items were not available and are marked with angle brackets in `report.tex`; search for `<`:

- `<YOUR UNIVERSITY NAME HERE>`, `<University motto / address>`, `<University Name>` and the two `<Affiliation line…>` lines
- `<USN>` for each of the four students (title page, certificate, declaration)
- `<HOD Name>` and `<Principal Name>` (certificate, acknowledgement)

## Figures

The five diagrams in `figures/` (architecture, use case, class, sequence, data-flow) are generated, not drawn by hand:

```
cd docs/report
node generate-report-figures.cjs   # writes figures/*.svg
node svg-to-png.cjs                # writes figures/*.png (uses the Playwright browser already installed for the project)
```

`fig-4.0-architecture.svg` is copied from `docs/paper/figures/fig1-architecture.svg`.
