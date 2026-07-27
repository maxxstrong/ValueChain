#!/usr/bin/env python3
"""
Fetch India's trade data from the UN Comtrade public API and build the
static JSON files that the website reads.

USAGE (from the project root folder):

    python3 scripts/fetch_data.py            # fetch anything missing, then rebuild JSON
    python3 scripts/fetch_data.py --force    # re-download everything, then rebuild JSON
    python3 scripts/fetch_data.py --process-only   # skip downloads, rebuild JSON from data/raw

No API key is required (the script uses the free public preview endpoint).
If you have a free key from https://comtradeapi.un.org, set it first for
higher rate limits:   export COMTRADE_API_KEY=yourkey

The script is polite to the API: it caches every response in data/raw/ and
never re-downloads a file that already exists (unless you pass --force).
It waits 3 seconds between requests.

Notes on Comtrade quirks this script works around:
- Import (M) queries ignore a single `partnerCode=0` filter; adding
  `partner2Code=0` (and a partner list like `0,899`) makes filters stick.
- The JSON endpoint intermittently returns garbled bodies; `format=csv`
  is reliable, so we always request CSV.
- Records are duplicated per `partner2Code`; we keep partner2Code == 0.
"""

import csv
import io
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data")

SCRIPT_VERSION = "2.0"

# Periods for the hand-maintained DGCIS/NIRYAT layer (states page). These are
# the single source of truth for the dates shown on that page — update them
# here when you refresh data/vc_states.js, and every label follows.
DGCIS_QUARTER = "Q4 FY2025-26 (January–March 2026)"
DGCIS_FULL_YEAR = "FY 2024-25 (April 2024 – March 2025)"
DGCIS_ALL_STATES = "FY 2022-23 (April 2022 – March 2023)"


def _utc_now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# ------------------------------------------------------------------ validation
# A stale-but-correct site beats a fresh-but-wrong one. Nothing is written to
# data/ until every check in scripts/validate.py passes on the freshly built
# objects. Run those checks standalone any time with:
#     python3 scripts/validate.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate import validate_all, ValidationError  # noqa: E402

BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
AUTH_BASE = "https://comtradeapi.un.org/data/v1/get/C/A/HS"
API_KEY = os.environ.get("COMTRADE_API_KEY", "").strip()

INDIA = "699"
N_YEARS = 10           # length of the trend window
TOP_N_PARTNERS = 25    # how many partners to keep in the JSON (charts show 10)
PAUSE_SECONDS = 3      # wait between API calls (be nice to the free tier)

# ---------------------------------------------------------------- HS2 labels
# Short, human-readable labels for every HS 2-digit chapter.
HS2_LABELS = {
    "01": "Live animals", "02": "Meat", "03": "Fish & seafood",
    "04": "Dairy, eggs & honey", "05": "Other animal products",
    "06": "Live plants & flowers", "07": "Vegetables", "08": "Fruit & nuts",
    "09": "Coffee, tea & spices", "10": "Cereals",
    "11": "Milling products & starches", "12": "Oil seeds & fodder",
    "13": "Gums & resins", "14": "Other vegetable products",
    "15": "Animal & vegetable oils", "16": "Prepared meat & fish",
    "17": "Sugar & confectionery", "18": "Cocoa", "19": "Cereal preparations",
    "20": "Prepared fruit & vegetables", "21": "Misc. food preparations",
    "22": "Beverages & spirits", "23": "Food residues & animal feed",
    "24": "Tobacco", "25": "Salt, sulphur, stone & cement",
    "26": "Ores, slag & ash", "27": "Mineral fuels & oils",
    "28": "Inorganic chemicals", "29": "Organic chemicals",
    "30": "Pharmaceuticals", "31": "Fertilisers",
    "32": "Dyes, paints & inks", "33": "Perfumes & cosmetics",
    "34": "Soaps & waxes", "35": "Glues & enzymes",
    "36": "Explosives & matches", "37": "Photographic goods",
    "38": "Misc. chemical products", "39": "Plastics",
    "40": "Rubber", "41": "Raw hides & leather", "42": "Leather goods & bags",
    "43": "Furskins", "44": "Wood & charcoal", "45": "Cork",
    "46": "Basketware", "47": "Wood pulp", "48": "Paper & paperboard",
    "49": "Printed books & media", "50": "Silk", "51": "Wool & animal hair",
    "52": "Cotton", "53": "Jute & other plant fibres",
    "54": "Man-made filaments", "55": "Man-made staple fibres",
    "56": "Wadding, felt & ropes", "57": "Carpets",
    "58": "Special woven fabrics", "59": "Coated industrial textiles",
    "60": "Knitted fabrics", "61": "Apparel (knitted)",
    "62": "Apparel (woven)", "63": "Made-up textiles & rags",
    "64": "Footwear", "65": "Headgear", "66": "Umbrellas & sticks",
    "67": "Feathers & artificial flowers", "68": "Stone & cement articles",
    "69": "Ceramics", "70": "Glass & glassware",
    "71": "Gems & precious metals", "72": "Iron & steel",
    "73": "Iron & steel articles", "74": "Copper", "75": "Nickel",
    "76": "Aluminium", "78": "Lead", "79": "Zinc", "80": "Tin",
    "81": "Other base metals", "82": "Tools & cutlery",
    "83": "Misc. metal products", "84": "Machinery & mechanical appliances",
    "85": "Electrical machinery & electronics",
    "86": "Railway equipment", "87": "Vehicles & parts",
    "88": "Aircraft & spacecraft", "89": "Ships & boats",
    "90": "Optical & medical instruments", "91": "Clocks & watches",
    "92": "Musical instruments", "93": "Arms & ammunition",
    "94": "Furniture & lighting", "95": "Toys, games & sports goods",
    "96": "Misc. manufactured articles", "97": "Works of art",
    "98": "Special classifications", "99": "Unspecified commodities",
}

# Friendlier display names where the UN wording is unclear.
NAME_OVERRIDES = {
    "490": "Taiwan (Other Asia, nes)",
    "899": "Areas, nes",
    "837": "Bunkers",
    "838": "Free zones",
    "839": "Special categories",
    "568": "Other Europe, nes",
    "577": "Other Africa, nes",
    "637": "North America, nes",
    "290": "Northern Africa, nes",
    "473": "LAIA, nes",
    "527": "Oceania, nes",
    "492": "Europe EU, nes",
    "842": "United States",
    "826": "United Kingdom",
    "410": "South Korea",
    "643": "Russia",
    "704": "Vietnam",
    "834": "Tanzania",
    "68": "Bolivia",
    "862": "Venezuela",
    "344": "Hong Kong SAR",
    "446": "Macao SAR",
    "417": "Kyrgyzstan",
    "418": "Laos",
    "462": "Maldives",
    "498": "Moldova",
    "807": "North Macedonia",
    "760": "Syria",
    "384": "Cote d'Ivoire",
    "180": "DR Congo",
    "408": "North Korea",
    "626": "Timor-Leste",
    "218": "Ecuador",
    "796": "Turks & Caicos",
}


def fetch(url, dest, force=False):
    """Download url to dest (skipping if cached), with a polite pause."""
    if os.path.exists(dest) and not force:
        print(f"  cached   {os.path.basename(dest)}")
        return
    print(f"  fetching {os.path.basename(dest)} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "valuechain.international data refresh script"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print("  rate-limited by Comtrade; waiting 60s and retrying once ...")
            time.sleep(60)
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read().decode("utf-8")
        else:
            raise
    if not body.strip().startswith("typeCode") and "typeCode" not in body[:2000] and not body.strip().startswith("{"):
        raise RuntimeError(f"Unexpected response for {url}: {body[:200]}")
    with open(dest, "w", encoding="utf-8") as f:
        f.write(body)
    time.sleep(PAUSE_SECONDS)


def api_url(**params):
    base = BASE
    if API_KEY:
        base = AUTH_BASE
        params["subscription-key"] = API_KEY
    params.setdefault("reporterCode", INDIA)
    params.setdefault("format", "csv")
    params.setdefault("includeDesc", "true")
    q = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{base}?{q}"


def read_rows(path):
    """Parse a cached Comtrade CSV response into a list of dicts."""
    with open(path, encoding="utf-8") as f:
        txt = f.read()
    start = txt.index("typeCode,")
    return list(csv.DictReader(io.StringIO(txt[start:])))


def world_value(rows, flow):
    for r in rows:
        if r["flowCode"] == flow and r["partnerCode"] == "0" and r["partner2Code"] == "0":
            return float(r["primaryValue"])
    return None


def latest_available_year():
    """Ask the API which recent year has data; fall back to last year."""
    this_year = date.today().year
    for y in (this_year, this_year - 1, this_year - 2):
        dest = os.path.join(RAW, f"probe_{y}.csv")
        try:
            fetch(api_url(cmdCode="TOTAL", flowCode="X", partnerCode="0",
                          partner2Code="0", period=y), dest)
            rows = read_rows(dest)
            if world_value(rows, "X"):
                return y
        except Exception:
            continue
    raise RuntimeError("Could not determine the latest available year from Comtrade.")


def do_fetch(force=False):
    os.makedirs(RAW, exist_ok=True)
    latest = latest_available_year()
    years = list(range(latest - N_YEARS + 1, latest + 1))
    print(f"Latest full year with data: {latest}. Trend window: {years[0]}-{latest}.")

    # 1) Yearly totals (exports and imports, one small call per year)
    totals = []
    for y in years:
        dest = os.path.join(RAW, f"totals_{y}.csv")
        fetch(api_url(cmdCode="TOTAL", flowCode="X,M", partnerCode="0,899",
                      partner2Code="0", period=y), dest, force)
        rows = read_rows(dest)
        x, m = world_value(rows, "X"), world_value(rows, "M")
        if x is None or m is None:
            raise RuntimeError(f"Missing world total for {y} (X={x}, M={m}).")
        totals.append((y, x, m))

    # 2) Partner rankings for the latest year
    for flow, name in (("X", "partners_exports"), ("M", "partners_imports")):
        dest = os.path.join(RAW, f"{name}_{latest}.csv")
        fetch(api_url(cmdCode="TOTAL", flowCode=flow, partner2Code="0",
                      period=latest), dest, force)

    # 3) HS 2-digit products for the latest year
    for flow, name in (("X", "hs2_exports"), ("M", "hs2_imports")):
        dest = os.path.join(RAW, f"{name}_{latest}.csv")
        fetch(api_url(cmdCode="AG2", flowCode=flow, partnerCode="0",
                      partner2Code="0", period=latest), dest, force)

    # 4) Country-name reference file
    fetch("https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json",
          os.path.join(RAW, "partnerAreas.json"), force)

    # Write the totals extract so --process-only can run without refetching
    with open(os.path.join(RAW, "yearly_totals.csv"), "w", encoding="utf-8") as f:
        f.write("year,flow,value_usd\n")
        for y, x, m in totals:
            f.write(f"{y},X,{x}\n{y},M,{m}\n")
    return latest


def partner_names():
    path = os.path.join(RAW, "partnerAreas.json")
    names = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            txt = f.read()
        txt = txt[txt.index("{"):]
        try:
            data = json.loads(txt)
        except json.JSONDecodeError:
            # Tolerate a truncated download: keep complete entries only.
            cut = txt.rfind("},")
            data = json.loads(txt[:cut + 1] + "]}") if cut > 0 else {"results": []}
        for e in data.get("results", []):
            names[str(e.get("PartnerCode") or e.get("id"))] = e.get("PartnerDesc") or e.get("text")
    names.update(NAME_OVERRIDES)
    return names


def load_partner_csv(path, flow, names):
    """Return (world_total, [(code, name, value)] sorted desc, excluding World)."""
    rows = read_rows(path)
    world, partners = None, {}
    for r in rows:
        if r["flowCode"] != flow or r["partner2Code"] != "0":
            continue
        code, val = r["partnerCode"], float(r["primaryValue"])
        if code == "0":
            world = val
        else:
            partners[code] = max(val, partners.get(code, 0))
    ranked = sorted(partners.items(), key=lambda kv: -kv[1])
    # Prefer reference names, then the row's own description, then the code.
    out = []
    desc_by_code = {r["partnerCode"]: (r.get("partnerDesc") or "").strip() for r in rows}
    for c, v in ranked:
        out.append({"code": c, "name": names.get(c) or desc_by_code.get(c) or f"Area {c}", "value": v})
    return world, out


def load_hs2_csv(path, flow=None):
    """Return {hs2: value}. Accepts either a raw Comtrade response or the
    simple two-column extract format (hs2,value_usd)."""
    with open(path, encoding="utf-8") as f:
        head = f.read(200)
    if head.startswith("hs2,"):
        with open(path, encoding="utf-8") as f:
            return {r["hs2"]: float(r["value_usd"]) for r in csv.DictReader(f)}
    rows = read_rows(path)
    vals = {}
    for r in rows:
        if flow and r["flowCode"] != flow:
            continue
        if r["partnerCode"] == "0" and r["partner2Code"] == "0":
            vals[r["cmdCode"]] = float(r["primaryValue"])
    return vals


def pick(*candidates):
    for p in candidates:
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"None of these files exist: {candidates}")


# ---------------------------------------------------------------- Session 2
# Head-to-head: US and EU imports by value chain from IN/CN/VN/BD.
H2H_CHAINS = {
    "textiles":    {"label": "Textiles & apparel", "hs": [f"{i:02d}" for i in range(50, 64)]},
    "pharma":      {"label": "Pharmaceuticals",    "hs": ["30"]},
    "leather":     {"label": "Leather & footwear", "hs": ["41", "42", "43", "64"]},
    "electronics": {"label": "Electronics",        "hs": ["85"]},
}
H2H_EXPORTERS = {"699": "india", "156": "china", "704": "vietnam", "50": "bangladesh"}
H2H_MARKETS = {"usa": ("842", "United States"), "eu": ("97", "European Union (extra-EU)")}
H2H_ALL_HS = sorted({h for c in H2H_CHAINS.values() for h in c["hs"]})
# Extra heavyweight chapters for the "Custom" product picker (with the chain
# chapters this covers the 40 largest product groups in US/EU imports).
H2H_EXTRA_HS = ["27", "29", "33", "39", "40", "44", "48", "69", "70", "71",
                "72", "73", "76", "82", "84", "87", "88", "90", "94", "95"]


def do_fetch_h2h(latest, force=False):
    """Fetch importer-side data for the head-to-head page.
    The preview endpoint truncates large responses, so chapters are fetched
    in two batches per market-year."""
    years = list(range(latest - N_YEARS + 1, latest + 1))
    batches = [H2H_ALL_HS[:len(H2H_ALL_HS)//2], H2H_ALL_HS[len(H2H_ALL_HS)//2:],
               H2H_EXTRA_HS[:10], H2H_EXTRA_HS[10:]]
    partners = "0," + ",".join(H2H_EXPORTERS)
    for mkey, (code, _) in H2H_MARKETS.items():
        for y in years:
            for i, batch in enumerate(batches):
                dest = os.path.join(RAW, f"h2h_{mkey}_{y}_b{i}.csv")
                params = dict(reporterCode=code, period=y, flowCode="M",
                              cmdCode=",".join(batch), partnerCode=partners)
                if mkey == "eu":
                    # The EU splits records by customs procedure; asking for
                    # the C00 totals keeps responses small and complete.
                    params["customsCode"] = "C00"
                fetch(api_url(**params), dest, force)


def process_h2h(latest):
    import glob as _glob
    years = list(range(latest - N_YEARS + 1, latest + 1))

    def load_all(mkey):
        acc = {}
        for path in sorted(_glob.glob(os.path.join(RAW, f"h2h_{mkey}_*.csv"))):
            with open(path, encoding="utf-8") as f:
                txt = f.read()
            if "typeCode," not in txt:
                continue
            for r in csv.DictReader(io.StringIO(txt[txt.index("typeCode,"):])):
                if r.get("flowCode") != "M" or not r.get("primaryValue"):
                    continue
                if r.get("partner2Code") not in ("0", None, ""):
                    continue  # keep world-as-second-partner rows only
                try:
                    y, v = int(r["refYear"]), float(r["primaryValue"])
                except (TypeError, ValueError):
                    continue
                key = (r["partnerCode"], r["cmdCode"])
                cust = (r.get("customsCode") or "C00").strip()
                acc.setdefault(y, {}).setdefault(key, {})[cust] = v
        # The EU reports separate customs procedures (C01 home use, C06/C07
        # processing); prefer the C00 total row, else sum the procedures.
        return {y: {k: (byc["C00"] if "C00" in byc else sum(byc.values()))
                    for k, byc in d.items()} for y, d in acc.items()}

    series = {}
    for mkey in H2H_MARKETS:
        series[mkey] = {}
        data = load_all(mkey)
        for chain, cfg in H2H_CHAINS.items():
            s = {"world": [], "india": [], "china": [], "vietnam": [], "bangladesh": []}
            for y in years:
                vals = data.get(y, {})
                s["world"].append(sum(vals.get(("0", h), 0) for h in cfg["hs"]))
                for code, name in H2H_EXPORTERS.items():
                    s[name].append(sum(vals.get((code, h), 0) for h in cfg["hs"]))
            series[mkey][chain] = s

    # Per-chapter series for the "Custom" product picker.
    picker_hs = sorted(set(H2H_ALL_HS) | set(H2H_EXTRA_HS))
    chapters = {h: HS2_LABELS.get(h, f"HS {h}") for h in picker_hs}
    chapter_series = {}
    for mkey in H2H_MARKETS:
        data = load_all(mkey)
        chapter_series[mkey] = {}
        for hs in picker_hs:
            s = {"world": [], "india": [], "china": [], "vietnam": [], "bangladesh": []}
            for y in years:
                vals = data.get(y, {})
                s["world"].append(vals.get(("0", hs), 0))
                for code, name in H2H_EXPORTERS.items():
                    s[name].append(vals.get((code, hs), 0))
            chapter_series[mkey][hs] = s

    return {
        "years": years,
        "chains": {k: v["label"] for k, v in H2H_CHAINS.items()},
        "chain_hs": {k: v["hs"] for k, v in H2H_CHAINS.items()},
        "markets": {k: v[1] for k, v in H2H_MARKETS.items()},
        "exporters": {"india": "India", "china": "China", "vietnam": "Vietnam", "bangladesh": "Bangladesh"},
        "series": series,
        "chapters": chapters,
        "chapter_series": chapter_series,
    }


# ---------------------------------------------------------------- Session 3
# Product pages: India's 10-year trade by chapter + an importer panel.
S3_PANEL = {
    # key: (reporterCode, label). US/EU come from the head-to-head files.
    "china": ("156", "China"), "japan": ("392", "Japan"), "uk": ("826", "United Kingdom"),
    "korea": ("410", "South Korea"), "canada": ("124", "Canada"), "mexico": ("484", "Mexico"),
    "australia": ("36", "Australia"), "uae": ("784", "United Arab Emirates"),
    "saudi": ("682", "Saudi Arabia"), "singapore": ("702", "Singapore"),
    "hongkong": ("344", "Hong Kong SAR"), "brazil": ("76", "Brazil"),
}


def do_fetch_s3(latest, force=False):
    years = list(range(latest - N_YEARS + 1, latest + 1))
    # India's exports+imports by chapter, one call per year
    for y in years:
        dest = os.path.join(RAW, f"india_hs2_{y}.csv")
        fetch(api_url(reporterCode=INDIA, period=y, flowCode="X,M",
                      cmdCode="AG2", partnerCode="0", partner2Code="0"), dest, force)
    # Importer panel: latest available year per market (falls back 2 years).
    # motCode=0 keeps reporters that split by mode of transport to totals.
    for mkey, (code, _) in S3_PANEL.items():
        got = False
        for y in (latest, latest - 1, latest - 2):
            dest = os.path.join(RAW, f"panel_{mkey}_{y}.csv")
            if os.path.exists(dest) and not force:
                got = True; break
            try:
                fetch(api_url(reporterCode=code, period=y, flowCode="M",
                              cmdCode="AG2", partnerCode="0,699",
                              partner2Code="0", motCode="0"), dest, force)
                with open(dest, encoding="utf-8") as f:
                    if len(f.read().splitlines()) > 40:
                        got = True; break
                os.remove(dest)
            except Exception:
                pass
        if not got:
            print(f"  WARNING: no recent data for panel market {mkey}")


def process_s3(latest):
    import glob as _glob
    years = list(range(latest - N_YEARS + 1, latest + 1))
    picker = sorted(set(H2H_ALL_HS) | set(H2H_EXTRA_HS))
    chapters = {h: HS2_LABELS.get(h, f"HS {h}") for h in picker}

    def rows_of(path):
        with open(path, encoding="utf-8") as f:
            txt = f.read()
        if "typeCode," not in txt:
            return []
        return list(csv.DictReader(io.StringIO(txt[txt.index("typeCode,"):])))

    # India trend
    trend = {hs: {"exports": [0]*len(years), "imports": [0]*len(years)} for hs in picker}
    for path in _glob.glob(os.path.join(RAW, "india_hs2_*.csv")) + \
                [os.path.join(RAW, f"hs2_{k}_{latest}.csv") for k in ("exports", "imports")]:
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            head = f.read(200)
        if head.startswith("hs2,"):  # simple two-column extract for the latest year
            key = "exports" if "exports" in path else "imports"
            for r in csv.DictReader(open(path, encoding="utf-8")):
                if r["hs2"] in trend:
                    trend[r["hs2"]][key][years.index(latest)] = float(r["value_usd"])
            continue
        for r in rows_of(path):
            if r.get("partnerCode") != "0" or r.get("partner2Code") not in ("0", None, ""):
                continue
            hs = r["cmdCode"]
            if hs not in trend:
                continue
            try:
                y, v = int(r["refYear"]), float(r["primaryValue"])
            except (TypeError, ValueError):
                continue
            if y in years:
                trend[hs]["exports" if r["flowCode"] == "X" else "imports"][years.index(y)] = v

    # Importer panel (incl. US/EU from the head-to-head raw files)
    markets = {}
    panel_all = dict(S3_PANEL)
    panel_all["usa"] = ("842", "United States")
    panel_all["eu"] = ("97", "European Union")
    for mkey, (_, label) in panel_all.items():
        if mkey in ("usa", "eu"):
            # sorted() is load-bearing: later files overwrite earlier ones for
            # the same (partner, chapter) key, so patch files must be named to
            # sort last (see data/raw/h2h_eu_zz_patch_*.csv).
            paths, yr = sorted(_glob.glob(os.path.join(RAW, f"h2h_{mkey}_*.csv"))), latest
        else:
            paths = sorted(_glob.glob(os.path.join(RAW, f"panel_{mkey}_*.csv")), reverse=True)[:1]
            if not paths:
                continue
            yr = int(paths[0].rsplit("_", 1)[1].split(".")[0])
        acc = {}
        for path in paths:
            for r in rows_of(path):
                if r.get("flowCode") != "M" or not r.get("primaryValue"):
                    continue
                if r.get("partner2Code") not in ("0", None, ""):
                    continue
                mot = (r.get("motCode") or "0").strip()
                try:
                    if int(r["refYear"]) != yr:
                        continue
                    v = float(r["primaryValue"])
                except (TypeError, ValueError):
                    continue
                hs = r["cmdCode"]
                if hs not in chapters:
                    continue
                cust = (r.get("customsCode") or "C00").strip()
                acc.setdefault((r["partnerCode"], hs), {}).setdefault(mot, {})[cust] = v
        flat = {}
        for k, bymot in acc.items():
            byc = bymot.get("0") or bymot[sorted(bymot)[0]]
            flat[k] = byc["C00"] if "C00" in byc else sum(byc.values())
        markets[mkey] = {"label": label, "year": yr,
                         "series": {hs: {"world": flat.get(("0", hs), 0),
                                         "india": flat.get(("699", hs), 0)} for hs in picker}}

    return {"years": years, "chapters": chapters, "india_trend": trend, "markets": markets}


# ---------------------------------------------------------------- Session 4
# Sourcing view: world's largest exporters per chapter + India's suppliers.
S4_EXPORTERS = {
    "china": ("156", "China"), "usa": ("842", "United States"),
    "germany": ("276", "Germany"), "japan": ("392", "Japan"),
    "korea": ("410", "South Korea"), "netherlands": ("528", "Netherlands"),
    "italy": ("380", "Italy"), "france": ("251", "France"),
    "vietnam": ("704", "Vietnam"), "mexico": ("484", "Mexico"),
    "uk": ("826", "United Kingdom"), "switzerland": ("757", "Switzerland"),
    "saudi": ("682", "Saudi Arabia"), "indonesia": ("360", "Indonesia"),
    "australia": ("36", "Australia"),
}
# India's imports by supplier: four 10-chapter batches with tuned partner sets.
S4_IN_BATCHES = [
    ("b1", "27,29,39,71,72,73,76,84,87,88", "156,643,784,842,682,368,410,392,757,276"),
    ("b2", "33,40,44,48,69,70,82,90,94,95", "156,842,276,392,410,764,704,360,757,784"),
    ("b3", "30,41,42,43,50,51,52,53,54,55", "156,380,276,842,704,764,360,392,50,410"),
    ("b4", "56,57,58,59,60,61,62,63,64,85", "156,704,50,764,360,410,392,842,276,784"),
]


def do_fetch_s4(latest, force=False):
    for name, chapters, partners in S4_IN_BATCHES:
        dest = os.path.join(RAW, f"india_suppliers_{name}.csv")
        fetch(api_url(reporterCode=INDIA, period=latest, flowCode="X,M",
                      cmdCode=chapters, partnerCode=partners, partner2Code="0"),
              dest, force)
    for key, (code, _) in S4_EXPORTERS.items():
        got = False
        for y in (latest, latest - 1, latest - 2):
            dest = os.path.join(RAW, f"exp_{key}_{y}.csv")
            if os.path.exists(dest) and not force:
                got = True; break
            try:
                fetch(api_url(reporterCode=code, period=y, flowCode="X,M",
                              cmdCode="AG2", partnerCode="0", partner2Code="0",
                              motCode="0"), dest, force)
                with open(dest, encoding="utf-8") as f:
                    if len(f.read().splitlines()) > 40:
                        got = True; break
                os.remove(dest)
            except Exception:
                pass
        if not got:
            print(f"  WARNING: no recent exports data for {key}")


def process_s4(latest):
    import glob as _glob
    pp = process_s3(latest)
    LABELS, PICKER = pp["chapters"], sorted(pp["chapters"])

    def rows_of(path):
        with open(path, encoding="utf-8") as f:
            txt = f.read()
        if "typeCode," not in txt:
            return []
        return list(csv.DictReader(io.StringIO(txt[txt.index("typeCode,"):])))

    world_suppliers = {}
    for key, (_, label) in S4_EXPORTERS.items():
        files = sorted(_glob.glob(os.path.join(RAW, f"exp_{key}_*.csv")))
        if not files:
            continue
        years = []
        for f in files:
            stem = os.path.basename(f).rsplit(".", 1)[0]
            for part in stem.split("_"):
                if part.isdigit():
                    years.append(int(part))
        yr = max(years)
        acc = {}
        for path in files:
            for r in rows_of(path):
                if r.get("flowCode") != "X" or not r.get("primaryValue"):
                    continue
                if r.get("partnerCode") != "0" or r.get("partner2Code") not in ("0", None, ""):
                    continue
                try:
                    if int(r["refYear"]) != yr:
                        continue
                    v = float(r["primaryValue"])
                except (TypeError, ValueError):
                    continue
                hs = r["cmdCode"]
                if hs not in LABELS:
                    continue
                mot = (r.get("motCode") or "0").strip()
                cust = (r.get("customsCode") or "C00").strip()
                acc.setdefault(hs, {}).setdefault(mot, {})[cust] = v
        flat = {}
        for hs, bymot in acc.items():
            byc = bymot.get("0") or bymot[sorted(bymot)[0]]
            flat[hs] = byc["C00"] if "C00" in byc else sum(byc.values())
        world_suppliers[key] = {"label": label, "year": yr,
                                "exports": {h: int(round(v)) for h, v in flat.items()}}
    # India as an exporter, from the S1 extract
    p = os.path.join(RAW, f"hs2_exports_{latest}.csv")
    if os.path.exists(p):
        ind = {r["hs2"]: int(float(r["value_usd"]))
               for r in csv.DictReader(open(p, encoding="utf-8")) if r["hs2"] in LABELS}
        world_suppliers["india"] = {"label": "India", "year": latest, "exports": ind}

    nice_names = {"Rep. of Korea": "South Korea", "Viet Nam": "Vietnam", "USA": "United States",
                  "Russian Federation": "Russia", "China, Hong Kong SAR": "Hong Kong SAR",
                  "United Rep. of Tanzania": "Tanzania"}
    india_sup = {}
    for path in _glob.glob(os.path.join(RAW, "india_suppliers_b*.csv")):
        for r in rows_of(path):
            if r.get("flowCode") != "M" or not r.get("primaryValue"):
                continue
            if r.get("partner2Code") not in ("0", None, ""):
                continue
            hs = r["cmdCode"]
            if hs not in LABELS:
                continue
            try:
                v = float(r["primaryValue"])
            except (TypeError, ValueError):
                continue
            name = (r.get("partnerDesc") or r["partnerCode"]).strip()
            india_sup.setdefault(hs, {})[nice_names.get(name, name)] = int(round(v))

    return {
        "chapters": LABELS,
        "years": pp["years"],
        "india_world_imports": {h: int(round(pp["india_trend"][h]["imports"][-1])) for h in PICKER},
        "india_import_trend": {h: [int(round(v)) for v in pp["india_trend"][h]["imports"]] for h in PICKER},
        "india_suppliers": india_sup,
        "world_suppliers": world_suppliers,
    }


# ---------------------------------------------------------------------------
# Session 5/6 — Explainers: bilateral trade (India vs one partner, total trade)
# ---------------------------------------------------------------------------
# One call per year per flow: reporter India, cmdCode=TOTAL, ALL partners.
# ~220 rows per response — safely under the free tier's row cap.

BILAT_FIRST_YEAR = 2016


def do_fetch_bilat(latest, force=False):
    print("\nFetching bilateral totals (explainers page) ...")
    for y in range(BILAT_FIRST_YEAR, latest + 1):
        for flow in ("X", "M"):
            dest = os.path.join(RAW, f"bilat_{flow.lower()}_{y}.csv")
            fetch(api_url(period=y, flowCode=flow, cmdCode="TOTAL",
                          partner2Code=0), dest, force)


def process_bilat(latest):
    """data for the country picker on explainers.html:
    {years, partners: {code: {name, exports: [...], imports: [...]}}}"""
    years = list(range(BILAT_FIRST_YEAR, latest + 1))
    nice = {"Rep. of Korea": "South Korea", "Viet Nam": "Vietnam", "USA": "United States",
            "Russian Federation": "Russia", "China, Hong Kong SAR": "Hong Kong SAR",
            "United Rep. of Tanzania": "Tanzania", "Türkiye": "Turkey",
            "Dem. Rep. of the Congo": "DR Congo", "Lao People's Dem. Rep.": "Laos",
            "Syrian Arab Republic": "Syria", "Iran (Islamic Rep. of)": "Iran",
            "Dem. People's Rep. of Korea": "North Korea",
            "Bolivia (Plurinational State of)": "Bolivia",
            "Venezuela (Bolivarian Rep. of)": "Venezuela",
            "United States Minor Outlying Isl.": "US Minor Outlying Islands"}
    partners = {}
    for i, y in enumerate(years):
        for flow, key in (("X", "exports"), ("M", "imports")):
            p = os.path.join(RAW, f"bilat_{flow.lower()}_{y}.csv")
            if not os.path.exists(p):
                continue
            for r in read_rows(p):
                code = r.get("partnerCode")
                if code in ("0", None, ""):   # 0 = World row
                    continue
                if code == INDIA:             # India is not its own partner
                    continue
                if r.get("partner2Code") not in ("0", None, ""):
                    continue
                try:
                    v = float(r.get("primaryValue") or 0)
                except (TypeError, ValueError):
                    continue
                name = (r.get("partnerDesc") or code).strip()
                d = partners.setdefault(code, {"name": nice.get(name, name),
                                               "exports": [0] * len(years),
                                               "imports": [0] * len(years)})
                if name and d["name"] == code:
                    d["name"] = nice.get(name, name)
                d[key][i] = int(round(v))
    # keep countries with meaningful trade: >= $50m total in the latest year
    keep = {c: d for c, d in partners.items()
            if d["exports"][-1] + d["imports"][-1] >= 50_000_000}
    return {"years": years, "partners": keep}


def do_process():
    names = partner_names()

    # ---- BUILD EVERYTHING IN MEMORY FIRST -------------------------------
    # Nothing touches data/ until validate_all() passes, so a bad fetch can
    # never overwrite a good site.
    with open(os.path.join(RAW, "yearly_totals.csv"), encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    years = sorted({int(r["year"]) for r in rows})
    latest = years[-1]
    trend = {
        "years": years,
        "exports": [next(float(r["value_usd"]) for r in rows if int(r["year"]) == y and r["flow"] == "X") for y in years],
        "imports": [next(float(r["value_usd"]) for r in rows if int(r["year"]) == y and r["flow"] == "M") for y in years],
    }

    built = {"trend": trend}

    for flow, key in (("X", "exports"), ("M", "imports")):
        path = pick(os.path.join(RAW, f"partners_{key}_{latest}.csv"))
        world, ranked = load_partner_csv(path, flow, names)
        top = ranked[:TOP_N_PARTNERS]
        others = (world or sum(r["value"] for r in ranked)) - sum(r["value"] for r in top)
        built[f"partners_{key}"] = {"year": latest, "world_total": world,
                                    "rows": top, "others": max(others, 0)}

    for flow, key in (("X", "exports"), ("M", "imports")):
        path = pick(os.path.join(RAW, f"hs2_{key}_{latest}.csv"))
        vals = load_hs2_csv(path, flow)
        rows2 = [{"hs2": c, "label": HS2_LABELS.get(c, f"HS {c}"), "value": v}
                 for c, v in sorted(vals.items(), key=lambda kv: -kv[1])]
        built[f"products_{key}"] = {"year": latest, "rows": rows2}

    built["headtohead"] = process_h2h(latest)
    built["productpages"] = process_s3(latest)
    built["sourcing"] = process_s4(latest)
    built["bilateral"] = process_bilat(latest)

    # ---- GATE ------------------------------------------------------------
    row_counts = validate_all(built, years)

    # ---- ONLY NOW WRITE --------------------------------------------------
    meta = {
        "latest_year": latest,
        "data_as_of": date.today().strftime("%B %Y"),
        "source": "UN Comtrade",
        "reporter": "India",
        "generated": date.today().isoformat(),
        "refreshed_at": _utc_now(),
        "script_version": SCRIPT_VERSION,
        "periods": {
            "comtrade": f"calendar year {latest}",
            "comtrade_window": f"{years[0]}–{latest}",
            "dgcis_quarter": DGCIS_QUARTER,
            "dgcis_full_year": DGCIS_FULL_YEAR,
            "dgcis_all_states": DGCIS_ALL_STATES,
        },
        "row_counts": row_counts,
    }

    def dump(fname, obj):
        with open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        print(f"  wrote data/{fname}")

    dump("meta.json", meta)
    dump("trend.json", trend)
    for flow, key in (("X", "exports"), ("M", "imports")):
        dump(f"partners_{key}.json", built[f"partners_{key}"])
        dump(f"products_{key}.json", built[f"products_{key}"])
    dump("headtohead.json", built["headtohead"])
    dump("productpages.json", built["productpages"])
    dump("sourcing.json", built["sourcing"])

    dump("bilateral.json", built["bilateral"])

    # Bundle the numbers into small .js files so the site also works when an
    # HTML file is opened directly (file://), where fetch() is blocked.
    # Each page loads vc_core.js plus its own file.
    core_keys = ["meta", "trend", "partners_exports", "partners_imports",
                 "products_exports", "products_imports"]
    core = {k: json.load(open(os.path.join(OUT, k + ".json"), encoding="utf-8")) for k in core_keys}
    with open(os.path.join(OUT, "vc_core.js"), "w", encoding="utf-8") as f:
        f.write("window.VC_DATA = " + json.dumps(core, ensure_ascii=False) + ";\n")
    for key, fname in (("headtohead", "vc_h2h.js"), ("productpages", "vc_products.js"),
                       ("sourcing", "vc_sourcing.js"), ("bilateral", "vc_bilat.js")):
        obj = json.load(open(os.path.join(OUT, key + ".json"), encoding="utf-8"))
        with open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
            f.write(f"window.VC_DATA.{key} = " + json.dumps(obj, ensure_ascii=False) + ";\n")
    print("  wrote data/vc_core.js, data/vc_h2h.js, data/vc_products.js, data/vc_sourcing.js, data/vc_bilat.js")

    print("Done. The website reads the data/vc_*.js files.")


if __name__ == "__main__":
    args = set(sys.argv[1:])
    os.makedirs(RAW, exist_ok=True)
    strict = "--strict" in args          # used by CI: any fetch failure aborts
    if "--process-only" not in args:
        try:
            latest = do_fetch(force="--force" in args)
            do_fetch_h2h(latest, force="--force" in args)
            do_fetch_s3(latest, force="--force" in args)
            do_fetch_s4(latest, force="--force" in args)
            do_fetch_bilat(latest, force="--force" in args)
        except Exception as e:
            if strict:
                print(f"\nFETCH FAILED: {e}")
                sys.exit(1)
            print(f"\nWARNING: fetching failed ({e}).")
            print("Falling back to whatever is cached in data/raw/.\n")
    try:
        do_process()
    except ValidationError as e:
        print(f"\nAborted: {e}")
        print("Nothing was written. The site keeps serving the previous data.")
        sys.exit(1)
