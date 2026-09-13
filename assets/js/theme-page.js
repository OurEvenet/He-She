/* ---------------------------------------------------------------
   Boot, for the alternative designs.

   theme1.html, theme2.html and theme3.html are different-looking
   invitations reading the same data/wedding.json. They share this
   file, and through it every piece of behaviour the main page has:
   the same timezone arithmetic, the same reply form and its
   validation, the same calendar files, the same lazy photographs,
   the same lightbox.

   A theme therefore supplies markup and a stylesheet, and nothing
   else. That is the whole point of the arrangement: a new design
   cannot get the times wrong, cannot break the reply form, and
   cannot ship a photograph that shifts the layout as it loads,
   because it does not implement any of those things.
   --------------------------------------------------------------- */

import { renderHead } from "./modules/render.js";
import { initImages } from "./modules/images.js";
import { initRsvp } from "./modules/rsvp.js";
import { initShare } from "./modules/share.js";
import { initLightbox } from "./modules/lightbox.js";
import { initCountdown } from "./modules/countdown.js";
import { initGifts } from "./modules/sections.js";
import { initMusic } from "./modules/music.js";
import { initEnvelope } from "./modules/envelope.js";
import { readGuest, prefillReply } from "./modules/guest.js";
import { buildEntries, downloadICS, icsFilename } from "./modules/calendar.js";

/** Reveals the page once the first photograph has actually decoded. */
async function dismissBoot() {
  const boot = document.getElementById("boot");
  if (!boot) return;
  const first = document.querySelector("img[src]");
  const ready = first?.decode ? first.decode().catch(() => {}) : Promise.resolve();
  await Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]);
  boot.classList.add("is-gone");
  setTimeout(() => (boot.hidden = true), 600);
}

function fail(err) {
  console.error(err);
  const boot = document.getElementById("boot");
  const note = document.getElementById("boot-fail");
  if (!boot || !note) return;
  boot.querySelector("i")?.remove();
  note.hidden = false;
  note.textContent =
    "The invitation could not load. Refresh the page, and if it keeps happening " +
    "the details are in the invitation you were sent.";
}

/**
 * @param {(config: object, guest: object|null) => void} paint  writes the
 *   theme's markup into the document. Everything below is wired afterwards.
 */
export function bootTheme(paint) {
  return (async () => {
    const res = await fetch(new URL("data/wedding.json", document.baseURI), {
      cache: "no-cache",
    });
    if (!res.ok) throw new Error(`wedding.json returned ${res.status}`);
    const config = await res.json();
    config.meta.dateLocale = config.meta.dateLocale || config.meta.locale;

    // Who this link was addressed to, if anybody. Read before paint, so
    // a theme can greet them in the hero as well as on the cover.
    const guest = readGuest(config);

    renderHead(config);
    paint(config, guest);

    const rsvpRoot = document.getElementById("rsvp") || document;
    initImages(document);
    initCountdown(document, config);
    initRsvp(rsvpRoot, config);
    prefillReply(rsvpRoot, guest);
    initShare(document, config);
    initGifts(document);
    initLightbox(
      document.getElementById("lightbox"),
      document.getElementById("gallery") || document,
      config
    );

    // The cover, and the music its tap is allowed to start
    initEnvelope(config, guest, initMusic(config));

    // The calendar, offered wherever a theme put the button
    const entries = buildEntries(config);
    for (const button of document.querySelectorAll("[data-day-ics]")) {
      button.addEventListener("click", () =>
        downloadICS(config, entries, icsFilename(config))
      );
    }

    // Folded answers print as nothing at all unless they are opened first
    let reopened = [];
    addEventListener("beforeprint", () => {
      reopened = [...document.querySelectorAll("details:not([open])")];
      for (const d of reopened) d.open = true;
    });
    addEventListener("afterprint", () => {
      for (const d of reopened) d.open = false;
      reopened = [];
    });

    await dismissBoot();
    return config;
  })().catch(fail);
}
