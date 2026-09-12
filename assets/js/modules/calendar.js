/* ---------------------------------------------------------------
   Calendar.

   Three ways into a guest's calendar, in order of richness:

   1. .ics download  — every event plus the two-week and one-day
      alarms, written as real VALARM components. Works in Apple
      Calendar, Outlook, Thunderbird, and Google via import.
   2. Google template links — one click, no sign-in. These cannot
      carry alarms, so the two-week leave prompt is issued as its
      own all-day event instead of as a reminder on the wedding.
   3. Google Calendar API — only when calendar.googleClientId is
      set. Writes directly, with a popup reminder at 20160 minutes
      (exactly fourteen days, inside Google's 40320 ceiling).
   --------------------------------------------------------------- */

import {
  zonedToUTC, toUTCStamp, toLocalStamp, toDateStamp, shiftDays,
} from "./dates.js";

/* --- RFC 5545 plumbing ------------------------------------------ */

const escapeText = (s) =>
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

/** Content lines are limited to 75 octets; continuations start with a space. */
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const out = [];
  let chunk = "";
  let size = 0;
  let limit = 75;

  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > limit) {
      out.push(chunk);
      chunk = " " + ch;
      size = 1 + n;
      limit = 74;
    } else {
      chunk += ch;
      size += n;
    }
  }
  out.push(chunk);
  return out.join("\r\n");
}

const uid = (slug, host) =>
  `${slug}-${Math.random().toString(36).slice(2, 9)}@${host}`;

/* --- Event shapes ----------------------------------------------- */

/**
 * Normalises the JSON into calendar-ready descriptors, and appends the
 * leave reminder as an all-day event of its own.
 */
export function buildEntries(config) {
  const tz = config.meta.timezone;
  const { venue, calendar, events } = config;
  const location = `${venue.name}, ${venue.address}`;

  const entries = events.map((ev) => ({
    id: ev.id,
    allDay: false,
    title: `${ev.name} — ${config.couple.one.name} & ${config.couple.two.name}`,
    shortName: ev.shortName || ev.name,
    startLocal: ev.start,
    endLocal: ev.end,
    start: zonedToUTC(ev.start, tz),
    end: zonedToUTC(ev.end, tz),
    description: [ev.description, ev.note, "", `Dress: ${ev.dress}`, config.meta.url]
      .filter((x) => x !== undefined)
      .join("\n"),
    location,
    alarms: calendar.alarms || [],
  }));

  const reminder = calendar.leaveReminder;
  if (reminder && reminder.enabled && events.length) {
    const firstDay = events[0].start;
    const day = shiftDays(firstDay, -reminder.daysBefore);
    entries.push({
      id: "leave-reminder",
      allDay: true,
      title: reminder.title,
      shortName: "Leave reminder",
      startDate: day,
      endDate: new Date(day.getTime() + 86400000),
      description: [].concat(reminder.description, "", config.meta.url).join("\n"),
      location,
      // Fires at 9am on the day it lands, rather than silently at midnight.
      alarms: [{ trigger: "PT9H", label: reminder.title }],
    });
  }

  return entries;
}

/* --- 1. ICS ------------------------------------------------------ */

export function buildICS(config, entries) {
  const host = (() => {
    try { return new URL(config.meta.url).hostname; } catch { return "wedding.invalid"; }
  })();
  const stamp = toUTCStamp(new Date());
  const org = config.calendar;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeText(org.organizerName)}//Wedding//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(config.meta.siteTitle)}`,
    `X-WR-TIMEZONE:${config.meta.timezone}`,
  ];

  for (const e of entries) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid(e.id, host)}`,
      `DTSTAMP:${stamp}`,
      e.allDay
        ? `DTSTART;VALUE=DATE:${toDateStamp(e.startDate)}`
        : `DTSTART:${toUTCStamp(e.start)}`,
      e.allDay
        ? `DTEND;VALUE=DATE:${toDateStamp(e.endDate)}`
        : `DTEND:${toUTCStamp(e.end)}`,
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      `LOCATION:${escapeText(e.location)}`,
      `URL:${escapeText(config.meta.url)}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE"
    );

    if (org.organizerEmail) {
      lines.push(
        `ORGANIZER;CN=${escapeText(org.organizerName)}:mailto:${org.organizerEmail}`
      );
    }

    for (const alarm of e.alarms) {
      lines.push(
        "BEGIN:VALARM",
        `TRIGGER:${alarm.trigger}`,
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(alarm.label)}`,
        "END:VALARM"
      );
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadICS(config, entries, filename) {
  const blob = new Blob([buildICS(config, entries)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* --- 2. Google template links ------------------------------------ */

export function googleUrl(config, entry) {
  const p = new URLSearchParams();
  p.set("action", "TEMPLATE");
  p.set("text", entry.title);
  p.set("details", entry.description);
  p.set("location", entry.location);

  if (entry.allDay) {
    p.set("dates", `${toDateStamp(entry.startDate)}/${toDateStamp(entry.endDate)}`);
  } else {
    // Floating local time plus ctz keeps the event at the venue's clock
    // regardless of where the guest's Google account thinks it lives.
    p.set("dates", `${toLocalStamp(entry.startLocal)}/${toLocalStamp(entry.endLocal)}`);
    p.set("ctz", config.meta.timezone);
  }

  return "https://calendar.google.com/calendar/render?" + p.toString();
}

/* --- 3. Google Calendar API (optional) ---------------------------- */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

let gisReady = null;

function loadGIS() {
  if (gisReady) return gisReady;
  gisReady = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google sign-in could not be reached."));
    document.head.appendChild(s);
  });
  return gisReady;
}

export function canUseGoogleApi(config) {
  return Boolean(config.calendar.googleClientId);
}

function requestToken(clientId) {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (res) =>
        res.access_token
          ? resolve(res.access_token)
          : reject(new Error("Google did not return access.")),
      error_callback: () => reject(new Error("Google sign-in was cancelled.")),
    });
    client.requestAccessToken();
  });
}

function toApiEvent(config, entry) {
  const tz = config.meta.timezone;
  const body = {
    summary: entry.title,
    description: entry.description,
    location: entry.location,
    source: { title: config.meta.siteTitle, url: config.meta.url },
  };

  if (entry.allDay) {
    body.start = { date: toDateStamp(entry.startDate) };
    body.end = { date: toDateStamp(entry.endDate) };
    body.reminders = { useDefault: false, overrides: [{ method: "popup", minutes: 540 }] };
  } else {
    body.start = { dateTime: entry.startLocal, timeZone: tz };
    body.end = { dateTime: entry.endLocal, timeZone: tz };
    const days = config.calendar.leaveReminder?.daysBefore ?? 14;
    body.reminders = {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: Math.min(days * 1440, 40320) },
        { method: "popup", minutes: 1440 },
      ],
    };
  }

  return body;
}

/** Writes every entry straight into the signed-in guest's calendar. */
export async function insertViaApi(config, entries) {
  await loadGIS();
  const token = await requestToken(config.calendar.googleClientId);

  for (const entry of entries) {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toApiEvent(config, entry)),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google rejected the event (${res.status}). ${detail.slice(0, 120)}`);
    }
  }
}
