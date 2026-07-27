#!/usr/bin/env python3
"""
Compute the research metrics for research.html from data already on the site.

Four families, all derived — nothing here needs a new source except the
mirror table, which comes from data/raw/mirror_2025.csv:

  1. Revealed advantage   — where India punches above its own weight
  2. Import dependence    — how concentrated India's supply of a product is
  3. Export concentration — how concentrated India's customer base is
  4. Mirror gaps          — what partners say they bought from India, versus
                            what India says it sold them

Writes data/vc_research.js. Run after fetch_data.py, before build_pages.py:

    python3 scripts/build_research.py
"""

import csv
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

# EU member codes, so India's own reported exports can be summed to compare
# against the EU's single reported figure.
EU_MEMBERS = ["40", "56", "100", "191", "196", "203", "208", "233", "246",
              "251", "276", "300", "348", "372", "380", "428", "440", "442",
              "470", "499", "528", "616", "620", "642", "703", "705", "724", "752"]


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def revealed_advantage(pp, n):
    """India's share of a chapter across the tracked markets, divided by
    India's share of all tracked chapters. Above 1.0 = India is
    over-represented in that product relative to its own average."""
    by_chapter = {}
    tot_world = tot_india = 0.0
    for hs in pp["chapters"]:
        w = sum(m["series"][hs]["world"] for m in pp["markets"].values())
        i = sum(m["series"][hs]["india"] for m in pp["markets"].values())
        by_chapter[hs] = (w, i)
        tot_world += w
        tot_india += i
    baseline = tot_india / tot_world if tot_world else 0
    rows = []
    for hs, (w, i) in by_chapter.items():
        if w <= 0:
            continue
        share = i / w
        rows.append({
            "hs": hs, "label": pp["chapters"][hs],
            "market_size": round(w), "from_india": round(i),
            "share": round(100 * share, 3),
            "rca": round(share / baseline, 2) if baseline else 0,
            "exports": round(pp["india_trend"][hs]["exports"][n]),
        })
    rows.sort(key=lambda r: -r["rca"])
    return {"baseline_share": round(100 * baseline, 2), "rows": rows}


def import_dependence(src):
    """Largest single supplier's share of India's total import bill for the
    chapter. Exact: the total is India's own reported world import figure."""
    rows = []
    for hs, name in src["chapters"].items():
        total = src["india_world_imports"].get(hs) or 0
        sup = src["india_suppliers"].get(hs) or {}
        if not total or not sup:
            continue
        top_name, top_val = max(sup.items(), key=lambda kv: kv[1])
        named = sorted(sup.values(), reverse=True)
        rows.append({
            "hs": hs, "label": name,
            "imports": round(total),
            "top": top_name, "top_share": round(100 * top_val / total, 1),
            "top3_share": round(100 * sum(named[:3]) / total, 1),
        })
    rows.sort(key=lambda r: -r["top_share"])
    return rows


def export_concentration(bil, n):
    """How concentrated India's customer base is: HHI over destinations,
    plus the top-five share. Computed on India's own reported exports."""
    vals = [(p["name"], p["exports"][n]) for p in bil["partners"].values()
            if p["exports"][n] > 0]
    total = sum(v for _, v in vals)
    vals.sort(key=lambda kv: -kv[1])
    shares = [(nm, v / total) for nm, v in vals]
    hhi = sum(s * s for _, s in shares) * 10000
    return {
        "total": round(total),
        "hhi": round(hhi),
        "top1": {"name": shares[0][0], "share": round(100 * shares[0][1], 1)},
        "top5_share": round(100 * sum(s for _, s in shares[:5]), 1),
        "top10_share": round(100 * sum(s for _, s in shares[:10]), 1),
        "partners": len(vals),
        "rows": [{"name": nm, "value": round(v), "share": round(100 * v / total, 2)}
                 for nm, v in vals[:15]],
    }


def mirror_gaps(bil, n):
    path = os.path.join(DATA, "raw", "mirror_2025.csv")
    if not os.path.exists(path):
        return []
    eu_sum = sum(bil["partners"][c]["exports"][n]
                 for c in EU_MEMBERS if c in bil["partners"])
    out = []
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            them = float(r["imports_from_india_usd"])
            code = r["reporterCode"]
            if code == "97":
                ours = eu_sum
            else:
                p = bil["partners"].get(code)
                ours = p["exports"][n] if p else None
            if not ours:
                continue
            out.append({
                "name": r["reporterName"],
                "year": int(r["year"]),
                "they_report": round(them),
                "india_reports": round(ours),
                "gap_pct": round(100 * (them - ours) / ours, 1),
            })
    out.sort(key=lambda r: -abs(r["gap_pct"]))
    return out


def main():
    meta = load("meta.json")
    pp = load("productpages.json")
    src = load("sourcing.json")
    bil = load("bilateral.json")
    n = len(pp["years"]) - 1
    bn = len(bil["years"]) - 1

    obj = {
        "year": meta["latest_year"],
        "generated": meta.get("generated"),
        "advantage": revealed_advantage(pp, n),
        "dependence": import_dependence(src),
        "concentration": export_concentration(bil, bn),
        "mirror": mirror_gaps(bil, bn),
    }

    with open(os.path.join(DATA, "research.json"), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DATA, "vc_research.js"), "w", encoding="utf-8") as f:
        f.write("window.VC_DATA = window.VC_DATA || {};\n"
                "window.VC_DATA.research = "
                + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n")

    a = obj["advantage"]
    print(f"India's average share of tracked markets: {a['baseline_share']}%")
    print("\nStrongest revealed advantage:")
    for r in a["rows"][:5]:
        print(f"  {r['label']:34} share {r['share']:6.2f}%  index {r['rca']:.2f}")
    print("\nHighest import dependence:")
    for r in obj["dependence"][:5]:
        print(f"  {r['label']:34} {r['top']} {r['top_share']:.0f}%")
    c = obj["concentration"]
    print(f"\nExport concentration: HHI {c['hhi']}, top partner "
          f"{c['top1']['name']} {c['top1']['share']}%, top 5 {c['top5_share']}%")
    print(f"\nLargest mirror gaps ({len(obj['mirror'])} partners):")
    for r in obj["mirror"][:4]:
        print(f"  {r['name']:20} {r['gap_pct']:+.0f}%")
    print("\nwrote data/research.json and data/vc_research.js")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
