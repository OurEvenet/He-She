/* ---------------------------------------------------------------
   Sharing.

   Half the guests will be sent this link by another guest, on a phone,
   in a chat. navigator.share hands that to the operating system's own
   sheet — WhatsApp, Messages, AirDrop — and where it does not exist the
   link goes to the clipboard instead. If neither is available the
   button never appears at all, rather than sitting there doing nothing.
   --------------------------------------------------------------- */

export function initShare(root, config) {
  const buttons = [...root.querySelectorAll("[data-share]")];
  if (!buttons.length) return;

  const canShare = typeof navigator.share === "function";
  const canCopy = Boolean(navigator.clipboard?.writeText) && window.isSecureContext;
  if (!canShare && !canCopy) return;

  // The address the guest is actually on, not the one in the JSON: sharing
  // a still-placeholder meta.url would send everyone nowhere.
  const url = /^https?:/.test(location.href)
    ? location.href.split("#")[0]
    : (() => {
        try { return new URL(config.meta.url).href; } catch { return location.href; }
      })();

  const payload = {
    title: config.meta.siteTitle,
    text: config.meta.description,
    url,
  };

  for (const button of buttons) {
    const label = button.querySelector("span") || button;
    const original = label.textContent;
    button.hidden = false;

    button.addEventListener("click", async () => {
      if (canShare) {
        try {
          await navigator.share(payload);
          return;
        } catch (err) {
          // A cancelled sheet is not a failure — say nothing and stop.
          if (err?.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        label.textContent = "Link copied";
        setTimeout(() => (label.textContent = original), 2200);
      } catch {
        label.textContent = "Could not copy — long-press the address bar";
        setTimeout(() => (label.textContent = original), 3200);
      }
    });
  }
}
