#!/usr/bin/env python3
"""
Generates placeholder imagery in the site palette, plus WebP versions and
LQIP (low quality image placeholder) base64 strings for data/wedding.json.

Replace assets/img/*.jpg with real photographs, then re-run:
    python3 tools/make-images.py
"""
import base64, io, json, math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")
os.makedirs(OUT, exist_ok=True)

INK   = (0x14, 0x23, 0x1F)
GREEN = (0x22, 0x46, 0x3C)
BRASS = (0xC0, 0x8A, 0x2E)
SHELL = (0xE8, 0xE6, 0xDC)
DEEP  = (0x0B, 0x16, 0x13)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def base_field(w, h, top, bottom, warm, rng):
    """Vertical gradient with a soft off-centre warm bloom."""
    yy = np.linspace(0, 1, h)[:, None]
    xx = np.linspace(0, 1, w)[None, :]
    img = np.zeros((h, w, 3), dtype=np.float64)
    for c in range(3):
        img[:, :, c] = top[c] + (bottom[c] - top[c]) * (yy ** 1.25)

    cx, cy = rng.uniform(0.25, 0.72), rng.uniform(0.18, 0.5)
    r = np.sqrt(((xx - cx) * 1.35) ** 2 + (yy - cy) ** 2)
    bloom = np.clip(1.0 - r / rng.uniform(0.55, 0.85), 0, 1) ** 2.1
    for c in range(3):
        img[:, :, c] = img[:, :, c] * (1 - bloom * 0.55) + warm[c] * (bloom * 0.55)
    return img


def leaf(draw, cx, cy, length, width, angle, fill):
    """Betel-shaped leaf silhouette."""
    pts = []
    steps = 48
    for i in range(steps + 1):
        t = i / steps
        # heart-ish half profile
        x = t * length
        wob = math.sin(t * math.pi) ** 0.75
        y = wob * width * (1 - 0.35 * t) * (1 + 0.25 * math.sin(t * math.pi * 2))
        pts.append((x, y))
    for i in range(steps, -1, -1):
        x, y = pts[i]
        pts.append((x, -y))
    ca, sa = math.cos(angle), math.sin(angle)
    rot = [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts[: steps + 1]] + \
          [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts[steps + 1:]]
    draw.polygon(rot, fill=fill)


def compose(name, w, h, seed, palette="green", leaves=4, vignette=0.55, soft=0.012):
    rng = random.Random(seed)
    nprng = np.random.default_rng(seed)

    if palette == "green":
        top, bottom, warm = DEEP, GREEN, lerp(BRASS, GREEN, 0.45)
    elif palette == "brass":
        top, bottom, warm = lerp(INK, BRASS, 0.25), lerp(GREEN, BRASS, 0.4), BRASS
    else:  # shell
        top, bottom, warm = SHELL, lerp(SHELL, GREEN, 0.28), lerp(SHELL, BRASS, 0.35)

    field = base_field(w, h, top, bottom, warm, rng)
    img = Image.fromarray(np.clip(field, 0, 255).astype(np.uint8), "RGB")

    # botanical silhouettes on a separate blurred layer
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tint = lerp(bottom, INK, 0.45) if palette != "shell" else lerp(bottom, GREEN, 0.5)
    for _ in range(leaves):
        L = rng.uniform(0.45, 1.05) * max(w, h)
        leaf(
            d,
            rng.uniform(-0.1, 1.05) * w,
            rng.uniform(-0.05, 1.05) * h,
            L,
            L * rng.uniform(0.22, 0.34),
            rng.uniform(0, math.tau),
            tint + (rng.randint(70, 130),),
        )
    layer = layer.filter(ImageFilter.GaussianBlur(max(w, h) * soft))
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")

    # a couple of brass filaments — lamp-light streaks
    fil = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fil)
    for _ in range(2):
        x0, y0 = rng.uniform(0, w), rng.uniform(0, h)
        pts = [(x0, y0)]
        for k in range(9):
            pts.append((pts[-1][0] + rng.uniform(-0.11, 0.16) * w,
                        pts[-1][1] + rng.uniform(-0.09, 0.14) * h))
        fd.line(pts, fill=BRASS + (rng.randint(26, 52),), width=max(2, int(w * 0.004)), joint="curve")
    fil = fil.filter(ImageFilter.GaussianBlur(max(w, h) * 0.02))
    img = Image.alpha_composite(img.convert("RGBA"), fil).convert("RGB")

    # grain, generated at quarter resolution then scaled up so it reads as
    # film grain and still survives JPEG/WebP encoding at a sane file size
    arr = np.asarray(img).astype(np.float64)
    gh, gw = max(2, h // 4), max(2, w // 4)
    grain = nprng.normal(0, 5.0, (gh, gw))
    grain = np.asarray(
        Image.fromarray(np.clip(grain * 8 + 128, 0, 255).astype(np.uint8), "L")
        .resize((w, h), Image.BICUBIC)
    ).astype(np.float64)
    grain = (grain - 128) / 8.0
    arr = np.clip(arr + grain[:, :, None], 0, 255)

    # vignette
    yy = np.linspace(-1, 1, h)[:, None]
    xx = np.linspace(-1, 1, w)[None, :]
    r = np.sqrt(xx ** 2 + yy ** 2) / math.sqrt(2)
    v = 1 - np.clip(r - 0.35, 0, 1) ** 1.6 * vignette
    arr = arr * v[:, :, None]

    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=45, threshold=3))

    jpg = os.path.join(OUT, name + ".jpg")
    img.save(jpg, "JPEG", quality=74, optimize=True, progressive=True)
    img.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=66, method=6)

    # LQIP: 20px wide, heavily compressed, inlined as a data URI
    tiny = img.copy()
    tiny.thumbnail((20, 20), Image.LANCZOS)
    buf = io.BytesIO()
    tiny.save(buf, "JPEG", quality=32)
    lqip = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    return {"w": w, "h": h, "lqip": lqip}


SPECS = [
    # name, w, h, seed, palette, leaves, vignette, silhouette softness
    ("hero",      1600, 2000, 11, "green", 5, 0.62, 0.016),
    ("poruwa",    1400, 1750, 23, "green", 3, 0.50, 0.005),
    ("lamp",      1200, 1200, 31, "brass", 2, 0.55, 0.004),
    ("hands",     1500, 1000, 47, "green", 3, 0.50, 0.005),
    ("araliya",   1100, 1400, 59, "shell", 3, 0.35, 0.004),
    ("kandy",     1600, 1000, 67, "green", 4, 0.55, 0.006),
    ("table",     1300, 1300, 73, "brass", 2, 0.50, 0.005),
    ("venue",     1600, 1000, 89, "green", 3, 0.50, 0.006),
    ("og",        1200,  630, 97, "green", 3, 0.45, 0.010),
]

meta = {}
for name, w, h, seed, pal, lv, vg, sf in SPECS:
    meta[name] = compose(name, w, h, seed, pal, lv, vg, sf)
    print(f"  {name:9s} {w}x{h}")

with open(os.path.join(OUT, "_lqip.json"), "w") as f:
    json.dump(meta, f, indent=2)
print("\nwrote", os.path.join(OUT, "_lqip.json"))
