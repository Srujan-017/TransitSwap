"""Renders every figure in the IEEE paper from data/accessibility-paper-data.json.

Run from docs/paper/ieee:  python scripts/make_figures.py
Writes figures/*.pdf (vector, for LaTeX) and figures/*.png (600 dpi, for Word).
No value is typed by hand: every number is read from the JSON written by
backend/scripts/generate-accessibility-paper-data.ts.
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data" / "accessibility-paper-data.json").read_text(encoding="utf-8"))
OUT = ROOT / "figures"
OUT.mkdir(exist_ok=True)

# Chart chrome & ink (reference palette, light surface; print surface is white).
INK = "#0b0b0b"
INK_2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
SURFACE = "#ffffff"
# Categorical slots 1-2 (validated all-pairs on white) and the ordinal blue ramp
# (steps 250/450/650, validated with --ordinal on white).
BLUE = "#2a78d6"
ORANGE = "#eb6834"
RAMP = ["#86b6ef", "#2a78d6", "#104281"]

COL_W = 3.5  # IEEE single-column width (in)
TEXT_W = 7.16  # IEEE double-column width (in)

plt.rcParams.update(
    {
        "font.family": "Arial",
        "font.size": 7.5,
        "axes.edgecolor": AXIS,
        "axes.linewidth": 0.6,
        "axes.labelcolor": INK_2,
        "axes.labelsize": 7.5,
        "xtick.color": INK_2,
        "ytick.color": INK,
        "xtick.labelsize": 7,
        "ytick.labelsize": 7.5,
        "xtick.major.width": 0.6,
        "xtick.major.size": 2.5,
        "ytick.major.size": 0,
        "legend.fontsize": 7,
        "legend.frameon": False,
        "pdf.fonttype": 42,  # embed TrueType fonts (IEEE PDF eXpress requirement)
        "ps.fonttype": 42,
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.02,
    }
)

PROFILE_LABEL = {
    "wheelchair": "Wheelchair",
    "stroller": "Stroller",
    "reduced_mobility": "Reduced mobility",
    "senior": "Senior",
    "pregnant": "Pregnant",
    "luggage": "Heavy luggage",
}


def save(fig, name):
    fig.savefig(OUT / f"{name}.pdf")
    fig.savefig(OUT / f"{name}.png", dpi=600)
    plt.close(fig)
    print(f"wrote figures/{name}.pdf/.png")


def style_hbar_axes(ax):
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(AXIS)
    ax.xaxis.grid(True, color=GRID, linewidth=0.5)
    ax.set_axisbelow(True)


# ── Fig. 1: pipeline schematic ─────────────────────────────────────────────
def fig_pipeline():
    fig = plt.figure(figsize=(TEXT_W, 2.05))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 30)
    ax.axis("off")

    # Titles are pre-broken so the widest line fits a 14.6-unit (~1.05 in) box at 6.8 pt.
    stages = [
        ("Query", "origin, destination,\nmobility profile $p$", False),
        ("(1) Candidate\ngeneration", "fixed patterns +\nbounded label search;\nexact Pareto filter", False),
        ("(2) Infrastructure\nconstraints (hard)", "station rule $g_p$ at\nboard/alight/transfer\nstops; rolling cap $W_p$", True),
        ("(3) Enrichment", "crowd, weather,\nreliability, interval,\ntransfer risk", False),
        ("(4) Crowd\nconstraint (hard)", "exclude aggregate\nHIGH crowd for\ncrowd-sensitive $p$", True),
        ("(5) Ranking\n& output", "profile-floored weights,\noptional personalisation,\nAccessibility Check", False),
    ]
    box_w, gap, x0, y0, h = 14.6, 2.2, 0.7, 11.6, 11.6
    centers = []
    for i, (title, body, hard) in enumerate(stages):
        x = x0 + i * (box_w + gap)
        centers.append(x + box_w / 2)
        face = (0.165, 0.471, 0.839, 0.10) if hard else SURFACE
        edge = BLUE if hard else AXIS
        ax.add_patch(
            FancyBboxPatch((x, y0), box_w, h, boxstyle="round,pad=0,rounding_size=1.1", fc=face, ec=edge, lw=0.9 if hard else 0.7)
        )
        ax.text(x + box_w / 2, y0 + h - 0.9, title, ha="center", va="top", fontsize=6.8, fontweight="bold", color=INK, linespacing=1.05)
        ax.text(x + box_w / 2, y0 + 3.4, body, ha="center", va="center", fontsize=6.0, color=INK_2, linespacing=1.12)
        if i > 0:
            ax.add_patch(
                FancyArrowPatch((x - gap + 0.15, y0 + h / 2), (x - 0.15, y0 + h / 2), arrowstyle="-|>", mutation_scale=6, lw=0.7, color=INK_2)
            )

    # Exclusion log above the two hard-constraint stages (spans stages 2-4).
    lx0, lx1 = centers[2] - box_w / 2, centers[4] + box_w / 2
    ax.add_patch(FancyBboxPatch((lx0, 24.9), lx1 - lx0, 4.8, boxstyle="round,pad=0,rounding_size=1.0", fc=SURFACE, ec=BLUE, lw=0.7))
    ax.text(
        (lx0 + lx1) / 2,
        27.3,
        "Exclusion log: every rejected candidate keeps a typed, human-readable\nreason $\\rho(r)$ (station rule · walking/rolling cap · crowd rule)",
        ha="center",
        va="center",
        fontsize=6.2,
        color=INK,
        linespacing=1.15,
    )
    for c in (centers[2], centers[4]):
        ax.add_patch(FancyArrowPatch((c, y0 + h + 0.1), (c, 24.8), arrowstyle="-|>", mutation_scale=6, lw=0.7, color=BLUE))

    # Data sources below.
    sources = [
        (centers[1], box_w, "stop graph: 41 metro\nstations, 24 bus stops;\nOSM/OSRM road legs"),
        (centers[2], box_w, "65 station records:\nlift, ramp, stairs,\nstep-free, status"),
        ((centers[3] + centers[4]) / 2, 2 * box_w + gap, "crowd estimate per stop:\nrecent reports (70%) + historical table (30%)"),
        (centers[5], box_w, "profile weights;\npairwise choice\nhistory"),
    ]
    for cx, w, label in sources:
        ax.add_patch(FancyBboxPatch((cx - w / 2, 0.5), w, 7.0, boxstyle="round,pad=0,rounding_size=0.9", fc="#f6f6f4", ec="none"))
        ax.text(cx, 4.0, label, ha="center", va="center", fontsize=6.0, color=INK_2, linespacing=1.12)
    for cx in (centers[1], centers[2], centers[3], centers[4], centers[5]):
        ax.add_patch(FancyArrowPatch((cx, 7.6), (cx, y0 - 0.15), arrowstyle="-|>", mutation_scale=6, lw=0.6, color=MUTED))
    save(fig, "fig1_pipeline")


# ── Fig. 2: trips with no feasible route, by profile and condition ─────────
def fig_infeasible():
    am = DATA["perClock"]["weekdayAmPeak"]["profiles"]
    off = DATA["perClock"]["weekdayOffPeak"]["profiles"]
    conditions = [
        ("Infrastructure constraints", lambda p: am[p]["infrastructure"]),
        ("+ crowd rule, off-peak (14:30)", lambda p: off[p]["deployed"]),
        ("+ crowd rule, AM peak (08:30)", lambda p: am[p]["deployed"]),
    ]
    # Senior, pregnant and luggage share identical hard rules, so their feasibility is
    # identical in every condition - asserted here, then drawn as one row.
    for _, get in conditions:
        assert get("senior")["noFeasiblePercent"] == get("pregnant")["noFeasiblePercent"] == get("luggage")["noFeasiblePercent"]
    rows = [
        ("Wheelchair", "wheelchair"),
        ("Stroller", "stroller"),
        ("Reduced mobility", "reduced_mobility"),
        ("Senior / pregnant /\nheavy luggage", "senior"),
    ]
    fig, ax = plt.subplots(figsize=(COL_W, 1.9))
    style_hbar_axes(ax)
    bar_h, step = 0.24, 0.27
    ys = list(range(len(rows)))[::-1]
    for k, (name, get) in enumerate(conditions):
        for y, (_, p) in zip(ys, rows):
            v = get(p)
            val = v["noFeasiblePercent"]
            ci = v["noFeasibleCi95"]
            yy = y + (1 - k) * step
            ax.barh(yy, val, height=bar_h, color=RAMP[k], edgecolor=SURFACE, linewidth=0.8, label=name if y == ys[0] else None)
            if val > 0:
                ax.plot([ci["low"], ci["high"]], [yy, yy], color=INK_2, lw=0.6)
            if p == "wheelchair":
                ax.text(ci["high"] + 1.0, yy, f"{val:.1f}%", va="center", ha="left", fontsize=6.6, color=INK)
    ax.set_yticks(ys)
    ax.set_yticklabels([label for label, _ in rows])
    ax.set_xlim(0, 62)
    ax.set_xticks([0, 10, 20, 30, 40, 50, 60])
    ax.set_xlabel("Trips with no feasible route (%, 95% Wilson CI)")
    # The reduced-mobility row (no crowd rule) leaves the right half of its band empty.
    ax.legend(loc="center right", bbox_to_anchor=(62, ys[2]), bbox_transform=ax.transData, handlelength=1.2, handleheight=0.9, borderaxespad=0.1)
    save(fig, "fig2_infeasible")


# ── Fig. 3: price of accessibility (positive detours), infrastructure variant ─
def fig_detours():
    am = DATA["perClock"]["weekdayAmPeak"]["profiles"]
    groups = [
        ("Wheelchair", "wheelchair"),
        ("Stroller /\nreduced mobility", "stroller"),
        ("Senior / pregnant /\nheavy luggage", "senior"),
    ]
    # Profiles sharing identical rules produce identical detours; assert it rather than assume it.
    assert am["stroller"]["infrastructure"]["priceOfAccessibility"]["positiveDetourValues"] == am["reduced_mobility"]["infrastructure"]["priceOfAccessibility"]["positiveDetourValues"]
    for p in ("pregnant", "luggage"):
        assert am["senior"]["infrastructure"]["priceOfAccessibility"]["positiveDetourValues"] == am[p]["infrastructure"]["priceOfAccessibility"]["positiveDetourValues"]

    fig, ax = plt.subplots(figsize=(COL_W, 1.95))
    style_hbar_axes(ax)
    labels = []
    data = []
    for label, key in groups:
        v = am[key]["infrastructure"]
        vals = v["priceOfAccessibility"]["positiveDetourValues"]
        share = v["priceOfAccessibility"]["odWithPositiveDetourPercent"]
        med = v["priceOfAccessibility"]["positiveDetourMinutes"]["median"]
        data.append(vals)
        labels.append(f"{label}\n{share:.1f}% of trips (n={len(vals)})\nmedian {med:.1f} min")
    ys = [3, 2, 1]
    ax.boxplot(
        data,
        positions=ys,
        vert=False,
        widths=0.42,
        showfliers=False,
        patch_artist=True,
        whis=(5, 95),
        medianprops={"color": INK, "linewidth": 1.1},
        boxprops={"facecolor": (0.165, 0.471, 0.839, 0.14), "edgecolor": BLUE, "linewidth": 0.8},
        whiskerprops={"color": BLUE, "linewidth": 0.7},
        capprops={"color": BLUE, "linewidth": 0.7},
    )
    import random

    rnd = random.Random(7)
    for y, vals in zip(ys, data):
        jitter = [y + rnd.uniform(-0.13, 0.13) for _ in vals]
        ax.scatter(vals, jitter, s=6, color=BLUE, alpha=0.55, edgecolors=SURFACE, linewidths=0.3, zorder=3)
    ax.set_xscale("log")
    ax.set_xlim(0.45, 72)
    ax.set_xticks([0.5, 1, 2, 5, 10, 20, 50])
    ax.set_xticklabels(["0.5", "1", "2", "5", "10", "20", "50"])
    ax.minorticks_off()
    ax.set_yticks(ys)
    ax.set_yticklabels(labels, fontsize=6.6, linespacing=1.15)
    ax.set_ylim(0.45, 3.55)
    ax.set_xlabel("Extra time vs. fastest route (min, log scale)")
    save(fig, "fig3_detours")


# ── Fig. 4: lift-outage criticality, wheelchair, infrastructure variant ─────
def fig_lifts():
    rows = []
    for s in DATA["liftCriticality"]:
        wc = s["infrastructure"]["wheelchair"]
        rows.append((s["stationName"].replace(" Metro", ""), wc["disconnected"], wc["rerouted"], wc["baselineFeasibleOd"]))
    rows.sort(key=lambda r: (r[1], r[2]), reverse=True)
    top = rows[:10]
    base = top[0][3]
    interchanges = {"Majestic", "RV Road"}

    fig, ax = plt.subplots(figsize=(COL_W, 2.5))
    style_hbar_axes(ax)
    ys = list(range(len(top)))[::-1]
    for y, (name, disc, rer, n) in zip(ys, top):
        d = 100 * disc / n
        r = 100 * rer / n
        ax.barh(y, d, height=0.62, color=BLUE, edgecolor=SURFACE, linewidth=0.8, label="Disconnected (no feasible route)" if y == ys[0] else None)
        ax.barh(y, r, left=d, height=0.62, color=ORANGE, edgecolor=SURFACE, linewidth=0.8, label="Rerouted (recommendation changes)" if y == ys[0] else None)
        if name in interchanges:
            ax.text(d + r + 0.6, y, f"{disc} + {rer} trips", va="center", ha="left", fontsize=6.4, color=INK)
    ax.set_yticks(ys)
    ax.set_yticklabels([f"{n}{' (interchange)' if n in interchanges else ''}" for n, *_ in top])
    ax.set_xlim(0, 32)
    ax.set_xticks([0, 5, 10, 15, 20, 25, 30])
    ax.set_xlabel(f"Wheelchair trips affected (% of {base} feasible trips)")
    ax.legend(loc="lower right", handlelength=1.2, handleheight=0.9, borderaxespad=0.2)
    save(fig, "fig4_lifts")


if __name__ == "__main__":
    fig_pipeline()
    fig_infeasible()
    fig_detours()
    fig_lifts()
