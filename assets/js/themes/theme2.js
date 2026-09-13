/* ---------------------------------------------------------------
   Theme 2 — Noir.

   The editorial one. Nothing is centred: everything hangs off a
   left margin, sections are numbered the way a printed programme
   numbers its movements, and the photographs run to the edge of the
   screen. Dark, with one warm accent.

   Same contract as every theme — #rsvp, [data-photo="n"], .frame —
   and the same data/wedding.json behind it.
   --------------------------------------------------------------- */

import { bootTheme } from "../theme-page.js";
import { esc, icon } from "../modules/render.js";
import { frameHTML } from "../modules/images.js";
import { formatDate, formatTime } from "../modules/dates.js";
import { replyFormHTML, replyCountHTML } from "../modules/forms.js";
import { countdownHTML } from "../modules/countdown.js";

const num = (n) => String(n).padStart(2, "0");

/** A section header: its number, its label, and the rule under both. */
const head = (n, label, title = "") => `
  <header class="lead">
    <p class="lead__num"><span aria-hidden="true">${num(n)}</span> ${esc(label)}</p>
    ${title ? `<h2>${esc(title)}</h2>` : ""}
  </header>`;

function paint(c) {
  const { couple, meta, events, venue, images, gallery, faq, contacts, rsvp, letter } = c;
  const first = events[0];
  const when = formatDate(first.start, meta.timezone, meta.dateLocale);

  document.getElementById("page").innerHTML = `

  <header class="hero" id="top">
    <div class="hero__media">
      ${frameHTML(images.hero, "", { eager: true, sizes: "100vw" })}
    </div>

    <div class="hero__top wrap">
      <p>${esc(venue.city)}</p>
      <p>${esc(when)}</p>
    </div>

    <div class="hero__inner wrap">
      <h1 class="names">
        <span>${esc(couple.one.name)}</span>
        <span class="names__amp" aria-hidden="true">&amp;</span>
        <span>${esc(couple.two.name)}</span>
      </h1>
      <p class="hero__line">${esc(couple.hero)}</p>
      ${countdownHTML("until the ceremony")}
      <div class="actions">
        <a class="btn" href="#rsvp">${esc(rsvp.heading)}</a>
        <a class="btn btn--quiet" href="#day">The running order</a>
      </div>
    </div>
  </header>

  <main>
    <section class="band" id="story">
      <div class="wrap split">
        ${head(1, "The note", letter.heading)}
        <div class="split__body">
          <div class="prose">${letter.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
          <p class="sign">${esc(letter.signoff)}</p>
          ${letter.aside ? `<p class="pull">${esc(letter.aside)}</p>` : ""}
        </div>
      </div>
    </section>

    <section class="band" id="day">
      <div class="wrap split">
        ${head(2, "The day", when)}
        <ol class="split__body runlist">
          ${events
            .map(
              (ev, i) => `
            <li>
              <p class="runlist__time">
                <b>${esc(formatTime(ev.start, meta.timezone, meta.dateLocale))}</b>
                <span>—&nbsp;${esc(formatTime(ev.end, meta.timezone, meta.dateLocale))}</span>
              </p>
              <div>
                <h3><i aria-hidden="true">${num(i + 1)}</i>${esc(ev.name)}</h3>
                <p>${esc(ev.description)}</p>
                ${ev.note ? `<p class="note">${esc(ev.note)}</p>` : ""}
                <p class="dress">${esc(ev.dress)}</p>
              </div>
            </li>`
            )
            .join("")}
          <li class="runlist__cta">
            <button class="btn btn--quiet" type="button" data-day-ics>
              ${icon("calendar")}<span>Add the day to your calendar</span>
            </button>
          </li>
        </ol>
      </div>
    </section>

    <section class="band band--flush" id="gallery">
      <div class="wrap">${head(3, "Photographs", "Before the day")}</div>
      <!-- A rail rather than a grid: on a phone it is one photograph at a
           time, swiped, which is how photographs are looked at there. -->
      <div class="rail" role="group" aria-label="Photographs">
        ${gallery
          .map(
            (g, i) => `
          <figure>
            <button class="open" type="button" data-photo="${i}"
                    aria-label="Open photograph: ${esc(g.alt || g.caption)}">
              ${frameHTML(images[g.src], esc(g.alt), { sizes: "(max-width: 46rem) 78vw, 30vw" })}
            </button>
            <figcaption><i aria-hidden="true">${num(i + 1)}</i>${esc(g.caption)}</figcaption>
          </figure>`
          )
          .join("")}
      </div>
    </section>

    <section class="band" id="venue">
      <div class="wrap split">
        ${head(4, "Getting there", venue.name)}
        <div class="split__body">
          <p class="venue__hall">${esc(venue.hall)}</p>
          <p class="venue__street">${esc(venue.address)}</p>
          <div class="actions">
            <a class="btn" href="${esc(venue.directionsUrl)}" target="_blank" rel="noopener">
              ${icon("pin")}<span>Directions</span>
            </a>
            <a class="btn btn--quiet" href="${esc(venue.mapsUrl)}" target="_blank" rel="noopener">
              <span>On the map</span>
            </a>
          </div>
          <dl class="notes">
            ${venue.notes
              .map((n) => `<dt>${esc(n.title)}</dt><dd>${esc(n.text)}</dd>`)
              .join("")}
          </dl>
        </div>
      </div>
    </section>

    <section class="band band--lit" id="rsvp">
      <div class="wrap split">
        ${head(5, "Reply", rsvp.heading)}
        <div class="split__body">
          <p class="intro">${esc(rsvp.intro)}</p>
          ${replyCountHTML(c)}
          ${replyFormHTML(c)}
        </div>
      </div>
    </section>

    <section class="band" id="faq">
      <div class="wrap split">
        ${head(6, "Questions")}
        <div class="split__body faq">
          ${faq
            .map(
              (f) => `
            <details>
              <summary>${esc(f.q)}</summary>
              <div><p>${esc(f.a)}</p></div>
            </details>`
            )
            .join("")}
        </div>
      </div>
    </section>
  </main>

  <footer class="foot">
    <div class="wrap">
      <p class="foot__names">${esc(couple.one.name)} &amp; ${esc(couple.two.name)}</p>
      <p class="foot__date">${esc(couple.dateLine)}</p>
      <div class="foot__grid">
        <div class="contacts">
          ${contacts
            .map(
              (p) => `
            <p>
              <a href="tel:${esc(p.phone.replace(/\s/g, ""))}">
                ${icon("phone")}<span>${esc(p.name)} — ${esc(p.phone)}</span>
              </a>
              <small>${esc(p.role)}</small>
            </p>`
            )
            .join("")}
        </div>
        <button class="btn btn--quiet" type="button" data-share hidden>
          ${icon("share")}<span>Send this on</span>
        </button>
      </div>
    </div>
  </footer>`;
}

bootTheme(paint);
