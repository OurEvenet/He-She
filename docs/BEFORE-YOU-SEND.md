# Before you send the link

Run this once, on a phone, the day before you share it. Every item is
here because it is a thing that goes wrong, and most of them go wrong
quietly — the invitation looks fine and is simply wrong.

Give it twenty minutes. It is cheaper than a hundred guests at the
wrong venue.

## The details

- [ ] Both names spelled the way the families spell them — including in
      the browser tab and in the WhatsApp preview card, which come from
      `meta.siteTitle` and are easy to forget
- [ ] Every date and time checked against the couple's written
      confirmation, not against memory
- [ ] `meta.timezone` is `Asia/Colombo` (or wherever the wedding is).
      This is what a guest in Melbourne sees the day through
- [ ] `meta.url` is the real address, not the placeholder — the share
      card and the calendar files are built from it
- [ ] `rsvp.deadline` is right, and `rsvp.endpoint` is a form endpoint
      that actually exists. With it empty the flow still completes and
      says plainly that nothing is being collected, which is fine while
      you are testing and a disaster the day you share it
- [ ] Bank details, if `gifts.enabled`, correct to the digit

## The things you have to tap

- [ ] Every maps link opens the right place. Tap it — do not trust the
      pin in the URL
- [ ] Every phone number dials, in international form (`+94…`)
- [ ] Send a reply through the form. It arrives where you expect, and
      the confirmation names the right person
- [ ] Set `rsvp.deadline` to yesterday, reload, check the wording, set
      it back
- [ ] Download the calendar file and open it. The ceremony is at the
      right hour in your own calendar app
- [ ] Open a personalised link (`?to=Your%20Name`) and check the cover
      greets you and the form is filled in
- [ ] If there is music: it starts on the cover tap, one tap pauses it,
      and it does not restart when you scroll

## How it looks and loads

- [ ] Paste the link into a real WhatsApp chat — with yourself is fine —
      and look at the preview card. Facebook's debugger is not the same
      thing. If you have changed the picture since last time, bump the
      `?v=` on `images.og` (run `python3 tools/sync-lqip.py`) or the old
      card will stick around for days
- [ ] Open it on a mid-range Android over mobile data, not on wifi and
      not in a simulator. That is the device this is for
- [ ] Turn on Reduce Motion in the phone's accessibility settings and
      open it again. Everything must still be reachable
- [ ] `python3 tools/check-pages.py` passes — contrast on every page,
      no sideways scroll at 320px, no tap target under 44px
- [ ] `meta.private` is `true` unless you genuinely want the invitation
      in Google

## Last

- [ ] Decide which design you are sending, and send *that* page's link
      (`theme4.html`, say) rather than the site root
- [ ] Send it to one trusted person first and ask them what is confusing
