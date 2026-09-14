/* ---------------------------------------------------------------
   The countdown.

   Days, hours, minutes to the ceremony. Every invitation template
   has one, and for good reason: it is the one number on the page
   that answers "is this soon?" without arithmetic.

   It counts to the ceremony in the venue's timezone, not the
   reader's, so a guest in London and a guest in Colombo see the
   same number of days to the same moment.

   Once the day has passed it stops counting and says so, rather
   than running negative, which is the failure every hand-rolled
   countdown eventually has.
   --------------------------------------------------------------- */

import { zonedToUTC } from "./dates.js";

const UNITS = [
  ["days", 86400000],
  ["hours", 3600000],
  ["minutes", 60000],
];

/** The markup a theme drops in wherever it wants the clock. */
export function countdownHTML(label = "until the ceremony") {
  return `
    <div class="countdown" data-countdown-clock role="timer" aria-live="off">
      ${UNITS.map(
        ([unit]) => `
        <div class="countdown__unit">
          <b data-unit="${unit}">–</b>
          <span>${unit}</span>
        </div>`
      ).join("")}
      <p class="countdown__label">${label}</p>
    </div>`;
}

export function initCountdown(root, config) {
  const clocks = [...root.querySelectorAll("[data-countdown-clock]")];
  if (!clocks.length || !config.events?.length) return;

  const target = zonedToUTC(config.events[0].start, config.meta.timezone).getTime();

  const paint = () => {
    let left = target - Date.now();

    if (left <= 0) {
      for (const clock of clocks) {
        clock.classList.add("is-done");
        clock.innerHTML = '<p class="countdown__label">The day is here.</p>';
      }
      return true;                       // nothing left to tick
    }

    for (const clock of clocks) {
      let rest = left;
      for (const [unit, ms] of UNITS) {
        const value = Math.floor(rest / ms);
        rest -= value * ms;
        const cell = clock.querySelector(`[data-unit="${unit}"]`);
        if (cell) cell.textContent = String(value).padStart(2, "0");
      }
    }
    return false;
  };

  if (paint()) return;

  // A minute is the smallest unit shown, so a minute is how often it is
  // worth waking up. Anything faster is a battery cost for nothing.
  const tick = setInterval(() => {
    if (paint()) clearInterval(tick);
  }, 60000);

  // A phone that has been asleep comes back with a stale clock
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) paint();
  });
}
