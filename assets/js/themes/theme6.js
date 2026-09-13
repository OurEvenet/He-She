/* ---------------------------------------------------------------
   Theme 6 — Batik. Saturated, and local.

   The one with colour in it. A batik-derived field runs full bleed
   behind the hero and behind the venue, in teal and turmeric, with
   the names reversed out in chalk; between those two bands the page
   is quiet chalk with madder rules, so the pattern reads as an event
   rather than as wallpaper.

   The field is drawn in CSS as a tiling SVG, so it costs no request
   and stays sharp at any density.

   Same contract as every theme — #rsvp, [data-photo="n"], .frame.
   --------------------------------------------------------------- */

import { bootTheme } from "../theme-page.js";
import { esc, icon } from "../modules/render.js";
import { frameHTML } from "../modules/images.js";
import { formatDate, formatTime } from "../modules/dates.js";
import { replyFormHTML, replyCountHTML } from "../modules/forms.js";
import { countdownHTML } from "../modules/countdown.js";
import { storyHTML, giftsHTML } from "../modules/sections.js";

const two = (n) => String(n).padStart(2, "0");

/** A madder rule with a turmeric diamond at the centre. */
const rule = () => `<div class="rule" aria-hidden="true"><i></i><b></b><i></i></div>`;

function paint(c) {
  const { couple, meta, events, venue, images, gallery, faq, contacts, rsvp, letter } = c;
  const when = formatDate(events[0].start, meta.timezone, meta.dateLocale);

  document.getElementById("page").innerHTML = `

  <header class="hero field" id="top">
    <div class="wrap center">
      <p class="eyebrow">${esc(couple.invite)}</p>
      <h1 class="names">
        <span>${esc(couple.one.name)}</span>
        <em aria-hidden="true">&amp;</em>
        <span>${esc(couple.two.name)}</span>
      </h1>
      <p class="hero__date">${esc(when)}</p>
      <p class="hero__where">${esc(venue.name)} · ${esc(venue.city)}</p>
      ${countdownHTML("until the poruwa")}
      <div class="actions">
        <a class="btn" href="#rsvp">${esc(rsvp.heading)}</a>
        <a class="btn btn--quiet" href="#day">See the day</a>
      </div>
    </div>
  </header>

  <main>
    <section class="band" id="letter">
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
        ? `<section class="band band--alt" id="story-band">
             <div class="wrap wrap--narrow center">
               <p class="eyebrow">Before all this</p>
               <h2>${esc(c.storyHeading || "How we got here")}</h2>
               ${rule()}
             </div>
             <div class="wrap wrap--narrow">${storyHTML(c)}</div>
           </section>`
        : ""
    }

    <section class="band" id="day">
      <div class="wrap center">
        <p class="eyebrow">The order of the day</p>
        <h2>${esc(when)}</h2>
        ${rule()}
      </div>
      <div class="wrap tiles">
        ${events
          .map(
            (ev, i) => `
          <article>
            <p class="tiles__n" aria-hidden="true">${two(i + 1)}</p>
            <p class="tiles__time">${esc(
              formatTime(ev.start, meta.timezone, meta.dateLocale)
            )}<span> until ${esc(formatTime(ev.end, meta.timezone, meta.dateLocale))}</span></p>
            <h3>${esc(ev.name)}</h3>
            <p class="tiles__text">${esc(ev.description)}</p>
            ${ev.note ? `<p class="note">${esc(ev.note)}</p>` : ""}
            <p class="dress">${esc(ev.dress)}</p>
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

    <section class="band band--alt" id="gallery">
      <div class="wrap center">
        <p class="eyebrow">Photographs</p>
        <h2>Before the day</h2>
        ${rule()}
      </div>
      <div class="wrap quilt">
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

    <section class="band field" id="venue">
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

  <footer class="foot field">
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
