#!/usr/bin/env python3
"""
Keep the exporter toolkit honest with as little human attention as possible.

Two jobs:
  1. Flag any scheme whose stated validity has lapsed while still marked
     active (same rule the build gate enforces, reported early).
  2. Watch the official pages the scheme data is drawn from, and notice when
     they change — a changed DGFT schemes page usually means a notification
     has been issued.

Used by .github/workflows/schemes-watch.yml. Writes Actions outputs:
    changed=true|false
    summary=<what to look at>

Fingerprints live in data/schemes_seen.json so you are told once per change,
not once per run.
"""

import hashlib
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEEN = os.path.join(ROOT, "data", "schemes_seen.json")

WATCH = {
    "DGFT schemes": "https://www.dgft.gov.in/CP/",
    "Commerce Dept schemes": "https://commerce.gov.in/trade-promotion/schemes-and-guidelines/",
    "MSME schemes": "https://msme.gov.in/schemes",
}


def emit(name, value):
    out = os.environ.get("GITHUB_OUTPUT")
    line = f"{name}={value}"
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    print(line)


def fingerprint(url):
    """Hash the visible text, so cosmetic markup changes don't cry wolf."""
    req = urllib.request.Request(
        url, headers={"User-Agent": "valuechain.international scheme checker"})
    with urllib.request.urlopen(req, timeout=60) as r:
        html = r.read().decode("utf-8", errors="replace")
    text = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    # ignore anything that looks like a session token or timestamp
    text = re.sub(r"\b[0-9a-f]{16,}\b", "", text)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], len(text)


def main():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from validate import validate_schemes

    notes = []

    expired = validate_schemes()
    if expired:
        notes.append("**Scheme entries needing a decision:**")
        notes.extend(f"- {p}" for p in expired)

    previous = {}
    if os.path.exists(SEEN):
        try:
            with open(SEEN, encoding="utf-8") as f:
                previous = json.load(f)
        except ValueError:
            previous = {}

    current, moved = {}, []
    for label, url in WATCH.items():
        try:
            fp, size = fingerprint(url)
        except Exception as e:                    # noqa: BLE001 — a site being down is not a failure
            print(f"  could not reach {label}: {e}")
            current[label] = previous.get(label, "")
            continue
        current[label] = fp
        was = previous.get(label)
        print(f"  {label}: {fp} ({size} chars){'' if was == fp else '  <-- changed' if was else '  (baseline)'}")
        if was and was != fp:
            moved.append(f"- [{label}]({url}) has changed since the last check")

    if moved:
        notes.append("**Official pages that changed:**")
        notes.extend(moved)

    os.makedirs(os.path.dirname(SEEN), exist_ok=True)
    with open(SEEN, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=1, sort_keys=True)
        f.write("\n")

    first_run = not previous
    if notes and not first_run:
        emit("changed", "true")
        emit("summary", " / ".join(n for n in notes if not n.startswith("-"))[:200])
        with open(os.path.join(ROOT, "data", "schemes_report.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(notes) + "\n")
    else:
        if first_run:
            print("Baseline recorded; no issue opened on first run.")
        emit("changed", "false")
        emit("summary", "")
    return 0


if __name__ == "__main__":
    sys.exit(main())
