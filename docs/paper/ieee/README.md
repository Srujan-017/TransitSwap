# TransitSwap — IEEE conference paper

*TransitSwap: Inclusive Multimodal Journey Planning with Profile-Specific Hard Accessibility Constraints*

| File | What it is |
|---|---|
| `TransitSwap_IEEE.tex` + `references.bib` | LaTeX source (IEEEtran conference class, BibTeX with IEEEtran.bst) |
| `figures/` | Figures 1–4 as vector PDF (used by LaTeX) and 600-dpi PNG (used by Word) |
| `TransitSwap_IEEE.docx` | The same paper typeset in Word (US Letter, IEEE conference layout, 6 pages) |
| `TransitSwap_IEEE_Word.pdf` | PDF export of the Word file, for preview |
| `data/accessibility-paper-data.json` | Raw experiment output; the source of every result except the worked example (Table II) |
| `scripts/make_figures.py` | Draws Figures 1–4 from the JSON |

## Compile the LaTeX version

On Overleaf: upload `TransitSwap_IEEE.tex`, `references.bib` and the `figures/` folder, and compile with pdfLaTeX. Locally:

```
pdflatex TransitSwap_IEEE
bibtex TransitSwap_IEEE
pdflatex TransitSwap_IEEE
pdflatex TransitSwap_IEEE
```

For an A4 conference, change the first line to `\documentclass[conference,a4paper]{IEEEtran}`.

## Regenerate the results

```
cd backend
npm ci
npx ts-node --transpile-only scripts/generate-accessibility-paper-data.ts   # writes data/accessibility-paper-data.json (~15 s)
npx ts-node --transpile-only scripts/print-worked-example.ts               # prints Table II
cd ../docs/paper/ieee
python scripts/make_figures.py                                             # needs matplotlib
```

No network or database is needed: the experiments use the backend's demo mode, an offline road-leg model, a seeded OD sample and a pinned clock, so every number comes out identical on each run except the timings.

## References

Every reference is dated 2023–2026. Twenty-four are peer-reviewed journal articles; each one's authors, volume, issue, pages and year were taken from the Crossref registry by DOI and cross-checked in OpenAlex. The remaining one is the GTFS standard (accessed Nov. 2026), which has no journal equivalent. The UN Convention on the Rights of Persons with Disabilities and India's RPwD Act 2016 are discussed through recent peer-reviewed analyses of them (references 2–4) rather than cited as 2006/2016 documents. DOIs are kept in `references.bib` (`doi` field, which the IEEE style file does not print) and listed here so anyone can check them:

| Year | Title | Journal | DOI |
|---|---|---|---|
| 2025 | Assessing public transport accessibility for people with physical disabilities in Burgos, Spain: A user-centered approach to inclusive urban mobility | *PLoS ONE* | [10.1371/journal.pone.0322068](https://doi.org/10.1371/journal.pone.0322068) |
| 2025 | Advancing an embodied understanding of accessibility for persons with disabilities | *J. Hum. Rights Pract.* (Oxford Univ. Press) | [10.1093/jhuman/huae049](https://doi.org/10.1093/jhuman/huae049) |
| 2025 | Social audit as a pathway for reasonable accommodation: A review on access to the built environment for persons with disabilities in the wake of the RPwD Act 2016 in India | *Jindal Glob. Law Rev.* (Springer) | [10.1007/s41020-025-00276-0](https://doi.org/10.1007/s41020-025-00276-0) |
| 2026 | Governing inclusion: Disability, urban governance, and inclusive development in India for persons with disabilities | *Soc. Sci. Humanit. Open* (Elsevier) | [10.1016/j.ssaho.2026.103681](https://doi.org/10.1016/j.ssaho.2026.103681) |
| 2025 | Developing metro rail-based accessibility in India: Existing challenges and prospects | *Transp. Res. Procedia* | [10.1016/j.trpro.2024.12.064](https://doi.org/10.1016/j.trpro.2024.12.064) |
| 2025 | Accessibility of public transport for people with disabilities: A systematic literature review | *Transport* | [10.3846/transport.2025.23562](https://doi.org/10.3846/transport.2025.23562) |
| 2024 | Determinants of public transportation disability among older adults in China | *Transp. Policy* | [10.1016/j.tranpol.2024.03.004](https://doi.org/10.1016/j.tranpol.2024.03.004) |
| 2024 | Scalable algorithms for bicriterion trip-based transit routing | *IEEE Trans. Intell. Transp. Syst.* | [10.1109/tits.2024.3391343](https://doi.org/10.1109/tits.2024.3391343) |
| 2026 | FLASH-TB: Integrating arc-flags and trip-based public transit routing | *Transp. Sci.* | [10.1287/trsc.2023.0481](https://doi.org/10.1287/trsc.2023.0481) |
| 2023 | Same network, same access to urban opportunities? Accessibility via public transportation for wheelchair users | *J. Disabil. Policy Stud.* | [10.1177/10442073231165773](https://doi.org/10.1177/10442073231165773) |
| 2026 | Stairway to transit: Mapping physical accessibility of subway stations in New York City | *J. Public Transp.* | [10.1016/j.jpubtr.2026.100180](https://doi.org/10.1016/j.jpubtr.2026.100180) |
| 2026 | Evaluation of elevator placements to improve wheelchair accessibility in Tokyo's railways | *Case Stud. Transp. Policy* | [10.1016/j.cstp.2026.101849](https://doi.org/10.1016/j.cstp.2026.101849) |
| 2024 | Measuring the impacts of disruptions on public transit accessibility and reliability | *J. Transp. Geogr.* | [10.1016/j.jtrangeo.2023.103769](https://doi.org/10.1016/j.jtrangeo.2023.103769) |
| 2025 | Enriching OpenStreetMap network data for transportation applications: Insights into the impact of urban congestion on accessibility | *J. Transp. Geogr.* | [10.1016/j.jtrangeo.2024.104096](https://doi.org/10.1016/j.jtrangeo.2024.104096) |
| 2025 | Enhancing sidewalk accessibility assessment for wheelchair users: An adaptive weighting fuzzy-based approach | *Heliyon* | [10.1016/j.heliyon.2024.e41101](https://doi.org/10.1016/j.heliyon.2024.e41101) |
| 2026 | OpenStreetMap suitability analysis for wheelchair routing | *AGILE: GIScience Ser.* | [10.5194/agile-giss-7-12-2026](https://doi.org/10.5194/agile-giss-7-12-2026) |
| 2025 | Developing accessible routes in historic environments for wheelchair users using a smart mobile application | *Ain Shams Eng. J.* | [10.1016/j.asej.2024.103240](https://doi.org/10.1016/j.asej.2024.103240) |
| 2024 | A systematic review on crowding valuation in public transport | *Public Transp.* | [10.1007/s12469-024-00363-w](https://doi.org/10.1007/s12469-024-00363-w) |
| 2026 | Impact of real-time crowding information on mass-transit passengers' platform placement choices | *Transp. Res. Part A, Policy Pract.* | [10.1016/j.tra.2026.105081](https://doi.org/10.1016/j.tra.2026.105081) |
| 2025 | Measuring route travel time reliability in an urban rail transit network | *J. Transp. Eng., Part A, Syst.* | [10.1061/jtepbs.teeng-8713](https://doi.org/10.1061/jtepbs.teeng-8713) |
| 2025 | Mobility-as-a-service personalised multi-modal multi-objective journey planning with machine-learning-guided shortest-path algorithms | *Appl. Sci.* | [10.3390/app15042052](https://doi.org/10.3390/app15042052) |
| 2026 | Preference-aware multimodal journey planner: An optimization approach for smart mobility | *Smart Cities* | [10.3390/smartcities9060103](https://doi.org/10.3390/smartcities9060103) |
| 2025 | Pairwise learning to rank by neural networks revisited: Reconstruction, theoretical analysis and practical performance | *Mach. Learn.* | [10.1007/s10994-024-06644-6](https://doi.org/10.1007/s10994-024-06644-6) |
| 2025 | Whom do explanations serve? A systematic literature survey of user characteristics in explainable recommender systems evaluation | *ACM Trans. Recomm. Syst.* | [10.1145/3716394](https://doi.org/10.1145/3716394) |

## Before submitting

- Author details (Srujan V, AL Abhishek, Shreyas M, B Anand and Swathi B Patil, Dept. of Information Science and Engineering, Don Bosco Institute of Technology, Bengaluru) are filled in both versions; check the spelling of every name and e-mail once more.
- If the conference uses double-blind review, the review copy must not identify you: replace the author block with "Anonymous", and the GitHub link and the department and college in the Acknowledgment with "[removed for review]" (keep the AI disclosure).
- Keep the generative-AI disclosure in the Acknowledgment; IEEE requires it.
- Push `backend/scripts/generate-accessibility-paper-data.ts`, `backend/scripts/print-worked-example.ts` and this folder to the GitHub repository cited in the paper, so the reproducibility claim holds.
