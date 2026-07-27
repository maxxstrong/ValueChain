#!/usr/bin/env python3
"""
Build step for valuechain.international.

Everything a crawler, a link preview or a reader-without-JavaScript needs is
written into the served HTML here, from the data files — never by hand:

  * headline stat cards rendered into the raw HTML (JS hydrates over them)
  * a freshness line under every page title, from data/meta.json
  * Open Graph / Twitter tags, plus a generated og:image per page
  * sitemap.xml and robots.txt

Idempotent: it rewrites the regions between marker comments, so it can run
on every deploy. Run after scripts/fetch_data.py:

    python3 scripts/build_pages.py
"""

import json
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
SITE = "https://valuechain.international"

# --------------------------------------------------------------- data loading


def load_json(name):
    with open(os.path.join(DATA, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def load_js_blob(filename, prefix):
    """Read one of the window.VC_DATA.* bundles without executing JS."""
    path = os.path.join(DATA, filename)
    with open(path, encoding="utf-8") as f:
        text = f.read()
    start = text.index(prefix) + len(prefix)
    end = text.rindex(";")
    return json.loads(text[start:end].strip())


# ------------------------------------------------------------------ formatting


def bn(v):
    return v / 1e9


def fmt_bn(v, dp=1):
    """Mirrors fmtBn() in js/main.js so static and hydrated values agree."""
    return "$" + f"{bn(v):,.{dp}f}" + " bn"


def fmt_bn_short(v):
    """Mirrors fmtBnShort() in the page scripts."""
    b = bn(v)
    return ("$" + str(round(b)) if b >= 100 else "$" + f"{b:.1f}") + " bn"


# ------------------------------------------------------------------- page data


def compute_values(meta):
    """The exact figures each page's JS would produce on first paint."""
    trend = load_json("trend")
    n = len(trend["years"]) - 1
    year = meta["latest_year"]

    vals = {
        "kn-exports": fmt_bn(trend["exports"][n], 0),
        "kn-imports": fmt_bn(trend["imports"][n], 0),
        "kn-deficit": fmt_bn(trend["imports"][n] - trend["exports"][n], 0),
    }

    # products.html — default selection is the largest export chapter
    pp = load_js_blob("vc_products.js", "window.VC_DATA.productpages =")
    codes = sorted(pp["chapters"], key=lambda h: -pp["india_trend"][h]["exports"][n])
    hs = codes[0]
    t = pp["india_trend"][hs]
    growth = (100 * (t["exports"][n] - t["exports"][0]) / t["exports"][0]) if t["exports"][0] else 0
    ranked = sorted(
        ({"label": m["label"], "world": m["series"][hs]["world"], "india": m["series"][hs]["india"]}
         for m in pp["markets"].values()),
        key=lambda r: -r["world"])
    top = ranked[0] if ranked else None
    vals["chip-x"] = fmt_bn_short(t["exports"][n])
    vals["chip-growth"] = ("+" if growth >= 0 else "") + str(round(growth)) + "%"
    vals["chip-gap"] = (f"{top['label']}: {100 * top['india'] / top['world']:.1f}%"
                        if top and top["world"] else "–")
    vals["_products_default"] = pp["chapters"][hs]

    # sourcing.html — default selection is the largest import bill
    src = load_js_blob("vc_sourcing.js", "window.VC_DATA.sourcing =")
    scodes = sorted(src["chapters"], key=lambda h: -(src["india_world_imports"].get(h) or 0))
    shs = scodes[0]
    total = src["india_world_imports"].get(shs) or 0
    strend = src["india_import_trend"][shs]
    sgrowth = round(100 * (strend[n] - strend[0]) / strend[0]) if strend[0] else 0
    sup = src["india_suppliers"].get(shs, {})
    stop = max(sup.items(), key=lambda kv: kv[1]) if sup else None
    vals["chip-m"] = fmt_bn_short(total)
    vals["chip-mgrowth"] = ("+" if sgrowth >= 0 else "") + str(sgrowth) + "%"
    vals["chip-dep"] = f"{stop[0]}: {100 * stop[1] / total:.0f}%" if stop and total else "–"
    vals["_sourcing_default"] = src["chapters"][shs]

    # head-to-head.html — country card defaults to the largest trade partner
    bil = load_js_blob("vc_bilat.js", "window.VC_DATA.bilateral =")
    bn_ = len(bil["years"]) - 1
    code, part = max(bil["partners"].items(),
                     key=lambda kv: kv[1]["exports"][bn_] + kv[1]["imports"][bn_])
    bal = part["exports"][bn_] - part["imports"][bn_]
    vals["bilat-title"] = f"India &amp; {part['name']}"
    vals["bilat-x"] = fmt_bn_short(part["exports"][bn_])
    vals["bilat-m"] = fmt_bn_short(part["imports"][bn_])
    vals["bilat-bal"] = ("+" if bal >= 0 else "\u2212") + fmt_bn_short(abs(bal))[1:]
    vals["_bilat_default"] = part["name"]

    # states.html — from the hand-maintained DGCIS layer
    st = load_js_blob("vc_states.js", "window.VC_DATA.states =")
    q = st["quarter"]["rows"]
    vals["chip-guj"] = f"{round(q[0]['share'])}%"
    vals["chip-top3"] = f"{round(q[0]['share'] + q[1]['share'] + q[2]['share'])}%"
    vals["chip-dist"] = f"{round(sum(r['share'] for r in st['districts']['rows']))}%"
    vals["_year"] = year
    return vals


def freshness_line(meta):
    p = meta["periods"]
    built = date.today().strftime("%-d %B %Y") if os.name != "nt" else date.today().strftime("%d %B %Y")
    return (f"Trade data: UN Comtrade, {p['comtrade']} "
            f"(series {p['comtrade_window']}). "
            f"State data: DGCIS / NIRYAT, {p['dgcis_quarter']} and {p['dgcis_full_year']}. "
            f"Page built {built}.")


# ----------------------------------------------------------------- page config
# title/description/og feed the head tags; headline is drawn on the og:image.

PAGES = {
    "index.html": {
        "title": "India in Global Value Chains — trade data atlas",
        "desc": "Where India sits in world trade: who buys from India, who India buys from, "
                "and how it is changing. Built on UN Comtrade data, free to download.",
        "headline": "Where does India sit in world trade?",
    },
    "head-to-head.html": {
        "title": "India vs China, Vietnam & Bangladesh — market share head to head",
        "desc": "Who is winning in the US and EU markets: India against China, Vietnam and "
                "Bangladesh across 40 product groups and ten years of trade data.",
        "headline": "India vs the competition",
    },
    "products.html": {
        "title": "Product pages — India's exports and the world's buyers",
        "desc": "Pick a product: India's export trend, the world's biggest import markets for "
                "it, and India's share in each. The gap is the opportunity.",
        "headline": "Pick a product. Find the gap.",
    },
    "sourcing.html": {
        "title": "Sourcing view — who supplies the world, and India",
        "desc": "For any product group: who supplies the world with it, and exactly where "
                "India's own import bill goes, supplier by supplier.",
        "headline": "Where does it come from?",
    },
    "states.html": {
        "title": "India's export states and districts",
        "desc": "Which Indian states and districts actually do the exporting — from Gujarat's "
                "refineries to Noida's phone factories. Official DGCIS and NIRYAT figures.",
        "headline": "Who inside India does the exporting?",
    },
    "explainers.html": {
        "title": "India's trade agreements and state export policies",
        "desc": "India's trade agreements sector by sector — UAE, Australia, EFTA, UK — and "
                "what each state government does to push exports.",
        "headline": "The deals and the policies",
    },
    "services.html": {
        "title": "Services — the other half of India's trade",
        "desc": "India's services exports are nearly as large as its goods exports, growing "
                "faster, and run a surplus that pays for most of the goods deficit. The half "
                "of Indian trade most charts leave out.",
        "headline": "The half most charts leave out",
    },
    "msme.html": {
        "title": "MSME export playbook — how to actually start exporting from India",
        "desc": "The real sequence to start exporting as a small business: IEC, Udyam, LUT, "
                "AD code, RCMC — with costs, timelines, certifications, how to get paid, and "
                "where MSMEs already win.",
        "headline": "You want to export. Where do you start?",
    },
    "research.html": {
        "title": "Research & open data — India's revealed advantage and trade gaps",
        "desc": "Revealed advantage, import dependence, export concentration and "
                "mirror-statistics gaps for India — with every dataset free to download "
                "under CC BY 4.0.",
        "headline": "Four things the raw numbers show",
    },
    "toolkit.html": {
        "title": "Exporter's toolkit — best markets, schemes, and where to apply",
        "desc": "Tell us what you export and where you are: your best markets ranked by "
                "opportunity, whether an FTA covers them, the schemes you likely qualify for, "
                "and the exact desk to walk into.",
        "headline": "What should you export, and where?",
    },
    "about.html": {
        "title": "About & methodology — ValueChain",
        "desc": "Who built this atlas, where every number comes from, how often it refreshes, "
                "what it deliberately excludes, and how to report an error.",
        "headline": "About & methodology",
    },
}

# ------------------------------------------------------------------- rewriting

MARK = {
    "head": ("<!--VC:HEAD-->", "<!--/VC:HEAD-->"),
    "fresh": ("<!--VC:FRESH-->", "<!--/VC:FRESH-->"),
}


def replace_block(html, kind, payload):
    open_m, close_m = MARK[kind]
    block = f"{open_m}{payload}{close_m}"
    if open_m in html and close_m in html:
        return re.sub(re.escape(open_m) + r".*?" + re.escape(close_m),
                      lambda _: block, html, flags=re.S)
    return None  # caller decides where to insert it


def head_tags(page, cfg, meta):
    url = f"{SITE}/" if page == "index.html" else f"{SITE}/{page}"
    img = f"{SITE}/og/{page.replace('.html', '')}.png"
    return (
        f'\n<link rel="canonical" href="{url}">'
        f'\n<meta property="og:type" content="website">'
        f'\n<meta property="og:site_name" content="ValueChain">'
        f'\n<meta property="og:title" content="{cfg["title"]}">'
        f'\n<meta property="og:description" content="{cfg["desc"]}">'
        f'\n<meta property="og:url" content="{url}">'
        f'\n<meta property="og:image" content="{img}">'
        f'\n<meta property="og:image:width" content="1200">'
        f'\n<meta property="og:image:height" content="630">'
        f'\n<meta name="twitter:card" content="summary_large_image">'
        f'\n<meta name="twitter:title" content="{cfg["title"]}">'
        f'\n<meta name="twitter:description" content="{cfg["desc"]}">'
        f'\n<meta name="twitter:image" content="{img}">'
        f'\n<meta name="author" content="ValueChain">'
        f'\n<meta name="robots" content="index, follow">'
        # Vercel Web Analytics: no cookies, no personal data, nothing to
        # consent to. Switch it on in the Vercel dashboard (Analytics tab);
        # until then this script simply 404s and costs nothing.
        f'\n<script defer src="/_vercel/insights/script.js"></script>'
        f'\n'
    )


def set_static_value(html, element_id, value):
    """Put a real number in the raw HTML where JS would later write one."""
    pattern = re.compile(
        r'(<(span|h1|h2|h3|div|b)[^>]*id="' + re.escape(element_id) + r'"[^>]*>)(.*?)(</\2>)', re.S)
    if not pattern.search(html):
        return html, False
    return pattern.sub(lambda m: m.group(1) + value + m.group(4), html, count=1), True


def build_page(page, cfg, meta, vals, fresh):
    path = os.path.join(ROOT, page)
    if not os.path.exists(path):
        print(f"  skip {page} (not found)")
        return False
    with open(path, encoding="utf-8") as f:
        html = f.read()
    original = html

    # 1. head tags
    tags = head_tags(page, cfg, meta)
    replaced = replace_block(html, "head", tags)
    if replaced is None:
        html = html.replace("</head>", f"{MARK['head'][0]}{tags}{MARK['head'][1]}\n</head>", 1)
    else:
        html = replaced

    # 2. description always matches the config
    html = re.sub(r'<meta name="description" content="[^"]*">',
                  f'<meta name="description" content="{cfg["desc"]}">', html, count=1)

    # 3. freshness line under the page title (inside the hero)
    line = (f'\n    <p class="freshness">{fresh}</p>\n    ')
    replaced = replace_block(html, "fresh", line)
    if replaced is None:
        m = re.search(r'(</h1>\s*)', html)
        if m:
            insert = f"{MARK['fresh'][0]}{line}{MARK['fresh'][1]}"
            html = html[:m.end()] + insert + html[m.end():]
    else:
        html = replaced

    # 4. headline numbers into the raw HTML
    for element_id, value in vals.items():
        if element_id.startswith("_"):
            continue
        html, _ = set_static_value(html, element_id, value)

    # 5. year placeholders (JS rewrites these identically)
    html = re.sub(r'(<span class="(?:latest-)?yr"[^>]*>)(.*?)(</span>)',
                  lambda m: m.group(1) + str(vals["_year"]) + m.group(3), html)
    html = re.sub(r'(<span class="latest-year"[^>]*>)(.*?)(</span>)',
                  lambda m: m.group(1) + str(vals["_year"]) + m.group(3), html)

    if html != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  built {page}")
        return True
    print(f"  unchanged {page}")
    return False


# ------------------------------------------------------------------ og images


def build_og_images(vals, meta):
    """A branded 1200x630 card per page, so links preview properly."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("  Pillow not installed — skipping og:image generation")
        return

    out = os.path.join(ROOT, "og")
    os.makedirs(out, exist_ok=True)

    def font(size, bold=False):
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif%s.ttf" % ("-Bold" if bold else ""),
            "/usr/share/fonts/truetype/liberation/LiberationSerif-%s.ttf" % ("Bold" if bold else "Regular"),
            "C:\\Windows\\Fonts\\georgia%s.ttf" % ("b" if bold else ""),
        ]
        for c in candidates:
            if os.path.exists(c):
                return ImageFont.truetype(c, size)
        return ImageFont.load_default()

    stats = {
        "index": [("Exports", vals["kn-exports"]), ("Imports", vals["kn-imports"]),
                  ("Deficit", vals["kn-deficit"])],
        "states": [("Gujarat", vals["chip-guj"]), ("Top 3 states", vals["chip-top3"]),
                   ("Top 10 districts", vals["chip-dist"])],
        "products": [("Exports", vals["chip-x"]), ("Growth", vals["chip-growth"])],
        "sourcing": [("Import bill", vals["chip-m"]), ("Growth", vals["chip-mgrowth"])],
        "head-to-head": [("Biggest partner", vals["_bilat_default"])],
    }

    for page, cfg in PAGES.items():
        key = page.replace(".html", "")
        img = Image.new("RGB", (1200, 630), "#17161a")
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, 1200, 8], fill="#c14e00")
        d.text((70, 70), "VALUECHAIN", font=font(28, True), fill="#ff8a3d")
        d.text((70, 112), "India in global value chains", font=font(24), fill="#8e8a84")

        # headline, wrapped by hand at a sane width
        words, lines, cur = cfg["headline"].split(), [], ""
        for w in words:
            trial = (cur + " " + w).strip()
            if len(trial) > 26:
                lines.append(cur)
                cur = w
            else:
                cur = trial
        lines.append(cur)
        y = 210
        for ln in lines[:3]:
            d.text((70, y), ln, font=font(64, True), fill="#ffffff")
            y += 76

        x = 70
        for label, value in stats.get(key, []):
            d.text((x, 470), str(value), font=font(46, True), fill="#ff8a3d")
            d.text((x, 528), label, font=font(22), fill="#8e8a84")
            x += 360

        d.text((70, 575), f"valuechain.international · UN Comtrade {meta['latest_year']}",
               font=font(22), fill="#6f6b66")
        img.save(os.path.join(out, f"{key}.png"), optimize=True)
    print(f"  wrote {len(PAGES)} og images to og/")


# ------------------------------------------------------------- sitemap / robots


def build_sitemap():
    today = date.today().isoformat()
    priority = {"index.html": "1.0"}
    entries = []
    for page in PAGES:
        if not os.path.exists(os.path.join(ROOT, page)):
            continue
        loc = f"{SITE}/" if page == "index.html" else f"{SITE}/{page}"
        entries.append(
            "  <url>\n"
            f"    <loc>{loc}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            "    <changefreq>monthly</changefreq>\n"
            f"    <priority>{priority.get(page, '0.8')}</priority>\n"
            "  </url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(entries) + "\n</urlset>\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(xml)

    robots = ("User-agent: *\n"
              "Allow: /\n"
              "\n"
              "# Data files are open — see the CC BY 4.0 licence in the footer.\n"
              f"Sitemap: {SITE}/sitemap.xml\n")
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(robots)
    print(f"  wrote sitemap.xml ({len(entries)} urls) and robots.txt")


def main():
    meta = load_json("meta")
    vals = compute_values(meta)
    fresh = freshness_line(meta)
    print("Building pages ...")
    print(f"  freshness: {fresh}")
    for page, cfg in PAGES.items():
        build_page(page, cfg, meta, vals, fresh)
    build_og_images(vals, meta)
    build_sitemap()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
