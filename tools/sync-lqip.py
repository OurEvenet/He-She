#!/usr/bin/env python3
"""
Copies the width / height / LQIP blur data produced by make-images.py into the
"images" block of data/wedding.json, preserving key order everywhere else.

Run after adding or replacing any photograph:
    python3 tools/make-images.py && python3 tools/sync-lqip.py
"""
import hashlib, json, os, collections

ROOT = os.path.join(os.path.dirname(__file__), "..")
IMG = os.path.join(ROOT, "assets", "img")
SRC = os.path.join(IMG, "_lqip.json")
DST = os.path.join(ROOT, "data", "wedding.json")


def stamped(name, ext):
    """
    The path to an image, with eight characters of its own content on the end.

    A photograph replaced in place keeps its name — hero.jpg is always
    hero.jpg — so nothing in the URL changes when the picture does, and a
    browser that has the old one has no reason to ask for another. You
    deploy, and you still see last month's photograph. Worse, so does every
    guest who looked once before.

    Hashing the bytes into the query string fixes that at the source: change
    the picture and the URL changes with it, so the old one can never be
    served. Leave the picture alone and the URL is stable, so it stays
    cached, which is the whole point of caching.
    """
    path = os.path.join(IMG, f"{name}.{ext}")
    rel = f"assets/img/{name}.{ext}"
    if not os.path.exists(path):
        return rel
    with open(path, "rb") as f:
        return f"{rel}?v={hashlib.sha256(f.read()).hexdigest()[:8]}"


with open(SRC) as f:
    lqip = json.load(f)
with open(DST) as f:
    data = json.load(f, object_pairs_hook=collections.OrderedDict)

images = collections.OrderedDict()
for name, m in lqip.items():
    images[name] = collections.OrderedDict(
        [("jpg", stamped(name, "jpg")),
         ("webp", stamped(name, "webp")),
         ("width", m["w"]),
         ("height", m["h"]),
         ("lqip", m["lqip"])]
    )

# The rebuilt "images" block goes back in its old position, immediately after
# "meta". The existing one is skipped rather than copied: copying it first and
# inserting afterwards, as this did, let the stale block win and the sync
# silently did nothing on every run after the first.
out = collections.OrderedDict()
for k, v in data.items():
    if k == "images":
        continue
    out[k] = v
    if k == "meta":
        out["images"] = images
if "images" not in out:
    out["images"] = images

with open(DST, "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
    f.write("\n")

print(f"synced {len(images)} images into data/wedding.json")
