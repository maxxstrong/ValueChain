#!/usr/bin/env python3
"""
Check whether DGCIS has published a new Quarterly Review of Merchandise
Foreign Trade — the source behind states.html, which cannot be automated
because DGCIS publishes PDFs rather than an API.

Used by .github/workflows/dgcis-watch.yml. Writes GitHub Actions outputs:
    changed=true|false
    found=<newest report href>
    label=<human-readable link text>

The fingerprint of what we last saw is kept in data/dgcis_seen.txt so an
issue is opened once per publication, not once per run.

Run locally too:  python3 scripts/check_dgcis.py
                  python3 scripts/check_dgcis.py --self-test

--------------------------------------------------------------------------
Why this file was rewritten (July 2026)
--------------------------------------------------------------------------
The first version watched  Publication_QuarterlyReview.aspx , which is not a
page DGCIS serves — the listing lives at CI_Quarterly_Review.aspx, and that
is the URL the site's own navigation points to. It also fingerprinted links
with a  QRMFT...pdf  regex. DGCIS stopped using that filename convention
after Q2 FY25-26: the Q3 and Q4 reports are published as
"Report Q3 FY25-26.pdf" and "Report Q4 FY25-26.pdf". Between them, the wrong
URL and the too-narrow pattern meant the watcher could not see the two most
recent reviews, and states.html went two quarters stale without an issue
ever being opened.

The matcher below is therefore deliberately loose: any PDF under the
writereaddata/Downloads path whose filename or link text looks like a
quarterly review counts. The fingerprint is the full href, which carries an
upload timestamp prefix and so changes on every new publication.
"""

import argparse
import html as html_mod
import os
import re
import sys
import urllib.request

LISTING = "https://www.dgciskol.gov.in/CI_Quarterly_Review.aspx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEEN_FILE = os.path.join(ROOT, "data", "dgcis_seen.txt")

# Any anchor pointing at a PDF in the downloads area.
ANCHOR_RE = re.compile(
    r'<a\b[^>]*?href\s*=\s*["\']([^"\']*?writereaddata/Downloads/[^"\']*?\.pdf)["\'][^>]*>(.*?)</a>',
    re.I | re.S)

# A link counts as a quarterly review if EITHER the filename or the link text
# looks like one. Kept broad on purpose — see the note above.
LOOKS_QUARTERLY = re.compile(
    r"(QRMFT|QRFT|Report\s*Q[1-4]|Q[1-4]\s*FY|Quarterly\s*Review)", re.I)

TAG_RE = re.compile(r"<[^>]+>")


def emit(name, value):
    """Write a GitHub Actions step output (and echo for local runs)."""
    out = os.environ.get("GITHUB_OUTPUT")
    line = f"{name}={value}"
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    print(line)


def fetch_listing():
    req = urllib.request.Request(
        LISTING, headers={"User-Agent": "valuechain.international update checker"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="replace")


def clean_text(raw):
    """Strip tags/entities/whitespace out of anchor inner HTML."""
    return re.sub(r"\s+", " ", html_mod.unescape(TAG_RE.sub(" ", raw))).strip()


def newest(page_html):
    """
    Return (href, label) for the most recent quarterly review on the page.

    DGCIS lists newest first, so page order is the ranking. Returns ("", "")
    if nothing on the page looks like a quarterly review, which the caller
    treats as "layout changed" rather than "nothing new".
    """
    for href, inner in ANCHOR_RE.findall(page_html):
        label = clean_text(inner)
        if LOOKS_QUARTERLY.search(href) or LOOKS_QUARTERLY.search(label):
            return html_mod.unescape(href.strip()), label
    return "", ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-test", action="store_true",
                    help="run the parser against known DGCIS markup and exit")
    args = ap.parse_args()
    if args.self_test:
        return self_test()

    try:
        page = fetch_listing()
    except Exception as e:                      # noqa: BLE001 — report, don't crash the watch
        print(f"Could not reach DGCIS: {e}")
        emit("changed", "false")
        emit("found", "")
        emit("label", "")
        return 0                                # a site being down is not a failure

    found, label = newest(page)
    if not found:
        print("Could not identify a quarterly review on the page — layout may have changed.")
        emit("changed", "false")
        emit("found", "")
        emit("label", "")
        return 0

    previous = ""
    if os.path.exists(SEEN_FILE):
        with open(SEEN_FILE, encoding="utf-8") as f:
            previous = f.read().strip()

    print(f"newest on page : {label or '(no link text)'}")
    print(f"               : {found}")
    print(f"last seen      : {previous or '(nothing recorded yet)'}")

    if found == previous:
        emit("changed", "false")
        emit("found", found)
        emit("label", label)
        return 0

    os.makedirs(os.path.dirname(SEEN_FILE), exist_ok=True)
    with open(SEEN_FILE, "w", encoding="utf-8") as f:
        f.write(found + "\n")

    # First ever run just records a baseline — don't raise an issue for it.
    if not previous:
        print("Baseline recorded; no issue opened on first run.")
        emit("changed", "false")
        emit("found", found)
        emit("label", label)
        return 0

    print("NEW REVIEW DETECTED — an issue will be opened.")
    emit("changed", "true")
    emit("found", found)
    emit("label", label)
    return 0


# --------------------------------------------------------------------------
# Self-test: markup shaped like the live DGCIS listing, July 2026.
# Guards the exact failure that let states.html go stale.
# --------------------------------------------------------------------------
SAMPLE = '''
<div id="nav">
  <a href="https://www.dgciskol.gov.in/Writereaddata/Downloads/Work Allocation Order No. 149.pdf">Who is Who</a>
  <a href="https://www.dgciskol.gov.in/writereaddata/Downloads/20260105125536Organogram of the Office.pdf">Organogram</a>
</div>
<h2>Quarterly Review of Foreign Trade</h2>
<a href="https://dgciskol.gov.in/writereaddata/Downloads/20260608125806Report Q4 FY25-26.pdf">Quarterly Review of Merchandise Foreign Trade January-March, 2026</a>
<a href="https://www.dgciskol.gov.in/writereaddata/Downloads/20260310114741Report Q3 FY25-26.pdf">Report of Quarterly Review of Merchandise Foreign Trade [Oct-Dec'25]</a>
<a href="https://www.dgciskol.gov.in/writereaddata/Downloads/20251204165537QRMFT Q2 of FY 25-26.pdf">Report of Quarterly Review of Merchandise Foreign Trade [July-Sep'25]</a>
'''


def self_test():
    fails = []

    href, label = newest(SAMPLE)
    if "Report Q4 FY25-26.pdf" not in href:
        fails.append(f"newest() picked {href!r}, expected the Q4 FY25-26 report")
    if "January-March, 2026" not in label:
        fails.append(f"label was {label!r}, expected the Jan-March 2026 title")

    # The nav PDFs above must never win — they are not quarterly reviews.
    if "Organogram" in href or "Work Allocation" in href:
        fails.append("a navigation PDF was mistaken for a quarterly review")

    # Regression: the old QRMFT-only pattern missed these two filenames
    # entirely, which is why states.html went two quarters stale.
    for name in ("Report Q4 FY25-26.pdf", "Report Q3 FY25-26.pdf",
                 "QRMFT Q2 of FY 25-26.pdf"):
        if not LOOKS_QUARTERLY.search(name):
            fails.append(f"filename not recognised as a review: {name}")

    # A page with no reviews must report nothing rather than a false positive.
    if newest('<a href="https://x/writereaddata/Downloads/Tender.pdf">Tender</a>')[0]:
        fails.append("unrelated PDF was treated as a quarterly review")

    # Changing the upload timestamp must register as a new publication.
    a, _ = newest(SAMPLE)
    b, _ = newest(SAMPLE.replace("20260608125806", "20260915090000"))
    if a == b:
        fails.append("a re-upload with a new timestamp did not change the fingerprint")

    for f in fails:
        print("FAIL:", f)
    if fails:
        return 1
    print(f"self-test passed — newest = {label}")
    print(f"                   href   = {href}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
