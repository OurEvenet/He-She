#!/usr/bin/env python3
"""
Generates the home-screen icons referenced by site.webmanifest and by the
apple-touch-icon link in index.html.

The mark is two brass rings on poruwa green — the same palette as the page,
drawn rather than set in type so no font file is needed at build time.

    python3 tools/make-icons.py

Outputs assets/img/icon-180.png (iOS home screen), icon-192.png and
icon-512.png (Android / manifest), and icon-maskable-512.png, which keeps the
mark inside the 80% safe circle Android crops to.
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")
os.makedirs(OUT, exist_ok=True)

GREEN = (0x22, 0x46, 0x3C)
DEEP = (0x0F, 0x22, 0x1D)
BRASS = (0xC0, 0x8A, 0x2E)
BRASS_HI = (0xE2, 0xB4, 0x5E)

SS = 4  # supersample, then downscale — cheap antialiasing


def rings(size, inset):
    """One icon at `size` px, with the mark occupying `inset` of the canvas."""
    s = size * SS
    img = Image.new("RGB", (s, s), GREEN)
    d = ImageDraw.Draw(img)

    # A soft vertical settle, darkest at the foot, so the flat green has depth
    for y in range(s):
        t = (y / s) ** 1.4
        d.line(
            [(0, y), (s, y)],
            fill=tuple(int(GREEN[c] + (DEEP[c] - GREEN[c]) * t) for c in range(3)),
        )

    r = s * inset * 0.27          # ring radius
    w = max(2, int(s * 0.026))    # stroke
    cy = s * 0.5
    dx = r * 0.62                 # how far the two rings overlap

    for cx, colour in ((s * 0.5 - dx, BRASS), (s * 0.5 + dx, BRASS_HI)):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=colour, width=w)

    # The nool: one thread hanging from the rings to the foot of the mark
    d.line([(s * 0.5, cy + r * 0.55), (s * 0.5, cy + r * 1.9)], fill=BRASS, width=max(1, w // 2))

    return img.resize((size, size), Image.LANCZOS)


for name, size, inset in (
    ("icon-180.png", 180, 1.0),
    ("icon-192.png", 192, 1.0),
    ("icon-512.png", 512, 1.0),
    ("icon-maskable-512.png", 512, 0.72),
):
    path = os.path.join(OUT, name)
    rings(size, inset).save(path, "PNG", optimize=True)
    print(f"wrote {os.path.relpath(path)}  {size}x{size}")
