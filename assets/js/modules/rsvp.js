/* ---------------------------------------------------------------
   RSVP.

   Static hosting means no server, so the reply goes to whatever form
   endpoint is named in wedding.json (Formspree, Basin, Getform, a
   Google Apps Script — anything that accepts a POST). With no
   endpoint set the flow still completes, and the confirmation says
   plainly that nothing is being collected.
   --------------------------------------------------------------- */

import {
  buildEntries, downloadICS, googleUrl, canUseGoogleApi, insertViaApi, icsFilename,
} from "./calendar.js";
import { formatDate } from "./dates.js";
import { esc, icon } from "./render.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Label of a button that also carries an icon, so the icon survives. */
const setLabel = (button, text) => {
  const span = button.querySelector("span");
  if (span) span.textContent = text;
  else button.textContent = text;
};

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

  /* Validation ----------------------------------------------------
     The message goes next to the field as well as at the foot of the
     form: on a phone the foot of the form is often off-screen, and a
     lone red line down there is a puzzle rather than a correction. */
  const markField = (input, message) => {
    const wrap = input?.closest(".field");
    if (!wrap) return;
    const slot = wrap.querySelector(".field__error");
    wrap.toggleAttribute("data-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (slot) {
      slot.textContent = message || "";
      slot.hidden = !message;
    }
  };

  const clearErrors = () => {
    error.hidden = true;
    error.textContent = "";
    for (const input of [form.elements.name, form.elements.email]) markField(input, "");
  };

  const fail = (message, field) => {
    error.hidden = false;
    error.textContent = message;
    markField(field, message);
    if (field) {
      // Bring it into view first: focusing alone leaves the field under
      // the software keyboard on a short screen.
      field.scrollIntoView({ block: "center", behavior: "smooth" });
      field.focus({ preventScroll: true });
    }
    return false;
  };

  const validate = () => {
    clearErrors();
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

  // Correcting a field should clear its complaint as you type
  form.addEventListener("input", (event) => {
    if (event.target.closest(".field[data-invalid]")) {
      markField(event.target, "");
      if (!form.querySelector(".field[data-invalid]")) error.hidden = true;
    }
  });

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
    submit.setAttribute("aria-busy", "true");
    setLabel(submit, "Sending…");

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
        submit.removeAttribute("aria-busy");
        setLabel(submit, "Send our reply");
        return fail(
          navigator.onLine === false
            ? "You appear to be offline. The reply is still here — send it again once you have signal."
            : "The reply did not go through. Check your connection and send it again, or call one of the numbers at the bottom of the page.",
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
      settle();
      return;
    }

    buildCalendarButtons();
    settle();
  }

  /** Put the confirmation where it can be read, then hand it the focus. */
  function settle() {
    confirm.scrollIntoView({ block: "start", behavior: "smooth" });
    confirm.focus({ preventScroll: true });
  }

  function buildCalendarButtons() {
    const host = confirm.querySelector("[data-google-buttons]");
    const dayEntries = entries.filter((e) => !e.allDay);
    const leave = entries.find((e) => e.allDay);

    host.innerHTML = dayEntries
      .map(
        (e, i) =>
          `<a class="btn${i ? " btn--quiet" : ""}" target="_blank" rel="noopener"
              href="${esc(googleUrl(config, e))}">${icon("calendar")}<span>Add the ${esc(
            e.shortName.toLowerCase()
          )}</span></a>`
      )
      .join("");

    if (leave) {
      host.insertAdjacentHTML(
        "beforeend",
        `<a class="btn btn--quiet" target="_blank" rel="noopener"
            href="${esc(googleUrl(config, leave))}">${icon("calendar")}<span>Add the leave reminder</span></a>`
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
      btn.innerHTML = `${icon("calendar")}<span>Add everything to my calendar</span>`;
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        setLabel(btn, "Adding…");
        try {
          await insertViaApi(config, entries);
          setLabel(btn, "Added");
        } catch (err) {
          btn.disabled = false;
          setLabel(btn, "Add everything to my calendar");
          error.hidden = false;
          error.textContent = err.message;
        }
      });
      host.prepend(btn);
    }

    confirm.querySelector("[data-ics]").addEventListener("click", () => {
      downloadICS(config, entries, icsFilename(config));
    });
  }
}
