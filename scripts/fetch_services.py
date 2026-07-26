#!/usr/bin/env python3
"""
Fetch India's services trade from the World Bank open API.

UN Comtrade covers goods only, which leaves the largest single hole in this
site: India's services exports are comparable in size to its merchandise
exports and are the country's strongest position in world trade.

The World Bank publishes balance-of-payments services data for every country,
free and without an API key, so this refreshes automatically like everything
else. Writes data/vc_services.js.

    python3 scripts/fetch_services.py
"""

import json
import os
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
RAW = os.path.join(DATA, "raw")

API = "https://api.worldbank.org/v2/country/{c}/indicator/{i}?format=json&date={a}:{b}&per_page=500"

FIRST_YEAR, LAST_YEAR = 2016, 2024      # World Bank runs a year behind Comtrade

COUNTRIES = {
    "IND": "India", "CHN": "China", "USA": "United States",
    "GBR": "United Kingdom", "DEU": "Germany", "IRL": "Ireland",
    "SGP": "Singapore", "JPN": "Japan", "FRA": "France", "NLD": "Netherlands",
}

INDICATORS = {
    "services_exports": "BX.GSR.NFSV.CD",     # services exports, BoP, current US$
    "services_imports": "BM.GSR.NFSV.CD",     # services imports
    "goods_exports_bop": "BX.GSR.MRCH.CD",    # goods exports on the same BoP basis
}

# Composition of India's services exports, as % of total services exports
SHARES = {
    "ict": ("BX.GSR.CMCP.ZS", "Computer, communications & other business services"),
    "travel": ("BX.GSR.TRVL.ZS", "Travel"),
    "transport": ("BX.GSR.TRAN.ZS", "Transport"),
    "finance": ("BX.GSR.INSF.ZS", "Insurance & financial services"),
}


def get(url, tries=3):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "valuechain.international services refresh"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:                      # noqa: BLE001
            if attempt == tries - 1:
                raise
            print(f"    retrying after {e}")
            time.sleep(3)
    return None


def series(countries, indicator):
    """{iso3: {year: value}} for one indicator."""
    url = API.format(c=";".join(countries), i=indicator, a=FIRST_YEAR, b=LAST_YEAR)
    payload = get(url)
    if not payload or len(payload) < 2 or not payload[1]:
        return {}, None
    out = {}
    for row in payload[1]:
        iso = row.get("countryiso3code")
        val = row.get("value")
        if not iso or val is None:
            continue
        out.setdefault(iso, {})[int(row["date"])] = float(val)
    return out, payload[0].get("lastupdated")


def main():
    os.makedirs(RAW, exist_ok=True)
    years = list(range(FIRST_YEAR, LAST_YEAR + 1))
    codes = list(COUNTRIES)

    print("Fetching services trade from the World Bank ...")
    data, updated = {}, None
    for key, ind in INDICATORS.items():
        print(f"  {key} ({ind})")
        got, upd = series(codes, ind)
        updated = updated or upd
        data[key] = got
        time.sleep(1)

    print("  composition of India's services exports")
    composition = []
    for key, (ind, label) in SHARES.items():
        got, _ = series(["IND"], ind)
        vals = got.get("IND", {})
        latest = max((y for y in vals if vals[y] is not None), default=None)
        if latest:
            composition.append({"key": key, "label": label,
                                "share": round(vals[latest], 1), "year": latest})
        time.sleep(1)
    composition.sort(key=lambda r: -r["share"])

    def rows_for(key):
        return {iso: [round(data[key].get(iso, {}).get(y, 0)) for y in years]
                for iso in codes if iso in data[key]}

    latest_year = max((y for y in data["services_exports"].get("IND", {})), default=LAST_YEAR)
    x = data["services_exports"].get("IND", {})
    m = data["services_imports"].get("IND", {})
    g = data["goods_exports_bop"].get("IND", {})

    ranking = sorted(
        ({"iso": iso, "name": COUNTRIES[iso],
          "value": round(data["services_exports"][iso].get(latest_year, 0))}
         for iso in data["services_exports"]
         if data["services_exports"][iso].get(latest_year)),
        key=lambda r: -r["value"])

    obj = {
        "source": "World Bank (balance of payments, current US$)",
        "source_url": "https://data.worldbank.org/indicator/BX.GSR.NFSV.CD",
        "last_updated": updated,
        "years": years,
        "latest_year": latest_year,
        "countries": COUNTRIES,
        "india": {
            "exports": [round(x.get(y, 0)) for y in years],
            "imports": [round(m.get(y, 0)) for y in years],
            "goods_exports": [round(g.get(y, 0)) for y in years],
            "surplus": [round(x.get(y, 0) - m.get(y, 0)) for y in years],
        },
        "exports_by_country": rows_for("services_exports"),
        "ranking": ranking,
        "composition": composition,
    }

    with open(os.path.join(DATA, "services.json"), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DATA, "vc_services.js"), "w", encoding="utf-8") as f:
        f.write("window.VC_DATA = window.VC_DATA || {};\n"
                "window.VC_DATA.services = "
                + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n")

    bn = lambda v: v / 1e9
    print(f"\nIndia {latest_year}: services exports ${bn(x.get(latest_year, 0)):,.0f}bn, "
          f"goods exports ${bn(g.get(latest_year, 0)):,.0f}bn, "
          f"services surplus ${bn(x.get(latest_year, 0) - m.get(latest_year, 0)):,.0f}bn")
    print("World ranking of the tracked countries:")
    for i, r in enumerate(ranking, 1):
        print(f"  {i}. {r['name']:16} ${bn(r['value']):,.0f}bn")
    print("Composition:", ", ".join(f"{c['label'].split(',')[0]} {c['share']}%"
                                    for c in composition))
    print("\nwrote data/services.json and data/vc_services.js")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
