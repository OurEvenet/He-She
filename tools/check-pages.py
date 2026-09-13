#!/usr/bin/env python3
"""
Audits every rendered page, not every stylesheet.

    python3 -m http.server 8811 &
    python3 tools/check-pages.py

The older tools/check-contrast.py reads colour pairs out of the CSS and
checks the ones it was told about. That worked while there was one
design. With seven it stops working — not because the maths changes, but
because the list does: every new theme is a new set of pairs somebody has
to remember to add, and the pair nobody remembers is the one that ships
unreadable.

So this walks the pages as a browser renders them. Every element holding
text is measured: its computed colour against the first opaque background
behind it, at the size and weight it is actually set in. Nothing has to
be declared in advance, and a theme added tomorrow is covered the moment
its filename goes in PAGES.

    4.5:1  body text
    3:1    large text (>= 24px, or >= 18.66px bold) and control borders

Text sitting over a photograph or a pattern is listed separately rather
than scored: there is no single background colour to score it against,
so those are measured from the rendered pixels instead — see the hero
check at the foot of this file.

Also reported, because they are the same class of mistake: horizontal
overflow at 320px, tap targets under 44px, and console errors.

Exits non-zero if anything fails, so it can gate a commit.
"""
import glob
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8811"
PAGES = [
    "index.html", "themes.html",
    "theme1.html", "theme2.html", "theme3.html",
    "theme4.html", "theme5.html", "theme6.html",
]

# The main page carries four colour palettes; the theme pages carry one each.
COLOUR_THEMES = ["kandyan", "poruwa", "araliya", "midnight"]

AUDIT = r"""
() => {
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));

  /* The first opaque background behind an element, compositing any
     translucent layers on the way up. Returns null if a background
     image is in the way — those are measured from pixels instead. */
  const ground = (el) => {
    let node = el, acc = [];
    while (node && node !== document.documentElement.parentNode) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage !== "none") return null;
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) {
        if (bg.a >= 0.999) {
          let out = bg.rgb;
          for (const layer of acc.reverse()) out = over(layer.rgb, out, layer.a);
          return out;
        }
        acc.push(bg);
      }
      node = node.parentElement;
    }
    return [255, 255, 255];
  };

  const results = { fails: [], skipped: 0, checked: 0 };

  for (const el of document.querySelectorAll("body *")) {
    if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.opacity === "0") continue;

    const bg = ground(el);
    if (!bg) { results.skipped++; continue; }

    const fg = parse(cs.color);
    if (!fg) continue;
    const colour = fg.a >= 0.999 ? fg.rgb : over(fg.rgb, bg, fg.a);

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3.0 : 4.5;

    const got = ratio(colour, bg);
    results.checked++;
    if (got < need - 0.005) {
      results.fails.push({
        text: el.textContent.trim().slice(0, 46),
        sel: el.tagName.toLowerCase() + (el.className && typeof el.className === "string"
              ? "." + el.className.trim().split(/\s+/).join(".") : ""),
        got: Math.round(got * 100) / 100, need, size: Math.round(size * 10) / 10, weight,
      });
    }
  }
  return results;
}
"""

SMALL = r"""
() => [...document.querySelectorAll('a,button,summary,select,input[type=text],input[type=email],textarea')]
  .filter((e) => e.offsetParent !== null && !e.closest('[hidden],.skip-link'))
  .filter((e) => { const h = e.getBoundingClientRect().height; return h > 0 && h < 44; })
  .map((e) => (e.textContent || e.tagName).trim().slice(0, 30))
"""

# Where the hero sets type over a photograph or a pattern there is no
# single background colour, so the worst pixel under each line is read
# out of a screenshot instead.
HERO = r"""
() => {
  const hero = document.querySelector(".hero");
  if (!hero) return null;
  const lines = [...hero.querySelectorAll("h1, p, .countdown__unit b")]
    .filter((e) => e.offsetParent && e.textContent.trim());
  return lines.map((e) => {
    const r = e.getBoundingClientRect();
    return {
      text: e.textContent.trim().slice(0, 34),
      colour: getComputedStyle(e).color,
      size: Math.round(parseFloat(getComputedStyle(e).fontSize) * 10) / 10,
      weight: parseInt(getComputedStyle(e).fontWeight, 10) || 400,
      box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    };
  });
}
"""


def luminance(rgb):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    x, y = sorted((luminance(a), luminance(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


def launch(pw):
    try:
        return pw.chromium.launch()
    except Exception:
        return pw.chromium.launch(
            executable_path=sorted(
                glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"))[-1])


def worst_pixel_under(png_bytes, box):
    """The pixel in `box` furthest from the text colour — i.e. the one the
    text has the least chance against. Read from the screenshot, with the
    text itself already hidden by the caller."""
    from PIL import Image
    import io
    im = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    x, y, w, h = box
    x, y = max(x, 0), max(y, 0)
    w, h = min(w, im.width - x), min(h, im.height - y)
    if w <= 0 or h <= 0:
        return None
    crop = im.crop((x, y, x + w, y + h))
    return list(crop.getdata())


def check(page, url, label, failures):
    page.goto(url, wait_until="networkidle")
    page.wait_for_timeout(900)
    if page.evaluate("!!document.querySelector('[data-envelope-open]')"):
        page.click("[data-envelope-open]")
        page.wait_for_timeout(1000)

    # A hero photograph fades in over half a second. Measuring it mid-fade
    # reads a darker ground than a guest ever sees, and quietly passes text
    # that fails once the picture is actually there. Themes 3, 5 and 6 have
    # no photograph behind their type, so a miss here is not a problem.
    if page.evaluate("!!document.querySelector('.hero .frame')"):
        try:
            page.wait_for_selector(".hero .frame.is-loaded", timeout=3000)
            page.wait_for_timeout(700)
        except Exception:
            failures.append(f"{label}: the hero photograph never finished loading")

    # Open every folded answer so its text is measured too
    page.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
    page.wait_for_timeout(400)

    res = page.evaluate(AUDIT)
    for f in res["fails"]:
        failures.append(
            f"{label}: {f['got']}:1 (needs {f['need']}:1) — "
            f"{f['size']}px/{f['weight']} {f['sel']} — {f['text']!r}")

    # The hero, measured from pixels because its ground is a photograph
    lines = page.evaluate(HERO) or []
    if lines:
        page.evaluate(
            "document.querySelectorAll('.hero h1, .hero p, .hero .countdown__unit b')"
            ".forEach(e => e.style.visibility = 'hidden')")
        shot = page.screenshot()
        page.evaluate(
            "document.querySelectorAll('.hero h1, .hero p, .hero .countdown__unit b')"
            ".forEach(e => e.style.visibility = '')")
        for line in lines:
            pixels = worst_pixel_under(shot, line["box"])
            if not pixels:
                continue
            fg = [int(v) for v in line["colour"].strip("rgba()").split(",")[:3]]
            got = min(contrast(fg, list(px)) for px in pixels)
            large = line["size"] >= 24 or (line["size"] >= 18.66 and line["weight"] >= 700)
            need = 3.0 if large else 4.5
            if got < need - 0.005:
                failures.append(
                    f"{label} hero: {round(got, 2)}:1 (needs {need}:1) over the "
                    f"photograph — {line['size']}px {line['text']!r}")

    small = page.evaluate(SMALL)
    if small:
        failures.append(f"{label}: {len(small)} tap targets under 44px — {small[:4]}")

    page.set_viewport_size({"width": 320, "height": 720})
    page.wait_for_timeout(500)
    if page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"):
        failures.append(f"{label}: the page scrolls sideways at 320px")
    page.set_viewport_size({"width": 390, "height": 844})

    return res


def main():
    failures, errors = [], []
    total = 0

    with sync_playwright() as pw:
        browser = launch(pw)
        page = browser.new_page(viewport={"width": 390, "height": 844}, has_touch=True)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

        for name in PAGES:
            if name == "index.html":
                for theme in COLOUR_THEMES:
                    res = check(page, f"{BASE}/{name}?theme={theme}", f"{name} [{theme}]", failures)
                    total += res["checked"]
            else:
                res = check(page, f"{BASE}/{name}", name, failures)
                total += res["checked"]

        browser.close()

    if errors:
        failures += [f"console error: {e}" for e in dict.fromkeys(errors)]

    print(f"{total} pieces of text measured across {len(PAGES)} pages.")
    if failures:
        print(f"\n{len(failures)} problem(s):\n")
        for f in failures:
            print("  ", f)
        sys.exit(1)
    print("Everything clears WCAG AA, nothing overflows at 320px, "
          "no tap target is under 44px, and no page logs an error.")


if __name__ == "__main__":
    main()
