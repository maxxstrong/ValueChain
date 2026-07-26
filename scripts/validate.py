#!/usr/bin/env python3
"""
Data validation gate for valuechain.international.

Rule: a stale-but-correct site beats a fresh-but-wrong one. fetch_data.py
builds every dataset in memory, calls validate_all() here, and only writes
to data/ if every check passes. If anything fails, the run aborts and the
previously published data is left exactly as it was.

Run standalone against whatever is currently in data/ :

    python3 scripts/validate.py
"""

import json
import os

MAX_YOY_CHANGE = 0.60      # log any year-on-year move beyond +/-60%
ROW_TOLERANCE = 0.25       # fail if a dataset's row count moves >25% vs last run

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data")


class ValidationError(Exception):
    """Raised when freshly built data fails a sanity check. Nothing is written."""


class Validator:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def fail(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def check_series(self, label, values, expected_len=None, zero_ok=False):
        """A series must exist, be the right length, and hold sane numbers.

        zero_ok=True for series where an all-zero result is a real finding
        rather than a fault — e.g. Bangladesh's mineral-fuel exports to the
        US genuinely are zero. Those are logged, not failed."""
        if not values:
            self.fail(f"{label}: series is empty")
            return
        if expected_len is not None and len(values) != expected_len:
            self.fail(f"{label}: expected {expected_len} values, got {len(values)}")
        for i, v in enumerate(values):
            if v is None:
                self.fail(f"{label}[{i}]: value is null")
            elif v < 0:
                self.fail(f"{label}[{i}]: negative value ({v})")
        if not any(values):
            if zero_ok:
                self.warn(f"{label}: every value is zero (no trade in this pair)")
            else:
                self.fail(f"{label}: every value is zero")

    def check_yoy(self, label, values):
        """Big jumps are not automatically wrong, but they must be surfaced."""
        for i in range(1, len(values)):
            prev, cur = values[i - 1], values[i]
            if not prev or not cur:
                continue
            change = (cur - prev) / prev
            if abs(change) > MAX_YOY_CHANGE:
                self.warn(f"{label}: {change:+.0%} year-on-year at index {i} "
                          f"({prev:,.0f} -> {cur:,.0f}) — review")

    def check_positive(self, label, value):
        if value is None or value <= 0:
            self.fail(f"{label}: expected a positive total, got {value}")

    def check_row_count(self, label, count, previous):
        if not count:
            self.fail(f"{label}: no rows produced")
            return
        if previous:
            drift = abs(count - previous) / previous
            if drift > ROW_TOLERANCE:
                self.fail(f"{label}: row count moved {drift:.0%} "
                          f"({previous} -> {count}) — outside tolerance")

    def report(self):
        for w in self.warnings:
            print(f"  WARN  {w}")
        if self.errors:
            print("\nVALIDATION FAILED — existing data left untouched:")
            for e in self.errors:
                print(f"  ERROR {e}")
            raise ValidationError(f"{len(self.errors)} check(s) failed")
        print(f"  validation passed ({len(self.warnings)} warning(s))")


def previous_row_counts():
    """Row counts from the last successful run, for drift comparison."""
    p = os.path.join(OUT, "meta.json")
    if not os.path.exists(p):
        return {}
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f).get("row_counts", {}) or {}
    except (ValueError, OSError):
        return {}


def validate_all(objects, years, prev=None):
    """Run every check across freshly built objects. Raises ValidationError."""
    print("\nValidating freshly built data ...")
    v = Validator()
    prev = previous_row_counts() if prev is None else prev
    n = len(years)

    trend = objects["trend"]
    v.check_series("trend.exports", trend["exports"], n)
    v.check_series("trend.imports", trend["imports"], n)
    v.check_yoy("trend.exports", trend["exports"])
    v.check_yoy("trend.imports", trend["imports"])

    for key in ("partners_exports", "partners_imports",
                "products_exports", "products_imports"):
        obj = objects[key]
        rows = obj["rows"]
        v.check_row_count(key, len(rows), prev.get(key))
        for r in rows:
            v.check_positive(f"{key}:{r.get('name') or r.get('label')}", r["value"])

    pp = objects["productpages"]
    v.check_row_count("productpages.chapters", len(pp["chapters"]),
                      prev.get("productpages.chapters"))
    for hs, t in pp["india_trend"].items():
        v.check_series(f"productpages.{hs}.exports", t["exports"], n)

    # How much India exports of each chapter, worldwide — used below to spot
    # markets where India's recorded share has collapsed implausibly.
    india_exports = {hs: t["exports"][-1] for hs, t in pp["india_trend"].items()
                     if t.get("exports")}

    for mkey, m in pp["markets"].items():
        for hs, s in m["series"].items():
            if s["world"] < 0 or s["india"] < 0:
                v.fail(f"markets.{mkey}.{hs}: negative value")
            if s["world"] > 0 and s["india"] > s["world"] * 1.05:
                v.fail(f"markets.{mkey}.{hs}: India ({s['india']:,.0f}) exceeds "
                       f"world ({s['world']:,.0f})")
            # A truncated or mis-merged cell can show up as India supplying
            # ~nothing to a large market in a chapter India exports heavily
            # (this is how the EU knitted-apparel cell was wrong by 292x).
            # Plenty of these are legitimate though — India really does not
            # ship crude to Mexico — so this is surfaced for review, not
            # failed. The hard stop is the drift check below.
            if (s["world"] > 1e9 and india_exports.get(hs, 0) > 1e9
                    and s["india"] < s["world"] * 0.0005):
                v.warn(f"markets.{mkey}.{hs}: India's share is "
                       f"{100 * s['india'] / s['world']:.3f}% of a "
                       f"${s['world'] / 1e9:,.1f}bn market while India exports "
                       f"${india_exports[hs] / 1e9:,.1f}bn of this chapter "
                       f"worldwide — check the cell is not truncated")

    # Value drift: mass truncation shows up as a market's total collapsing
    # between runs. Individual cells move; a whole market does not.
    prev_totals = (prev or {}).get("_market_totals", {})
    for mkey, m in pp["markets"].items():
        total_india = sum(s["india"] for s in m["series"].values())
        before = prev_totals.get(mkey)
        if before and total_india < before * 0.30:
            v.fail(f"markets.{mkey}: India total collapsed from "
                   f"${before / 1e9:,.1f}bn to ${total_india / 1e9:,.1f}bn "
                   f"— refusing to publish")

    h2h = objects["headtohead"]
    for mkt, chapters in h2h["chapter_series"].items():
        for hs, series in chapters.items():
            for who, vals in series.items():
                # 'world' and 'india' must have trade; competitors may not
                v.check_series(f"h2h.{mkt}.{hs}.{who}", vals, n,
                               zero_ok=who not in ("world", "india"))

    src = objects["sourcing"]
    v.check_row_count("sourcing.world_suppliers", len(src["world_suppliers"]),
                      prev.get("sourcing.world_suppliers"))

    bil = objects["bilateral"]
    v.check_row_count("bilateral.partners", len(bil["partners"]),
                      prev.get("bilateral.partners"))
    if "699" in bil["partners"]:
        v.fail("bilateral: India (699) is listed as its own trading partner")
    for code, p in bil["partners"].items():
        # one direction can legitimately be zero (e.g. India imports but does
        # not export to a tiny market); both zero would mean the pair is junk
        v.check_series(f"bilateral.{p['name']}.exports", p["exports"],
                       len(bil["years"]), zero_ok=any(p["imports"]))
        v.check_series(f"bilateral.{p['name']}.imports", p["imports"],
                       len(bil["years"]), zero_ok=any(p["exports"]))

    v.report()
    return {
        "_market_totals": {mkey: sum(s["india"] for s in m["series"].values())
                           for mkey, m in pp["markets"].items()},
        "partners_exports": len(objects["partners_exports"]["rows"]),
        "partners_imports": len(objects["partners_imports"]["rows"]),
        "products_exports": len(objects["products_exports"]["rows"]),
        "products_imports": len(objects["products_imports"]["rows"]),
        "productpages.chapters": len(pp["chapters"]),
        "sourcing.world_suppliers": len(src["world_suppliers"]),
        "bilateral.partners": len(bil["partners"]),
    }


def validate_schemes(path=None, today=None):
    """The toolkit's scheme data is hand-curated, so it is the most likely
    thing on the site to rot. Any scheme still marked 'active' after its
    stated expiry date fails the build — you cannot quietly serve an expired
    incentive. Returns a list of problems (empty means fine)."""
    import datetime
    import re as _re
    path = path or os.path.join(OUT, "vc_schemes.js")
    today = today or datetime.date.today()
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        text = f.read()
    anchor = "window.VC_DATA.schemes ="
    start = text.index(anchor) + len(anchor)
    body = text[start:text.rindex(";")]
    # the file is annotated for humans; strip /* ... */ notes before parsing
    body = _re.sub(r"/\*.*?\*/", "", body, flags=_re.S)
    obj = json.loads(body.strip())

    problems = []
    for s in obj.get("schemes", []):
        exp = s.get("expires")
        if exp:
            try:
                d = datetime.date(*[int(x) for x in exp.split("-")])
            except ValueError:
                problems.append(f"{s['id']}: unreadable expires value {exp!r}")
                continue
            if d < today and s.get("status") == "active":
                problems.append(
                    f"{s['id']} ({s['name']}): marked active but its stated "
                    f"validity ended {exp}. Re-check {s['url']} and set the "
                    f"status to 'active' with a new date, 'check', or 'ended'.")
        if s.get("status") not in ("active", "check", "ended"):
            problems.append(f"{s['id']}: unknown status {s.get('status')!r}")
        if not s.get("url", "").startswith("http"):
            problems.append(f"{s['id']}: missing or invalid official url")

    # The compliance radar rots the same way — regulatory dates move, and an
    # out-of-date CBAM or EUDR date is worse than none. Same enforcement.
    cpath = os.path.join(OUT, "vc_compliance.js")
    if os.path.exists(cpath):
        with open(cpath, encoding="utf-8") as f:
            ctext = f.read()
        canchor = "window.VC_DATA.compliance ="
        cbody = ctext[ctext.index(canchor) + len(canchor):ctext.rindex(";")]
        cbody = _re.sub(r"/\*.*?\*/", "", cbody, flags=_re.S)
        cobj = json.loads(cbody.strip())
        for r in cobj.get("rules", []):
            rb = r.get("review_by")
            if not rb:
                problems.append(f"compliance:{r['id']}: no review_by date set")
                continue
            try:
                d = datetime.date(*[int(x) for x in rb.split("-")])
            except ValueError:
                problems.append(f"compliance:{r['id']}: unreadable review_by {rb!r}")
                continue
            if d < today:
                problems.append(
                    f"compliance:{r['id']} ({r['name']}): due for review since {rb}. "
                    f"Re-check {r['url']}, confirm the dates, and set a new review_by.")
    return problems


def _load_current():
    def L(name):
        with open(os.path.join(OUT, name + ".json"), encoding="utf-8") as f:
            return json.load(f)
    built = {k: L(k) for k in ("trend", "partners_exports", "partners_imports",
                               "products_exports", "products_imports",
                               "headtohead", "productpages", "sourcing", "bilateral")}
    return built, built["trend"]["years"]


if __name__ == "__main__":
    import sys
    try:
        built, years = _load_current()
    except FileNotFoundError as e:
        print(f"Cannot validate — missing file: {e.filename}")
        sys.exit(2)
    failed = False
    try:
        counts = validate_all(built, years)
        print("\nRow counts:")
        for k, n in counts.items():
            print(f"  {k}: {n}")
    except ValidationError as e:
        print(f"\n{e}")
        failed = True

    print("\nChecking curated scheme data ...")
    problems = validate_schemes()
    if problems:
        print("  SCHEME DATA NEEDS ATTENTION:")
        for p in problems:
            print(f"   - {p}")
        failed = True
    else:
        print("  scheme data ok — nothing marked active past its expiry")

    sys.exit(1 if failed else 0)
