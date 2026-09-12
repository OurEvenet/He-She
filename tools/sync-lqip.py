#!/usr/bin/env python3
"""
Copies the width / height / LQIP blur data produced by make-images.py into the
"images" block of data/wedding.json, preserving key order everywhere else.

Run after adding or replacing any photograph:
    python3 tools/make-images.py && python3 tools/sync-lqip.py
"""
import json, os, collections

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "assets", "img", "_lqip.json")
DST = os.path.join(ROOT, "data", "wedding.json")

with open(SRC) as f:
    lqip = json.load(f)
with open(DST) as f:
    data = json.load(f, object_pairs_hook=collections.OrderedDict)

images = collections.OrderedDict()
for name, m in lqip.items():
    images[name] = collections.OrderedDict(
        [("jpg", f"assets/img/{name}.jpg"),
         ("webp", f"assets/img/{name}.webp"),
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
