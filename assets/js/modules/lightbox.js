/* ---------------------------------------------------------------
   Lightbox.

   On a phone the gallery is two photographs wide, which is a decent
   contact sheet and a poor way to actually look at anything. Tapping
   a frame opens it full screen, where it can be swiped through and
   read with its caption.

   Built on <dialog>, so the top layer, the backdrop, the Escape key
   and returning focus to the frame that was tapped all come from the
   platform rather than from us. Where <dialog> is not available the
   frames are unwrapped back into plain figures and nothing is lost
   but the enlargement.
   --------------------------------------------------------------- */

export function initLightbox(dialog, root, config) {
  const triggers = [...root.querySelectorAll("[data-photo]")];
  if (!triggers.length) return;

  // Safari before 15.4, and anything else without the modal dialog:
  // give the photographs back as figures rather than dead buttons.
  if (!dialog || typeof dialog.showModal !== "function") {
    for (const button of triggers) button.replaceWith(...button.childNodes);
    return;
  }

  // A gallery entry pointing at a file that is not in assets/img has no
  // image to show, so it is dropped here — and the button that was built
  // for it is dropped with it, rather than opening the wrong photograph.
  const photos = config.gallery
    .map((g, i) => ({ ...g, image: config.images[g.src], at: i }))
    .filter((g) => g.image);
  if (!photos.length) return;

  let index = 0;

  dialog.innerHTML = `
    <div class="lightbox__bar">
      <span data-count></span>
      <button class="lightbox__close" type="button" data-close aria-label="Close">&times;</button>
    </div>
    <div class="lightbox__stage">
      <picture>
        <source type="image/webp" data-webp>
        <img alt="" decoding="async">
      </picture>
    </div>
    <div class="lightbox__foot">
      <p class="lightbox__caption" data-caption></p>
      <div class="lightbox__nav">
        <button class="btn btn--quiet" type="button" data-prev>Previous</button>
        <button class="btn btn--quiet" type="button" data-next>Next</button>
      </div>
    </div>`;

  const img = dialog.querySelector("img");
  const source = dialog.querySelector("[data-webp]");
  const caption = dialog.querySelector("[data-caption]");
  const count = dialog.querySelector("[data-count]");

  const show = (next) => {
    index = (next + photos.length) % photos.length;
    const photo = photos[index];
    source.srcset = photo.image.webp;
    img.src = photo.image.jpg;
    img.width = photo.image.width;
    img.height = photo.image.height;
    img.alt = photo.alt || photo.caption || "";
    caption.textContent = photo.caption || "";
    count.textContent = `${index + 1} of ${photos.length}`;
    dialog.querySelector(".lightbox__nav").hidden = photos.length < 2;
  };

  const open = (at) => {
    show(at);
    dialog.showModal();
    // Belt and braces: some browsers still scroll the page behind a modal.
    document.documentElement.style.overflow = "hidden";
  };

  for (const button of triggers) {
    const at = photos.findIndex((p) => p.at === Number(button.dataset.photo));
    if (at < 0) {
      button.replaceWith(...button.childNodes);
      continue;
    }
    button.addEventListener("click", () => open(at));
  }

  dialog.addEventListener("close", () => {
    document.documentElement.style.overflow = "";
  });
  dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-prev]").addEventListener("click", () => show(index - 1));
  dialog.querySelector("[data-next]").addEventListener("click", () => show(index + 1));

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); show(index - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); show(index + 1); }
  });

  // Clicking the backdrop — anything outside the three rows — closes it
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  /* Swipe, the way a phone gallery is expected to behave. A horizontal
     move of more than 45px that is clearly not a vertical scroll. */
  let startX = 0;
  let startY = 0;
  let tracking = false;

  dialog.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return (tracking = false);
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  dialog.addEventListener("touchend", (event) => {
    if (!tracking) return;
    tracking = false;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      show(index + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });
}
