/* ---------------------------------------------------------------
   Invitation editor.

   Edits data/wedding.json through a form and hands back a file to
   drop into the repository. It imports the site's own dates.js, so
   the times shown here are computed by exactly the code that writes
   guests' calendar entries — there is no second implementation to
   drift out of step.

   The loaded object is mutated in place rather than rebuilt, which
   keeps key order intact so the downloaded file stays diffable
   against the one in your repository.
   --------------------------------------------------------------- */

import {
  zonedToUTC, toUTCStamp, shiftDays, formatDate, formatTime, daysUntil,
} from "./modules/dates.js";

const $ = (sel) => document.querySelector(sel);

let data = null;
let pristine = "";
let sourceLabel = "";

/* --- Path helpers ------------------------------------------------ */
const get = (obj, path) =>
  path.split(".").reduce((a, k) => (a == null ? a : a[k]), obj);

function set(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((a, k) => (a[k] ??= {}), obj);
  target[last] = value;
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const tz = () => data.meta.timezone;
const dl = () => data.meta.dateLocale || data.meta.locale || "en-GB";
const imageKeys = () => Object.keys(data.images || {});

/* --- Derived readouts -------------------------------------------- */

function eventDerived(ev) {
  if (!ev.start || !ev.end) return { text: "Set a start and an end time.", bad: true };
  const start = zonedToUTC(ev.start, tz());
  const end = zonedToUTC(ev.end, tz());
  if (!(end > start)) return { text: "The end is not after the start.", bad: true };
  const mins = Math.round((end - start) / 60000);
  const len =
    mins >= 60
      ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}`
      : `${mins}m`;
  return {
    text: `${formatTime(ev.start, tz(), dl())} ${tz()} → ${toUTCStamp(start)} · runs ${len}`,
    bad: false,
  };
}

function leaveDerived() {
  const r = data.calendar?.leaveReminder;
  const first = data.events?.[0];
  if (!r?.enabled || !first?.start) return { text: "Reminder is switched off.", bad: false };
  const day = shiftDays(first.start, -Number(r.daysBefore || 0));
  const over = Number(r.daysBefore) > 28;
  return {
    text:
      `Lands on ${formatDate(day.toISOString().slice(0, 10), "UTC", dl())}` +
      (over ? " — beyond Google's 28-day reminder ceiling" : ""),
    bad: over,
  };
}

function deadlineDerived() {
  const d = data.rsvp?.deadline;
  if (!d) return { text: "", bad: false };
  const left = daysUntil(d, tz());
  const first = data.events?.[0]?.start;
  const late = first && zonedToUTC(d, tz()) >= zonedToUTC(first, tz());
  return {
    text:
      (left >= 0 ? `${left} days from today` : `${-left} days ago — already passed`) +
      (late ? " · falls on or after the ceremony" : ""),
    bad: left < 0 || late,
  };
}

/* --- Field rendering ---------------------------------------------- */

/**
 * Every field reads and writes one path on one object. `scope` is the
 * whole document for plain sections, or a single array item for lists.
 */
function field(scope, f) {
  const wrap = document.createElement("div");
  wrap.className = "f" + (f.wide ? " f--wide" : "") + (f.type === "check" ? " f--check" : "");
  const id = "f" + Math.random().toString(36).slice(2, 9);
  const value = get(scope, f.path);

  const label = `<label for="${id}">${esc(f.label)}</label>`;
  const hint = f.hint ? `<p class="hint">${esc(f.hint)}</p>` : "";
  let control = "";

  switch (f.type) {
    case "textarea":
      control = `<textarea id="${id}" class="${f.tall ? "tall" : ""}">${esc(value)}</textarea>`;
      break;
    case "lines":
      control = `<textarea id="${id}" class="${f.tall ? "tall" : ""}">${esc(
        (value || []).join("\n")
      )}</textarea>`;
      break;
    case "paras":
      control = `<textarea id="${id}" class="tall">${esc((value || []).join("\n\n"))}</textarea>`;
      break;
    case "number":
      control = `<input id="${id}" type="number" value="${esc(value)}" ${
        f.min != null ? `min="${f.min}"` : ""
      } ${f.max != null ? `max="${f.max}"` : ""} ${f.step ? `step="${f.step}"` : ""}>`;
      break;
    case "datetime":
      control = `<input id="${id}" type="datetime-local" value="${esc(
        String(value || "").slice(0, 16)
      )}">`;
      break;
    case "check":
      control = `<input id="${id}" type="checkbox" ${value ? "checked" : ""}>`;
      break;
    case "color":
      control = `<div class="swatch">
        <input type="color" value="${esc(value)}" aria-label="${esc(f.label)} colour picker">
        <input id="${id}" type="text" value="${esc(value)}">
      </div>`;
      break;
    case "select": {
      const opts = (typeof f.options === "function" ? f.options() : f.options)
        .map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const t = typeof o === "string" ? o : o.label;
          return `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(t)}</option>`;
        })
        .join("");
      control = `<select id="${id}">${opts}</select>`;
      break;
    }
    default:
      control = `<input id="${id}" type="${f.type || "text"}" value="${esc(value)}">`;
  }

  const derived = f.derive ? `<p class="derived"></p>` : "";
  wrap.innerHTML =
    f.type === "check" ? control + label : label + control + hint + derived;

  const input = wrap.querySelector(`#${id}`);
  const swatch = wrap.querySelector('input[type="color"]');

  const read = () => {
    switch (f.type) {
      case "check": return input.checked;
      case "number": return input.value === "" ? null : Number(input.value);
      case "lines": return input.value.split("\n");
      case "paras": return input.value.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
      case "datetime": return input.value ? input.value.slice(0, 16) + ":00" : "";
      default: return input.value;
    }
  };

  const refresh = () => {
    if (!f.derive) return;
    const d = f.derive(scope);
    const el = wrap.querySelector(".derived");
    el.textContent = d.text;
    el.dataset.bad = d.bad ? "1" : "0";
  };

  input.addEventListener("input", () => {
    set(scope, f.path, read());
    if (swatch && /^#[0-9a-f]{6}$/i.test(input.value)) swatch.value = input.value;
    refresh();
    touched(f.rerender);
  });

  if (swatch) {
    swatch.addEventListener("input", () => {
      input.value = swatch.value;
      set(scope, f.path, swatch.value);
      touched();
    });
  }

  refresh();
  return wrap;
}

/* --- Repeating lists ---------------------------------------------- */

function list(section) {
  const host = document.createElement("div");
  host.className = "items";
  const arr = get(data, section.list) || [];

  arr.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "item";

    const head = document.createElement("div");
    head.className = "item__head";
    head.innerHTML = `
      <span class="item__label">${esc(section.label(item, i))}</span>
      <span class="item__tools">
        <button class="icon" type="button" data-up   title="Move up"   ${i === 0 ? "disabled" : ""}>&uarr;</button>
        <button class="icon" type="button" data-down title="Move down" ${i === arr.length - 1 ? "disabled" : ""}>&darr;</button>
        <button class="icon icon--danger" type="button" data-del title="Remove">&times;</button>
      </span>`;

    head.querySelector("[data-up]").onclick = () => {
      arr.splice(i - 1, 0, arr.splice(i, 1)[0]); touched(true);
    };
    head.querySelector("[data-down]").onclick = () => {
      arr.splice(i + 1, 0, arr.splice(i, 1)[0]); touched(true);
    };
    head.querySelector("[data-del]").onclick = () => {
      if (!confirm(`Remove “${section.label(item, i)}”?`)) return;
      arr.splice(i, 1); touched(true);
    };
    card.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "grid grid--two";
    section.fields.forEach((f) => grid.appendChild(field(item, f)));

    if (section.media) {
      const media = document.createElement("div");
      media.className = "item__media";
      const src = section.media(item);
      media.innerHTML = `<img src="${esc(src || "")}" alt="" loading="lazy"
        onerror="this.removeAttribute('src')">`;
      media.appendChild(grid);
      card.appendChild(media);
    } else {
      card.appendChild(grid);
    }

    host.appendChild(card);
  });

  const add = document.createElement("button");
  add.className = "btn btn--quiet add";
  add.type = "button";
  add.textContent = section.addLabel || "Add";
  add.onclick = () => {
    (get(data, section.list) || []).push(section.template());
    touched(true);
  };
  host.appendChild(add);

  return host;
}

/* --- The schema ---------------------------------------------------- */

const SPEC = [
  {
    id: "basics",
    title: "Basics",
    note: "Identity and addressing. meta.url feeds the canonical link, the social preview, and the URL written into every calendar entry — set it to your live Pages address before you share the link.",
    fields: [
      { path: "meta.siteTitle", label: "Browser and share title", wide: true },
      { path: "meta.description", label: "Share description", type: "textarea", wide: true,
        hint: "Shown when someone pastes the link into WhatsApp or a message." },
      { path: "meta.url", label: "Live address", type: "url" },
      { path: "meta.ogImage", label: "Share image path" },
      { path: "meta.timezone", label: "Venue timezone",
        hint: "An IANA name, e.g. Asia/Colombo. All times below are read as local to this zone." },
      { path: "meta.locale", label: "Page language (lang attribute)" },
      { path: "meta.dateLocale", label: "Date formatting locale",
        hint: "Kept separate because en-LK resolves to bare en in browsers, which prints the month first. en-GB gives day-month-year." },
      { path: "meta.themeColor", label: "Browser theme colour", type: "color" },
    ],
  },

  {
    id: "couple",
    title: "The couple",
    note: "The two names set in large type, and the line above them.",
    fields: [
      { path: "couple.one.name", label: "First name, line one" },
      { path: "couple.two.name", label: "First name, line two" },
      { path: "couple.one.full", label: "Full name, line one" },
      { path: "couple.two.full", label: "Full name, line two" },
      { path: "couple.invite", label: "Invitation line", type: "textarea", wide: true,
        hint: "Appears above the names, in brass." },
      { path: "couple.dateLine", label: "Date written out (footer)", wide: true },
      { path: "couple.hero", label: "Closing line on the hero", type: "textarea", wide: true },
    ],
  },

  {
    id: "letter",
    title: "The note",
    note: "The letter on the paper panel. Separate paragraphs with a blank line.",
    fields: [
      { path: "letter.heading", label: "Heading", wide: true },
      { path: "letter.body", label: "Paragraphs", type: "paras", wide: true },
      { path: "letter.signoff", label: "Sign-off" },
      { path: "letter.aside", label: "Pull quote beside the letter", type: "textarea", wide: true },
    ],
  },

  {
    id: "events",
    title: "The day",
    note: "Each part of the day becomes its own calendar entry. Times are local to the venue timezone — enter them exactly as they appear on the invitation and the page converts to UTC itself.",
    list: "events",
    addLabel: "Add another part of the day",
    label: (e, i) => `${i + 1}. ${e.name || "Untitled"}`,
    template: () => ({
      id: "event-" + Math.random().toString(36).slice(2, 6),
      name: "", shortName: "", start: "", end: "", note: "", description: "", dress: "",
    }),
    fields: [
      { path: "name", label: "Name", rerender: true },
      { path: "shortName", label: "Short name",
        hint: "Used on the calendar buttons: “Add the poruwa”." },
      { path: "start", label: "Starts", type: "datetime", derive: eventDerived },
      { path: "end", label: "Ends", type: "datetime" },
      { path: "id", label: "Identifier", hint: "Lowercase, no spaces. Used in the calendar file." },
      { path: "dress", label: "Dress" },
      { path: "description", label: "Description", type: "textarea", wide: true },
      { path: "note", label: "Highlighted note", type: "textarea", wide: true,
        hint: "Shown in the brass-ruled box. Leave empty to hide it." },
    ],
  },

  {
    id: "venue",
    title: "Venue",
    fields: [
      { path: "venue.name", label: "Venue name" },
      { path: "venue.hall", label: "Hall or room" },
      { path: "venue.address", label: "Full address", wide: true,
        hint: "Goes into the LOCATION field of every calendar entry." },
      { path: "venue.city", label: "City (shown on the hero)" },
      { path: "venue.image", label: "Photograph", type: "select", options: imageKeys },
      { path: "venue.mapsUrl", label: "Map link", type: "url" },
      { path: "venue.directionsUrl", label: "Directions link", type: "url" },
      { path: "venue.lat", label: "Latitude", type: "number", step: "any" },
      { path: "venue.lng", label: "Longitude", type: "number", step: "any" },
    ],
    sub: {
      title: "Travel notes",
      list: "venue.notes",
      addLabel: "Add a note",
      label: (n, i) => n.title || `Note ${i + 1}`,
      template: () => ({ title: "", text: "" }),
      fields: [
        { path: "title", label: "Heading", rerender: true },
        { path: "text", label: "Note", type: "textarea", wide: true },
      ],
    },
  },

  {
    id: "calendar",
    title: "Calendar and the leave reminder",
    note: "The downloadable .ics file carries the alarms below as real VALARM components. Google's one-click links cannot carry alarms, so the two-week prompt is issued there as its own all-day event instead.",
    fields: [
      { path: "calendar.organizerName", label: "Organiser name" },
      { path: "calendar.organizerEmail", label: "Organiser email", type: "email" },
      { path: "calendar.googleClientId", label: "Google OAuth client ID", wide: true,
        hint: "Optional. Fill this in to offer writing straight into a guest's Google Calendar. Leave empty and that button never appears." },
      { path: "calendar.leaveReminder.enabled", label: "Send a reminder to arrange leave from work", type: "check", wide: true },
      { path: "calendar.leaveReminder.daysBefore", label: "Days before the ceremony",
        type: "number", min: 1, max: 28, derive: leaveDerived,
        hint: "Google caps reminders at 28 days (40320 minutes)." },
      { path: "calendar.leaveReminder.title", label: "Reminder title" },
      { path: "calendar.leaveReminder.description", label: "Reminder body, one line each",
        type: "lines", tall: true, wide: true,
        hint: "Blank lines are kept. Bullets are just characters — • works fine." },
    ],
    sub: {
      title: "Alarms on each part of the day",
      note: "ISO 8601 durations, negative meaning before the start: -P14D is fourteen days, -PT2H is two hours.",
      list: "calendar.alarms",
      addLabel: "Add an alarm",
      label: (a, i) => a.trigger || `Alarm ${i + 1}`,
      template: () => ({ trigger: "-P1D", label: "" }),
      fields: [
        { path: "trigger", label: "When", rerender: true },
        { path: "label", label: "What it says", wide: true },
      ],
    },
  },

  {
    id: "rsvp",
    title: "Replies",
    note: "GitHub Pages cannot receive a form post, so replies go to an endpoint you own — Formspree, Basin, Getform, or a Google Apps Script. Leave it empty and the form still works, but the confirmation tells the guest nothing is being collected.",
    fields: [
      { path: "rsvp.endpoint", label: "Form endpoint", type: "url", wide: true,
        hint: "Anything that accepts a JSON POST." },
      { path: "rsvp.deadline", label: "Replies close", type: "datetime", derive: deadlineDerived },
      { path: "rsvp.maxGuests", label: "Largest party allowed", type: "number", min: 1, max: 20 },
      { path: "rsvp.heading", label: "Section heading" },
      { path: "rsvp.intro", label: "Intro line", type: "textarea", wide: true },
    ],
    sub: {
      title: "Answer options",
      list: "rsvp.attendance",
      addLabel: "Add an answer",
      label: (a, i) => a.label || `Answer ${i + 1}`,
      template: () => ({ value: "", label: "" }),
      fields: [
        { path: "value", label: "Stored value", hint: "What arrives in your inbox." },
        { path: "label", label: "What the guest sees", rerender: true },
      ],
    },
    sub2: {
      title: "Meal options",
      list: "rsvp.meals",
      addLabel: "Add a meal option",
      label: (m, i) => m.label || `Option ${i + 1}`,
      template: () => ({ value: "", label: "" }),
      fields: [
        { path: "value", label: "Stored value" },
        { path: "label", label: "What the guest sees", rerender: true },
      ],
    },
  },

  {
    id: "gallery",
    title: "Photographs",
    note: "Pick from the files in assets/img. Alt text is read aloud by screen readers; the caption is printed under the photograph.",
    list: "gallery",
    addLabel: "Add a photograph",
    label: (g, i) => `${i + 1}. ${g.caption || g.src || "Untitled"}`,
    template: () => ({ src: imageKeys()[0] || "", alt: "", caption: "" }),
    media: (g) => data.images?.[g.src]?.jpg,
    fields: [
      { path: "src", label: "File", type: "select", options: imageKeys, rerender: true },
      { path: "caption", label: "Caption", rerender: true },
      { path: "alt", label: "Alt text", type: "textarea", wide: true },
    ],
  },

  {
    id: "faq",
    title: "Questions",
    list: "faq",
    addLabel: "Add a question",
    label: (f, i) => f.q || `Question ${i + 1}`,
    template: () => ({ q: "", a: "" }),
    fields: [
      { path: "q", label: "Question", wide: true, rerender: true },
      { path: "a", label: "Answer", type: "textarea", wide: true },
    ],
  },

  {
    id: "contacts",
    title: "Who to call",
    list: "contacts",
    addLabel: "Add a contact",
    label: (c, i) => c.name || `Contact ${i + 1}`,
    template: () => ({ name: "", role: "", phone: "" }),
    fields: [
      { path: "name", label: "Name", rerender: true },
      { path: "phone", label: "Phone" },
      { path: "role", label: "What they handle", wide: true },
    ],
  },

  { id: "assets", title: "Image files", assets: true,
    note: "Generated by the tools, not edited here. Drop new photographs into assets/img keeping the same names, then run python3 tools/sync-lqip.py to refresh the dimensions and blur placeholders." },
];

/* --- Checks -------------------------------------------------------- */

function runChecks() {
  const out = [];
  const fix = (text, id) => out.push({ kind: "fix", text, id });
  const note = (text, id) => out.push({ kind: "note", text, id });

  if (/example\.(com|github\.io)/.test(data.meta.url || ""))
    note("The live address is still the placeholder. Calendar entries and the share preview will point at nothing.", "basics");
  if (!data.rsvp.endpoint)
    note("No form endpoint, so replies are not being collected anywhere.", "rsvp");
  if (!data.calendar.organizerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.calendar.organizerEmail))
    note("The organiser email is missing or malformed. It is written into every calendar entry.", "calendar");

  const ids = new Set();
  (data.events || []).forEach((e, i) => {
    const n = e.name || `Event ${i + 1}`;
    if (!e.start || !e.end) fix(`“${n}” is missing a start or end time.`, "events");
    else if (!(zonedToUTC(e.end, tz()) > zonedToUTC(e.start, tz())))
      fix(`“${n}” ends before it starts.`, "events");
    if (!e.id) fix(`“${n}” has no identifier.`, "events");
    else if (ids.has(e.id)) fix(`Two parts of the day share the identifier “${e.id}”.`, "events");
    else ids.add(e.id);
  });
  if (!(data.events || []).length) fix("There are no parts of the day, so there is nothing to add to a calendar.", "events");

  const d = deadlineDerived();
  if (d.bad) fix(`Reply deadline: ${d.text}.`, "rsvp");
  const l = leaveDerived();
  if (l.bad) fix(l.text + ".", "calendar");

  const keys = new Set(imageKeys());
  (data.gallery || []).forEach((g, i) => {
    if (!keys.has(g.src)) fix(`Photograph ${i + 1} points at “${g.src}”, which is not in assets/img.`, "gallery");
    if (!g.alt) note(`Photograph ${i + 1} has no alt text.`, "gallery");
  });
  if (!keys.has(data.venue.image)) fix(`The venue photograph “${data.venue.image}” is not in assets/img.`, "venue");

  (data.contacts || []).forEach((c, i) => {
    if (!c.phone) note(`${c.name || `Contact ${i + 1}`} has no phone number.`, "contacts");
  });

  return out;
}

/* --- Rendering ------------------------------------------------------ */

function subPanel(spec) {
  const box = document.createElement("div");
  box.style.marginTop = "1.4rem";
  box.innerHTML =
    `<h3 style="font-size:.85rem;font-weight:700;margin-bottom:.2rem">${esc(spec.title)}</h3>` +
    (spec.note ? `<p class="panel__note" style="margin-bottom:.7rem">${esc(spec.note)}</p>` : "");
  box.appendChild(list(spec));
  return box;
}

function render() {
  const form = $("#form");
  form.textContent = "";

  for (const section of SPEC) {
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "s-" + section.id;
    panel.innerHTML =
      `<div class="panel__head"><h2>${esc(section.title)}</h2></div>` +
      (section.note ? `<p class="panel__note">${esc(section.note)}</p>` : "");

    if (section.assets) {
      const grid = document.createElement("div");
      grid.className = "assets";
      grid.innerHTML = Object.entries(data.images || {})
        .map(
          ([k, v]) => `<figure class="asset">
            <img src="${esc(v.jpg)}" alt="" loading="lazy">
            <p><b>${esc(k)}</b><span>${v.width}&thinsp;&times;&thinsp;${v.height}</span></p>
          </figure>`
        )
        .join("");
      panel.appendChild(grid);
    } else if (section.list) {
      panel.appendChild(list(section));
    } else {
      const grid = document.createElement("div");
      grid.className = "grid grid--two";
      section.fields.forEach((f) => grid.appendChild(field(data, f)));
      panel.appendChild(grid);
    }

    if (section.sub) panel.appendChild(subPanel(section.sub));
    if (section.sub2) panel.appendChild(subPanel(section.sub2));

    form.appendChild(panel);
  }

  renderNav();
  renderChecks();
  renderRaw();
}

function renderNav() {
  $("#nav").innerHTML = SPEC.map((s) => {
    const n = s.list ? (get(data, s.list) || []).length : s.assets ? imageKeys().length : "";
    return `<a href="#s-${s.id}">${esc(s.title)}${n !== "" ? `<b>${n}</b>` : ""}</a>`;
  }).join("");
}

function renderChecks() {
  const items = runChecks();
  const pill = $("#checks-pill");
  const panel = $("#checks");

  pill.hidden = items.length === 0;
  $("#checks-count").textContent = items.length;
  pill.dataset.state = items.some((i) => i.kind === "fix") ? "error" : "ok";

  panel.hidden = items.length === 0;
  $("#checks-list").innerHTML = items
    .map(
      (i) => `<li data-kind="${i.kind}">
        <b>${i.kind === "fix" ? "Fix" : "Note"}</b>
        <span><a href="#s-${i.id}">${esc(i.text)}</a></span>
      </li>`
    )
    .join("");
}

const serialise = () => JSON.stringify(data, null, 2) + "\n";

function renderRaw() {
  const pre = $("#raw");
  if (!pre.hidden) pre.textContent = serialise();
}

/* --- State ---------------------------------------------------------- */

function touched(rerender = false) {
  $("#dirty").hidden = serialise() === pristine;
  if (rerender) render();
  else { renderChecks(); renderNav(); renderRaw(); }
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 2600);
}

function adopt(json, label) {
  data = json;
  data.meta.dateLocale = data.meta.dateLocale || data.meta.locale;
  pristine = serialise();
  sourceLabel = label;
  $("#source").textContent = label;
  $("#dirty").hidden = true;
  render();
}

/* --- Wiring ---------------------------------------------------------- */

$("#download").addEventListener("click", () => {
  const blob = new Blob([serialise()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wedding.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  pristine = serialise();
  $("#dirty").hidden = true;
  toast("Downloaded. Replace data/wedding.json with it and commit.");
});

$("#load").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed.meta || !parsed.events) throw new Error("not an invitation file");
    adopt(parsed, `from ${file.name}`);
    toast("Loaded " + file.name);
  } catch (err) {
    alert(`That file could not be read as an invitation: ${err.message}`);
  }
  e.target.value = "";
});

$("#revert").addEventListener("click", async () => {
  if (!confirm("Discard every change and reload from data/wedding.json?")) return;
  await boot();
  toast("Reloaded from data/wedding.json");
});

$("#raw-toggle").addEventListener("click", (e) => {
  const pre = $("#raw");
  pre.hidden = !pre.hidden;
  e.target.textContent = pre.hidden ? "Show" : "Hide";
  e.target.setAttribute("aria-expanded", String(!pre.hidden));
  renderRaw();
});

addEventListener("beforeunload", (e) => {
  if (!$("#dirty").hidden) e.preventDefault();
});

/* --- Sticky furniture -------------------------------------------------
   The bar and the section strip are both sticky and both change height
   with the width of the screen, so their real heights are measured and
   handed to the CSS: one for where the strip sits, one for how far a
   jump to a section has to clear. */
function measureSticky() {
  const bar = $(".bar");
  const nav = $(".nav");
  const root = document.documentElement;
  const barH = bar?.offsetHeight || 0;
  // Above 60rem the nav is a sidebar, not a strip sitting under the bar
  const stacked = nav && getComputedStyle(nav).position === "sticky" &&
    window.matchMedia("(max-width: 60rem)").matches;

  root.style.setProperty("--bar-h", `${barH}px`);
  root.style.setProperty("--sticky-h", `${barH + (stacked ? nav.offsetHeight : 0)}px`);
}

if (window.ResizeObserver) {
  const ro = new ResizeObserver(measureSticky);
  ro.observe(document.body);
}
addEventListener("resize", measureSticky, { passive: true });

// Mark the section currently in view, and keep its chip on screen when the
// sections are a sideways-scrolling strip rather than a sidebar.
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      document.querySelectorAll(".nav a").forEach((a) => {
        const current = a.getAttribute("href") === "#" + entry.target.id;
        a.classList.toggle("is-current", current);
        if (current && a.parentElement.scrollWidth > a.parentElement.clientWidth) {
          a.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        }
      });
    }
  },
  { rootMargin: "-20% 0px -70%" }
);

const observeSections = () =>
  document.querySelectorAll(".panel[id]").forEach((p) => spy.observe(p));

async function boot() {
  const res = await fetch(new URL("data/wedding.json", document.baseURI), { cache: "no-cache" });
  if (!res.ok) throw new Error(`wedding.json returned ${res.status}`);
  adopt(await res.json(), "from data/wedding.json");
  observeSections();
  measureSticky();
}

boot().catch((err) => {
  $("#source").textContent = "could not load data/wedding.json";
  $("#form").innerHTML = `<section class="panel">
    <h2>Nothing to edit yet</h2>
    <p class="panel__note">${esc(err.message)}. The editor reads the file over HTTP, so it needs a
    local server rather than being opened straight from the filesystem — run
    <code>python3 -m http.server 8000</code> in the project folder and open
    <code>http://localhost:8000/editor.html</code>. You can also use <em>Open a file</em> above to
    load a copy of wedding.json from your computer.</p>
  </section>`;
});
