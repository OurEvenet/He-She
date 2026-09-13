/* ---------------------------------------------------------------
   Boot. Fetch the content, build the page, wire the behaviour.
   --------------------------------------------------------------- */

import {
  renderHead, renderHero, renderLetter, renderStory, renderDay, renderGallery,
  renderVenue, renderRsvp, renderGifts, renderFaq, renderFooter,
} from "./modules/render.js";
import { initImages } from "./modules/images.js";
import { initThread } from "./modules/thread.js";
import { initRsvp } from "./modules/rsvp.js";
import { initDock } from "./modules/dock.js";
import { initShare } from "./modules/share.js";
import { initLightbox } from "./modules/lightbox.js";
import { initGifts } from "./modules/sections.js";
import { initCountdown } from "./modules/countdown.js";
import { initMusic } from "./modules/music.js";
import { initEnvelope } from "./modules/envelope.js";
import { readGuest, prefillReply } from "./modules/guest.js";
import { buildEntries, downloadICS, icsFilename } from "./modules/calendar.js";
import { chosenTheme, applyTheme } from "./modules/theme.js";
import { initOrnament } from "./modules/ornament.js";

const boot = document.getElementById("boot");
const fail = document.getElementById("boot-fail");

const dismissBoot = () => {
  boot.classList.add("is-gone");
  setTimeout(() => (boot.hidden = true), 600);
};

/* The calendar, offered where the day is described rather than only
   behind the reply form — plenty of guests want one without the other. */
function wireDayCalendar(config) {
  const button = document.querySelector("[data-day-ics]");
  if (!button) return;
  const entries = buildEntries(config);
  button.addEventListener("click", () => {
    downloadICS(config, entries, icsFilename(config));
  });
}

/* A folded-away answer prints as nothing at all, so everything is opened
   for the printer and put back exactly as the reader left it. */
function wirePrinting() {
  let reopened = [];
  addEventListener("beforeprint", () => {
    reopened = [...document.querySelectorAll("details:not([open])")];
    for (const d of reopened) d.open = true;
  });
  addEventListener("afterprint", () => {
    for (const d of reopened) d.open = false;
    reopened = [];
  });
}

async function start() {
  // Relative, so the site works at username.github.io/repo/ as well as
  // at a custom domain root.
  const res = await fetch(new URL("data/wedding.json", document.baseURI), {
    cache: "no-cache",
  });
  if (!res.ok) throw new Error(`wedding.json returned ${res.status}`);
  const config = await res.json();
  // Used for Intl only; meta.locale still sets the document language.
  config.meta.dateLocale = config.meta.dateLocale || config.meta.locale;

  // Before a single section is built, so the page is never briefly
  // dressed in the wrong colours.
  const { theme } = chosenTheme(config);
  applyTheme(theme);

  // Who the link was addressed to, if anybody
  const guest = readGuest(config);

  renderHead(config);
  renderHero(document.getElementById("hero"), config);
  renderLetter(document.getElementById("letter"), config);
  renderStory(document.getElementById("story"), config);
  renderDay(document.getElementById("day"), config);
  renderGallery(document.getElementById("gallery"), config);
  renderVenue(document.getElementById("venue"), config);
  renderRsvp(document.getElementById("rsvp"), config);
  renderGifts(document.getElementById("gifts"), config);
  renderFaq(document.getElementById("faq"), config);
  renderFooter(document.getElementById("footer"), config);

  initImages(document);
  initCountdown(document, config);
  initThread(document.getElementById("thread"), document.getElementById("progress"));
  initRsvp(document.getElementById("rsvp"), config);
  prefillReply(document.getElementById("rsvp"), guest);
  initDock(document.getElementById("dock"), config);
  initShare(document, config);
  initGifts(document);
  initLightbox(document.getElementById("lightbox"), document.getElementById("gallery"), config);
  wireDayCalendar(config);
  wirePrinting();
  // Artwork last: it is decoration, and nothing waits on it
  initOrnament(theme, config);

  // The cover, and the music its tap is allowed to start. The page
  // behind it is inert until it opens, so this goes last.
  initEnvelope(config, guest, initMusic(config));

  // Hold the curtain until the hero photograph has actually decoded,
  // so the first thing seen is the finished page rather than a flash.
  const hero = document.querySelector("#hero img");
  const ready = hero?.decode ? hero.decode().catch(() => {}) : Promise.resolve();
  await Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]);
  dismissBoot();
}

start().catch((err) => {
  console.error(err);
  boot.querySelector("i").remove();
  fail.hidden = false;
  fail.textContent =
    "The invitation could not load. Refresh the page, and if it keeps happening the details are in the invitation you were sent.";
});
