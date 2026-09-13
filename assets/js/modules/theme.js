/* ---------------------------------------------------------------
   Themes.

   One line in wedding.json — meta.theme — decides how the whole
   invitation is dressed. The palettes live in themes.css; this file
   is the register of what exists, which ornaments each theme wears,
   and the two lines that apply it.

   The theme is set on <html> before the content renders, so the
   page is never briefly the wrong colour.

   A ?theme= in the address overrides it for that visit only. That
   is for the couple deciding between two of them on a phone, not
   for guests, and it changes nothing for anyone else.
   --------------------------------------------------------------- */

export const THEMES = [
  {
    id: "poruwa",
    label: "Poruwa — betel green and brass",
    note: "The original. Quiet, and the only one with no ornament.",
    ornaments: {},
  },
  {
    id: "kandyan",
    label: "Kandyan — lac red and gold",
    note: "Sri Lankan through and through: a couple on the poruwa, liyawel creepers, a punkalasa, sesath.",
    ornaments: {
      corners: "liyawel",
      letter: "kandyan-couple",
      rules: "liyawel",
      footer: "punkalasa",
      watermark: "sesath",
    },
  },
  {
    id: "araliya",
    label: "Araliya — temple flower, for a morning",
    note: "Lighter. Temple flowers on the section rules, nothing else.",
    ornaments: { rules: "araliya" },
  },
  {
    id: "handahana",
    label: "Handahana — indigo, for a late reception",
    note: "The moon palette. No ornament.",
    ornaments: {},
  },
];

export const DEFAULT_THEME = "poruwa";

const byId = (id) => THEMES.find((t) => t.id === id);

/** The theme this visit should use, and where the choice came from. */
export function chosenTheme(config) {
  let preview = null;
  try {
    preview = new URL(location.href).searchParams.get("theme");
  } catch {
    /* an address we cannot parse is simply not a preview */
  }
  if (preview && byId(preview)) return { theme: byId(preview), preview: true };

  const named = config?.meta?.theme;
  return { theme: byId(named) || byId(DEFAULT_THEME), preview: false };
}

/** Paints the page in a theme. Safe to call before anything is rendered. */
export function applyTheme(theme) {
  const id = typeof theme === "string" ? theme : theme?.id;
  if (!byId(id)) return byId(DEFAULT_THEME);
  document.documentElement.dataset.theme = id;
  return byId(id);
}
