# ValueChain — India in Global Value Chains

An interactive, single-page data atlas of where India sits in world trade,
built on [UN Comtrade](https://comtradeplus.un.org/) data. Live at
**valuechain.international**.

There is no backend, no database and no login. The site is one HTML page
with interactive charts (Apache ECharts) drawn from a small data file that
lives in the repo. Nothing runs while you sleep.

## What's in the box

```
index.html               Story No. 1: India's Trade at a Glance (3 interactive charts)
head-to-head.html        Story No. 2: India vs China, Vietnam & Bangladesh
products.html            Story No. 3: Product pages — pick a product, find the gap
sourcing.html            Story No. 4: Sourcing view — who supplies the world, and India
explainers.html          Story No. 5: Explainers — trade agreements & state export policies
states.html              Story No. 6: States — which states & districts power exports
css/style.css            All styling
js/main.js               Charts for the main page
js/h2h.js                Charts for the head-to-head page
js/products.js           Charts for the product pages
data/vc_*.js             The numbers the site displays (one file per page)
data/*.json              The same numbers as individual JSON files
data/raw/                Cached raw API responses (so re-runs don't re-fetch)
scripts/fetch_data.py    The script that refreshes data/ from UN Comtrade
```

The chart library loads from a pinned CDN (jsDelivr, version 5.5.0).
Optional: if you ever want the site to work fully offline, download
https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js and save it
as `js/vendor/echarts.min.js` — the page will use the local copy
automatically whenever it is present.

## Looking at the site on your computer

Just **double-click `index.html`** — it opens in your browser and everything
works, charts and all. No server, no setup. (The chart library comes from a
CDN, so you need an internet connection the first time.)

## Refreshing the data (do this once or twice a year)

UN Comtrade publishes each year's annual figures a few months into the next
year. When a new year is out:

**Step 1 — run the fetch script.** In a terminal, from this folder:

```
python3 scripts/fetch_data.py
```

The script asks Comtrade which is the newest full year, downloads the
10-year trend, the partner rankings and the product tables, caches the raw
responses in `data/raw/`, and rewrites `data/data.js` (plus the JSON files).
It needs nothing installed beyond Python 3 itself, and it re-stamps every
chart with the current month automatically.

No API key is needed. If Comtrade ever tightens the free tier, get a free
key at https://comtradeapi.un.org, then run:

```
export COMTRADE_API_KEY=yourkeyhere
python3 scripts/fetch_data.py --force
```

**Step 2 — check it looks right.** Double-click `index.html` and eyeball
the charts.

**Step 3 — commit and push.** In the terminal:

```
git add data
git commit -m "Data refresh: <year>"
git push
```

**Fully automatic option:** the repo ships with a GitHub Action
(`.github/workflows/refresh-data.yml`) that re-runs the fetch script every
July 1st and pushes the fresh numbers itself — Vercel then redeploys. You
can also trigger it any time from GitHub → Actions → "Refresh trade data"
→ Run workflow. If Comtrade is down it fails safely, GitHub emails you,
and the site keeps serving the old data. The hand-curated files
(data/vc_states.js, data/vc_policies.js and the agreement cards in
explainers.html) are the only things the robot cannot update — give them
a once-a-year read.

**Step 4 — done.** Vercel notices the push and redeploys the site by
itself, usually within a minute. There is no step 5.

If the fetch fails halfway (Comtrade's free tier is rate-limited), just run
the script again — it skips everything already cached in `data/raw/`.

## Putting the site on the internet (first-time setup)

### A. Push the code to GitHub

1. Create a free account at https://github.com if you don't have one.
2. Click the **+** (top right) → **New repository**. Name it `valuechain`,
   leave everything else as default, click **Create repository**.
3. On your computer, in a terminal, from this folder:

   ```
   git init
   git add .
   git commit -m "ValueChain session 1"
   git branch -M main
   git remote add origin https://github.com/YOURUSERNAME/valuechain.git
   git push -u origin main
   ```

   (Replace `YOURUSERNAME`. GitHub will ask you to sign in the first time.)

### B. Deploy on Vercel (free)

1. Go to https://vercel.com and sign up **with your GitHub account**.
2. Click **Add New… → Project**, and pick the `valuechain` repository.
3. Framework preset: **Other**. Build command: leave **empty**.
   Output directory: leave **empty** (the site is served from the repo root).
4. Click **Deploy**. In about a minute you'll get a URL like
   `valuechain.vercel.app`. The site is now live.

From now on, every `git push` redeploys automatically.

### C. Point valuechain.international at Vercel

1. In Vercel, open the project → **Settings → Domains** → type
   `valuechain.international` → **Add**. Also add
   `www.valuechain.international` when prompted (Vercel will offer to
   redirect www to the bare domain — accept).
2. Vercel now shows you the DNS records it wants. They are:

   | Type  | Name (host) | Value                  |
   |-------|-------------|------------------------|
   | A     | `@`         | `76.76.21.21`          |
   | CNAME | `www`       | `cname.vercel-dns.com` |

   (Use exactly what Vercel's Domains page shows you — if it differs from
   this table, Vercel's page wins.)
3. Log in to the website of the **registrar** where you bought
   valuechain.international (e.g. Namecheap, GoDaddy, Porkbun). Find
   **DNS settings** / **Manage DNS** for the domain.
4. Delete any existing A or CNAME records for `@` and `www` (often a
   registrar "parking page"), then add the two records from the table.
5. Save. DNS changes take anywhere from a few minutes to 24 hours to
   spread. The Vercel Domains page will flip to a green "Valid
   Configuration" tick when it's working, and HTTPS certificates are
   issued automatically. Nothing else to do.

### Alternative: GitHub Pages (also free)

In the GitHub repository go to **Settings → Pages**, set Source to
**Deploy from a branch**, pick `main` and `/ (root)`, save. The site
appears at `https://YOURUSERNAME.github.io/valuechain/`. For the custom
domain, enter `valuechain.international` in the Custom domain box and, at
your registrar, create four A records for `@` pointing to
`185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
`185.199.111.153`, and a CNAME for `www` pointing to
`YOURUSERNAME.github.io`. Vercel is recommended because deploys are faster
and the DNS setup is simpler.

## Design & data notes

- Latest full year in the current data: **2025** (fetched July 2026).
- The three charts are interactive: the trend chart has US$ values /
  year-on-year growth / deficit modes and a zoom slider; partners and
  products flip between exports and imports; products also switch between
  a treemap of all ~97 product groups and top-10 bars. Every chart has a
  CSV download that follows whatever view is on screen.
- Exports are FOB, imports CIF — the universal convention, which is why
  import figures run slightly "hot" compared to FOB-based sources.
- Product groups are HS 2-digit chapters with shortened human labels
  (the map lives in `scripts/fetch_data.py`, edit freely).
- "Taiwan (Other Asia, nes)" is UN Comtrade's label for Taiwan.
- Session 1 uses trade **values** only. Comtrade quantity fields are patchy,
  so no unit-price analysis yet.
- The head-to-head page compares suppliers per value chain, for the four
  chains combined ("Overall"), or for any of the 40 largest HS 2-digit
  product groups via the "Custom" dropdown (roughly 97% of goods trade).
  Comtrade covers goods only — services trade is a separate statistical
  world and is not included.
- The head-to-head page measures market share from the importer's side:
  what the US (reporter 842) and the EU (reporter 97, extra-EU trade)
  report buying from each supplier, valued CIF. Value chains are HS 2-digit
  chapters: textiles & apparel 50–63, pharmaceuticals 30, leather &
  footwear 41–43 + 64, electronics 85. The EU splits records by customs
  procedure; the script prefers the C00 total row and otherwise sums the
  procedures. The Comtrade preview endpoint silently truncates long
  responses, so the script fetches chapters in two batches per market-year.
- The product pages combine India's own reported trade by chapter (the
  trend chart) with an importer panel of 14 major markets (the gap chart):
  US, EU (extra-EU), China, Japan, UK, South Korea, Canada, Mexico,
  Australia, UAE, Saudi Arabia, Singapore, Hong Kong and Brazil. Each
  market's latest available year is used (China 2024; UAE and Saudi 2023 as
  of this fetch) and marked on the chart. Some reporters split records by
  mode of transport; the script requests motCode=0 totals.
- The sourcing view shows, for each product, India's imports by supplier
  country (India's own reports, CIF) and the world's largest exporters of
  that product (each country's own reported exports, FOB, latest available
  year). Russia stopped reporting to Comtrade after 2021, so it appears in
  India's supplier chart but not the world-exporters ranking. A few small
  country-chapter cells are unavailable on the free API tier and omitted.
- The Explainers page (session 5) covers India's four modern trade
  agreements (UAE CEPA in force May 2022, Australia ECTA Dec 2022, EFTA
  TEPA Oct 2025, UK CETA July 2026) and a state export-policy picker.
  It also has a country picker: India's exports, imports and trade balance
  with any of ~160 partner countries, 2016–2025 (data/vc_bilat.js, fetched
  as two Comtrade calls per year — total goods trade, all partners). On the
  explainers page the picker also lists every India trade agreement with
  the selected country, newest first (the list lives in js/explainers.js —
  edit VC_AGREEMENTS there when a new agreement enters force). The same
  picker appears at the top of the head-to-head page. Agreement facts were checked against Government
  of India (PIB) releases in July 2026 — if a new agreement lands (e.g. the
  India–EU FTA under negotiation), edit `explainers.html` directly: each
  agreement is one self-contained `<div class="fta">` block you can copy.
  Pages can deep-link into products/sourcing with `#hs=XX` in the URL
  (preselects that product group) and into the explainers country picker
  with `#c=CODE` — a trick you can reuse anywhere.
- The States page (session 6) is the one page NOT built on UN Comtrade,
  because Comtrade has no state-level data. It uses the DGCIS Quarterly
  Review of Merchandise Foreign Trade (Ministry of Commerce) and NIRYAT
  full-year figures. The numbers live in data/vc_states.js — update them by
  hand when DGCIS publishes a new quarterly review (roughly every three
  months at dgciskol.gov.in); scripts/fetch_data.py does not touch them.
- The explainers page also has a state policy picker (reforms, subsidies and
  export policies by state). That content is hand-curated in
  data/vc_policies.js for the 16 biggest exporter states — edit it there
  when a state publishes a new policy; last checked July 2026.

Built by Shobhit Narayan Singh · An open data project.
