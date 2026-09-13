# Wedding invitation

A single-page wedding invitation with RSVP and calendar handoff, built to run on
GitHub Pages with no build step and no server.

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

Nine pictures are included, rendered by `tools/make-images.py`: a lamp lit in
a dark room, hill country going blue at dusk, araliya on a cloth, the lakeside
at the hour the reception starts, the poruwa dressed in white and gold. They
are drawn from numbers — light first, then shape, then the grain and falloff
that stop a rendered image looking rendered — so the page has real subject
matter in it from the first commit rather than coloured rectangles.

They are **original artwork, not photographs**, and they are meant to be
replaced. Nothing here is traced from or derived from anyone else's picture.

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

`tools/sync-lqip.py` is the last step of both generators: it reads
`assets/img/_lqip.json` and rewrites the `images` block in the JSON.
`import-photos.py` runs it for you. The recorded width and height are what
keep the layout from shifting as photographs arrive, so do not edit them by
hand.

Each photograph loads with a 20px blurred placeholder inlined in the JSON, and
its real file is fetched only once it is within 500px of the viewport.

---

## Structure

```
index.html                    frame only — no content
editor.html                   form editor for wedding.json
site.webmanifest              name, colours and icons for "add to home screen"
.nojekyll
data/wedding.json             all content
assets/css/tokens.css         palette, type scale, motion curves, safe areas, @font-face
assets/css/themes.css         the four palettes, and how the ornament sits and moves
assets/css/style.css
assets/css/editor.css
assets/fonts/                 Fraunces + Karla, self-hosted (OFL)
assets/img/
assets/img/icon-*.png         home-screen icons, generated by tools/make-icons.py
assets/svg/                   the ornament set, generated by tools/make-ornaments.py
assets/js/main.js             boot
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
tools/import-photos.py        real photographs in, web-sized files out
tools/make-ornaments.py       draws the ornament set
tools/check-contrast.py       asserts every theme is legible
tools/make-images.py          renders the nine scenes the site ships with
tools/make-icons.py           regenerates the home-screen icons
tools/sync-lqip.py            writes image metadata into the JSON
tools/shots.py                screenshots + smoke tests (needs playwright)
```

---

## Themes

One line in `data/wedding.json` dresses the whole invitation:

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

**Contrast is asserted, not eyeballed.** Four palettes is four chances to
ship a page nobody can read in sunlight:

```
python3 tools/check-contrast.py
```

It walks every theme and checks each pair where the site actually puts
text on a background, at the ratio WCAG 2.1 asks for, and exits non-zero
if anything falls short. It found two failures in the palette that had
already shipped — the focus ring at 2.4:1 and the border round a form
field at 1.3:1, where the field's background is the same colour as the
band behind it — which is why there is now a `--field-line` token, darker
than the hairline dividers, for the boundary of a control.

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

- [ ] `meta.url` set to the real address
- [ ] `rsvp.endpoint` set, and a test reply received
- [ ] Real names, dates, times, venue and phone numbers in `wedding.json`
- [ ] Editor shows nothing under "Worth checking"
- [ ] A theme chosen, and looked at on a phone in daylight
- [ ] Real photographs through `python3 tools/import-photos.py`, and the alt
      text and captions updated to match what is in them
- [ ] Opened it on an actual phone, and tapped the dock, a photograph and the form
- [ ] `name` in `site.webmanifest` changed from the generic one
- [ ] `calendar.organizerEmail` set to an address you actually read
- [ ] Downloaded the `.ics` and opened it once, to confirm the alarms appear
