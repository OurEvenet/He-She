/* ---------------------------------------------------------------
   RSVP.

   Static hosting means no server, so the reply goes to whatever form
   endpoint is named in wedding.json (Formspree, Basin, Getform, a
   Google Apps Script — anything that accepts a POST). With no
   endpoint set the flow still completes, and the confirmation says
   plainly that nothing is being collected.
   --------------------------------------------------------------- */

import { buildEntries, downloadICS, googleUrl, canUseGoogleApi, insertViaApi } from "./calendar.js";
import { formatDate } from "./dates.js";
import { esc } from "./render.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function initRsvp(root, config) {
  const form = root.querySelector("#rsvp-form");
  const confirm = root.querySelector("#rsvp-confirm");
  const error = root.querySelector("#rsvp-error");
  const submit = root.querySelector("#rsvp-submit");
  if (!form) return;

  const attendingBlock = root.querySelector("[data-attending]");
  const entries = buildEntries(config);

  /* Fields that only apply if they are actually coming ----------- */
  const syncAttending = () => {
    const value = form.querySelector('input[name="attendance"]:checked')?.value;
    attendingBlock.hidden = value === "no";
  };
  form.addEventListener("change", (e) => {
    if (e.target.name === "attendance") syncAttending();
  });
  syncAttending();

  /* Validation ---------------------------------------------------- */
  const fail = (message, field) => {
    error.hidden = false;
    error.textContent = message;
    field?.focus();
    return false;
  };

  const validate = () => {
    error.hidden = true;
    const name = form.elements.name;
    const email = form.elements.email;

    if (!name.value.trim()) {
      return fail("Add the name on your invitation so we know who replied.", name);
    }
    if (!EMAIL.test(email.value.trim())) {
      return fail("That email address does not look complete — check it and try again.", email);
    }
    return true;
  };

  /* Submission ---------------------------------------------------- */
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const attending = data.attendance !== "no";
    if (!attending) {
      delete data.guests;
      delete data.meal;
    }
    data._subject = `RSVP — ${data.name}`;
    data.submittedAt = new Date().toISOString();

    const endpoint = config.rsvp.endpoint;
    submit.disabled = true;
    submit.textContent = "Sending…";

    if (endpoint) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        submit.disabled = false;
        submit.textContent = "Send our reply";
        return fail(
          "The reply did not go through. Check your connection and send it again, or call one of the numbers at the bottom of the page.",
          submit
        );
      }
    }

    showConfirmation({ data, attending });
  });

  /* Confirmation + calendar -------------------------------------- */
  function showConfirmation({ data, attending }) {
    form.hidden = true;
    confirm.hidden = false;
    root.querySelector("#rsvp-demo").hidden = Boolean(config.rsvp.endpoint);

    const firstName = data.name.trim().split(/\s+/)[0];
    confirm.querySelector("[data-confirm-heading]").textContent = attending
      ? `Wonderful, ${firstName}.`
      : `Noted, ${firstName}.`;
    confirm.querySelector("[data-confirm-body]").textContent = attending
      ? "You are on the list. Put the day in your calendar now — the buttons below also set a reminder two weeks out, so you have time to sort out leave at work."
      : "We are sorry to miss you. If anything changes, send the form again — we will take the most recent reply.";

    if (!attending) {
      confirm.querySelectorAll(".confirm__group, .leave-note, .confirm__rule")
        .forEach((n) => n.remove());
      confirm.focus();
      return;
    }

    buildCalendarButtons();
    confirm.focus();
  }

  function buildCalendarButtons() {
    const host = confirm.querySelector("[data-google-buttons]");
    const dayEntries = entries.filter((e) => !e.allDay);
    const leave = entries.find((e) => e.allDay);

    host.innerHTML = dayEntries
      .map(
        (e, i) =>
          `<a class="btn${i ? " btn--quiet" : ""}" target="_blank" rel="noopener"
              href="${esc(googleUrl(config, e))}">Add the ${esc(e.shortName.toLowerCase())}</a>`
      )
      .join("");

    if (leave) {
      host.insertAdjacentHTML(
        "beforeend",
        `<a class="btn btn--quiet" target="_blank" rel="noopener"
            href="${esc(googleUrl(config, leave))}">Add the leave reminder</a>`
      );

      const when = formatDate(
        leave.startDate.toISOString().slice(0, 10),
        "UTC",
        config.meta.dateLocale
      );
      confirm.querySelector("[data-leave-note]").textContent =
        `The calendar file carries an alarm ${config.calendar.leaveReminder.daysBefore} days before the ceremony. ` +
        `If you use the Google buttons instead, the separate all-day reminder lands on ${when} — ` +
        `time enough to put the leave request in and arrange cover.`;
    }

    // Direct write, only when a client ID has been configured
    if (canUseGoogleApi(config)) {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.type = "button";
      btn.textContent = "Add everything to my calendar";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Adding…";
        try {
          await insertViaApi(config, entries);
          btn.textContent = "Added";
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Add everything to my calendar";
          error.hidden = false;
          error.textContent = err.message;
        }
      });
      host.prepend(btn);
    }

    confirm.querySelector("[data-ics]").addEventListener("click", () => {
      const slug = `${config.couple.one.name}-${config.couple.two.name}-wedding`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      downloadICS(config, entries, `${slug}.ics`);
    });
  }
}
