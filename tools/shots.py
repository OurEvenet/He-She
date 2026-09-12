import sys, json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8811/index.html"
OUT = "/tmp/shots"
import os; os.makedirs(OUT, exist_ok=True)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    errs = []

    # --- Desktop ---
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    pg.on("console", lambda m: errs.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
    pg.goto(BASE, wait_until="networkidle")
    pg.wait_for_timeout(1200)
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
    mp = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    mp.goto(BASE, wait_until="networkidle")
    mp.wait_for_timeout(1200)
    mp.screenshot(path=f"{OUT}/m-hero.png")
    mp.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    mp.wait_for_timeout(1500)
    mp.evaluate("window.scrollTo(0,0)")
    mp.wait_for_timeout(600)
    mp.screenshot(path=f"{OUT}/m-full.png", full_page=True)
    print("mobile hscroll:", mp.evaluate("document.documentElement.scrollWidth > window.innerWidth"))

    print("\nERRORS:", errs or "none")
    b.close()
