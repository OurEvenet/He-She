/* ---------------------------------------------------------------
   The thread.

   A single brass line fills as the page is read. It is the only
   ambient motion outside the hero, and it does the job that a dozen
   fade-up section reveals would otherwise be doing badly.

   On a narrow screen there is no margin to hang a thread in, so the
   same progress is drawn as a hairline across the top of the screen
   instead. Both are fed from here: one measurement, two readouts.
   --------------------------------------------------------------- */

export function initThread(el, progress) {
  // Asked to sit still: the thread is simply drawn whole, and the
  // hairline never appears, rather than both twitching as you scroll.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el?.style.setProperty("--thread-progress", "1");
    if (progress) progress.hidden = true;
    return;
  }

  let ticking = false;

  const measure = () => {
    ticking = false;

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        const travelled = window.innerHeight * 0.82 - rect.top;
        const progressed = Math.min(Math.max(travelled / rect.height, 0), 1);
        el.style.setProperty("--thread-progress", progressed.toFixed(4));
      }
    }

    if (progress) {
      // How far through the document, rather than how far down the thread:
      // on a phone the reader wants "am I nearly done", not decoration.
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const read = room > 0 ? Math.min(Math.max(window.scrollY / room, 0), 1) : 0;
      progress.style.setProperty("--read-progress", read.toFixed(4));
      progress.classList.toggle("is-lit", window.scrollY > 24);
    }
  };

  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(measure);
  };

  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request, { passive: true });
  measure();
}
