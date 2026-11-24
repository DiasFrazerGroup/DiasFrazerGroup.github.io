"""Illustrative figures for the paper pages.

Each figure is a schematic of the paper's central idea, drawn in the site's colours. None of them plot
real results: shapes and point clouds are illustrative. Replace a figure with the paper's own key figure
whenever its licence allows (set `image:` in the paper's front matter).

Run from the repository root:
    python scripts/paper_figures.py
Writes papers/<slug>/figure.svg for every slug below.
"""
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Polygon, Rectangle

BG = "#141922"
INK = "#d5d9e0"
MUTED = "#8a93a3"
FAINT = "#2a3140"
ACCENT = "#7cc7bb"
ACCENT2 = "#3f9d90"
WARM = "#e0a96d"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 13,
    "text.color": INK,
    "axes.labelcolor": MUTED,
    "axes.edgecolor": FAINT,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "svg.fonttype": "path",
})

ROOT = Path(__file__).resolve().parents[1]
rng = np.random.default_rng(3)


def canvas():
    fig = plt.figure(figsize=(8, 6), facecolor=BG)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 8)
    ax.set_ylim(0, 6)
    ax.axis("off")
    ax.set_facecolor(BG)
    return fig, ax


def inset(fig, rect):
    a = fig.add_axes(rect, facecolor=BG)
    for s in ("top", "right"):
        a.spines[s].set_visible(False)
    a.set_xticks([])
    a.set_yticks([])
    return a


def arrow(ax, p, q, color=MUTED, ls="-", lw=1.6, rad=0.0):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=14, color=color, lw=lw,
                                 linestyle=ls, connectionstyle=f"arc3,rad={rad}"))


def box(ax, x, y, w, h, text, edge=MUTED, fill=BG, color=INK, size=12):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.12",
                                ec=edge, fc=fill, lw=1.4))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", color=color, fontsize=size)


def label(ax, x, y, text, color=MUTED, size=11, **kw):
    ax.text(x, y, text, color=color, fontsize=size, **kw)


def save(fig, slug):
    out = ROOT / "papers" / slug / "figure.svg"
    fig.savefig(out, facecolor=BG)
    plt.close(fig)
    print("wrote", out.relative_to(ROOT))


# ---------------------------------------------------------------- EVE
def eve():
    fig, ax = canvas()
    # alignment of sequences across species; conserved columns in accent
    rows, cols = 12, 14
    x0, y0, cw, ch = 0.45, 1.5, 0.15, 0.24
    conserved = {2, 5, 6, 10}
    shades = [FAINT, "#3a4252", "#4a5365", MUTED]
    for r in range(rows):
        for c in range(cols):
            col = ACCENT2 if c in conserved and rng.random() > 0.06 else shades[rng.integers(0, 4)]
            ax.add_patch(Rectangle((x0 + c * cw, y0 + r * ch), cw * 0.9, ch * 0.85, color=col, lw=0))
    label(ax, x0, y0 + rows * ch + 0.25, "Sequences across species", INK, 12)
    label(ax, x0, y0 - 0.45, "conserved positions", ACCENT, 10)
    arrow(ax, (2.75, 3.0), (3.35, 3.0))
    # Bayesian VAE
    ax.add_patch(Polygon([[3.45, 2.0], [4.15, 2.6], [4.15, 3.4], [3.45, 4.0]], closed=True, fc=FAINT, ec=MUTED, lw=1.2))
    ax.add_patch(Polygon([[4.65, 2.6], [5.35, 2.0], [5.35, 4.0], [4.65, 3.4]], closed=True, fc=FAINT, ec=MUTED, lw=1.2))
    for yy in (2.75, 3.0, 3.25):
        ax.add_patch(plt.Circle((4.4, yy), 0.07, color=ACCENT))
    label(ax, 4.4, 4.35, "Bayesian VAE", INK, 12, ha="center")
    label(ax, 4.4, 1.6, "no clinical labels", MUTED, 10, ha="center")
    arrow(ax, (5.45, 3.0), (5.95, 3.0))
    # score distributions
    a = inset(fig, [0.75, 0.3, 0.22, 0.42])
    xs = np.linspace(0, 1, 300)
    b = np.exp(-((xs - 0.28) ** 2) / 0.012)
    p = np.exp(-((xs - 0.76) ** 2) / 0.01)
    a.fill_between(xs, b, color=MUTED, alpha=0.35, lw=0)
    a.plot(xs, b, color=MUTED, lw=1.5)
    a.fill_between(xs, p, color=ACCENT, alpha=0.35, lw=0)
    a.plot(xs, p, color=ACCENT, lw=1.5)
    a.set_xlabel("EVE score", fontsize=11)
    a.text(0.28, 1.08, "benign", color=MUTED, ha="center", fontsize=10)
    a.text(0.76, 1.08, "pathogenic", color=ACCENT, ha="center", fontsize=10)
    a.set_ylim(0, 1.25)
    save(fig, "2021-eve")


# ---------------------------------------------------------------- popEVE
def popeve():
    fig, ax = canvas()
    genes = 9
    offs = rng.normal(0, 0.9, genes)
    scales = rng.uniform(0.5, 1.4, genes)
    for k, (title, calibrated, rect) in enumerate([
        ("Scores within each gene", False, [0.08, 0.17, 0.39, 0.62]),
        ("One proteome-wide scale", True, [0.56, 0.17, 0.39, 0.62]),
    ]):
        a = inset(fig, rect)
        for g in range(genes):
            n = 26
            benign = rng.normal(0, 0.55, n)
            dis = rng.normal(2.1, 0.35, 3)
            if not calibrated:
                benign = benign * scales[g] + offs[g]
                dis = dis * scales[g] + offs[g] - 0.6 * scales[g]
            jit = rng.uniform(-0.18, 0.18, n)
            a.scatter(g + jit, benign, s=9, color=MUTED, alpha=0.55, lw=0)
            a.scatter(g + rng.uniform(-0.12, 0.12, 3), dis, s=26, color=WARM, lw=0)
        a.axhline(1.35 if calibrated else 1.0, color=ACCENT, ls="--", lw=1.3)
        a.set_xlim(-0.7, genes - 0.3)
        a.set_ylim(-3.2, 4.2)
        a.set_xlabel("genes", fontsize=11)
        if k == 0:
            a.set_ylabel("deleteriousness", fontsize=11)
        ax.text(rect[0] * 8, 5.45, title, color=INK, fontsize=13)
    label(ax, 0.64, 0.45, "●", WARM, 11)
    label(ax, 0.84, 0.45, "disease variants", MUTED, 11)
    label(ax, 3.0, 0.45, "- - -", ACCENT, 11)
    label(ax, 3.45, 0.45, "one threshold for every gene", MUTED, 11)
    save(fig, "2025-popeve")


# ---------------------------------------------------------------- LFB
def lfb():
    fig, ax = canvas()
    # a small phylogeny with sequences at the tips
    tips = np.linspace(1.0, 5.0, 8)
    xl = 2.3
    def join(y1, y2, x, xc):
        ax.plot([x, x], [y1, y2], color=MUTED, lw=1.4)
        ax.plot([x, xc], [y1, y1], color=MUTED, lw=1.4)
        ax.plot([x, xc], [y2, y2], color=MUTED, lw=1.4)
    lvl = [(tips[i] + tips[i + 1]) / 2 for i in range(0, 8, 2)]
    for i in range(0, 8, 2):
        join(tips[i], tips[i + 1], 1.7, xl)
    l2 = [(lvl[0] + lvl[1]) / 2, (lvl[2] + lvl[3]) / 2]
    join(lvl[0], lvl[1], 1.1, 1.7); join(lvl[2], lvl[3], 1.1, 1.7)
    join(l2[0], l2[1], 0.5, 1.1)
    ax.plot([0.25, 0.5], [(l2[0] + l2[1]) / 2] * 2, color=MUTED, lw=1.4)
    scores = rng.normal(0.62, 0.17, 8).clip(0.2, 0.95)
    for y, s in zip(tips, scores):
        ax.add_patch(FancyBboxPatch((xl + 0.05, y - 0.13), 0.75, 0.26, boxstyle="round,pad=0,rounding_size=0.05",
                                    fc=FAINT, ec="none"))
        ax.add_patch(Rectangle((xl + 0.92, y - 0.08), 0.9 * s, 0.16, color=ACCENT2))
    label(ax, xl + 0.42, 5.45, "sequence", INK, 12, ha="center")
    label(ax, xl + 1.4, 5.45, "score", INK, 12, ha="center")
    ax.plot([4.15, 4.25, 4.25, 4.15], [0.85, 0.85, 5.15, 5.15], color=ACCENT, lw=1.5)
    arrow(ax, (4.3, 3.0), (4.75, 3.0), ACCENT)
    label(ax, 4.52, 3.25, "average", ACCENT, 11, ha="center")
    # scaling behaviour
    a = inset(fig, [0.66, 0.2, 0.31, 0.55])
    xs = np.linspace(0, 1, 200)
    plain = 0.55 + 0.35 * np.tanh(5 * xs) - 0.22 * np.clip(xs - 0.5, 0, None) ** 1.3
    lfb_ = 0.6 + 0.35 * np.tanh(4 * xs) + 0.12 * xs
    a.plot(xs, plain, color=MUTED, lw=2)
    a.plot(xs, lfb_, color=ACCENT, lw=2.4)
    a.text(1.0, plain[-1] - 0.06, "likelihood", color=MUTED, ha="right", fontsize=11)
    a.text(1.0, lfb_[-1] + 0.03, "with LFB", color=ACCENT, ha="right", fontsize=11)
    a.set_xlabel("model size", fontsize=11)
    a.set_ylabel("variant effect accuracy", fontsize=11)
    a.set_ylim(0.45, 1.15)
    save(fig, "2025-likelihood-to-fitness")


# ---------------------------------------------------------------- Blending
def blending():
    fig, ax = canvas()
    label(ax, 0.45, 5.35, "Evolutionary cost of a variant", INK, 13)
    rows = [(1.9, 0.4), (0.5, 1.9), (1.2, 1.1)]
    for i, (fold, dark) in enumerate(rows):
        y = 4.4 - i * 0.75
        ax.add_patch(Rectangle((0.45, y), fold, 0.42, color=MUTED, alpha=0.75, lw=0))
        ax.add_patch(Rectangle((0.45 + fold, y), dark, 0.42, color=ACCENT, lw=0))
    label(ax, 0.45, 1.95, "■", MUTED, 13)
    label(ax, 0.75, 1.95, "folding stability (ΔΔG)", MUTED, 11)
    label(ax, 0.45, 1.5, "■", ACCENT, 13)
    label(ax, 0.75, 1.5, "'dark energy': function", MUTED, 11)
    label(ax, 0.45, 1.05, "physics + inverse folding, no labels", MUTED, 10)
    a = inset(fig, [0.55, 0.16, 0.41, 0.66])
    onc = rng.multivariate_normal([0.25, 0.75], [[0.012, 0], [0, 0.012]], 45)
    tsg = rng.multivariate_normal([0.72, 0.35], [[0.016, 0.002], [0.002, 0.014]], 45)
    a.scatter(*tsg.T, s=16, color=MUTED, alpha=0.75, lw=0)
    a.scatter(*onc.T, s=16, color=WARM, alpha=0.9, lw=0)
    a.text(0.25, 1.02, "oncogene drivers", color=WARM, ha="center", fontsize=11)
    a.text(0.72, 0.02, "tumour suppressors", color=MUTED, ha="center", fontsize=11)
    a.set_xlim(0, 1); a.set_ylim(-0.05, 1.12)
    a.set_xlabel("destabilisation (ΔΔG)", fontsize=11)
    a.set_ylabel("dark energy", fontsize=11)
    save(fig, "2026-blending")


# ---------------------------------------------------------------- Review: fitness, folding, function
def review():
    fig, ax = canvas()
    box(ax, 0.35, 3.75, 1.6, 0.7, "sequence")
    box(ax, 0.35, 1.55, 1.6, 0.7, "structure")
    box(ax, 2.75, 3.75, 2.0, 0.7, "protein\nlanguage model", ACCENT2, size=11)
    box(ax, 2.75, 1.55, 2.0, 0.7, "inverse folding", ACCENT2, size=11)
    arrow(ax, (1.95, 4.1), (2.75, 4.1))
    arrow(ax, (1.95, 1.9), (2.75, 1.9))
    arrow(ax, (1.95, 4.0), (2.75, 2.05), MUTED, rad=0.0)
    box(ax, 5.9, 4.4, 1.7, 0.6, "fitness", ACCENT, size=12)
    box(ax, 5.9, 2.7, 1.7, 0.6, "function", ACCENT, size=12)
    box(ax, 5.9, 1.0, 1.7, 0.6, "folding", ACCENT, size=12)
    arrow(ax, (4.75, 4.15), (5.9, 4.65), ACCENT)
    arrow(ax, (4.75, 1.85), (5.9, 1.3), ACCENT)
    arrow(ax, (4.75, 2.05), (5.9, 2.95), WARM, ls="--")
    label(ax, 4.85, 4.95, "likelihood ≠ fitness", MUTED, 10)
    label(ax, 4.0, 2.75, "conservation read\nas stability", WARM, 10, ha="center")
    label(ax, 0.35, 5.35, "From sequences and structures to fitness, folding and function", INK, 12)
    save(fig, "2026-fitness-folding-function")


# ---------------------------------------------------------------- Comparative transcriptomics
def comparative():
    fig, ax = canvas()
    top, bot = 0.17 * 6, 0.83 * 6                     # heatmap extent in canvas units
    ys = [top + (bot - top) * (i + 0.5) / 6 for i in range(6)]
    tipx = 1.9
    def j(y1, y2, x, x1, x2):
        ax.plot([x, x], [y1, y2], color=MUTED, lw=1.4)
        ax.plot([x, x1], [y1, y1], color=MUTED, lw=1.4)
        ax.plot([x, x2], [y2, y2], color=MUTED, lw=1.4)
    j(ys[0], ys[1], 1.45, tipx, tipx); j(ys[2], ys[3], 1.3, tipx, tipx); j(ys[4], ys[5], 1.1, tipx, tipx)
    a1, a2, a3 = (ys[0] + ys[1]) / 2, (ys[2] + ys[3]) / 2, (ys[4] + ys[5]) / 2
    j(a1, a2, 0.85, 1.45, 1.3)
    b = (a1 + a2) / 2
    j(b, a3, 0.5, 0.85, 1.1)
    ax.plot([0.3, 0.5], [(b + a3) / 2] * 2, color=MUTED, lw=1.4)
    label(ax, 0.45, 5.35, "species", INK, 12)
    # expression that is correlated along the tree
    base = rng.normal(0, 1, 10)
    clade = [rng.normal(0, 0.6, 10) for _ in range(3)]
    rows = []
    for i in range(6):
        rows.append(base + clade[i // 2] + rng.normal(0, 0.35, 10))
    M = np.array(rows)
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list("site", [BG, FAINT, ACCENT2, ACCENT])
    a = fig.add_axes([0.24, 0.17, 0.72, 0.66])
    a.imshow(M, cmap=cmap, aspect="auto", origin="lower", extent=(0, 10, 0.5, 6.5))
    a.axis("off")
    label(ax, 1.95, 5.35, "tissues and cell types", INK, 12)
    label(ax, 1.95, 0.55, "expression patterns are shared along the tree, with clade-specific shifts", MUTED, 10)
    save(fig, "2025-comparative-transcriptomics")


# ---------------------------------------------------------------- Trustable clinical use
def trustable():
    fig, ax = canvas()
    a = inset(fig, [0.12, 0.17, 0.5, 0.66])
    xs = np.linspace(0, 1, 200)
    a.plot([0, 1], [0, 1], color=FAINT, lw=1.2, ls="--")
    cal = 1 / (1 + np.exp(-11 * (xs - 0.55)))
    a.plot(xs, cal, color=ACCENT, lw=2.4)
    bx = np.linspace(0.05, 0.95, 10)
    by = 1 / (1 + np.exp(-11 * (bx - 0.55))) + rng.normal(0, 0.03, 10)
    a.errorbar(bx, by.clip(0, 1), yerr=0.06, fmt="o", color=INK, ms=4, ecolor=MUTED, elinewidth=1, capsize=2)
    for lo, hi, al in [(0.8, 0.9, 0.12), (0.9, 0.97, 0.2), (0.97, 1.02, 0.3)]:
        a.axhspan(lo, hi, color=WARM, alpha=al, lw=0)
    a.set_xlim(0, 1); a.set_ylim(0, 1.02)
    a.set_xlabel("model score", fontsize=11)
    a.set_ylabel("probability pathogenic", fontsize=11)
    label(ax, 5.3, 4.9, "Calibrated scores", INK, 13)
    label(ax, 5.3, 4.45, "map to strengths of\nclinical evidence", MUTED, 11, va="top")
    for i, (txt, al) in enumerate([("supporting", 0.12), ("moderate", 0.2), ("strong", 0.3)]):
        y = 3.2 - i * 0.5
        ax.add_patch(Rectangle((5.3, y), 0.3, 0.3, color=WARM, alpha=al + 0.15, lw=0))
        label(ax, 5.75, y + 0.06, txt, MUTED, 11)
    save(fig, "2024-trustable-clinical-vep")


if __name__ == "__main__":
    for f in (eve, popeve, lfb, blending, review, comparative, trustable):
        f()
