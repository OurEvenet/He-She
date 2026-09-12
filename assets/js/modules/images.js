/* ---------------------------------------------------------------
   Images.

   Every frame carries its aspect ratio and a 20px blur placeholder
   from wedding.json, so the layout is final before a single photo
   arrives and nothing shifts.

   Loading is driven by a scroll sweep rather than IntersectionObserver.
   An observer only reports *changes* in intersection, so an element
   jumped over inside a single frame — an anchor link, a restored
   scroll position, a fast flick on a phone — is never reported as
   intersecting and its photograph never loads. Sweeping the remaining
   frames on each animation frame is deterministic, and the work
   shrinks to nothing as the set empties.
   --------------------------------------------------------------- */

const MARGIN = 500; // start loading this far below the fold

/** Markup for one lazily-loaded photograph. */
export function frameHTML(image, alt, { eager = false, sizes = "100vw", className = "" } = {}) {
  if (!image) return "";
  const attrs = eager
    ? 'loading="eager" fetchpriority="high" decoding="async"'
    : 'loading="lazy" decoding="async"';
  const src = eager ? "src" : "data-src";
  const srcset = eager ? "srcset" : "data-srcset";

  return `
    <div class="frame${eager ? " is-eager" : ""}${className ? " " + className : ""}"
         style="--ar:${image.width} / ${image.height}; --lqip:url('${image.lqip}')">
      <picture>
        <source type="image/webp" ${srcset}="${image.webp}">
        <img ${src}="${image.jpg}" alt="${alt}" width="${image.width}"
             height="${image.height}" sizes="${sizes}" ${attrs}>
      </picture>
    </div>`;
}

function reveal(frame) {
  const img = frame.querySelector("img");
  if (!img) return;
  const source = frame.querySelector("source");

  // Never leave a blur stuck, even if a file is missing.
  const done = () => frame.classList.add("is-loaded");
  img.addEventListener("load", done, { once: true });
  img.addEventListener("error", done, { once: true });

  if (source?.dataset.srcset) {
    source.srcset = source.dataset.srcset;
    delete source.dataset.srcset;
  }
  if (img.dataset.src) {
    img.src = img.dataset.src;
    delete img.dataset.src;
  }

  if (img.complete && img.naturalWidth) done();
}

export function initImages(root = document) {
  const pending = new Set(root.querySelectorAll(".frame"));
  let ticking = false;

  const sweep = () => {
    ticking = false;
    for (const frame of pending) {
      // top < fold covers both "coming into view" and "already scrolled
      // past", which is the case an observer misses.
      if (frame.getBoundingClientRect().top < window.innerHeight + MARGIN) {
        pending.delete(frame);
        reveal(frame);
      }
    }
    if (!pending.size) {
      removeEventListener("scroll", request);
      removeEventListener("resize", request);
    }
  };

  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(sweep);
  };

  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request, { passive: true });
  sweep();
}
