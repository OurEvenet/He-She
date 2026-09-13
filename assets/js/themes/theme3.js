/* ---------------------------------------------------------------
   Theme 3 — Botanical.

   The light one. Cream and sage rather than a dark hero: the
   photograph sits in an arch at the top of the page instead of
   behind the type, which means the type is on paper and always
   legible, whatever photograph goes in.

   Same contract as every theme — #rsvp, [data-photo="n"], .frame.
   --------------------------------------------------------------- */

import { bootTheme } from "../theme-page.js";
import { esc, icon } from "../modules/render.js";
import { frameHTML } from "../modules/images.js";
import { formatDate, formatTime } from "../modules/dates.js";
import { replyFormHTML, replyCountHTML } from "../modules/forms.js";
import { countdownHTML } from "../modules/countdown.js";

/** A sprig, from the ornament set, used as a section flourish. */
const sprig = (name = "araliya") =>
  `<img class="sprig" src="assets/svg/${name}.svg" alt="" aria-hidden="true" width="120" height="16">`;

function paint(c) {
  const { couple, meta, events, venue, images, gallery, faq, contacts, rsvp, letter } = c;
  const first = events[0];
  const when = formatDate(first.start, meta.timezone, meta.dateLocale);

  document.getElementById("page").innerHTML = `

  <header class="hero" id="top">
    <div class="wrap center">
      <p class="eyebrow">${esc(couple.invite)}</p>
      <h1 class="names">
        <span>${esc(couple.one.name)}</span>
        <em aria-hidden="true">&amp;</em>
        <span>${esc(couple.two.name)}</span>
      </h1>
      ${sprig("liyawel")}
      <p class="hero__date">${esc(when)} · ${esc(venue.name)}</p>
      ${countdownHTML("until we say so")}
      <div class="actions">
        <a class="btn" href="#rsvp">${esc(rsvp.heading)}</a>
        <a class="btn btn--quiet" href="#day">See the day</a>
      </div>
    </div>

    <!-- The photograph sits in an arch under the type rather than behind
         it, so nothing has to fight a bright sky to stay readable. -->
    <div class="arch wrap">
      ${frameHTML(images.hero, "", { eager: true, sizes: "(max-width: 46rem) 100vw, 60vw" })}
    </div>
  </header>

  <main>
    <section class="band" id="story">
      <div class="wrap wrap--narrow card card--paper center">
        <p class="eyebrow">${esc(letter.heading)}</p>
        ${sprig()}
        <div class="prose">${letter.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        <p class="sign">${esc(letter.signoff)}</p>
      </div>
      ${letter.aside ? `<p class="aside wrap wrap--narrow center">${esc(letter.aside)}</p>` : ""}
    </section>

    <section class="band band--sage" id="day">
      <div class="wrap center">
        <h2>How the day runs</h2>
        <p class="lead">Three parts, one venue. Come to whichever you can.</p>
      </div>
      <div class="wrap cards">
        ${events
          .map(
            (ev) => `
          <article class="card">
            <p class="card__time">${esc(formatTime(ev.start, meta.timezone, meta.dateLocale))}</p>
            <p class="card__until">until ${esc(formatTime(ev.end, meta.timezone, meta.dateLocale))}</p>
            <h3>${esc(ev.name)}</h3>
            <p class="card__text">${esc(ev.description)}</p>
            ${ev.note ? `<p class="card__note">${esc(ev.note)}</p>` : ""}
            <p class="card__dress">${esc(ev.dress)}</p>
          </article>`
          )
          .join("")}
      </div>
      <div class="wrap center">
        <button class="btn btn--quiet" type="button" data-day-ics>
          ${icon("calendar")}<span>Add the day to your calendar</span>
        </button>
      </div>
    </section>

    <section class="band" id="gallery">
      <div class="wrap center">
        <h2>Before the day</h2>
        ${sprig("liyawel")}
      </div>
      <div class="wrap mosaic">
        ${gallery
          .map(
            (g, i) => `
          <figure>
            <button class="open" type="button" data-photo="${i}"
                    aria-label="Open photograph: ${esc(g.alt || g.caption)}">
              ${frameHTML(images[g.src], esc(g.alt), { sizes: "(max-width: 46rem) 50vw, 33vw" })}
            </button>
            <figcaption>${esc(g.caption)}</figcaption>
          </figure>`
          )
          .join("")}
      </div>
    </section>

    <section class="band band--blush" id="venue">
      <div class="wrap venue">
        <div>
          <h2>${esc(venue.name)}</h2>
          <p class="venue__hall">${esc(venue.hall)}</p>
          <p class="venue__street">${esc(venue.address)}</p>
          <div class="actions actions--left">
            <a class="btn" href="${esc(venue.directionsUrl)}" target="_blank" rel="noopener">
              ${icon("pin")}<span>Open directions</span>
            </a>
            <a class="btn btn--quiet" href="${esc(venue.mapsUrl)}" target="_blank" rel="noopener">
              <span>See it on the map</span>
            </a>
          </div>
        </div>
        <div class="venue__photo">
          ${frameHTML(images[venue.image], `${esc(venue.name)} from the lakeside`, {
            sizes: "(max-width: 52rem) 100vw, 45vw",
          })}
        </div>
      </div>
      <div class="wrap cards cards--notes">
        ${venue.notes
          .map(
            (n) => `<article class="card card--note"><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></article>`
          )
          .join("")}
      </div>
    </section>

    <section class="band" id="rsvp">
      <div class="wrap wrap--narrow center">
        <h2>${esc(rsvp.heading)}</h2>
        ${sprig()}
        <p class="lead">${esc(rsvp.intro)}</p>
        ${replyCountHTML(c)}
      </div>
      <div class="wrap wrap--narrow card card--paper">${replyFormHTML(c)}</div>
    </section>

    <section class="band band--sage" id="faq">
      <div class="wrap wrap--narrow center"><h2>Things people have asked</h2></div>
      <div class="wrap wrap--narrow faq">
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
    </section>
  </main>

  <footer class="foot">
    <div class="wrap center">
      <p class="foot__names">${esc(couple.one.name)} &amp; ${esc(couple.two.name)}</p>
      <p class="foot__date">${esc(couple.dateLine)}</p>
      ${sprig("liyawel")}
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
        ${icon("share")}<span>Send this invitation on</span>
      </button>
    </div>
  </footer>`;
}

bootTheme(paint);
