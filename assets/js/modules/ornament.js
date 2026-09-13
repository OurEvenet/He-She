/* ---------------------------------------------------------------
   Ornament.

   Hangs the theme's artwork on the page: creepers at the corners of
   the hero, a rule between sections, the couple under the letter, a
   punkalasa at the foot.

   The drawings are fetched and put into the document rather than
   used as <img>, because inline they inherit the theme's colour
   through currentColor and the stylesheet can hold every rule about
   how they move — including the one that stops them moving at all
   when the reader has asked for that.

   All of it is decoration. Every piece is aria-hidden and outside
   the tab order: a screen reader hears the invitation, not the
   wallpaper. If a drawing fails to load the page simply carries on
   without it.
   --------------------------------------------------------------- */

const cache = new Map();

async function drawing(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      fetch(new URL(`assets/svg/${name}.svg`, document.baseURI))
        .then((res) => (res.ok ? res.text() : ""))
        .catch(() => "")
    );
  }
  return cache.get(name);
}

/** One ornament, built and placed, or nothing at all if it will not load. */
async function place(name, className, into, where = "beforeend", attrs = {}) {
  if (!name || !into) return null;
  const markup = await drawing(name);
  if (!markup) return null;

  const host = document.createElement("span");
  host.className = `orn ${className}`;
  host.setAttribute("aria-hidden", "true");
  for (const [key, value] of Object.entries(attrs)) host.dataset[key] = value;
  host.innerHTML = markup;

  // The drawings carry their own title and role for standalone use; inside
  // the page they are wallpaper, so that is taken back off them.
  const svg = host.querySelector("svg");
  if (svg) {
    svg.removeAttribute("role");
    svg.removeAttribute("aria-label");
    svg.querySelector("title")?.remove();
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
  }

  into.insertAdjacentElement(where, host);
  return host;
}

export async function initOrnament(theme, config) {
  const set = theme?.ornaments || {};
  if (!Object.keys(set).length) return;

  const hero = document.getElementById("hero");
  const letter = document.querySelector("#letter .letter__paper");
  const footer = document.querySelector("#footer .footer__grid");

  const jobs = [];

  // Creepers at the top corners of the hero, clear of the type
  if (set.corners && hero) {
    jobs.push(place(set.corners, "orn--corner", hero, "afterbegin", { corner: "tl" }));
    jobs.push(place(set.corners, "orn--corner", hero, "afterbegin", { corner: "tr" }));
  }

  // The couple, under the letter, where the page first slows down
  if (set.letter && letter) {
    jobs.push(place(set.letter, "orn--couple", letter, "beforeend"));
  }

  // A rule between the sections that carry a heading, but never so many
  // that it becomes a pattern: the first three are plenty.
  if (set.rules) {
    const heads = [...document.querySelectorAll(".band__head")].slice(0, 3);
    for (const head of heads) {
      jobs.push(place(set.rules, "orn--rule", head, "beforeend"));
    }
  }

  // A pot of plenty at the foot
  if (set.footer && footer) {
    jobs.push(place(set.footer, "orn--pot", footer, "beforebegin"));
  }

  // A sesath turning behind the reply form, faint enough to be noticed
  // only by someone looking for it
  const rsvp = document.getElementById("rsvp");
  if (set.watermark && rsvp) {
    // It hangs off the right-hand edge on purpose, so the band it sits in
    // has to clip it — otherwise the page gains a sideways scroll.
    rsvp.classList.add("orn-host");
    jobs.push(place(set.watermark, "orn--watermark", rsvp, "afterbegin"));
  }

  await Promise.all(jobs);
}
