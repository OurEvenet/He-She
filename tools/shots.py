import sys, json, glob, re
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8811/index.html"
OUT = "/tmp/shots"
import os; os.makedirs(OUT, exist_ok=True)


def uncover(pg):
    """Every page now opens behind a cover. Tap it, so the smoke test is
    looking at the invitation rather than at the envelope."""
    try:
        if pg.evaluate("!!document.querySelector('[data-envelope-open]')"):
            pg.click("[data-envelope-open]")
            pg.wait_for_timeout(1100)
    except Exception:
        pass


def launch(pw):
    """Use Playwright's own browser, or a Chromium already on the machine."""
    try:
        return pw.chromium.launch()
    except Exception:
        found = sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"))
        if not found:
            raise
        return pw.chromium.launch(executable_path=found[-1])


with sync_playwright() as pw:
    b = launch(pw)
    errs = []

    # --- Desktop ---
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    pg.on("console", lambda m: errs.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_timeout(1200)
    uncover(pg)
    pg.screenshot(path=f"{OUT}/hero.png")
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.wait_for_timeout(1500)
    pg.evaluate("window.scrollTo(0, 0)")
    pg.wait_for_timeout(800)
    pg.screenshot(path=f"{OUT}/full.png", full_page=True)

    # CLS + metrics
    m = pg.evaluate("""() => ({
      frames: document.querySelectorAll('.frame').length,
      loaded: document.querySelectorAll('.frame.is-loaded').length,
      fonts: [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+':'+f.style),
      h1: getComputedStyle(document.querySelector('.names')).fontFamily,
      thread: getComputedStyle(document.getElementById('thread')).getPropertyValue('--thread-progress'),
      title: document.title,
    })""")
    print(json.dumps(m, indent=1)[:700])

    # --- RSVP flow ---
    pg.evaluate("document.getElementById('rsvp').scrollIntoView()")
    pg.wait_for_timeout(400)
    pg.fill("#rsvp-name", "Ruwan Perera")
    pg.fill("#rsvp-email", "not-an-email")
    pg.click("#rsvp-submit")
    pg.wait_for_timeout(300)
    print("validation msg:", pg.inner_text("#rsvp-error"))
    pg.screenshot(path=f"{OUT}/rsvp-error.png")

    pg.fill("#rsvp-email", "ruwan@example.com")
    pg.click("#rsvp-submit")
    pg.wait_for_timeout(900)
    print("confirm visible:", pg.is_visible("#rsvp-confirm"))
    print("google buttons:", pg.eval_on_selector_all("[data-google-buttons] a", "els=>els.map(e=>e.textContent.trim())"))
    print("leave note:", pg.inner_text("[data-leave-note]")[:160])
    pg.screenshot(path=f"{OUT}/rsvp-confirm.png")

    # --- Mobile ---
    mp = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True)
    mp.goto(BASE, wait_until="networkidle")
    mp.wait_for_timeout(1200)
    uncover(mp)
    mp.screenshot(path=f"{OUT}/m-hero.png")
    mp.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    mp.wait_for_timeout(1500)
    dock_up = "document.getElementById('dock').classList.contains('is-up')"
    print("dock down over the footer:", not mp.evaluate(dock_up))
    mp.evaluate("document.getElementById('day').scrollIntoView()")
    mp.wait_for_timeout(600)
    print("dock up mid-page:", mp.evaluate(dock_up))
    mp.evaluate("document.getElementById('gallery').scrollIntoView()")
    mp.wait_for_timeout(800)
    mp.click("[data-photo='0']")
    mp.wait_for_timeout(600)
    print("lightbox:", mp.evaluate("document.getElementById('lightbox').open"), mp.inner_text("[data-count]"))
    mp.screenshot(path=f"{OUT}/m-lightbox.png")
    mp.keyboard.press("Escape")
    mp.evaluate("window.scrollTo(0,0)")
    mp.wait_for_timeout(600)
    mp.screenshot(path=f"{OUT}/m-full.png", full_page=True)

    # --- Narrow-screen checks, on both pages -----------------------------
    # Nothing may scroll sideways, and nothing a thumb has to hit may be
    # under 44px tall. Both are silent failures on a desk and obvious on a
    # phone, so they are asserted rather than eyeballed.
    AUDIT = """() => {
      const doc = document.documentElement;
      const targets = [...document.querySelectorAll('a,button,summary,select,input[type=text],input[type=email],textarea')]
        .filter(e => e.offsetParent !== null && !e.closest('[hidden],.skip-link'))
        .map(e => ({ label: (e.textContent || e.tagName).trim().slice(0, 30),
                     h: Math.round(e.getBoundingClientRect().height) }))
        .filter(t => t.h > 0 && t.h < 44);
      return { hscroll: doc.scrollWidth > doc.clientWidth + 1, scrollWidth: doc.scrollWidth, small: targets };
    }"""

    for page_name in ("index.html", "editor.html"):
        for width in (320, 390):
            ap = b.new_page(viewport={"width": width, "height": 780}, has_touch=True)
            ap.goto(BASE.replace("index.html", page_name), wait_until="networkidle")
            ap.wait_for_timeout(1200)
            uncover(ap)
            ap.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            ap.wait_for_timeout(600)
            r = ap.evaluate(AUDIT)
            print(f"{page_name} @{width}: sideways-scroll={r['hscroll']} "
                  f"({r['scrollWidth']}px) small-targets={len(r['small'])} {r['small'][:4]}")
            ap.close()

    # --- Type on the hero photograph -------------------------------------
    # The one place the page puts text over a picture it did not choose.
    # Whatever the couple drops in, every line has to stay readable, so the
    # real rendered pixels behind each line are measured rather than assumed:
    # the type is hidden, the frame is shot, and the brightest pixel inside
    # each line's own box is contrasted against the colour that line is
    # painted in.
    def luminance(c):
        f = lambda v: (v / 255) / 12.92 if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])

    try:
        from PIL import Image
    except ImportError:
        print("\n(hero contrast check needs Pillow)")
    else:
        print()
        for width, height, label in ((390, 844, "phone"), (1440, 900, "desktop")):
            hp = b.new_page(viewport={"width": width, "height": height}, has_touch=width < 800)
            hp.goto(BASE, wait_until="networkidle")
            hp.wait_for_timeout(2800)
            uncover(hp)
            lines = hp.evaluate("""() =>
              [...document.querySelectorAll('.hero__eyebrow,.names,.hero__meta strong,.hero__line')]
                .map(el => { const r = el.getBoundingClientRect();
                  return { sel: (el.className || el.tagName).split(' ')[0],
                           top: Math.round(r.top), bottom: Math.round(r.bottom),
                           left: Math.round(r.left), right: Math.round(r.right),
                           colour: getComputedStyle(el).color }; })""")
            # Hide the children, not .hero__inner itself: visibility is
            # inherited, and the scrim being measured is its ::before.
            hp.evaluate("document.querySelectorAll('.hero__inner > *')"
                        ".forEach(e => e.style.visibility = 'hidden')")
            hp.wait_for_timeout(250)
            hp.screenshot(path=f"{OUT}/hero-bg-{label}.png")
            hp.close()

            sheet = Image.open(f"{OUT}/hero-bg-{label}.png").convert("RGB")
            worst, worst_at = 99.0, ""
            for line in lines:
                box = (max(0, line["left"]), max(0, line["top"]),
                       min(sheet.width, line["right"]), min(sheet.height, line["bottom"]))
                if box[2] - box[0] < 2 or box[3] - box[1] < 2:
                    continue
                text = tuple(int(v) for v in re.findall(r"\d+", line["colour"])[:3])
                bright = max(sheet.crop(box).getdata(), key=luminance)
                lo, hi = sorted((luminance(text), luminance(bright)))
                got = (hi + 0.05) / (lo + 0.05)
                if got < worst:
                    worst, worst_at = got, line["sel"]
            verdict = "ok" if worst >= 4.5 else "TOO LOW"
            print(f"hero type on the photograph @{label}: worst {worst:.2f}:1 "
                  f"({worst_at}) {verdict}")

    # --- Every theme, and the artwork it hangs on the page ---------------
    # A theme is a whole second (third, fourth) design to get wrong, and the
    # ornaments are absolutely positioned, which is the usual way a page
    # gains a sideways scroll. Both are checked rather than admired.
    print()
    for theme in ("poruwa", "kandyan", "araliya", "handahana"):
        tp = b.new_page(viewport={"width": 390, "height": 844}, has_touch=True)
        tp.on("pageerror", lambda e, t=theme: errs.append(f"{t}: {e}"))
        tp.goto(f"{BASE}?theme={theme}", wait_until="networkidle")
        tp.wait_for_timeout(2600)
        uncover(tp)
        tp.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        tp.wait_for_timeout(900)
        r = tp.evaluate(AUDIT)
        art = tp.evaluate("""() => {
          const orn = [...document.querySelectorAll('.orn')];
          return { n: orn.length,
                   hidden: orn.every(o => o.getAttribute('aria-hidden') === 'true'),
                   reachable: orn.some(o => o.querySelector('a,button,[tabindex]')) };
        }""")
        chrome = tp.evaluate("document.querySelector('meta[name=theme-color]').content")
        tp.screenshot(path=f"{OUT}/theme-{theme}.png")
        print(f"{theme:10s} sideways-scroll={r['hscroll']} small-targets={len(r['small'])} "
              f"ornaments={art['n']} aria-hidden={art['hidden']} "
              f"in-tab-order={art['reachable']} chrome={chrome}")
        tp.close()

    print("\nERRORS:", errs or "none")
    b.close()
