#!/usr/bin/env python3
"""
Renders the nine pictures the invitation ships with.

    python3 tools/make-images.py && python3 tools/sync-lqip.py

These are composed scenes rather than abstract fills: a lamp lit in the
dark, hill country going blue at dusk, araliya on a cloth, the lakeside at
the hour the reception starts. Everything is drawn from numbers — light
first, then shape, then the grain and the falloff that stop a rendered
image looking rendered.

They are original artwork, not photographs, and they are meant to be
replaced. When the real pictures arrive:

    python3 tools/import-photos.py

Each scene is built as a float array in linear-ish space, so light adds
the way light does, and is only squeezed into 8-bit at the very end.
"""
import base64, io, json, math, os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")
os.makedirs(OUT, exist_ok=True)

# The room the day happens in: lamplight, lac red, betel green, brass.
FLAME = np.array([1.00, 0.83, 0.46])
BRASS = np.array([0.75, 0.54, 0.18])
LAC = np.array([0.43, 0.13, 0.14])
GREEN = np.array([0.13, 0.27, 0.23])
DEEP = np.array([0.045, 0.065, 0.058])
IVORY = np.array([0.95, 0.92, 0.86])
LEAF = np.array([0.20, 0.33, 0.19])


def grid(w, h):
    """x, y in 0..1, plus an aspect-corrected x for round things."""
    y, x = np.mgrid[0:h, 0:w]
    return x / w, y / h, (x / w - 0.5) * (w / h) + 0.5


def sky(w, h, top, bottom, power=1.0):
    _, y, _ = grid(w, h)
    t = (y ** power)[:, :, None]
    return top * (1 - t) + bottom * t


def glow(w, h, cx, cy, radius, colour, strength=1.0, falloff=2.2):
    """A light source. Adds, never replaces — that is what makes it glow."""
    x, y, xa = grid(w, h)
    d = np.sqrt((xa - cx) ** 2 + ((y - cy) * 1.0) ** 2) / radius
    f = np.clip(1 - d, 0, 1) ** falloff
    return f[:, :, None] * colour * strength


def bokeh(w, h, n, seed, colour, rmin=0.012, rmax=0.05, strength=0.5, band=(0.0, 1.0)):
    """Out-of-focus points of light, the way lamps go behind a lens."""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w, 3))
    for _ in range(n):
        cx = rng.uniform(-0.05, 1.05)
        cy = rng.uniform(*band)
        r = rng.uniform(rmin, rmax)
        s = rng.uniform(0.35, 1.0) * strength
        x, y, xa = grid(w, h)
        d = np.sqrt((xa - cx) ** 2 + (y - cy) ** 2) / r
        disc = np.clip(1 - d, 0, 1)
        disc = disc ** 0.45                      # flat-ish centre, soft rim
        out += disc[:, :, None] * colour * s
    return out


def ridge(w, h, base, amp, seed, roughness=5, power=1.6):
    """A horizon line: several sine bands summed, which reads as terrain."""
    rng = np.random.default_rng(seed)
    xs = np.linspace(0, 1, w)
    line = np.zeros(w)
    for k in range(1, roughness + 1):
        line += (rng.uniform(0.35, 1.0) / k ** power) * np.sin(
            xs * math.pi * 2 * k * rng.uniform(0.6, 1.5) + rng.uniform(0, 6.28))
    line = line / np.abs(line).max()
    return base + line * amp


def below(w, h, line):
    """Mask of everything under a horizon line, with a soft edge."""
    _, y, _ = grid(w, h)
    edge = 1.6 / h
    return np.clip((y - line[None, :]) / edge, 0, 1)


def soften(arr, px):
    if px <= 0:
        return arr
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(px)), dtype=np.float64) / 255


def grain(w, h, seed, amount=0.02):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, (h, w, 1))
    n = soften(np.repeat((n - n.min()) / (n.max() - n.min()), 3, axis=2), 0.6)
    return (n - 0.5) * amount


def vignette(w, h, strength=0.5, radius=0.95):
    x, y, xa = grid(w, h)
    d = np.sqrt((xa - 0.5) ** 2 + (y - 0.5) ** 2) / radius
    return 1 - np.clip(d, 0, 1) ** 2.2 * strength


def petal_mask(w, h, cx, cy, r, angle, seed, petals=5):
    """A five-petalled flower, drawn as a polar radius function."""
    x, y, xa = grid(w, h)
    dx, dy = (xa - cx), (y - cy)
    d = np.sqrt(dx ** 2 + dy ** 2)
    a = np.arctan2(dy, dx) + angle
    rng = np.random.default_rng(seed)
    wobble = 1 + 0.06 * np.sin(a * petals * 2 + rng.uniform(0, 6))
    edge = r * (0.62 + 0.38 * np.abs(np.cos(a * petals / 2))) * wobble
    return np.clip((edge - d) / (r * 0.10), 0, 1)


def local(w, h, cx, cy, angle):
    """Coordinates rotated into a shape's own frame."""
    x, y, xa = grid(w, h)
    dx, dy = xa - cx, y - cy
    ca, sa = math.cos(-angle), math.sin(-angle)
    return dx * ca - dy * sa, dx * sa + dy * ca


def leaf_mask(w, h, cx, cy, length, width, angle):
    """
    A betel leaf: widest a third of the way up, tapering to a point, with
    the notch at the stem that makes the shape read as a heart.
    """
    u, v = local(w, h, cx, cy, angle)
    t = u / length                                   # 0 at stem, 1 at tip
    inside = (t > 0) & (t < 1)
    # A broad shoulder near the base, drawn to a point at the tip
    half = width * np.sin(np.pi * np.clip(t, 0, 1) ** 0.62) * (1 - 0.25 * np.clip(t, 0, 1))
    body = np.clip((half - np.abs(v)) / (width * 0.06), 0, 1) * inside
    # the notch: two lobes either side of the stem
    notch = np.clip((np.abs(v) - width * 0.30 * (1 - np.clip(t / 0.18, 0, 1))) /
                    (width * 0.06), 0, 1)
    body = np.where(t < 0.18, body * notch, body)
    return body


def ellipse(w, h, cx, cy, rx, ry, softness=8.0):
    x, y, xa = grid(w, h)
    d = np.sqrt(((xa - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
    return np.clip((1 - d) * softness, 0, 1)


def rim(mask, w, h, px, side=(-1.0, -1.0)):
    """The bright edge a silhouette catches on the side facing the light."""
    grown = soften(np.repeat(mask[:, :, None], 3, axis=2), px)[:, :, 0]
    edge = np.clip(grown - mask, 0, 1)
    x, y, _ = grid(w, h)
    lean = np.clip(0.5 + side[0] * (x - 0.5) * 2 + side[1] * (y - 0.5) * 2, 0, 1)
    return edge * lean


def finish(arr, seed, vig=0.5, warm=1.0):
    arr = arr * vignette(arr.shape[1], arr.shape[0], vig)[:, :, None]
    arr = arr + grain(arr.shape[1], arr.shape[0], seed)
    arr = np.clip(arr, 0, 1) ** (1 / 1.05)          # a touch of lift in the shadows
    arr[:, :, 0] *= warm
    arr[:, :, 2] *= 2 - warm
    return np.clip(arr, 0, 1)


# --- The nine scenes ---------------------------------------------------

def scene_lamp(w, h, seed):
    """
    A standing brass lamp, wick just lit. Almost entirely silhouette: the
    shape is read from the light behind it and the rim it catches, which
    is how a lamp in a dark room actually looks.
    """
    img = np.ones((h, w, 3)) * DEEP * 0.7
    img += glow(w, h, 0.52, 0.44, 0.78, FLAME, 0.50, 2.4)     # the room
    img += glow(w, h, 0.40, 0.33, 0.22, FLAME, 0.85, 1.9)     # near the wick
    img += bokeh(w, h, 6, seed, FLAME, 0.02, 0.08, 0.09, (0.6, 1.0))

    x, y, xa = grid(w, h)
    # bowl, stem, foot — a pahana, stacked
    bowl = np.clip(ellipse(w, h, 0.52, 0.52, 0.16, 0.055)
                   - ellipse(w, h, 0.52, 0.495, 0.135, 0.035), 0, 1)
    spout = np.clip((1 - np.abs((xa - 0.36) / 0.055) - np.abs((y - 0.515) / 0.022)) * 6, 0, 1)
    stem = np.clip((1 - np.abs(xa - 0.52) / 0.022) * 8, 0, 1) \
        * np.clip((y - 0.55) * 24, 0, 1) * np.clip((0.80 - y) * 24, 0, 1)
    knop = ellipse(w, h, 0.52, 0.66, 0.045, 0.022)
    foot = np.clip(ellipse(w, h, 0.52, 0.81, 0.15, 0.045)
                   * np.clip((y - 0.78) * 30, 0, 1), 0, 1)
    body = np.clip(bowl + spout + stem + knop + foot, 0, 1)

    # silhouette first, then the brass edge facing the flame
    img *= (1 - body * 0.93)[:, :, None]
    img += (rim(body, w, h, w * 0.006, (-1.4, -0.8)) * 0.9)[:, :, None] * BRASS * 2.2
    img += (body * np.clip(1 - np.abs(xa - 0.40) * 2.6, 0, 1) * 0.16)[:, :, None] * BRASS

    # the flame on the spout, and what it throws on everything near it
    flame = np.clip((1 - np.sqrt(((xa - 0.345) / 0.020) ** 2
                                 + ((y - 0.455) / 0.055) ** 2)) * 5, 0, 1)
    img += flame[:, :, None] * FLAME * 1.6
    img += soften(flame[:, :, None] * FLAME, w * 0.025) * 1.1
    return finish(img, seed, 0.62, 1.03)


def scene_kandy(w, h, seed):
    """Hill country at dusk: ridges going blue as they go back."""
    img = sky(w, h, np.array([0.16, 0.20, 0.32]), np.array([0.86, 0.60, 0.38]), 2.3)
    img += glow(w, h, 0.68, 0.86, 0.55, np.array([1.0, 0.72, 0.42]), 0.55, 2.0)

    layers = [(0.78, 0.030, np.array([0.44, 0.47, 0.56]), 7.0),
              (0.83, 0.038, np.array([0.30, 0.35, 0.44]), 4.5),
              (0.88, 0.045, np.array([0.19, 0.25, 0.31]), 2.5),
              (0.94, 0.055, np.array([0.10, 0.15, 0.18]), 1.0),
              (1.02, 0.070, np.array([0.05, 0.08, 0.09]), 0.0)]
    for i, (base, amp, colour, blur) in enumerate(layers):
        mask = below(w, h, ridge(w, h, base, amp, seed + i * 13, 6))
        if blur:
            mask = soften(np.repeat(mask[:, :, None], 3, axis=2), blur)[:, :, 0]
        img = img * (1 - mask[:, :, None]) + colour * mask[:, :, None]
    return finish(img, seed, 0.45, 1.01)


def scene_venue(w, h, seed):
    """The lakeside at the hour the reception starts."""
    horizon = 0.52
    img = sky(w, h, np.array([0.11, 0.15, 0.26]), np.array([0.78, 0.50, 0.32]), 2.6)
    img += glow(w, h, 0.30, horizon, 0.45, np.array([1.0, 0.70, 0.40]), 0.60, 2.2)

    x, y, xa = grid(w, h)
    trees = below(w, h, ridge(w, h, horizon - 0.01, 0.018, seed + 5, 8))
    trees *= 1 - below(w, h, np.full(w, horizon))
    img = img * (1 - trees[:, :, None]) + np.array([0.05, 0.07, 0.06]) * trees[:, :, None]

    water = below(w, h, np.full(w, horizon))[:, :, None]
    # the sky, upside down, smeared sideways: a reflection
    mirror = np.flipud(img) * 0.55
    mirror = soften(mirror, w * 0.006)
    ripple = (np.sin(y * 210) * 0.5 + 0.5)[:, :, None] * 0.10 + 0.95
    img = img * (1 - water) + mirror * water * ripple

    # the lamps along the far shore, and their long reflections
    img += bokeh(w, h, 9, seed + 3, FLAME, 0.004, 0.012, 0.85,
                 (horizon - 0.012, horizon - 0.002))
    img += bokeh(w, h, 9, seed + 3, FLAME, 0.004, 0.030, 0.22,
                 (horizon + 0.02, horizon + 0.22))
    return finish(img, seed, 0.5, 1.02)


def scene_araliya(w, h, seed):
    """Temple flowers dropped on a pale cloth."""
    img = np.ones((h, w, 3)) * IVORY * 0.93
    img += glow(w, h, 0.35, 0.25, 0.9, np.array([1.0, 0.97, 0.90]), 0.10, 1.4)
    # the weave of the cloth
    x, y, _ = grid(w, h)
    img -= ((np.sin(x * w * 0.9) * np.sin(y * h * 0.9)) * 0.012)[:, :, None]

    rng = np.random.default_rng(seed)
    blooms = [(0.30, 0.32, 0.20, 0.0), (0.66, 0.52, 0.24, 1.1),
              (0.44, 0.76, 0.17, 2.2), (0.82, 0.21, 0.13, 0.6),
              (0.13, 0.66, 0.12, 3.0)]
    for i, (cx, cy, r, a) in enumerate(blooms):
        m = petal_mask(w, h, cx, cy, r, a, seed + i)
        depth = 0.0 if i < 3 else w * 0.010          # the far ones sit out of focus
        if depth:
            m = soften(np.repeat(m[:, :, None], 3, axis=2), depth)[:, :, 0]
        shadow = soften(np.repeat(m[:, :, None], 3, axis=2), w * 0.016)[:, :, 0]
        img -= (shadow * 0.13)[:, :, None]
        petal = np.ones((h, w, 3)) * np.array([1.0, 0.985, 0.95])
        # the yellow throat every frangipani has
        throat = np.clip(1 - np.sqrt(((_ - cx) ** 2 + (y - cy) ** 2)) / (r * 0.42), 0, 1) ** 1.6
        petal = petal * (1 - throat[:, :, None]) + np.array([1.0, 0.84, 0.42]) * throat[:, :, None]
        img = img * (1 - m[:, :, None]) + petal * m[:, :, None]
    return finish(img, seed, 0.30, 1.005)


def scene_hands(w, h, seed):
    """Betel leaves, overlapping, the way they are passed."""
    img = np.ones((h, w, 3)) * DEEP * 1.5
    img += glow(w, h, 0.42, 0.35, 0.75, FLAME, 0.30, 2.0)

    leaves = [(0.22, 0.62, 0.46, 0.17, -0.30, 0.80),
              (0.44, 0.40, 0.44, 0.16, 0.28, 1.00),
              (0.66, 0.66, 0.40, 0.15, -0.10, 0.72)]
    for i, (cx, cy, ln, wd, ang, lightness) in enumerate(leaves):
        m = leaf_mask(w, h, cx, cy, ln, wd, ang)
        shadow = soften(np.repeat(m[:, :, None], 3, axis=2), w * 0.022)[:, :, 0]
        img *= (1 - shadow * 0.5)[:, :, None]

        u, v = local(w, h, cx, cy, ang)
        # lit from the lamp side, darkening along the length and across it
        across = np.clip(1 - np.abs(v) / (wd * 1.4), 0, 1)
        along = np.clip(1 - u / (ln * 1.5), 0, 1)
        body = LEAF[None, None, :] * ((0.42 + 0.95 * across * along) * lightness)[:, :, None]
        # the midrib and the veins running off it
        midrib = np.clip(1 - np.abs(v) / (wd * 0.035), 0, 1)
        veins = np.clip(1 - np.abs(np.sin(v / (wd * 0.30) * np.pi + u / (ln * 0.34))) * 14, 0, 1)
        body += ((midrib * 0.30 + veins * 0.10) * m)[:, :, None] * FLAME
        # a wet highlight where the leaf faces the flame
        gloss = np.clip(1 - np.sqrt(((u - ln * 0.28) / (ln * 0.30)) ** 2
                                    + ((v + wd * 0.35) / (wd * 0.5)) ** 2), 0, 1) ** 2
        body += (gloss * m * 0.28)[:, :, None] * FLAME
        img = img * (1 - m[:, :, None]) + body * m[:, :, None]
    return finish(img, seed, 0.55, 1.02)


def scene_table(w, h, seed):
    """
    The table laid, from above, before anybody sits down: a banana leaf
    across the dark wood, brass rims catching the lamp, and the leaf
    falling into shadow at the far side.
    """
    img = np.ones((h, w, 3)) * np.array([0.085, 0.062, 0.046])
    img += glow(w, h, 0.34, 0.30, 0.95, FLAME, 0.40, 1.7)
    x, y, xa = grid(w, h)
    # the grain of the wood it is laid on
    img += (np.sin(y * 140 + np.sin(x * 9) * 2) * 0.006)[:, :, None]

    # the leaf: a long rounded band, laid at a slight angle
    u, v = local(w, h, 0.5, 0.5, -0.09)
    leafm = np.clip((1 - np.abs(v) / 0.30) * 7, 0, 1) * np.clip((1 - np.abs(u) / 0.60) * 7, 0, 1)
    shadow = soften(np.repeat(leafm[:, :, None], 3, axis=2), w * 0.02)[:, :, 0]
    img *= (1 - shadow * 0.35)[:, :, None]
    ribs = 0.93 + 0.07 * np.sin(v * 520)
    lit = 0.45 + 0.95 * np.clip(1 - np.sqrt((xa - 0.34) ** 2 + (y - 0.30) ** 2) / 0.85, 0, 1)
    img = img * (1 - leafm[:, :, None]) + (LEAF * 0.62)[None, None, :] * (leafm * ribs * lit)[:, :, None]
    spine = np.clip(1 - np.abs(v) / 0.006, 0, 1) * leafm
    img += spine[:, :, None] * np.array([0.30, 0.30, 0.18])

    # Brass, cropped by the frame. A whole circle in the middle of a
    # picture reads as an icon; a rim running out of shot reads as a
    # plate that carried on past the edge, which is what a photograph of
    # a laid table actually looks like.
    for cx, cy, r in ((0.14, 0.20, 0.30), (0.93, 0.74, 0.26)):
        outer = ellipse(w, h, cx, cy, r, r, 10)
        inner = ellipse(w, h, cx, cy, r * 0.86, r * 0.86, 10)
        band = np.clip(outer - inner, 0, 1)
        cast = soften(np.repeat(outer[:, :, None], 3, axis=2), w * 0.025)[:, :, 0]
        img *= (1 - cast * 0.4)[:, :, None]
        img = img * (1 - inner[:, :, None]) + \
            (np.array([0.17, 0.13, 0.08])[None, None, :] * (0.5 + 0.9 * lit)[:, :, None]) * inner[:, :, None]
        sheen = 0.30 + 1.25 * np.clip(1 - np.sqrt((xa - cx + r * 0.40) ** 2
                                                  + (y - cy + r * 0.40) ** 2) / (r * 1.5), 0, 1)
        img = img * (1 - band[:, :, None]) + (BRASS * 1.2)[None, None, :] * (band * sheen)[:, :, None]

    # One cut lime and a scatter of seeds, small and soft, to give the
    # eye something the size of a real object to measure against
    lime = soften(np.repeat(ellipse(w, h, 0.72, 0.46, 0.042, 0.040, 6)[:, :, None], 3, axis=2),
                  w * 0.004)[:, :, 0]
    img = img * (1 - lime[:, :, None] * 0.85) + \
        (np.array([0.52, 0.58, 0.20])[None, None, :] * (0.5 + 0.8 * lit)[:, :, None]) * (lime * 0.85)[:, :, None]
    rng = np.random.default_rng(seed)
    for _ in range(14):
        sx, sy = rng.uniform(0.18, 0.88), rng.uniform(0.25, 0.78)
        img += (ellipse(w, h, sx, sy, 0.008, 0.006, 4) * 0.35)[:, :, None] * np.array([0.45, 0.33, 0.14])
    return finish(img, seed, 0.5, 1.03)


def scene_poruwa(w, h, seed):
    """
    The canopy mid-assembly, seen against the light coming through the
    doorway behind it. Structure in silhouette; the hung cloth is the
    only thing bright, because cloth is the only thing that glows.
    """
    img = np.ones((h, w, 3)) * DEEP * 0.8
    img += glow(w, h, 0.30, 0.42, 0.80, FLAME, 0.55, 2.0)
    img += glow(w, h, 0.78, 0.30, 0.40, LAC * 2.0, 0.30, 2.0)
    img += bokeh(w, h, 8, seed, FLAME, 0.015, 0.055, 0.13, (0.05, 0.60))

    x, y, xa = grid(w, h)
    xs = np.linspace(0, 1, w)

    # A detail rather than the whole structure: the dressed side of the
    # canopy, close enough that it is mostly cloth. Folds are what make
    # fabric read as fabric — sinusoidal shading, lit from one side, with
    # the hem swinging as the folds do.
    folds = (0.5 + 0.5 * np.cos(xs * 26.0 + 0.4 * np.sin(xs * 7.0)))
    depth = (folds ** 1.5)[None, :]
    hem = (0.82 + 0.035 * np.sin(xs * 13.0 + 1.0))[None, :]
    cloth = np.clip((hem - y) * 26, 0, 1) * np.clip((y - 0.06) * 26, 0, 1) \
        * np.clip((0.72 - xa) * 12, 0, 1)
    side = np.clip(1 - np.abs(xa - 0.24) * 1.5, 0, 1)
    tone = 0.30 + 0.62 * depth * (0.45 + 0.75 * side)
    img = img * (1 - cloth[:, :, None]) + (IVORY * 0.92)[None, None, :] * (cloth * tone)[:, :, None]
    # gold thread worked along the hem
    band = np.clip((1 - np.abs(y - (hem - 0.035)) / 0.012) * 4, 0, 1) * cloth
    img += (band * (0.35 + 0.8 * depth))[:, :, None] * BRASS * 1.4

    # The post the cloth is tied to, dark, at the edge of frame
    post = np.clip((1 - np.abs(xa - 0.86) / 0.075) * 6, 0, 1)
    img *= (1 - post * 0.90)[:, :, None]
    img += (rim(post, w, h, w * 0.008, (-1.6, -0.3)) * 0.85)[:, :, None] * BRASS * 2.0
    # and the cord binding it, catching the same light
    for cy in (0.34, 0.40, 0.46):
        cord = np.clip((1 - np.abs(y - cy) / 0.011) * 4, 0, 1) * post
        img += (cord * 0.5)[:, :, None] * BRASS * 1.6

    img *= (1 - np.clip((y - 0.88) * 9, 0, 1) * 0.75)[:, :, None]
    return finish(img, seed, 0.58, 1.02)


def scene_hero(w, h, seed):
    """The picture the names sit on: dark, warm, and quiet at the foot."""
    img = np.ones((h, w, 3)) * DEEP * 0.9
    img += glow(w, h, 0.62, 0.26, 0.85, FLAME, 0.50, 2.1)
    img += glow(w, h, 0.20, 0.12, 0.45, LAC * 2.2, 0.35, 1.8)
    img += bokeh(w, h, 16, seed, FLAME, 0.015, 0.075, 0.16, (0.02, 0.62))

    x, y, xa = grid(w, h)
    # a suggestion of the canopy, well out of focus
    arch = np.clip(1 - np.abs((y - 0.30) - 0.10 * np.sin((xa - 0.1) * 3.0)) * 14, 0, 1)
    arch *= np.clip((xa - 0.05) * 6, 0, 1) * np.clip((0.95 - xa) * 6, 0, 1)
    arch = soften(np.repeat(arch[:, :, None], 3, axis=2), w * 0.012)[:, :, 0]
    img += arch[:, :, None] * BRASS * 0.30

    m = below(w, h, ridge(w, h, 0.72, 0.05, seed + 2, 4))
    m = soften(np.repeat(m[:, :, None], 3, axis=2), w * 0.01)[:, :, 0]
    img = img * (1 - m[:, :, None]) + (GREEN * 0.25)[None, None, :] * m[:, :, None]

    # the type goes at the foot, so the foot gets darker
    img *= (1 - np.clip((y - 0.45) / 0.55, 0, 1) ** 1.6 * 0.55)[:, :, None]
    return finish(img, seed, 0.55, 1.03)


def scene_og(w, h, seed):
    """The social preview: the same lamplight, composed wide."""
    img = np.ones((h, w, 3)) * DEEP
    img += glow(w, h, 0.5, 0.52, 0.70, FLAME, 0.55, 2.0)
    img += bokeh(w, h, 12, seed, FLAME, 0.02, 0.06, 0.22, (0.05, 0.95))
    x, y, xa = grid(w, h)
    flame = np.clip((1 - np.sqrt(((xa - 0.5) / 0.022) ** 2
                                 + ((y - 0.50) / 0.10) ** 2)) * 5, 0, 1)
    img += flame[:, :, None] * FLAME * 1.4
    img += soften(flame[:, :, None] * FLAME, w * 0.03) * 1.0
    return finish(img, seed, 0.55, 1.03)


SPECS = [
    ("hero",    1600, 2000, 11, scene_hero),
    ("poruwa",  1400, 1750, 23, scene_poruwa),
    ("lamp",    1200, 1200, 31, scene_lamp),
    ("hands",   1500, 1000, 47, scene_hands),
    ("araliya", 1100, 1400, 59, scene_araliya),
    ("kandy",   1600, 1000, 67, scene_kandy),
    ("table",   1300, 1300, 73, scene_table),
    ("venue",   1600, 1000, 89, scene_venue),
    ("og",      1200,  630, 97, scene_og),
]


def write(name, arr, seed):
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8), "RGB")
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=40, threshold=3))
    jpg = os.path.join(OUT, name + ".jpg")
    img.save(jpg, "JPEG", quality=82, optimize=True, progressive=True)
    img.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=78, method=6)

    tiny = img.copy()
    tiny.thumbnail((20, 20), Image.LANCZOS)
    buf = io.BytesIO()
    tiny.save(buf, "JPEG", quality=32)
    kb = os.path.getsize(jpg) / 1024
    print(f"  {name:9s} {img.width}x{img.height}  {kb:5.0f} kB")
    return {"w": img.width, "h": img.height,
            "lqip": "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()}


meta = {}
for name, w, h, seed, scene in SPECS:
    meta[name] = write(name, scene(w, h, seed), seed)

with open(os.path.join(OUT, "_lqip.json"), "w") as f:
    json.dump(meta, f, indent=2)
print("\nwrote", os.path.relpath(os.path.join(OUT, "_lqip.json")))
print("now run: python3 tools/sync-lqip.py")
