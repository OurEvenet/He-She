# Where the photographs came from

The nine pictures in `assets/img/` are **real photographs**, and they are
**stand-ins**. They are here so the page is a finished thing you can look at
and show people — not so they end up in front of your guests. Replace them
with your own:

```
python3 tools/import-photos.py
```

They came from [elementary/wallpapers](https://github.com/elementary/wallpapers),
which publishes per-photograph licensing at
[debian/copyright](https://github.com/elementary/wallpapers/blob/deb-packaging/debian/copyright).
Every one below is free to use, modify and redistribute, commercially
included. None requires attribution; they are credited anyway, because the
people who took them deserve the line.

Each was resized and had all its metadata stripped on the way in, which is
what `tools/import-photos.py` does to anything it is given.

| Slot | Photograph | Photographer | Licence |
| --- | --- | --- | --- |
| `hero` | [Slot canyon](https://unsplash.com/photos/WeYamle9fDM) | Ashim D'Silva | CC0 (public domain) |
| `lamp` | [Paper lantern](https://unsplash.com/photos/v7r8kZStqFw) | Mr. Lee | CC0 (public domain) |
| `venue` | [Sunset by the pier](https://unsplash.com/photos/ces8_Bo7bhQ) | — | CC0 (public domain) |
| `og` | [Canazei granite ridges](https://unsplash.com/photos/yrwpJwDNSHE) | Benjamin Voros | CC0 (public domain) |
| `poruwa` | [A trail of footprints in the sand](https://unsplash.com/photos/A9mr3TPoj0k) | David Emrich | [Unsplash licence](https://unsplash.com/license) |
| `hands` | [Morskie Oko](https://unsplash.com/photos/_1UF_3TlKcQ) | — | [Unsplash licence](https://unsplash.com/license) |
| `araliya` | [Petals](https://unsplash.com/photos/MpTdvXlAsVE) | Martin Adams | [Unsplash licence](https://unsplash.com/license) |
| `kandy` | [Photo of valley](https://unsplash.com/photos/M6XC789HLe8) | Aniket Doele | [Unsplash licence](https://unsplash.com/license) |
| `table` | [Dahlia](https://unsplash.com/photos/iGrsa9rL11o) | Tj Holowaychuk | [Unsplash licence](https://unsplash.com/license) |

## A word about the slot names

The slot names — `poruwa`, `lamp`, `hands`, `table` — say what *should* go
there, not what is in there now. There is no photograph of a poruwa or a
wedding lunch in any freely licensed collection I could reach, so those slots
carry the nearest thing that is real: dunes, a lantern, ferns, a dahlia. The
alt text and captions in `wedding.json` describe the pictures that are
actually there, so nothing on the page claims to be something it is not.

Drop `poruwa.jpg` into `assets/img/incoming/` and run the import, and the slot
becomes what its name says.

## The drawn set

`tools/make-images.py` still renders a complete set of original artwork —
a lamp lit in the dark, hill country at dusk, araliya on a cloth. Run it if
you would rather ship drawings than someone else's photographs:

```
python3 tools/make-images.py && python3 tools/sync-lqip.py
```

That set is entirely original and carries no third-party licence at all.
