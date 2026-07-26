#!/usr/bin/env python3
"""
Check whether DGCIS has published a new Quarterly Review of Merchandise
Foreign Trade — the source behind states.html, which cannot be automated
because DGCIS publishes PDFs rather than an API.

Used by .github/workflows/dgcis-watch.yml. Writes GitHub Actions outputs:
    changed=true|false
    found=<newest report label>

The fingerprint of what we last saw is kept in data/dgcis_seen.txt so an
issue is opened once per publication, not once per run.

Run locally too:  python3 scripts/check_dgcis.py
"""

import os
import re
import sys
import urllib.request

LISTING = "https://www.dgciskol.gov.in/Publication_QuarterlyReview.aspx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEEN_FILE = os.path.join(ROOT, "data", "dgcis_seen.txt")

# Matches the PDF links DGCIS uses, e.g. ".../QRMFT-Q2 25-26.pdf"
PDF_RE = re.compile(r"QRMFT[^\"'>]*?\.pdf", re.I)
# Fallback: quarter labels in the page text, e.g. "Q2 2025-26"
QTR_RE = re.compile(r"Q[1-4]\s*\d{2}[-–]\d{2}", re.I)


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


def newest_label(html):
    """Best-effort fingerprint of the most recent report on the page."""
    pdfs = PDF_RE.findall(html)
    if pdfs:
        # De-duplicate, keep page order; the newest is normally listed first
        seen, ordered = set(), []
        for p in pdfs:
            key = p.strip()
            if key.lower() not in seen:
                seen.add(key.lower())
                ordered.append(key)
        return ordered[0]
    qtrs = QTR_RE.findall(html)
    if qtrs:
        return qtrs[0].strip()
    return ""


def main():
    try:
        html = fetch_listing()
    except Exception as e:                      # noqa: BLE001 — report, don't crash the watch
        print(f"Could not reach DGCIS: {e}")
        emit("changed", "false")
        emit("found", "")
        return 0                                # a site being down is not a failure

    found = newest_label(html)
    if not found:
        print("Could not identify a report on the page — page layout may have changed.")
        emit("changed", "false")
        emit("found", "")
        return 0

    previous = ""
    if os.path.exists(SEEN_FILE):
        with open(SEEN_FILE, encoding="utf-8") as f:
            previous = f.read().strip()

    print(f"newest on page : {found}")
    print(f"last seen      : {previous or '(nothing recorded yet)'}")

    if found == previous:
        emit("changed", "false")
        emit("found", found)
        return 0

    os.makedirs(os.path.dirname(SEEN_FILE), exist_ok=True)
    with open(SEEN_FILE, "w", encoding="utf-8") as f:
        f.write(found + "\n")

    # First ever run just records a baseline — don't raise an issue for it.
    if not previous:
        print("Baseline recorded; no issue opened on first run.")
        emit("changed", "false")
        emit("found", found)
        return 0

    print("NEW REVIEW DETECTED — an issue will be opened.")
    emit("changed", "true")
    emit("found", found)
    return 0


if __name__ == "__main__":
    sys.exit(main())
