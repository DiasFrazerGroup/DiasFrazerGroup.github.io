"""Social sharing card (1200x630) shown when a page link is posted on Bluesky, X, LinkedIn, Slack...

Run with any Python that has Pillow and numpy:  python scripts/og_card.py
Writes assets/img/og-card.png. Colours match assets/dark.scss.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
W, H, S = 1200, 630, 2                      # draw at 2x, downsample for smooth edges
PAPER, INK, MUTED, ACCENT = (13, 16, 21), (228, 231, 236), (138, 147, 163), (108, 176, 255)
SUPP = "/System/Library/Fonts/Supplemental/"

def font(name, size, index=0):
    try:
        return ImageFont.truetype(SUPP + name, size * S, index=index)
    except OSError:
        return ImageFont.load_default()

im = Image.new("RGB", (W * S, H * S), PAPER)
d = ImageDraw.Draw(im)

# double helix of dots on the right, echoing the home-page animation
rng = np.random.default_rng(7)
x0, x1, yc, amp = 760, 1150, 315, 150
for strand, phase in ((0, 0.0), (1, np.pi)):
    for t in np.linspace(0, 1, 46):
        x = x0 + (x1 - x0) * t
        z = np.sin(2 * np.pi * 1.6 * t + phase)
        y = yc + amp * np.cos(2 * np.pi * 1.6 * t + phase) * 0.9 + rng.normal(0, 2)
        r = 3.2 + 2.2 * (z + 1) / 2
        col = ACCENT if z > -0.1 else tuple(int(0.55 * c + 0.45 * p) for c, p in zip(MUTED, PAPER))
        d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=col)
for t in np.linspace(0, 1, 18):               # rungs
    x = x0 + (x1 - x0) * t
    ya = yc + amp * np.cos(2 * np.pi * 1.6 * t) * 0.9
    yb = yc + amp * np.cos(2 * np.pi * 1.6 * t + np.pi) * 0.9
    d.line([(x * S, ya * S), (x * S, yb * S)], fill=(40, 52, 70), width=2 * S)

L = 80
d.text((L * S, 92 * S), "CENTRE FOR GENOMIC REGULATION · BARCELONA", font=font("Georgia.ttf", 19), fill=ACCENT)
big, big_i = font("Georgia.ttf", 64), font("Georgia Italic.ttf", 64)
y = 170
d.text((L * S, y * S), "We build ", font=big, fill=INK)
w = d.textlength("We build ", font=big) / S
d.text(((L + w) * S, y * S), "generative", font=big_i, fill=ACCENT)
d.text((L * S, (y + 80) * S), "models of", font=big, fill=INK)
d.text((L * S, (y + 160) * S), "life’s data.", font=big, fill=INK)
d.line([(L * S, 500 * S), ((L + 60) * S, 500 * S)], fill=ACCENT, width=2 * S)
d.text((L * S, 520 * S), "Dias & Frazer Group", font=font("Georgia.ttf", 30), fill=INK)

im.resize((W, H), Image.LANCZOS).save(ROOT / "assets/img/og-card.png", optimize=True)
print("wrote assets/img/og-card.png")
