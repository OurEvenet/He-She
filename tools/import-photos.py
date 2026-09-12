#!/usr/bin/env python3
"""
Turns real photographs into the files the invitation actually wants.

Drop whatever came off the camera or the phone into assets/img/incoming/,
named after the slot it belongs in (hero.jpg, poruwa.HEIC, lamp.png …), then:

    python3 tools/import-photos.py

For each one it will

  * respect the EXIF rotation, so a photograph taken sideways is upright;
  * strip every scrap of metadata, GPS coordinates included — a phone
    photograph taken at home carries the coordinates of your house, and this
    site is public;
  * resize to something a phone can download on hotel wifi;
  * write the .jpg and the matching .webp;
  * record the real width, height and blur placeholder in data/wedding.json,
    which is what keeps the layout from shifting as the photographs arrive.

Framing is left alone. The gallery reads each photograph's own aspect ratio
out of the JSON and lays itself out around it, so there is no reason to crop
what you framed. The one exception is `og`, the social preview: WhatsApp and
the rest crop that to 1200x630 themselves and do it badly, so it is cropped
here instead.

Options:

    --from DIR     where the originals are (default assets/img/incoming)
    --in-place     read the originals straight from assets/img and overwrite
                   them, for when you have already dropped them in there
    --only NAME    just this slot, repeatable
    --max-width N  longest edge of every written file, overriding the
                   per-slot defaults (1800 for the hero, 1600 for the venue,
                   1200 for the gallery; the social preview is always
                   1200x630 because that is what the chat apps want)
    --crop NAME=W:H  crop a slot to an exact ratio, e.g. --crop hero=4:5
    --keep         leave the originals in incoming/ instead of moving them
                   into incoming/imported/

HEIC (the format iPhones use by default) needs one extra package:

    pip install pillow-heif

Without it, HEIC files are reported and skipped — set the phone to
"Most Compatible", or export as JPEG, and run this again.
"""
import argparse, base64, io, json, os, shutil, subprocess, sys, collections

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("This needs Pillow:  pip install pillow")

try:  # optional, only for iPhone HEIC files
    import pillow_heif

    pillow_heif.register_heif_opener()
    HEIC = True
except ImportError:
    HEIC = False

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IMG = os.path.join(ROOT, "assets", "img")
INCOMING = os.path.join(IMG, "incoming")
JSON_PATH = os.path.join(ROOT, "data", "wedding.json")
LQIP_PATH = os.path.join(IMG, "_lqip.json")

READABLE = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp", ".heic", ".heif"}

# The social preview is the only fixed shape: the chat apps crop it anyway,
# and they want exactly this many pixels.
FIXED_SIZE = {"og": (1200, 630)}

# How big each file is actually worth writing. A gallery frame is about 600
# CSS px at its widest, so 1200 covers it twice over on a retina screen;
# the hero and the venue photograph run edge to edge and get more.
MAX_WIDTH = {"hero": 1800, "venue": 1600}
MAX_WIDTH_DEFAULT = 1200

JPEG_QUALITY = 82
WEBP_QUALITY = 80


def known_images():
    """The images block as the invitation currently has it, in its own order."""
    with open(JSON_PATH) as f:
        data = json.load(f, object_pairs_hook=collections.OrderedDict)
    return data.get("images", collections.OrderedDict())


def sources(folder, wanted):
    """({slot: path} for every readable file named after a slot, skipped count)."""
    found = {}
    skipped = 0
    if not os.path.isdir(folder):
        return found, skipped
    for entry in sorted(os.listdir(folder)):
        path = os.path.join(folder, entry)
        if not os.path.isfile(path):
            continue
        name, ext = os.path.splitext(entry)
        name, ext = name.lower(), ext.lower()
        if name not in wanted or ext not in READABLE:
            continue
        if ext in (".heic", ".heif") and not HEIC:
            print(f"  {name:9s} skipped — {entry} is an iPhone HEIC file")
            skipped += 1
            continue
        # A .jpg beats a .png of the same slot only by being found first;
        # either is fine, so the first readable one wins and we say which.
        found.setdefault(name, path)
    return found, skipped


def load(path):
    """Open, rotate per EXIF, and flatten to RGB with no metadata attached."""
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)          # upright, whatever the phone said

    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        flat = Image.new("RGB", img.size, (255, 255, 255))
        flat.paste(img, mask=img.split()[-1])
        img = flat
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Rebuilding from raw pixels leaves every metadata block — EXIF, GPS,
    # ICC, the lot — behind, rather than trusting each encoder to drop it.
    return Image.frombytes("RGB", img.size, img.tobytes())


def fit(img, max_width):
    """Longest edge down to max_width. Never enlarges a small original."""
    longest = max(img.size)
    if longest <= max_width:
        return img
    scale = max_width / longest
    size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
    return img.resize(size, Image.LANCZOS)


def crop_to(img, ratio_w, ratio_h):
    """Centre crop to a ratio, taking the largest rectangle that fits."""
    want = ratio_w / ratio_h
    have = img.width / img.height
    if abs(want - have) < 0.002:
        return img
    if have > want:                                  # too wide: trim the sides
        w = round(img.height * want)
        left = (img.width - w) // 2
        return img.crop((left, 0, left + w, img.height))
    h = round(img.width / want)                      # too tall: trim top and foot
    top = (img.height - h) // 2
    return img.crop((0, top, img.width, top + h))


def lqip(img):
    """The 20px blur the page shows until the real file lands."""
    tiny = img.copy()
    tiny.thumbnail((20, 20), Image.LANCZOS)
    buf = io.BytesIO()
    tiny.save(buf, "JPEG", quality=32)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def process(name, path, max_width, crops):
    img = load(path)
    before = img.size

    if name in crops:
        img = crop_to(img, *crops[name])
        img = fit(img, max_width or MAX_WIDTH.get(name, MAX_WIDTH_DEFAULT))
    elif name in FIXED_SIZE:
        # Exactly the pixels the chat apps and Twitter cards ask for
        w, h = FIXED_SIZE[name]
        img = crop_to(img, w, h).resize((w, h), Image.LANCZOS)
    else:
        img = fit(img, max_width or MAX_WIDTH.get(name, MAX_WIDTH_DEFAULT))

    jpg = os.path.join(IMG, name + ".jpg")
    webp = os.path.join(IMG, name + ".webp")
    img.save(jpg, "JPEG", quality=JPEG_QUALITY, optimize=True,
             progressive=True, exif=b"")
    img.save(webp, "WEBP", quality=WEBP_QUALITY, method=6, exif=b"")

    kb = lambda p: os.path.getsize(p) / 1024
    print(
        f"  {name:9s} {before[0]}x{before[1]} → {img.width}x{img.height}   "
        f"jpg {kb(jpg):6.0f} kB   webp {kb(webp):6.0f} kB"
    )
    return {"w": img.width, "h": img.height, "lqip": lqip(img)}


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from", dest="src", default=INCOMING)
    ap.add_argument("--in-place", action="store_true")
    ap.add_argument("--only", action="append", default=[])
    ap.add_argument("--max-width", type=int, default=0,
                    help="override the per-slot longest edge for every file")
    ap.add_argument("--crop", action="append", default=[],
                    help="NAME=W:H, e.g. hero=4:5")
    ap.add_argument("--keep", action="store_true")
    args = ap.parse_args()

    crops = {}
    for item in args.crop:
        try:
            name, ratio = item.split("=", 1)
            w, h = (float(x) for x in ratio.split(":", 1))
            crops[name.lower()] = (w, h)
        except ValueError:
            sys.exit(f"--crop wants NAME=W:H, not {item!r}")

    current = known_images()
    known = list(current)
    wanted = set(args.only) & set(known) if args.only else set(known)
    if args.only and not wanted:
        sys.exit(f"--only names nothing the invitation uses. It knows: {', '.join(known)}")

    src = IMG if args.in_place else os.path.abspath(args.src)
    if src == INCOMING and not os.path.isdir(src):
        os.makedirs(src, exist_ok=True)   # so there is somewhere obvious to drop them
    found, skipped = sources(src, wanted)

    if not found:
        where = os.path.relpath(src, ROOT)
        if skipped:
            print(f"\nNothing in {where}/ could be read.")
            print("Those are HEIC files. Either install the reader:")
            print("    pip install pillow-heif")
            print("or set the iPhone to Settings → Camera → Formats → Most Compatible,")
            print("or export the photographs as JPEG. Then run this again.")
            return 1
        print(f"No photographs found in {where}/.")
        print("Name each file after the slot it belongs in, then run this again:")
        print("  " + ", ".join(f"{n}.jpg" for n in known))
        print("\n(iPhone HEIC files also work, with: pip install pillow-heif)")
        return 1

    print(f"Reading from {os.path.relpath(src, ROOT)}/\n")

    # Everything the invitation already has, so a run that replaces two
    # photographs cannot drop the other seven out of the JSON.
    meta = collections.OrderedDict(
        (name, {"w": entry["width"], "h": entry["height"], "lqip": entry["lqip"]})
        for name, entry in current.items()
    )

    for name in known:
        if name in found:
            meta[name] = process(name, found[name], args.max_width, crops)

    with open(LQIP_PATH, "w") as f:
        json.dump(meta, f, indent=2)

    untouched = [n for n in known if n not in found]
    if untouched:
        print("\nLeft as they were: " + ", ".join(untouched))

    print()
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "sync-lqip.py")], check=True)

    if not args.in_place and not args.keep:
        done = os.path.join(src, "imported")
        os.makedirs(done, exist_ok=True)
        for name, path in found.items():
            shutil.move(path, os.path.join(done, os.path.basename(path)))
        print(f"originals moved to {os.path.relpath(done, ROOT)}/")

    print("\nNow check the alt text and captions in data/wedding.json still "
          "describe what is in the photographs — the editor has fields for both.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
