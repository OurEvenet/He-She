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
date pickers, colour picker, dropdowns of the actual image files, add/remove/
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

Nine placeholders are included, generated in the site palette at the right
dimensions. To use real photographs:

1. Drop your files into `assets/img/`, keeping the same base names
   (`hero.jpg`, `poruwa.jpg`, `lamp.jpg`, …)
2. Regenerate the WebP versions, dimensions and blur placeholders:

```
python3 tools/make-images.py     # only if you want new placeholders
python3 tools/sync-lqip.py       # writes width/height/lqip into wedding.json
```

`tools/sync-lqip.py` is the one that matters — it reads whatever is in
`assets/img/` and updates the `images` block in the JSON. The recorded width and
height are what keep the layout from shifting as photographs arrive, so do not
edit them by hand.

Each photograph loads with a 20px blurred placeholder inlined in the JSON, and
its real file is fetched only once it is within 500px of the viewport.

---

## Structure

```
index.html                    frame only — no content
editor.html                   form editor for wedding.json
.nojekyll
data/wedding.json             all content
assets/css/tokens.css         palette, type scale, motion curves, @font-face
assets/css/style.css
assets/css/editor.css
assets/fonts/                 Fraunces + Karla, self-hosted (OFL)
assets/img/
assets/js/main.js             boot
assets/js/editor.js           the editor
assets/js/modules/
  dates.js                    timezone conversion and formatting
  calendar.js                 ICS builder, Google links, Calendar API
  images.js                   lazy loading and blur-up
  render.js                   builds every section from the JSON
  rsvp.js                     validation, submission, calendar handoff
  thread.js                   scroll-linked brass thread
tools/make-images.py          regenerates placeholder imagery
tools/sync-lqip.py            writes image metadata into the JSON
tools/shots.py                screenshots + smoke tests (needs playwright)
```

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
`aria-label` on the stylised names, live error messaging, and a `<noscript>`
block carrying the essential details.

---

## Before you share the link

- [ ] `meta.url` set to the real address
- [ ] `rsvp.endpoint` set, and a test reply received
- [ ] Real names, dates, times, venue and phone numbers in `wedding.json`
- [ ] Editor shows nothing under "Worth checking"
- [ ] Real photographs in `assets/img/`, then `python3 tools/sync-lqip.py`
- [ ] `calendar.organizerEmail` set to an address you actually read
- [ ] Downloaded the `.ics` and opened it once, to confirm the alarms appear
