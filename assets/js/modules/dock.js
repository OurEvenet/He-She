/* ---------------------------------------------------------------
   The dock.

   A phone screen is read with one thumb, and the three things a guest
   actually came to do — reply, find the place, ring someone — were
   otherwise several screens apart. The dock parks them at the bottom
   of the screen once the hero has scrolled away, and gets out of the
   way again while the reply form itself is on screen, where it would
   only be repeating itself.

   Visibility is decided by a scroll sweep rather than an observer,
   for the same reason the photographs are: a flick that crosses the
   whole hero inside one frame is never reported as a change.
   --------------------------------------------------------------- */

import { esc, icon } from "./render.js";

export function initDock(el, config) {
  if (!el) return;

  const contact = (config.contacts || [])[0];
  const actions = [
    `<a class="btn" href="#rsvp" data-dock-rsvp>${icon("reply")}<span>Reply</span></a>`,
    config.venue?.directionsUrl
      ? `<a class="btn btn--quiet" href="${esc(config.venue.directionsUrl)}"
             target="_blank" rel="noopener">${icon("pin")}<span>Directions</span></a>`
      : "",
    contact?.phone
      ? `<a class="btn btn--quiet" href="tel:${esc(contact.phone.replace(/\s/g, ""))}"
             aria-label="Call ${esc(contact.name)} on ${esc(contact.phone)}">
           ${icon("phone")}<span>Call</span></a>`
      : "",
  ].filter(Boolean);

  el.innerHTML = actions.join("");
  el.hidden = false;

  const hero = document.getElementById("hero");
  // Both of these offer the same three things in full, so the dock stands
  // down while either is on screen rather than talking over them.
  const quiet = ["rsvp", "footer"].map((id) => document.getElementById(id)).filter(Boolean);
  let ticking = false;
  let up = null;

  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.85 && r.bottom > 0;
  };

  const measure = () => {
    ticking = false;
    // Past the hero, and not while the reply form or footer is in view.
    const heroGone = hero ? hero.getBoundingClientRect().bottom < 0 : window.scrollY > 400;
    const next = heroGone && !quiet.some(onScreen);
    if (next === up) return;
    up = next;
    el.classList.toggle("is-up", next);
    // Out of the tab order as well as out of sight
    el.inert = !next;
  };

  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(measure);
  };

  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request, { passive: true });
  measure();
}
