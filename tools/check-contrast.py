#!/usr/bin/env python3
"""
Checks every theme in assets/css/themes.css for legibility.

    python3 tools/check-contrast.py

Four palettes is four chances to ship a page somebody cannot read in
sunlight on a phone. Each pair below is a place where the site actually
puts text on a background, checked against the ratio WCAG 2.1 asks for:
4.5:1 for body text, 3:1 for large or bold display type and for the lines
and rules that carry meaning.

Exits non-zero if anything falls short, so it can gate a commit.
"""
import re, os, sys

CSS = os.path.join(os.path.dirname(__file__), "..", "assets", "css")

# (foreground, background, minimum, what it is)
PAIRS = [
    ("--ink",        "--shell",      4.5, "body text on paper"),
    ("--ink",        "--shell-warm", 4.5, "body text on the warm band"),
    ("--ink-soft",   "--shell",      4.5, "secondary text on paper"),
    ("--ink-soft",   "--shell-warm", 4.5, "secondary text on the warm band"),
    ("--brass-lo",   "--shell",      4.5, "the times in the running order"),
    ("--brass-lo",   "--shell-warm", 4.5, "the times, on the warm band"),
    ("--on-dark",    "--poruwa",     4.5, "text on the venue band"),
    ("--on-dark",    "--poruwa-lo",  4.5, "text on the hero and footer"),
    ("--on-dark-soft", "--poruwa",   4.5, "secondary text on the venue band"),
    ("--on-dark-soft", "--poruwa-lo", 4.5, "secondary text in the footer"),
    ("--brass-hi",   "--poruwa",     4.5, "the hall name on the venue band"),
    ("--brass-hi",   "--poruwa-lo",  4.5, "the eyebrow line on the hero"),
    ("--alarm",      "--shell-warm", 4.5, "form errors"),
    ("--poruwa-lo",  "--brass",      4.5, "text on a brass button"),
    ("--brass-lo",   "--shell",      3.0, "focus ring on paper"),
    ("--brass-hi",   "--poruwa-lo",  3.0, "focus ring on a dark band"),
    ("--brass",      "--poruwa-lo",  3.0, "ornament on the hero"),
    ("--brass-hi",   "--poruwa-dim", 3.0, "ornament on the deep surface"),
    ("--field-line", "--shell-warm", 3.0, "the line round a form field"),
    ("--field-line", "--shell",      3.0, "the same line, on paper"),
]


def channel(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_colour):
    h = hex_colour.lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    lo, hi = sorted((la, lb))
    return (hi + 0.05) / (lo + 0.05)


def palettes():
    """Every theme's tokens, with tokens.css as the base each one starts from."""
    with open(os.path.join(CSS, "tokens.css")) as f:
        base = dict(re.findall(r"(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;", f.read()))
    with open(os.path.join(CSS, "themes.css")) as f:
        css = f.read()

    found = {"tokens.css default": dict(base)}
    for name, block in re.findall(
            r':root\[data-theme="([\w-]+)"\]\s*\{(.*?)\}', css, re.S):
        theme = dict(base)
        theme.update(dict(re.findall(r"(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;", block)))
        found[name] = theme
    return found


def main():
    bad = 0
    for name, tokens in palettes().items():
        print(f"\n{name}")
        for fg, bg, need, what in PAIRS:
            if fg not in tokens or bg not in tokens:
                print(f"  ?  {what}: {fg} or {bg} is not defined")
                bad += 1
                continue
            got = ratio(tokens[fg], tokens[bg])
            ok = got >= need
            bad += not ok
            print(f"  {'ok' if ok else 'NO'}  {got:5.2f}:1  (needs {need})  {what}"
                  f"{'' if ok else f'   {fg} {tokens[fg]} on {bg} {tokens[bg]}'}")

    print()
    if bad:
        print(f"{bad} pair(s) below the line.")
        return 1
    print("Every theme is legible everywhere the page puts text.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
