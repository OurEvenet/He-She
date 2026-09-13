# Wedding invitation

Seven wedding invitation designs with RSVP and calendar handoff, built to run
on GitHub Pages with no build step and no server. All seven read the same
`data/wedding.json`: change a time once and every design has it.

Plain HTML, CSS and vanilla ES modules. No framework, no bundler, no Actions
workflow. Push it and it works.

---

## Deploy

1. Create a repository and push these files to `main`.
2. **Settings → Pages → Build and deployment → Deploy from a branch**,
   branch `main`, folder `/ (root)`.
3. Open `data/wedding.json` and set `meta.url` to the address Pages gives you,
   e.g. `https://yourname.github.io/wedding/`. That one value feeds the
   canonical link, the social preview, and the URL written into calendar events.

`.nojekyll` is included so Jekyll does not touch the asset folders. Every path in
the site is relative, so it works from a project subfolder
(`yourname.github.io/repo/`) as well as from a custom domain root.

To preview locally, any static server will do — the page fetches JSON, so
opening `index.html` from the filesystem will not work:

```
python3 -m http.server 8000
```

---

## Editing the invitation

**Everything is in `data/wedding.json`.** You should not need to touch the HTML.

### The editor

Open `editor.html` for a form-based editor rather than hand-editing JSON:

```
python3 -m http.server 8000
# then http://localhost:8000/editor.html
```

It loads the current `data/wedding.json`, gives every field a proper control —
date pickers, a theme picker that recolours the editor as you choose, dropdowns of the actual image files, add/remove/
reorder on every list — and hands back a file to drop into the repository. The
loaded object is edited in place, so key order survives and the download stays
diffable against what is already committed.

Two things it does that hand-editing cannot:

- **Shows you the real conversion.** Under each start time it prints what the
  calendar will actually receive, e.g. `9.12 a.m. Asia/Colombo →
  20270220T034200Z · runs 1h 33m`. It imports the site's own `dates.js` rather
  than reimplementing the maths, so there is no second copy to drift.
- **Checks the things that bite.** An event ending before it starts, duplicate
  event identifiers, a gallery entry pointing at a missing file, a reply
  deadline falling after the ceremony, a leave reminder set beyond Google's
  28-day ceiling, a still-placeholder site URL, an unset form endpoint. These
  appear at the top of the page and link to the field concerned.

The editor is a build-time tool. It is harmless to publish — it is marked
`noindex` and only ever writes to a download — but you can delete `editor.html`,
`assets/css/editor.css` and `assets/js/editor.js` before going live if you would
rather guests never stumble on it.

| Key | What it controls |
| --- | --- |
| `meta` | Title, description, social preview, site URL, timezone |
| `meta.theme` | Which of the four themes dresses the page — see Themes below |
| `meta.dateLocale` | Locale used for formatting dates only — kept separate from `meta.locale` because `en-LK` resolves to bare `en` in browsers, which prints month-first |
| `images` | Generated. Paths, dimensions and blur placeholders — see below |
| `couple` | Names, the invitation line, the date written out |
| `letter` | The note, and the pull quote beside it |
| `events[]` | Each part of the day. Order here is the order on the page |
| `venue` | Name, address, map links, travel notes |
| `calendar` | Organiser details, alarms, the leave reminder, optional OAuth client ID |
| `rsvp` | Form endpoint, reply deadline, guest cap, meal options |
| `gallery[]` | Which images appear, their alt text and captions |
| `faq[]`, `contacts[]` | Self-explanatory |

### Times

Times are written as **local wall-clock time at the venue**, the way a person
reads an invitation:

```json
{ "start": "2027-02-20T09:12:00", "end": "2027-02-20T10:45:00" }
```

with `meta.timezone` set to `Asia/Colombo`. The page converts to UTC itself
using `Intl`, so a guest whose phone is set to London or Melbourne still sees
the ceremony at 9.12 a.m. Colombo time, and their calendar entry lands correctly.
Do not append an offset to these strings.

---

## Collecting replies

Static hosting cannot receive a POST, so the reply goes to a form endpoint of
your choosing. Set `rsvp.endpoint` to any URL that accepts a JSON POST:

- **Formspree** — create a form, paste the `https://formspree.io/f/xxxx` URL
- **Basin**, **Getform**, **Formcarry** — same pattern
- **Google Apps Script** — deploy a web app as a doPost handler and use its URL

While `rsvp.endpoint` is empty the form still completes and the confirmation
appears, but the reply goes nowhere. In that state the confirmation panel says
so plainly, so you cannot ship it by accident. That notice disappears as soon as
an endpoint is set.

The payload is flat JSON: `name`, `email`, `attendance`, `guests`, `meal`,
`message`, `submittedAt`.

---

## Calendar

Three routes in, in order of richness.

**1. Download an `.ics` file.** Built in the browser, no server. Contains every
event plus the leave reminder, each carrying real `VALARM` components:

```
BEGIN:VALARM
TRIGGER:-P14D
ACTION:DISPLAY
DESCRIPTION:Two weeks out — sort out leave and cover at work
END:VALARM
```

Works in Apple Calendar, Outlook, Thunderbird, and Google via import. Edit the
alarms under `calendar.alarms`.

**2. Google Calendar links.** One click, no sign-in. Google's template URLs
cannot carry alarms, so the two-week prompt is issued as its own all-day event
instead — titled "Apply for leave", landing fourteen days before the ceremony.
Edit it under `calendar.leaveReminder`.

**3. Write directly to the guest's Google Calendar.** Optional. Leave
`calendar.googleClientId` empty and this button never appears. To enable it:

1. Google Cloud Console → new project → enable the **Google Calendar API**
2. **Credentials → Create credentials → OAuth client ID → Web application**
3. Add your Pages origin (`https://yourname.github.io`) under
   *Authorised JavaScript origins*
4. Paste the client ID into `calendar.googleClientId`

It requests the `calendar.events` scope and writes each event with a popup
reminder at 20160 minutes — exactly fourteen days, and within Google's
40320-minute ceiling.

---

## Images

Nine **real photographs** ship with the site — a paper lantern lit in a dark
doorway, a pier at sunset, a valley between granite cliffs, ferns, petals.
They are stand-ins, there so the page is a finished thing you can look at,
and they are meant to be replaced with yours.

All nine are freely licensed (CC0, or the Unsplash licence) and come from
[elementary/wallpapers](https://github.com/elementary/wallpapers), which
publishes its per-photograph licensing. Photographer, source and licence for
each one are in [`assets/img/CREDITS.md`](assets/img/CREDITS.md). None of
them requires attribution; they are credited anyway.

The slot names say what *should* go in them, not what is in them now: no
freely licensed photograph of a poruwa or a wedding lunch was reachable, so
those slots carry the nearest real thing and the alt text describes what is
actually in the picture. Nothing on the page claims to be something it is not.

`tools/make-images.py` still renders a complete set of **original artwork**
instead — a lamp lit in the dark, hill country at dusk, araliya on a cloth —
if you would rather ship drawings than someone else's photographs. That set
carries no third-party licence at all.

### Putting your own photographs in

Drop the originals — straight off the camera or the phone, any size, any
orientation — into `assets/img/incoming/`, each named after the slot it
belongs in, and run one command:

```
mkdir -p assets/img/incoming
cp ~/Pictures/wedding/ceremony.jpg assets/img/incoming/poruwa.jpg
python3 tools/import-photos.py
```

The slots are `hero`, `poruwa`, `lamp`, `hands`, `araliya`, `kandy`, `table`,
`venue` and `og`. You do not need all nine at once — anything you leave out
keeps the placeholder it has, and you can run the command again as more
photographs arrive.

For each one it will:

- **turn it the right way up**, following the EXIF rotation a phone writes
  rather than the order the pixels happen to be stored in;
- **strip every scrap of metadata.** A phone photograph carries the GPS
  coordinates of wherever it was taken, often somebody's house, and this site
  is public. The written files are rebuilt from raw pixels, so nothing —
  EXIF, GPS, camera serial, colour profile — survives the trip;
- **resize to something a phone can download on hotel wifi**: 1800px for the
  hero, 1600px for the venue, 1200px for the gallery, which is twice what any
  of those frames is ever displayed at;
- **write both the `.jpg` and the `.webp`**, which the page needs as a pair;
- **record the real width, height and blur placeholder** in
  `data/wedding.json`.

Framing is left alone. The gallery reads each photograph's own aspect ratio
out of the JSON and lays itself out around it, so there is no reason to crop
what you framed — pass `--crop hero=4:5` if you want one anyway. The single
exception is `og`, the social preview, which is cropped to exactly 1200×630
because WhatsApp and the rest will otherwise crop it themselves, badly.

iPhone HEIC files work with one extra package:

```
pip install pillow-heif
```

Without it they are named and skipped, rather than silently ignored.

Afterwards, check that the alt text and captions still describe what is
actually in the photographs. Alt text is read aloud to guests using a screen
reader, and "brass oil lamp with the wick just lit" is worse than useless if
the photograph is now of the cake.

### The rest of the imagery

```
python3 tools/make-images.py     # re-render the nine scenes (needs numpy)
python3 tools/make-icons.py      # regenerate the home-screen icons
python3 tools/sync-lqip.py       # push image metadata into wedding.json
```

`tools/sync-lqip.py` is the last step of every image tool: it reads
`assets/img/_lqip.json` and rewrites the `images` block in the JSON.
`import-photos.py` runs it for you. The recorded width and height are what
keep the layout from shifting as photographs arrive, so do not edit them by
hand.

**Why the paths carry `?v=` on the end.** A photograph replaced in place
keeps its name — `hero.jpg` is always `hero.jpg` — so nothing in the URL
changes when the picture does, and a browser holding the old one has no
reason to ask for another. You deploy, and still see last month's
photograph; so does every guest who looked once before. The sync puts eight
characters of the file's own content into the query string, so changing the
picture changes the URL and the stale one can never be served. Leave the
picture alone and the URL is stable, so it stays cached, which is the point
of caching. It is computed, never typed.

Each photograph loads with a 20px blurred placeholder inlined in the JSON, and
its real file is fetched only once it is within 500px of the viewport.

---

## Structure

```
index.html                    frame only — no content
theme1.html … theme6.html     the six alternative designs, also frame only
themes.html                   the picker: all seven, side by side
editor.html                   form editor for wedding.json
site.webmanifest              name, colours and icons for "add to home screen"
.nojekyll
data/wedding.json             all content
assets/css/tokens.css         palette, type scale, motion curves, safe areas, @font-face
assets/css/themes.css         the four palettes, and how the ornament sits and moves
assets/css/parts.css          the cover, music toggle, story and gifts — shared by all seven
assets/css/themes-page.css    the picker
assets/css/themes/base.css    the structure themes 4–6 share
assets/css/themes/theme1.css … theme6.css
assets/css/style.css
assets/css/editor.css
assets/fonts/                 Fraunces + Karla, self-hosted (OFL)
assets/img/
assets/img/icon-*.png         home-screen icons, generated by tools/make-icons.py
assets/svg/                   the ornament set, generated by tools/make-ornaments.py
assets/js/main.js             boot, for index.html
assets/js/theme-page.js       boot, for the six theme pages
assets/js/themes.js           the picker
assets/js/themes/theme1.js … theme6.js    markup only, one per design
assets/js/editor.js           the editor
assets/js/modules/
  dates.js                    timezone conversion and formatting
  calendar.js                 ICS builder, Google links, Calendar API
  images.js                   lazy loading and blur-up
  render.js                   builds every section from the JSON
  rsvp.js                     validation, submission, calendar handoff
  thread.js                   scroll-linked brass thread and reading hairline
  dock.js                     the thumb-reach action bar on a phone
  lightbox.js                 full-screen photographs
  share.js                    the system share sheet, or the clipboard
  theme.js                    which themes exist, and which artwork each wears
  ornament.js                 hangs that artwork on the page
  forms.js                    the reply form's markup, written once for every design
  sections.js                 our story, and gift details behind a tap
  countdown.js                days, hours and minutes to the ceremony
  envelope.js                 the cover, and the tap that opens it
  music.js                    lazy audio and its toggle
  guest.js                    ?to=… — the greeting and the prefilled form
tools/import-photos.py        real photographs in, web-sized files out
tools/make-ornaments.py       draws the ornament set
tools/check-contrast.py       colour pairs in the main page's four palettes
tools/check-pages.py          the rendered audit: every page, every line of text
tools/guest-links.py          a guest list in, personalised links + WhatsApp out
tools/make-images.py          renders the nine scenes the site ships with
tools/make-icons.py           regenerates the home-screen icons
tools/sync-lqip.py            writes image metadata into the JSON
tools/shots.py                screenshots + smoke tests (needs playwright)
docs/BEFORE-YOU-SEND.md       the pre-send checklist
```

---

## The seven designs

Open **`themes.html`** to see them side by side with the couple's own names
in each. Pick one and send that page's link.

| Page | Name | What it is |
| --- | --- | --- |
| `index.html` | Poruwa | The flagship. A brass thread down the page, a thumb dock, Kandyan artwork, and four colour themes of its own (below) |
| `theme1.html` | Ivory | The classic printed invitation — centred, symmetric, gold rules, a monogram |
| `theme2.html` | Noir | Editorial. Nothing centred, sections numbered like a programme, photographs to the edge of the screen |
| `theme3.html` | Botanical | Cream and sage, soft corners, the photograph in an arch *under* the type rather than behind it |
| `theme4.html` | Araliya | Night garden. Deep indigo and brass, with a stem that draws itself across the hero once |
| `theme5.html` | Ink & Kite | Paper minimal. One sans family, a narrow column, and the two names set deliberately small |
| `theme6.html` | Batik | Saturated. A teal batik field behind the hero and the venue, madder rules, names reversed out in chalk |

A design supplies markup and a stylesheet and nothing else. The timezone
arithmetic, the reply form and its validation, the calendar files, the lazy
photographs, the lightbox, the countdown, the cover and the music all come
from shared modules, so a new design **cannot** get the times wrong or break
the reply form — it does not implement any of that.

Three things are a contract rather than a choice:

```
#rsvp             wraps the reply form, so rsvp.js can find it
[data-photo="n"]  wraps each photograph, so the lightbox opens
.frame            comes from frameHTML(), so nothing shifts as it loads
```

### Writing an eighth

```
assets/js/themes/theme7.js     the markup — call bootTheme(paint)
assets/css/themes/theme7.css   @import "base.css", then a palette
theme7.html                    copy theme6.html, change three names
```

`assets/css/themes/base.css` already holds the reset, the rhythm, the
buttons, the form, the questions, the footer and the lightbox, driven by
about a dozen custom properties — so a theme file is a palette and the
handful of rules that make it look like itself. `assets/css/parts.css`
does the same for the four things every design draws identically: the
cover, the music toggle, the story list and the gift details.

Then add the filename to `PAGES` in `tools/check-pages.py` and run it.

(Themes 1–3 predate `base.css` and each carry their own copy of the
structure. They are shipped and verified; rewriting working pages to
prove a point is not a change worth making.)

---

## The colour themes on the main page

One line in `data/wedding.json` dresses `index.html`:

```json
"meta": { "theme": "kandyan" }
```

| Theme | What it is |
| --- | --- |
| `kandyan` | **The Sri Lankan one**, and the default. Lac red and gold — the reds of a Nilame costume, the gold of a bride's nalalpata — on the ivory of a palm-leaf manuscript. It is the only theme with the full ornament set |
| `poruwa` | The original. Betel green, brass lamplight, and paper. No ornament |
| `araliya` | Temple flower, for a morning ceremony. White, sage and gold worn lightly, with flowers on the section rules |
| `handahana` | The moon, for a reception that runs late. Indigo, and gold read by lamplight |

The palettes live in `assets/css/themes.css` and nothing else varies —
type, spacing and motion are the same in all four, because an invitation
should read the same however it is dressed. The editor has a picker that
recolours the editor itself as you choose, and its *Preview page* link
opens the invitation in whichever theme is selected. Adding
`?theme=araliya` to the address previews one for that visit only, which is
for the couple deciding between two on a phone; it changes nothing for
guests.

The colour the browser paints its own chrome follows the theme, so there
is no separate `themeColor` to keep in step — the old key is gone.

**Contrast is measured, not eyeballed.**

```
python3 -m http.server 8811 &
python3 tools/check-pages.py
```

This walks all seven designs as a browser renders them and measures every
piece of text against the ground actually behind it — 1275 of them at the
last count — plus sideways scroll at 320px, tap targets under 44px, and
console errors. Text over a photograph or a pattern has no single
background colour to score against, so those lines are read out of the
rendered pixels instead.

It replaces `tools/check-contrast.py`, which read a list of colour pairs
out of the CSS. That worked with one design. With seven it stops working,
not because the maths changes but because the list does: every new theme
is a new set of pairs somebody has to remember to add, and the pair
nobody remembers is the one that ships unreadable. Switching to the
rendered audit immediately found nine real failures nothing had caught —
theme 1's gold measured 3.4:1 on its own ivory rather than the 4.5 it was
written for, and theme 6's batik tile put its own bright pattern behind
14px text. The pair list is kept for the main page's four palettes.

### The artwork

```
python3 tools/make-ornaments.py     # writes assets/svg/*.svg
```

Five drawings, in the register of Kandyan decorative work:

- **kandyan-couple** — a couple on the poruwa under a thorana arch,
  between two lit lamps. It draws itself on, and the flames keep moving
- **liyawel** — the creeper, as a rule between sections and a curl in
  each top corner of the hero
- **punkalasa** — the pot of plenty, at the foot of the page
- **sesath** — the ceremonial fan, turning very slowly behind the reply
  form at nine per cent opacity
- **araliya** — temple flowers, for the lighter theme

They are **original drawings**, generated by maths rather than traced
from anyone's work: the motifs themselves are traditional and centuries
old, but every path in these files is written by the tool. They are also
**vector, not video** — a few kilobytes each, sharp at any size, drawn in
`currentColor` so a theme colours them by setting one property, and
animated in CSS rather than by a player.

Every piece is decoration and is treated as such: `aria-hidden`, outside
the tab order, never able to take a tap meant for a button, gone from the
printed sheet, and — under `prefers-reduced-motion` — simply there,
finished, from the first frame, with nothing drawing on and no flame.

---

---

## The cover, the music, and personalised links

Three things every design gets, all of them off-by-default-shaped so a
couple who wants none of them ends up with none of them.

### The cover

```json
"envelope": {
  "enabled": true,
  "text": "Open the invitation",
  "salutation": "Together with our families"
}
```

A full-screen cover with the two names and one control. The tap that
opens it does three jobs at once: it is the gesture browsers require
before audio may play, it is the moment the invitation feels handed over
rather than loaded, and it is where a personalised link says the guest's
name back to them.

While it is closed every other element on the page is `inert`, not merely
invisible — a screen reader that can still reach the invitation
underneath makes the cover a trap rather than a cover. With motion
reduced it still opens; it just does not animate. Set `enabled` to
`false` and the page simply starts at the hero.

### The music

```json
"music": { "src": "assets/audio/ours.mp3", "title": "Our song", "autoOnOpen": true }
```

Leave `src` empty and no toggle appears. Otherwise a small round control
sits bottom-right, and:

- nothing plays until a finger has touched the screen — browsers require
  it, and so does basic manners;
- **the file is not fetched until that touch either.** A four-megabyte mp3
  downloading on page load is the fastest way to make an invitation feel
  broken on a slow connection: it competes with the photographs for the
  same bandwidth, on the same phone, at the same moment;
- one tap stops it, and the control's accessible name says which tap it
  is — "Pause the music", then "Play the music";
- the choice is remembered for the session, so scrolling back to the top
  does not start the song over.

### Personalised links

```
theme4.html?to=Ruwan%20%26%20family&n=4
```

The cover says *Dear Ruwan & family*, the reply form opens with the name
in it and the party size set, and the reply carries an `invitedAs` field
so the couple can tell a personalised reply from a forwarded one.

```
python3 tools/guest-links.py guests.csv --page theme4.html > links.csv
```

Input is a CSV with a `name` column, optionally `phone` and `party`.
Output adds a `link` column and a `whatsapp` column — a `wa.me` link that
opens the chat with the message already typed. Open it in a spreadsheet
and tap down the column.

**Why the name is in the link and not in a table.** A lookup table of
unguessable tokens would have to ship inside `wedding.json`, where every
guest could read the whole guest list, every phone number, and who else
was invited. Nothing is worth that. Unguessable per-guest tokens need a
server that can hold the list privately; this is the honest static
version, and what it costs is that a guest could edit their own party
size in the address bar — which, on a site with no server, they could do
anyway. Say out loud to the couple that this is a greeting, not a
password.

---

## Two optional sections

Both are genuinely optional: leave them out of `wedding.json` and nothing
appears — no heading, no empty band, no gap.

```json
"storyHeading": "How we got here",
"story": [
  { "date": "March 2019", "title": "A queue at Galle Face", "body": "…" }
],

"gifts": {
  "enabled": true,
  "heading": "If you were going to ask",
  "message": "You being in the room is the whole point…",
  "buttonText": "View the bank details",
  "bank": { "bankName": "…", "accountName": "…", "accountNumber": "…", "branch": "…" },
  "registryUrl": ""
}
```

Three to five moments in the story and no more; any further and it stops
being an invitation and starts being an autobiography.

The bank details sit behind a tap, always, with a copy button for the
account number. Two reasons, and the second is the one people forget:
asking is delicate enough that it should not be the thing a guest reads
on the way past, and an account number displayed inline ends up in every
screenshot the invitation is forwarded as.

---

## Privacy

`"meta": { "private": true }` — the default — puts
`<meta name="robots" content="noindex, nofollow">` on the page. A private
invitation has no business in a search index: it carries a family's
names, a house-full of phone numbers, and a date and place they will all
be at. Set it to `false` only if you genuinely want it findable.

If you use `tools/guest-links.py`, you are handling names and phone
numbers of people who never signed up with you. Keep the CSV out of the
repository — `guests*.csv` is in `.gitignore` — and delete it when the
wedding is over.

---

## On a phone

Most guests will open this on a phone, in a chat, one-handed. The page is
built for that first.

**The three things a guest came to do are always within reach.** The hero
carries the reply and the running order; after it scrolls away a dock sits in
the thumb zone with *Reply*, *Directions* and *Call*. It stands down again
while the reply form or the footer is on screen, where it would only be
repeating what is already there. Above 46rem it does not exist at all.

**Nothing a thumb has to hit is under 44px**, and hover is asked for with
`@media (hover: hover)` so a tapped button does not stay looking pressed.
Form fields are never smaller than 16px, which is the size below which iOS
zooms the page in the moment a field is focused and leaves the guest scrolled
sideways in the middle of the form.

**The page paints edge to edge** (`viewport-fit=cover`) and every edge pads
itself back out of the notch and the home indicator with
`env(safe-area-inset-*)`, held in one place as `--safe-*` in `tokens.css`.

**The brass thread becomes a hairline.** There is no margin to hang a thread
in at 390px, so the same measurement is drawn as a 2px line across the top of
the screen. One scroll handler feeds both.

**Photographs open.** Two-up is a decent contact sheet and a poor way to look
at anything, so tapping a frame opens it full screen — swipeable, captioned,
closed with Escape or the backdrop. It is a `<dialog>`, so the top layer, the
backdrop and returning focus come from the platform; where `<dialog>` is
missing the frames quietly go back to being plain figures.

**The calendar is offered before the form**, under the running order, because
plenty of people want the date in their diary without replying in the same
minute. On iOS the `.ics` is opened rather than downloaded — Safari ignores
the `download` attribute, and a file that silently never arrives is worse than
no button at all.

**Sharing uses the system sheet** where `navigator.share` exists and the
clipboard where it does not. If neither is available the button never appears.

The editor gets the same treatment: the toolbar and the section list become
sideways-scrolling strips rather than four wrapped rows of buttons, reorder
and remove grow to 44px on a touch screen, and every field clears the iOS
zoom threshold.

`tools/shots.py` asserts the two failures that are invisible on a desk and
obvious on a phone — anything that scrolls sideways, and any target under
44px — on both pages at 320px and 390px.

**Add to home screen** works: `site.webmanifest` carries the name, colours and
icons, and `apple-touch-icon` covers iOS. Edit the name in the manifest; it is
the one piece of text that does not come from `wedding.json`, because a
manifest is read by the browser before any of our code runs.

There is deliberately **no service worker**. Offline support would mean a
cache that can serve a guest last week's times after you have corrected them,
which is a poor trade for a page that is read a handful of times.

---

## Notes on the build

**Fonts are self-hosted** rather than pulled from Google. No third-party
request, nothing to break if a CDN is blocked, and the `SOFT` and `WONK`
variation axes that give Fraunces its character are preserved. Both families are
SIL Open Font Licence 1.1 — licences are in `assets/fonts/`.

**Lazy loading uses a scroll sweep, not `IntersectionObserver`.** An observer
only reports *changes* in intersection, so an element jumped over within a
single frame — an anchor link, a restored scroll position, a fast flick on a
phone — is never reported and its photograph never loads. The sweep is
deterministic and removes its own listeners once every frame has loaded.

**Motion is deliberately sparse.** One orchestrated sequence on load, and a
single brass thread that fills as the page is read. There are no fade-up
reveals on each section. Everything respects `prefers-reduced-motion`.

**Accessibility.** Skip link, visible keyboard focus, labelled form controls,
`aria-label` on the stylised names, live error messaging that also appears at
the field it concerns, the running order as a real ordered list, and a
`<noscript>` block carrying the essential details. A browser too old for ES
modules is told so rather than left on the loading curtain.

**Printing.** The invitation prints as a plain sheet: no photographs, no form,
no dock, every folded answer opened for the printer and put back afterwards.

---

## Before you share the link

The full list is **[docs/BEFORE-YOU-SEND.md](docs/BEFORE-YOU-SEND.md)** —
twenty minutes on a phone, and every item on it is there because it is a
thing that goes wrong quietly. The short version:

- [ ] `meta.url` set to the real address
- [ ] `rsvp.endpoint` set, and a test reply received
- [ ] Real names, dates, times, venue and phone numbers in `wedding.json`
- [ ] Every maps link tapped, every phone number dialled
- [ ] Editor shows nothing under "Worth checking"
- [ ] A design chosen from `themes.html`, and looked at on a phone in daylight
- [ ] Real photographs through `python3 tools/import-photos.py`, and the alt
      text and captions updated to match what is in them
- [ ] `python3 tools/check-pages.py` passes
- [ ] Pasted into a real WhatsApp chat and the preview card checked
- [ ] `calendar.organizerEmail` set to an address you actually read
- [ ] Downloaded the `.ics` and opened it once, to confirm the alarms appear
