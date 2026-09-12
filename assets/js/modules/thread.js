/* ---------------------------------------------------------------
   The thread.

   A single brass line fills as the page is read. It is the only
   ambient motion outside the hero, and it does the job that a dozen
   fade-up section reveals would otherwise be doing badly.
   --------------------------------------------------------------- */

export function initThread(el) {
  if (!el) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.style.setProperty("--thread-progress", "1");
    return;
  }

  let ticking = false;

  const measure = () => {
    ticking = false;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;
    const travelled = window.innerHeight * 0.82 - rect.top;
    const progress = Math.min(Math.max(travelled / rect.height, 0), 1);
    el.style.setProperty("--thread-progress", progress.toFixed(4));
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
