/* ---------------------------------------------------------------
   The envelope.

   A full-screen cover with the two names and one control. The tap
   that opens it does three jobs at once: it is the gesture browsers
   require before audio may play, it is the moment the invitation
   feels handed over rather than loaded, and it is where a
   personalised link says the guest's name back to them.

   While it is closed the page behind it is inert — not merely
   invisible. A screen reader that can still reach the invitation
   underneath makes the cover a trap rather than a cover.

   With motion reduced it still opens; it simply does not animate.
   The cover is content, not decoration, so it is never skipped.
   --------------------------------------------------------------- */

import { esc } from "./render.js";
import { formatDate } from "./dates.js";

export function initEnvelope(config, guest, music) {
  const env = config.envelope;
  if (!env?.enabled) return;

  // Everything already on the page, whatever a given theme called it.
  // Marking only <main> would leave a hero, a dock or a lightbox
  // reachable behind the cover, which is exactly the trap to avoid.
  const behind = [...document.body.children];
  const { couple, meta, events, venue } = config;
  const when = formatDate(events[0].start, meta.timezone, meta.dateLocale);

  const cover = document.createElement("div");
  cover.className = "envelope";
  cover.id = "envelope";
  cover.innerHTML = `
    <div class="envelope__inner">
      <p class="envelope__to">${
        guest ? `Dear ${esc(guest.name)}` : esc(env.salutation || couple.invite)
      }</p>
      <p class="envelope__names">
        ${esc(couple.one.name)}<em aria-hidden="true">&amp;</em>${esc(couple.two.name)}
      </p>
      <p class="envelope__when">${esc(when)} · ${esc(venue.city)}</p>
      <button class="btn envelope__open" type="button" data-envelope-open>
        <span>${esc(env.text || "Open the invitation")}</span>
      </button>
    </div>`;

  document.body.appendChild(cover);
  document.body.classList.add("is-sealed");
  for (const el of behind) el.inert = true;

  const open = () => {
    // The music starts inside the click handler, synchronously enough
    // for Safari to count it as user-initiated.
    music?.startIfWanted();

    document.body.classList.remove("is-sealed");
    cover.classList.add("is-open");
    for (const el of behind) el.inert = false;

    const done = () => {
      cover.remove();
      // Focus lands on the invitation itself, so a keyboard or screen
      // reader carries on from the top of the page rather than the body.
      const first = document.querySelector("h1");
      if (first) {
        first.setAttribute("tabindex", "-1");
        first.focus({ preventScroll: true });
      }
    };

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) done();
    else {
      cover.addEventListener("transitionend", done, { once: true });
      setTimeout(done, 1200);              // in case the transition never fires
    }
  };

  cover.querySelector("[data-envelope-open]").addEventListener("click", open, { once: true });
  cover.querySelector("[data-envelope-open]").focus({ preventScroll: true });
}
