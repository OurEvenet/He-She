#!/usr/bin/env python3
"""
Turns a guest list into one personalised link per household, with a
WhatsApp message ready to send.

    python3 tools/guest-links.py guests.csv > links.csv
    python3 tools/guest-links.py guests.csv --page theme4.html

The input is a CSV with a header row. Only `name` is required:

    name,phone,party
    Ruwan & family,+94 77 000 0000,4
    Aunty Padma,0112345678,1
    The Fernandos,,6

The output is a CSV with the original columns plus two:

    link      the invitation, addressed to that household
    whatsapp  a wa.me link that opens the chat with the message typed

Open the output in a spreadsheet, tap down the whatsapp column, and
send. There is no list stored anywhere: the name travels in the link,
which is what makes this work on a static host with no server behind
it. assets/js/modules/guest.js explains the trade that involves.

A guest who forwards their link forwards their own name with it, which
is worth saying out loud to the couple — it is a greeting, not a
password, and nothing behind it is private to that household.
"""
import argparse
import csv
import json
import os
import sys
from urllib.parse import quote, urlencode

ROOT = os.path.join(os.path.dirname(__file__), "..")


def base_url(explicit):
    if explicit:
        return explicit.rstrip("/") + "/"
    with open(os.path.join(ROOT, "data", "wedding.json"), encoding="utf-8") as fh:
        url = json.load(fh)["meta"]["url"]
    if not url or "example" in url:
        sys.exit(
            "meta.url in data/wedding.json is still the placeholder. Set it to the "
            "real address, or pass --base https://yourname.github.io/wedding/"
        )
    return url.rstrip("/") + "/"


def message(template, name, url):
    return template.replace("{name}", name).replace("{link}", url)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csvfile", help="the guest list")
    ap.add_argument("--page", default="", help="which design to send (default: the site root)")
    ap.add_argument("--base", default="", help="override meta.url from wedding.json")
    ap.add_argument(
        "--message",
        default="Dear {name}, we would love for you to be there. Our invitation: {link}",
        help="the WhatsApp message; {name} and {link} are filled in",
    )
    args = ap.parse_args()

    root = base_url(args.base) + args.page

    with open(args.csvfile, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    if not rows:
        sys.exit(f"{args.csvfile} has no rows under its header.")
    if "name" not in rows[0]:
        sys.exit(f"{args.csvfile} needs a 'name' column. Found: {', '.join(rows[0])}")

    out = csv.DictWriter(sys.stdout, fieldnames=list(rows[0]) + ["link", "whatsapp"])
    out.writeheader()

    skipped = 0
    for row in rows:
        name = (row.get("name") or "").strip()
        if not name:
            skipped += 1
            continue

        params = {"to": name}
        party = (row.get("party") or "").strip()
        if party.isdigit() and int(party) > 1:
            params["n"] = party

        link = f"{root}?{urlencode(params)}"
        row["link"] = link

        # wa.me wants digits only, and a Sri Lankan 07x number needs its
        # country code before it will dial from anywhere else.
        digits = "".join(ch for ch in (row.get("phone") or "") if ch.isdigit())
        if digits.startswith("0"):
            digits = "94" + digits[1:]
        row["whatsapp"] = (
            f"https://wa.me/{digits}?text={quote(message(args.message, name, link))}"
            if digits else ""
        )
        out.writerow(row)

    if skipped:
        print(f"{skipped} row(s) had no name and were left out.", file=sys.stderr)
    print(f"{len(rows) - skipped} link(s) written.", file=sys.stderr)


if __name__ == "__main__":
    main()
