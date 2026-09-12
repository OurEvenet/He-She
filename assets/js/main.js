/* ---------------------------------------------------------------
   Boot. Fetch the content, build the page, wire the behaviour.
   --------------------------------------------------------------- */

import {
  renderHead, renderHero, renderLetter, renderDay, renderGallery,
  renderVenue, renderRsvp, renderFaq, renderFooter,
} from "./modules/render.js";
import { initImages } from "./modules/images.js";
import { initThread } from "./modules/thread.js";
import { initRsvp } from "./modules/rsvp.js";

const boot = document.getElementById("boot");
const fail = document.getElementById("boot-fail");

const dismissBoot = () => {
  boot.classList.add("is-gone");
  setTimeout(() => (boot.hidden = true), 600);
};

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

  renderHead(config);
  renderHero(document.getElementById("hero"), config);
  renderLetter(document.getElementById("letter"), config);
  renderDay(document.getElementById("day"), config);
  renderGallery(document.getElementById("gallery"), config);
  renderVenue(document.getElementById("venue"), config);
  renderRsvp(document.getElementById("rsvp"), config);
  renderFaq(document.getElementById("faq"), config);
  renderFooter(document.getElementById("footer"), config);

  initImages(document);
  initThread(document.getElementById("thread"));
  initRsvp(document.getElementById("rsvp"), config);

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
