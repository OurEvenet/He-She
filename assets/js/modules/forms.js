/* ---------------------------------------------------------------
   The reply form, in one place.

   Every theme dresses the invitation differently, but they all use
   the same reply form, because rsvp.js works against the markup:
   the ids it focuses, the [data-attending] block it hides, the
   [data-google-buttons] host it fills, the .field wrappers it marks
   invalid. Writing that markup once means a new theme cannot get it
   subtly wrong — it styles these classes and the behaviour follows.

   What varies between themes is arrangement and colour, which is
   CSS. What does not vary is what the form is.
   --------------------------------------------------------------- */

import { esc, icon } from "./render.js";
import { formatDate, daysUntil } from "./dates.js";

/** How long is left to reply, in the couple's own words. */
export function replyCountHTML(c) {
  const { rsvp, meta } = c;
  const left = daysUntil(rsvp.deadline, meta.timezone);
  const label =
    left > 1
      ? `days left to reply — replies close on ${esc(
          formatDate(rsvp.deadline, meta.timezone, meta.dateLocale, { weekday: undefined })
        )}`
      : left === 1
      ? "one day left to reply"
      : "replies have closed — message us directly and we will squeeze you in";

  return `
    <div class="rsvp__count">
      <b data-countdown>${left > 0 ? left : 0}</b>
      <span data-countdown-label>${label}</span>
    </div>`;
}

/** The form itself, and the confirmation that replaces it. */
export function replyFormHTML(c) {
  const { rsvp } = c;
  const guestOptions = Array.from({ length: rsvp.maxGuests }, (_, i) => i + 1)
    .map((n) => `<option value="${n}">${n}</option>`)
    .join("");

  return `
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
    </div>`;
}
