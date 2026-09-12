/* ---------------------------------------------------------------
   Dates.

   Times in wedding.json are written as local wall-clock time in the
   venue's timezone ("2027-02-20T09:12:00" + "Asia/Colombo"), because
   that is how a person reads an invitation. Calendars need UTC. The
   conversion below uses Intl rather than a timezone library, so the
   page ships no dependencies and still handles offsets correctly for
   a guest whose device is set to any zone.
   --------------------------------------------------------------- */

/** Offset, in ms, of `timeZone` from UTC at the given instant. */
function offsetAt(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);

  const p = {};
  for (const { type, value } of parts) p[type] = value;

  const asIfUTC = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour), Number(p.minute), Number(p.second)
  );
  return asIfUTC - instant.getTime();
}

/**
 * "2027-02-20T09:12:00" in Asia/Colombo -> the correct UTC instant.
 * Two passes, because the offset itself depends on the instant.
 */
export function zonedToUTC(localISO, timeZone) {
  const [datePart, timePart = "00:00:00"] = String(localISO).split("T");
  const [Y, M, D] = datePart.split("-").map(Number);
  const [h = 0, m = 0, s = 0] = timePart.split(":").map(Number);

  const naive = Date.UTC(Y, M - 1, D, h, m, s);
  let guess = naive;
  for (let i = 0; i < 2; i++) {
    guess = naive - offsetAt(new Date(guess), timeZone);
  }
  return new Date(guess);
}

const pad = (n) => String(n).padStart(2, "0");

/** 20270220T034200Z — the form both ICS and Google expect. */
export function toUTCStamp(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) + "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) + "Z"
  );
}

/** 20270220T091200 — floating local time, paired with a ctz parameter. */
export function toLocalStamp(localISO) {
  return String(localISO).replace(/[-:]/g, "").replace(/\.\d+$/, "");
}

/** 20270206 — for all-day VALUE=DATE events. */
export function toDateStamp(date) {
  return (
    date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate())
  );
}

/** Calendar day N days before a local ISO date, still as a plain date. */
export function shiftDays(localISO, days) {
  const [Y, M, D] = String(localISO).split("T")[0].split("-").map(Number);
  return new Date(Date.UTC(Y, M - 1, D + days));
}

/* --- Display formatting ----------------------------------------- */

export function formatTime(localISO, timeZone, locale) {
  return new Intl.DateTimeFormat([locale, "en-GB"], {
    timeZone, hour: "numeric", minute: "2-digit", hour12: true,
  })
    .format(zonedToUTC(localISO, timeZone))
    .replace(":", ".")                                  // 9.12, as written locally
    .replace(/\s?([AP])M/i, (_, x) => " " + x.toLowerCase() + ".m.");
}

export function formatDate(localISO, timeZone, locale, opts = {}) {
  // en-LK is not in every browser's locale set; en-GB keeps day-month-year
  // order rather than falling back to the American sequence.
  return new Intl.DateTimeFormat([locale, "en-GB"], {
    timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric",
    ...opts,
  }).format(zonedToUTC(localISO, timeZone));
}

/** Whole days from now until a local ISO instant. Negative once passed. */
export function daysUntil(localISO, timeZone) {
  const ms = zonedToUTC(localISO, timeZone).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}
