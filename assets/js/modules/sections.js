/* ---------------------------------------------------------------
   Two optional sections, written once so every theme gets the same
   behaviour and the same wording.

   Both are genuinely optional: leave them out of wedding.json and
   nothing appears — no heading, no empty band, no gap. A template
   that renders an empty section when the couple skipped it is the
   most common way these pages look unfinished.
   --------------------------------------------------------------- */

import { esc } from "./render.js";

/* --- Our story ---------------------------------------------------
   Three to five moments, each with a date and a line. Any more and it
   stops being an invitation and starts being an autobiography. */

export function storyHTML(c) {
  if (!c.story?.length) return "";
  return `
    <ol class="story">
      ${c.story
        .map(
          (m) => `
        <li>
          <p class="story__when">${esc(m.date)}</p>
          <div>
            <h3>${esc(m.title)}</h3>
            <p>${esc(m.body)}</p>
          </div>
        </li>`
        )
        .join("")}
    </ol>`;
}

/* --- Gifts -------------------------------------------------------
   Behind a tap, always. Two reasons, and the second is the one people
   forget: asking is delicate enough that it should not be the thing a
   guest reads on the way past, and an account number displayed inline
   ends up in every screenshot the invitation is forwarded as. */

export function giftsHTML(c) {
  const gifts = c.gifts;
  if (!gifts?.enabled) return "";

  const bank = gifts.bank;
  const rows = bank
    ? [
        ["Bank", bank.bankName],
        ["Account name", bank.accountName],
        ["Account number", bank.accountNumber],
        ["Branch", bank.branch],
      ].filter(([, v]) => v)
    : [];

  return `
    <div class="gifts">
      ${gifts.message ? `<p class="gifts__note">${esc(gifts.message)}</p>` : ""}
      ${
        rows.length
          ? `<details class="gifts__details">
               <summary>${esc(gifts.buttonText || "View the bank details")}</summary>
               <div>
                 <dl class="gifts__list">
                   ${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}
                 </dl>
                 <button class="btn btn--quiet" type="button"
                         data-copy="${esc(bank.accountNumber)}">
                   <span>Copy the account number</span>
                 </button>
               </div>
             </details>`
          : ""
      }
      ${
        gifts.registryUrl
          ? `<p><a class="btn btn--quiet" href="${esc(gifts.registryUrl)}"
                   target="_blank" rel="noopener"><span>${esc(
                     gifts.registryText || "See the registry"
                   )}</span></a></p>`
          : ""
      }
    </div>`;
}

/** Copy-to-clipboard for the account number — typing it out is error-prone. */
export function initGifts(root) {
  for (const button of root.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      const span = button.querySelector("span");
      const was = span.textContent;
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        span.textContent = "Copied";
      } catch {
        // Clipboard refused — usually an insecure origin. Say so rather
        // than claiming success the guest can't verify.
        span.textContent = "Copy it by hand — the number is above";
      }
      setTimeout(() => (span.textContent = was), 2500);
    });
  }
}
