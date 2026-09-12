/* ---------------------------------------------------------------
   Render. Every section is built here from wedding.json — index.html
   holds the frame and nothing else, so content changes never touch
   markup.
   --------------------------------------------------------------- */

import { frameHTML } from "./images.js";
import { formatDate, formatTime, daysUntil } from "./dates.js";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

/* --- Icons -------------------------------------------------------
   Drawn inline rather than pulled from a font or a sprite: five small
   paths cost less than a request, and they inherit currentColor, so the
   same mark works on a brass button and on a dark one. */

const PATHS = {
  calendar:
    '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  phone:
    '<path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z"/>',
  reply: '<path d="M4 5h16v12H8l-4 4z"/>',
  share:
    '<path d="M12 15V4M8.5 7.5 12 4l3.5 3.5"/><path d="M5 12v7h14v-7"/>',
};

/** One inline icon, sized by the button's own font-size. */
export const icon = (name) =>
  PATHS[name]
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
            focusable="false">${PATHS[name]}</svg>`
    : "";

/* --- Head ------------------------------------------------------- */

export function renderHead(c) {
  const { meta } = c;
  document.title = meta.siteTitle;
  document.documentElement.lang = meta.locale;

  const set = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  const absolute = (path) => {
    try { return new URL(path, meta.url).href; } catch { return path; }
  };

  set('meta[name="description"]', "content", meta.description);
  set('meta[name="theme-color"]', "content", meta.themeColor);
  set('meta[property="og:title"]', "content", meta.siteTitle);
  set('meta[property="og:description"]', "content", meta.description);
  set('meta[property="og:url"]', "content", meta.url);
  set('meta[property="og:image"]', "content", absolute(meta.ogImage));
  set('meta[name="twitter:title"]', "content", meta.siteTitle);
  set('meta[name="twitter:description"]', "content", meta.description);
  set('meta[name="twitter:image"]', "content", absolute(meta.ogImage));
  set('link[rel="canonical"]', "href", meta.url);

  // Structured data, so a shared link previews as an event
  const first = c.events[0];
  const ld = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: meta.siteTitle,
    startDate: `${first.start}+05:30`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: c.venue.name,
      address: c.venue.address,
      geo: { "@type": "GeoCoordinates", latitude: c.venue.lat, longitude: c.venue.lng },
    },
    image: [absolute(meta.ogImage)],
    description: meta.description,
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
}

/* --- Hero ------------------------------------------------------- */

export function renderHero(el, c) {
  const { couple, meta, events, venue, images } = c;
  const first = events[0];

  el.innerHTML = `
    <div class="hero__media">
      ${frameHTML(images.hero, "", { eager: true, sizes: "100vw" })}
    </div>
    <div class="hero__inner shell">
      <p class="hero__eyebrow">${esc(couple.invite)}</p>
      <h1 class="names" aria-label="${esc(couple.one.name)} and ${esc(couple.two.name)}">
        <span>${esc(couple.one.name)}</span>
        <span><span class="names__amp" aria-hidden="true">&amp;</span>${esc(couple.two.name)}</span>
      </h1>
      <div class="hero__meta">
        <p><strong>${esc(formatDate(first.start, meta.timezone, meta.dateLocale))}</strong></p>
        <p>${esc(first.shortName)} at ${esc(formatTime(first.start, meta.timezone, meta.dateLocale))},
           ${esc(venue.name)}, ${esc(venue.city)}</p>
      </div>
      <p class="hero__line">${esc(couple.hero)}</p>
      <div class="hero__actions">
        <a class="btn" href="#rsvp">${esc(c.rsvp.heading)}</a>
        <a class="btn btn--quiet" href="#day">How the day runs</a>
      </div>
    </div>
    <a class="hero__scroll" href="#letter"><span>Read on</span><i></i></a>`;

  // The hero photograph sits behind the type; its frame must fill the box.
  const frame = el.querySelector(".frame");
  if (frame) {
    frame.style.position = "absolute";
    frame.style.inset = "0";
    frame.style.aspectRatio = "auto";
  }
}

/* --- Letter ----------------------------------------------------- */

export function renderLetter(el, c) {
  const { letter } = c;
  el.innerHTML = `
    <div class="shell letter">
      <div class="letter__paper">
        <h2>${esc(letter.heading)}</h2>
        <div class="prose">${letter.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        <p class="letter__sign">${esc(letter.signoff)}</p>
      </div>
      ${letter.aside ? `<p class="aside">${esc(letter.aside)}</p>` : ""}
    </div>`;
}

/* --- The day ---------------------------------------------------- */

export function renderDay(el, c) {
  const { events, meta } = c;

  el.innerHTML = `
    <div class="shell">
      <div class="band__head">
        <h2>How the day runs</h2>
        <p>Three parts, one venue. Come to whichever you can.</p>
      </div>
      <ol class="day">
        ${events
          .map(
            (ev) => `
          <li class="slot">
            <p class="slot__time">${esc(formatTime(ev.start, meta.timezone, meta.dateLocale))}
              <small>until ${esc(formatTime(ev.end, meta.timezone, meta.dateLocale))}</small>
            </p>
            <div class="slot__body">
              <h3>${esc(ev.name)}</h3>
              <p>${esc(ev.description)}</p>
              ${ev.note ? `<p class="slot__note">${esc(ev.note)}</p>` : ""}
              <p class="slot__dress">Dress: ${esc(ev.dress)}</p>
            </div>
          </li>`
          )
          .join("")}
      </ol>

      <div class="day__actions">
        <button class="btn btn--quiet" type="button" data-day-ics>
          ${icon("calendar")}<span>Add the day to your calendar</span>
        </button>
        <p class="day__note">A calendar file with every part of the day, and an alarm
          two weeks ahead so leave from work does not creep up on you.</p>
      </div>
    </div>`;
}

/* --- Gallery ---------------------------------------------------- */

export function renderGallery(el, c) {
  const { gallery, images } = c;

  el.innerHTML = `
    <div class="shell">
      <div class="band__head">
        <h2>Before the day</h2>
        <p>Photographs from the months of getting ready, mostly taken badly and on purpose.</p>
      </div>
      <div class="gallery">
        ${gallery
          .map(
            (g, i) => `
          <figure>
            <button class="gallery__open" type="button" data-photo="${i}"
                    aria-label="Open photograph: ${esc(g.alt || g.caption)}">
              ${frameHTML(images[g.src], esc(g.alt), {
                sizes: "(max-width: 46rem) 50vw, 40vw",
              })}
            </button>
            <figcaption>${esc(g.caption)}</figcaption>
          </figure>`
          )
          .join("")}
      </div>
    </div>`;
}

/* --- Venue ------------------------------------------------------ */

export function renderVenue(el, c) {
  const { venue, images } = c;

  el.innerHTML = `
    <div class="shell">
      <div class="band__head">
        <h2>Getting there</h2>
      </div>
      <div class="venue">
        <div>
          <p class="venue__address">${esc(venue.name)}</p>
          <p class="venue__hall">${esc(venue.hall)}</p>
          <p class="venue__street">${esc(venue.address)}</p>
          <div class="venue__notes">
            ${venue.notes
              .map(
                (n) => `<div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></div>`
              )
              .join("")}
          </div>
          <div class="venue__links">
            <a class="btn" href="${esc(venue.directionsUrl)}" target="_blank" rel="noopener">
              ${icon("pin")}<span>Open directions</span>
            </a>
            <a class="btn btn--quiet" href="${esc(venue.mapsUrl)}" target="_blank" rel="noopener">
              <span>See it on the map</span>
            </a>
          </div>
        </div>
        <div>${frameHTML(images[venue.image], `${esc(venue.name)} from the lakeside`, {
          sizes: "(max-width: 58rem) 100vw, 40vw",
        })}</div>
      </div>
    </div>`;
}

/* --- RSVP ------------------------------------------------------- */

export function renderRsvp(el, c) {
  const { rsvp, meta, couple } = c;
  const left = daysUntil(rsvp.deadline, meta.timezone);
  const guestOptions = Array.from({ length: rsvp.maxGuests }, (_, i) => i + 1)
    .map((n) => `<option value="${n}">${n}</option>`)
    .join("");

  el.innerHTML = `
    <div class="shell rsvp">
      <div>
        <div class="band__head">
          <h2>${esc(rsvp.heading)}</h2>
          <p>${esc(rsvp.intro)}</p>
        </div>
        <div class="rsvp__count">
          <b data-countdown>${left > 0 ? left : 0}</b>
          <span data-countdown-label>${
            left > 1
              ? `days left to reply — replies close on ${esc(
                  formatDate(rsvp.deadline, meta.timezone, meta.dateLocale, { weekday: undefined })
                )}`
              : left === 1
              ? "one day left to reply"
              : "replies have closed — message us directly and we will squeeze you in"
          }</span>
        </div>
      </div>

      <div>
        <form class="form" id="rsvp-form" novalidate>
          <div class="field" data-field="name">
            <label for="rsvp-name">Name, as it appears on your invitation</label>
            <input id="rsvp-name" name="name" type="text" autocomplete="name"
                   autocapitalize="words" enterkeyhint="next" spellcheck="false"
                   aria-describedby="rsvp-name-error" required>
            <p class="field__error" id="rsvp-name-error" hidden></p>
          </div>

          <div class="field" data-field="email">
            <label for="rsvp-email">Email</label>
            <input id="rsvp-email" name="email" type="email" autocomplete="email"
                   inputmode="email" autocapitalize="off" autocorrect="off"
                   spellcheck="false" enterkeyhint="next"
                   aria-describedby="rsvp-email-hint rsvp-email-error" required>
            <p class="field__hint" id="rsvp-email-hint">Only used to send you the details again nearer the time.</p>
            <p class="field__error" id="rsvp-email-error" hidden></p>
          </div>

          <fieldset class="fieldset">
            <legend>Are you coming?</legend>
            <div class="choices">
              ${rsvp.attendance
                .map(
                  (a, i) => `
                <label class="choice">
                  <input type="radio" name="attendance" value="${esc(a.value)}" ${
                    i === 0 ? "checked" : ""
                  }>
                  <span>${esc(a.label)}</span>
                </label>`
                )
                .join("")}
            </div>
          </fieldset>

          <div class="if-attending" data-attending>
            <div class="form__row">
              <div class="field">
                <label for="rsvp-guests">How many of you</label>
                <select id="rsvp-guests" name="guests">${guestOptions}</select>
              </div>
              <div class="field">
                <label for="rsvp-meal">Anything we should cook around</label>
                <select id="rsvp-meal" name="meal">
                  ${rsvp.meals
                    .map((m) => `<option value="${esc(m.value)}">${esc(m.label)}</option>`)
                    .join("")}
                </select>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="rsvp-message">Anything else</label>
            <textarea id="rsvp-message" name="message" rows="4" enterkeyhint="enter"
              placeholder="Allergies, a song you want played, the year you last danced."></textarea>
          </div>

          <p class="form__error" id="rsvp-error" role="alert" hidden></p>

          <div class="form__submit">
            <button class="btn" type="submit" id="rsvp-submit">
              ${icon("reply")}<span>Send our reply</span>
            </button>
          </div>
        </form>

        <div class="confirm" id="rsvp-confirm" hidden tabindex="-1">
          <div>
            <h3 data-confirm-heading>Thank you.</h3>
            <p data-confirm-body></p>
          </div>

          <div class="confirm__rule"></div>

          <div class="confirm__group" data-calendar-google>
            <p>Put it in Google Calendar</p>
            <div class="confirm__buttons" data-google-buttons></div>
          </div>

          <div class="confirm__group">
            <p>Or download it for Apple Calendar, Outlook, or anything else</p>
            <div class="confirm__buttons">
              <button class="btn btn--quiet" type="button" data-ics>
                ${icon("calendar")}<span>Download the calendar file</span>
              </button>
            </div>
          </div>

          <div class="leave-note">
            <b>Two weeks ahead</b>
            <p data-leave-note></p>
          </div>

          <p class="confirm__demo" id="rsvp-demo" hidden>
            Replies are not being collected yet. Set <code>rsvp.endpoint</code> in
            <code>data/wedding.json</code> to a form endpoint before you share this link.
          </p>
        </div>
      </div>
    </div>`;
}

/* --- FAQ -------------------------------------------------------- */

export function renderFaq(el, c) {
  el.innerHTML = `
    <div class="shell">
      <div class="band__head"><h2>Things people have asked</h2></div>
      <div class="faq">
        ${c.faq
          .map(
            (f) => `
          <details>
            <summary>${esc(f.q)}</summary>
            <div><p>${esc(f.a)}</p></div>
          </details>`
          )
          .join("")}
      </div>
    </div>`;
}

/* --- Footer ----------------------------------------------------- */

export function renderFooter(el, c) {
  const { couple, events, meta, contacts } = c;
  el.innerHTML = `
    <div class="shell footer__grid">
      <div>
        <p class="footer__names">${esc(couple.one.name)} &amp; ${esc(couple.two.name)}</p>
        <p class="footer__date">${esc(couple.dateLine)}</p>
      </div>
      <div class="footer__contacts">
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
      <div class="footer__share">
        <button class="btn btn--quiet" type="button" data-share hidden>
          ${icon("share")}<span>Send this invitation on</span>
        </button>
      </div>
    </div>`;
}
