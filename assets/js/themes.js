/* ---------------------------------------------------------------
   The picker.

   Six designs, one data/wedding.json. This page reads the same file
   as the invitations do, so the names and the date on every card are
   the couple's own rather than a made-up sample — which is the whole
   claim the page is making, demonstrated rather than asserted.
   --------------------------------------------------------------- */

import { esc } from "./modules/render.js";
import { formatDate } from "./modules/dates.js";

const DESIGNS = [
  {
    file: "index.html",
    name: "Poruwa",
    blurb: "The flagship: a brass thread down the page, four colour themes, and Kandyan artwork.",
    swatch: ["#22463c", "#c08a2e", "#e8e6dc"],
  },
  {
    file: "theme1.html",
    name: "Ivory",
    blurb: "The classic printed invitation — centred, symmetric, gold rules, a monogram.",
    swatch: ["#24201b", "#a8802f", "#fbf8f2"],
  },
  {
    file: "theme2.html",
    name: "Noir",
    blurb: "Editorial and left-aligned, sections numbered like a programme, photographs to the edge.",
    swatch: ["#0c0c0e", "#d9a441", "#f0ece4"],
  },
  {
    file: "theme3.html",
    name: "Botanical",
    blurb: "Cream and sage, soft corners, and the photograph in an arch under the type.",
    swatch: ["#4e6b50", "#e8d3c8", "#fcf9f4"],
  },
  {
    file: "theme4.html",
    name: "Araliya",
    blurb: "Night garden: deep indigo, brass, and a stem that draws itself across the hero.",
    swatch: ["#0e1230", "#b98a2e", "#c98b96"],
  },
  {
    file: "theme5.html",
    name: "Ink & Kite",
    blurb: "Paper minimal. One sans family, a narrow column, and the names set deliberately small.",
    swatch: ["#22242a", "#8e86b8", "#fbfaf6"],
  },
  {
    file: "theme6.html",
    name: "Batik",
    blurb: "Saturated and local: a teal batik field, madder rules, names reversed out in chalk.",
    swatch: ["#0c5350", "#9e2b20", "#d7a22a"],
  },
];

const swatchHTML = (colours) =>
  `<span class="card__swatch" aria-hidden="true">${colours
    .map((c) => `<i style="background:${esc(c)}"></i>`)
    .join("")}</span>`;

async function start() {
  const res = await fetch(new URL("data/wedding.json", document.baseURI), { cache: "no-cache" });
  if (!res.ok) throw new Error(`wedding.json returned ${res.status}`);
  const c = await res.json();
  c.meta.dateLocale = c.meta.dateLocale || c.meta.locale;

  const when = formatDate(c.events[0].start, c.meta.timezone, c.meta.dateLocale);
  const names = `${c.couple.one.name} & ${c.couple.two.name}`;

  // A link the reader can carry across to whichever design they open,
  // so a personalised link keeps being personalised.
  const query = location.search;

  document.getElementById("page").innerHTML = `
    <header class="top">
      <div class="wrap">
        <p class="tag">One invitation, seven designs</p>
        <h1>${esc(names)}</h1>
        <p class="top__when">${esc(when)} · ${esc(c.venue.name)}, ${esc(c.venue.city)}</p>
        <p class="top__note">
          Every design below is the same <code>data/wedding.json</code> — the same names,
          the same three events, the same reply form. Changing the look changes no content,
          and changing the content changes every look at once.
        </p>
      </div>
    </header>

    <main class="wrap">
      <ul class="cards">
        ${DESIGNS.map(
          (d) => `
          <li class="card">
            <a href="${esc(d.file)}${esc(query)}">
              ${swatchHTML(d.swatch)}
              <h2>${esc(d.name)}</h2>
              <p>${esc(d.blurb)}</p>
              <span class="card__go">Open ${esc(d.file)}</span>
            </a>
          </li>`
        ).join("")}
      </ul>
    </main>

    <footer class="foot wrap">
      <p>Pick one and send that page's link — <code>theme4.html</code> rather than the site
         root, say. The other six stay in the repository costing nothing: they are static
         files nobody downloads unless they are asked for.</p>
    </footer>`;

  document.title = `Designs — ${names}`;
  document.getElementById("boot")?.remove();
}

start().catch((err) => {
  console.error(err);
  const note = document.getElementById("boot-fail");
  if (note) {
    note.hidden = false;
    note.textContent = "The designs could not load. Refresh the page.";
  }
});
