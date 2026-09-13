/* ---------------------------------------------------------------
   Music.

   Three rules, all of them forced by how invitations are actually
   opened — on a phone, often in a room with other people in it:

     1. Nothing plays until a finger has touched the screen. Browsers
        require it, and so does basic manners.
     2. The file is not fetched until that touch either. A four-megabyte
        mp3 downloading on page load is the single fastest way to make
        an invitation feel broken on a slow connection — it competes
        with the photographs for the same bandwidth.
     3. One tap stops it, and the control says which tap it is.

   The choice is remembered for the session, so scrolling back to the
   top or following a link does not start the song over.
   --------------------------------------------------------------- */

import { esc } from "./render.js";

const KEY = "wedding:music";

const ICON_ON =
  '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>';
const ICON_OFF =
  '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3l18 18"/>';

const svg = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
        focusable="false">${paths}</svg>`;

export function initMusic(config) {
  const music = config.music;
  if (!music?.src) return null;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "music";
  button.dataset.music = "";
  document.body.appendChild(button);

  /** @type {HTMLAudioElement | null} — built on first play, not before. */
  let audio = null;
  let playing = false;

  const paint = () => {
    button.innerHTML = svg(playing ? ICON_ON : ICON_OFF);
    // The name says what the tap will do, not what the state is: a
    // screen reader user needs the verb.
    button.setAttribute(
      "aria-label",
      playing ? `Pause the music (${esc(music.title || "music")})` : "Play the music"
    );
    button.setAttribute("aria-pressed", String(playing));
    button.classList.toggle("is-playing", playing);
  };

  const ensure = () => {
    if (audio) return audio;
    audio = new Audio();
    audio.src = new URL(music.src, document.baseURI).href;
    audio.loop = true;
    audio.preload = "none";
    audio.addEventListener("pause", () => { playing = false; paint(); });
    audio.addEventListener("play", () => { playing = true; paint(); });
    return audio;
  };

  /** Play, and shrug if the browser says no — it is background music. */
  const play = async () => {
    try {
      await ensure().play();
      sessionStorage.setItem(KEY, "on");
    } catch {
      playing = false;
      paint();
    }
  };

  const pause = () => {
    audio?.pause();
    try { sessionStorage.setItem(KEY, "off"); } catch { /* private window */ }
  };

  button.addEventListener("click", () => (playing ? pause() : play()));
  paint();

  return {
    /** Called by the envelope: the tap that opened it is the gesture. */
    startIfWanted() {
      if (music.autoOnOpen === false) return;
      let choice = null;
      try { choice = sessionStorage.getItem(KEY); } catch { /* private window */ }
      if (choice === "off") return;
      play();
    },
  };
}
