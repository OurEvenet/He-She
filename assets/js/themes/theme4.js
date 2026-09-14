/* ---------------------------------------------------------------
   Theme 4 — Araliya. The night garden.

   Deep indigo the whole way down, brass for every rule and figure,
   and one blush pink used exactly twice — on the ampersand between
   the names and on the line that closes the letter. A colour used
   twice reads as a decision; used everywhere it reads as a palette.

   The boldness is spent on one thing: the araliya stem that draws
   itself across the hero once, on open. Everything under it is
   quiet, centred and widely spaced.

   Same contract as every theme — #rsvp, [data-photo="n"], .frame —
   and the same data/wedding.json behind it.
   --------------------------------------------------------------- */

import { bootTheme } from "../theme-page.js";
import { esc, icon } from "../modules/render.js";
import { frameHTML } from "../modules/images.js";
import { formatDate, formatTime } from "../modules/dates.js";
import { replyFormHTML, replyCountHTML } from "../modules/forms.js";
import { countdownHTML } from "../modules/countdown.js";
import { storyHTML, giftsHTML } from "../modules/sections.js";

/** A brass hairline with a diamond at the middle. */
const rule = () => `<div class="rule" aria-hidden="true"><i></i><b></b><i></i></div>`;

function paint(c) {
  const { couple, meta, events, venue, images, gallery, faq, contacts, rsvp, letter } = c;
  const when = formatDate(events[0].start, meta.timezone, meta.dateLocale);

  document.getElementById("page").innerHTML = `

  <header class="hero" id="top">
    <div class="hero__media">
      ${frameHTML(images.hero, "", { eager: true, sizes: "100vw" })}
    </div>

    <div class="hero__inner wrap center">
      <p class="eyebrow">${esc(venue.city)} · ${esc(when)}</p>
      <h1 class="names">
        <span>${esc(couple.one.name)}</span>
        <em aria-hidden="true">&amp;</em>
        <span>${esc(couple.two.name)}</span>
      </h1>

      <!-- The one flourish. It draws itself on open, once, and holds
           still afterwards; with motion reduced it is simply there. -->
      <img class="stem" src="assets/svg/araliya.svg" alt="" aria-hidden="true"
           width="480" height="64">

      <p class="hero__line">${esc(couple.hero)}</p>
      ${countdownHTML("until the poruwa")}
      <div class="actions">
        <a class="btn" href="#rsvp">${esc(rsvp.heading)}</a>
        <a class="btn btn--quiet" href="#day">See the day</a>
      </div>
    </div>
  </header>

  <main>
    <section class="band band--alt" id="letter">
      <div class="wrap wrap--narrow center">
        <p class="eyebrow">Our note to you</p>
        <h2>${esc(letter.heading)}</h2>
        ${rule()}
        <div class="prose">${letter.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        <p class="sign">${esc(letter.signoff)}</p>
        ${letter.aside ? `<p class="aside">${esc(letter.aside)}</p>` : ""}
      </div>
    </section>

    ${
      c.story?.length
        ? `<section class="band" id="story-band">
             <div class="wrap wrap--narrow center">
               <p class="eyebrow">Before all this</p>
               <h2>${esc(c.storyHeading || "How we got here")}</h2>
               ${rule()}
             </div>
             <div class="wrap wrap--narrow">${storyHTML(c)}</div>
           </section>`
        : ""
    }

    <section class="band band--alt" id="day">
      <div class="wrap center">
        <p class="eyebrow">The order of the day</p>
        <h2>${esc(when)}</h2>
        ${rule()}
      </div>
      <ol class="runs wrap wrap--narrow">
        ${events
          .map(
            (ev) => `
          <li>
            <p class="runs__time">
              <b>${esc(formatTime(ev.start, meta.timezone, meta.dateLocale))}</b>
              <span>until ${esc(formatTime(ev.end, meta.timezone, meta.dateLocale))}</span>
            </p>
            <div>
              <h3>${esc(ev.name)}</h3>
              <p>${esc(ev.description)}</p>
              ${ev.note ? `<p class="note">${esc(ev.note)}</p>` : ""}
              <p class="dress">Dress · ${esc(ev.dress)}</p>
            </div>
          </li>`
          )
          .join("")}
      </ol>
      <div class="wrap center">
        <button class="btn btn--quiet" type="button" data-day-ics>
          ${icon("calendar")}<span>Add the day to your calendar</span>
        </button>
      </div>
    </section>

    <section class="band" id="gallery">
      <div class="wrap center">
        <p class="eyebrow">Photographs</p>
        <h2>Before the day</h2>
        ${rule()}
      </div>
      <div class="wrap plates">
        ${gallery
          .map(
            (g, i) => `
          <figure>
            <button class="open" type="button" data-photo="${i}"
                    aria-label="Open photograph: ${esc(g.alt || g.caption)}">
              ${frameHTML(images[g.src], esc(g.alt), { sizes: "(max-width: 46rem) 50vw, 25vw" })}
            </button>
            <figcaption>${esc(g.caption)}</figcaption>
          </figure>`
          )
          .join("")}
      </div>
    </section>

    <section class="band band--alt" id="venue">
      <div class="wrap center">
        <p class="eyebrow">Getting there</p>
        <h2>${esc(venue.name)}</h2>
        <p class="venue__hall">${esc(venue.hall)}</p>
        <p class="venue__street">${esc(venue.address)}</p>
        <div class="actions">
          <a class="btn" href="${esc(venue.directionsUrl)}" target="_blank" rel="noopener">
            ${icon("pin")}<span>Open directions</span>
          </a>
          <a class="btn btn--quiet" href="${esc(venue.mapsUrl)}" target="_blank" rel="noopener">
            <span>See it on the map</span>
          </a>
        </div>
        <div class="wrap venue__plate">
          ${frameHTML(images[venue.image], `${esc(venue.name)} from the lakeside`, {
            sizes: "(max-width: 52rem) 100vw, 55vw",
          })}
        </div>
        <div class="notes">
          ${venue.notes
            .map((n) => `<div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></div>`)
            .join("")}
        </div>
      </div>
    </section>

    <section class="band" id="rsvp">
      <div class="wrap wrap--narrow center">
        <p class="eyebrow">Reply</p>
        <h2>${esc(rsvp.heading)}</h2>
        ${rule()}
        <p class="lead">${esc(rsvp.intro)}</p>
        ${replyCountHTML(c)}
      </div>
      <div class="wrap wrap--narrow card">${replyFormHTML(c)}</div>
    </section>

    ${
      c.gifts?.enabled
        ? `<section class="band band--alt" id="gifts">
             <div class="wrap wrap--narrow center">
               <p class="eyebrow">Gifts</p>
               <h2>${esc(c.gifts.heading || "If you were going to ask")}</h2>
               ${rule()}
               ${giftsHTML(c)}
             </div>
           </section>`
        : ""
    }

    <section class="band" id="faq">
      <div class="wrap wrap--narrow center">
        <p class="eyebrow">Questions</p>
        <h2>Things people have asked</h2>
        ${rule()}
      </div>
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
      ${couple.hashtag ? `<p class="hashtag">${esc(couple.hashtag)}</p>` : ""}
      ${rule()}
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
