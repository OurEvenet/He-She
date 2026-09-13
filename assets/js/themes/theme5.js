/* ---------------------------------------------------------------
   Theme 5 — Ink & Kite. Paper minimal.

   One family, no serif anywhere, and the names set small. That last
   part is the whole idea: every other invitation in the world opens
   with the two names at the largest size the screen allows, so this
   one declines. The boldness is spent on the whitespace and on a
   single monoline drawing; the type stays quiet and exact.

   Everything hangs off one left margin, and the measure is narrow
   enough that a phone and a desktop read almost identically.

   Same contract as every theme — #rsvp, [data-photo="n"], .frame.
   --------------------------------------------------------------- */

import { bootTheme } from "../theme-page.js";
import { esc, icon } from "../modules/render.js";
import { frameHTML } from "../modules/images.js";
import { formatDate, formatTime } from "../modules/dates.js";
import { replyFormHTML, replyCountHTML } from "../modules/forms.js";
import { countdownHTML } from "../modules/countdown.js";
import { storyHTML, giftsHTML } from "../modules/sections.js";

/** A label above a section. Small caps, a rule, and nothing else. */
const label = (text) => `<p class="tag">${esc(text)}</p>`;

function paint(c) {
  const { couple, meta, events, venue, images, gallery, faq, contacts, rsvp, letter } = c;
  const when = formatDate(events[0].start, meta.timezone, meta.dateLocale);

  document.getElementById("page").innerHTML = `

  <header class="hero" id="top">
    <div class="wrap">
      ${label("You are invited")}
      <h1 class="names">${esc(couple.one.name)} <span aria-hidden="true">&amp;</span> ${esc(
        couple.two.name
      )}</h1>
      <p class="hero__line">${esc(couple.hero)}</p>

      <dl class="facts">
        <dt>Date</dt><dd>${esc(when)}</dd>
        <dt>Place</dt><dd>${esc(venue.name)}, ${esc(venue.city)}</dd>
        <dt>Begins</dt><dd>${esc(
          formatTime(events[0].start, meta.timezone, meta.dateLocale)
        )}, ${esc(events[0].shortName.toLowerCase())}</dd>
      </dl>

      ${countdownHTML("until the ceremony")}

      <div class="actions">
        <a class="btn" href="#rsvp">${esc(rsvp.heading)}</a>
        <a class="btn btn--quiet" href="#day">The running order</a>
      </div>

      <!-- The drawing, and the only picture above the fold. -->
      <img class="draw" src="assets/svg/liyawel.svg" alt="" aria-hidden="true"
           width="480" height="64">
    </div>
  </header>

  <main>
    <section class="band" id="letter">
      <div class="wrap">
        ${label("A note")}
        <h2>${esc(letter.heading)}</h2>
        <div class="prose">${letter.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        <p class="sign">${esc(letter.signoff)}</p>
        ${letter.aside ? `<p class="aside">${esc(letter.aside)}</p>` : ""}
      </div>
    </section>

    ${
      c.story?.length
        ? `<section class="band band--alt" id="story-band">
             <div class="wrap">
               ${label("Before all this")}
               <h2>${esc(c.storyHeading || "How we got here")}</h2>
               ${storyHTML(c)}
             </div>
           </section>`
        : ""
    }

    <section class="band" id="day">
      <div class="wrap">
        ${label("The day")}
        <h2>${esc(when)}</h2>
        <ol class="ledger">
          ${events
            .map(
              (ev) => `
            <li>
              <p class="ledger__time">
                <b>${esc(formatTime(ev.start, meta.timezone, meta.dateLocale))}</b>
                <span>${esc(formatTime(ev.end, meta.timezone, meta.dateLocale))}</span>
              </p>
              <div>
                <h3>${esc(ev.name)}</h3>
                <p>${esc(ev.description)}</p>
                ${ev.note ? `<p class="note">${esc(ev.note)}</p>` : ""}
                <p class="dress">${esc(ev.dress)}</p>
              </div>
            </li>`
            )
            .join("")}
        </ol>
        <button class="btn btn--quiet" type="button" data-day-ics>
          ${icon("calendar")}<span>Add the day to your calendar</span>
        </button>
      </div>
    </section>

    <section class="band band--alt" id="gallery">
      <div class="wrap">
        ${label("Photographs")}
        <h2>Before the day</h2>
      </div>
      <!-- One at a time, full measure, captioned underneath: the way a
           picture is looked at on paper rather than in a grid. -->
      <div class="wrap stack">
        ${gallery
          .map(
            (g, i) => `
          <figure>
            <button class="open" type="button" data-photo="${i}"
                    aria-label="Open photograph: ${esc(g.alt || g.caption)}">
              ${frameHTML(images[g.src], esc(g.alt), { sizes: "(max-width: 40rem) 100vw, 34rem" })}
            </button>
            <figcaption><i aria-hidden="true">${String(i + 1).padStart(
              2,
              "0"
            )}</i>${esc(g.caption)}</figcaption>
          </figure>`
          )
          .join("")}
      </div>
    </section>

    <section class="band" id="venue">
      <div class="wrap">
        ${label("Getting there")}
        <h2>${esc(venue.name)}</h2>
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
        <div class="notes">
          ${venue.notes
            .map((n) => `<div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></div>`)
            .join("")}
        </div>
      </div>
    </section>

    <section class="band band--alt" id="rsvp">
      <div class="wrap">
        ${label("Reply")}
        <h2>${esc(rsvp.heading)}</h2>
        <p class="lead">${esc(rsvp.intro)}</p>
        ${replyCountHTML(c)}
        ${replyFormHTML(c)}
      </div>
    </section>

    ${
      c.gifts?.enabled
        ? `<section class="band" id="gifts">
             <div class="wrap">
               ${label("Gifts")}
               <h2>${esc(c.gifts.heading || "If you were going to ask")}</h2>
               ${giftsHTML(c)}
             </div>
           </section>`
        : ""
    }

    <section class="band" id="faq">
      <div class="wrap">
        ${label("Questions")}
        <h2>Things people have asked</h2>
        <div class="faq">
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
      ${couple.hashtag ? `<p class="hashtag">${esc(couple.hashtag)}</p>` : ""}
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
  </footer>`;
}

bootTheme(paint);
