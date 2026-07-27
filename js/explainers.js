/* ValueChain — bilateral country picker (shared by explainers.html and
   head-to-head.html). Reads window.VC_DATA.bilateral from data/vc_bilat.js.
   On pages with a #bilat-fta box it also lists all trade-related agreements
   with the selected country — in force, under negotiation, and ended —
   newest first. For EU members both bilateral and EU-level items appear.
   Wrapped in an IIFE so nothing here collides with the page's own chart
   script (h2h.js also defines fmtBn, init, boot, ...). */
(function () {
"use strict";

function fmtBn(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return "$" + (v / 1e9).toFixed(a >= 1e10 ? 0 : 1) + " bn";
  if (a >= 1e6) return "$" + (v / 1e6).toFixed(0) + " m";
  return "$" + Math.round(v / 1e3) + " k";
}

function downloadCSV(filename, header, rows) {
  const esc = (x) => {
    const s = String(x == null ? "" : x);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header.map(esc).join(",")].concat(rows.map((r) => r.map(esc).join(",")));
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ---- India's trade-related agreements, by partner country (M49 codes) ----
   y: sort key (newest first) · d: date label · n: name · t: one-line note
   s: "inforce" | "talks" | "ended" · m: member codes ("EU" = all EU members) */
const VC_AGREEMENTS = [
  /* ---------------- in force ---------------- */
  { s: "inforce", y: 2026, d: "In force 15 Jul 2026", n: "India–UK CETA",
    t: "The UK scrapped duties on 99% of Indian tariff lines from day one; India phases cuts on whisky, cars and more.",
    m: ["826"] },
  { s: "inforce", y: 2025, d: "In force 1 Oct 2025", n: "India–EFTA TEPA",
    t: "Tariffs on ~95% of industrial goods phase out over up to 10 years; EFTA pledged $100 bn of investment in India.",
    m: ["757", "579", "352", "438"] },
  { s: "inforce", y: 2022.9, d: "In force 29 Dec 2022", n: "India–Australia ECTA",
    t: "100% of Indian exports enter Australia duty-free since Jan 2026.",
    m: ["36"] },
  { s: "inforce", y: 2022.4, d: "In force 1 May 2022", n: "India–UAE CEPA",
    t: "About 99% of Indian exports by value enter the UAE duty-free.",
    m: ["784"] },
  { s: "inforce", y: 2021, d: "In force 1 Apr 2021", n: "India–Mauritius CECPA",
    t: "India's first trade agreement with an African country.",
    m: ["480"] },
  { s: "inforce", y: 2011.6, d: "In force 1 Aug 2011", n: "India–Japan CEPA",
    t: "Covers ~90% of tariff lines, liberalised over ten years.",
    m: ["392"] },
  { s: "inforce", y: 2011.5, d: "In force 1 Jul 2011", n: "India–Malaysia CECA",
    t: "Goes beyond the ASEAN agreement on goods, services and investment.",
    m: ["458"] },
  { s: "inforce", y: 2010.1, d: "In force 1 Jan 2010", n: "ASEAN–India FTA (goods)",
    t: "Tariff elimination on most goods with the ten ASEAN states; an upgrade review is ongoing.",
    m: ["96", "104", "116", "360", "418", "458", "608", "702", "704", "764"] },
  { s: "inforce", y: 2010, d: "In force 1 Jan 2010", n: "India–South Korea CEPA",
    t: "Covers goods, services and investment; upgrade talks ongoing.",
    m: ["410"] },
  { s: "inforce", y: 2009, d: "In force 1 Jun 2009", n: "MERCOSUR–India PTA",
    t: "Limited tariff concessions on a few hundred product lines.",
    m: ["32", "76", "600", "858"] },
  { s: "inforce", y: 2007, d: "In force 2007 · widened 2017", n: "India–Chile PTA",
    t: "Preferential (not zero) duties on a limited list of goods.",
    m: ["152"] },
  { s: "inforce", y: 2006, d: "In force 1 Jan 2006", n: "SAFTA",
    t: "The South Asian Free Trade Area; sensitive lists apply.",
    m: ["4", "50", "64", "144", "462", "524", "586"] },
  { s: "inforce", y: 2005, d: "In force 1 Aug 2005", n: "India–Singapore CECA",
    t: "India's first comprehensive agreement — goods, services and investment.",
    m: ["702"] },
  { s: "inforce", y: 2004, d: "In force 2004", n: "India–Thailand Early Harvest Scheme",
    t: "Zero duty on an early list of 82 products.",
    m: ["764"] },
  { s: "inforce", y: 2003, d: "In force 2003", n: "India–Afghanistan PTA",
    t: "Preferential duties, mainly on dried fruit into India.",
    m: ["4"] },
  { s: "inforce", y: 2000, d: "In force 1 Mar 2000", n: "India–Sri Lanka FTA",
    t: "Zero duty on most goods, with negative lists on both sides.",
    m: ["144"] },
  { s: "inforce", y: 1994, d: "In force 1994", n: "EC–India Cooperation Agreement",
    t: "The non-preferential framework that still governs India–EU trade relations — no tariff preferences.",
    m: ["EU"] },
  { s: "inforce", y: 1991, d: "1991 · renewed since", n: "India–Nepal Treaty of Trade",
    t: "Duty-free access into India for most Nepalese manufactures.",
    m: ["524"] },
  { s: "inforce", y: 1976, d: "In force 1976", n: "Asia-Pacific Trade Agreement (APTA)",
    t: "Limited tariff concessions — India's only preferential arrangement that covers China.",
    m: ["50", "144", "156", "410", "418", "496"] },
  { s: "inforce", y: 1972, d: "1972 · renewed 2016", n: "India–Bhutan Agreement on Trade",
    t: "A full free-trade regime between the two countries.",
    m: ["64"] },

  /* ---------------- under negotiation ---------------- */
  { s: "talks", y: 2025, d: "Under negotiation", n: "India–US Bilateral Trade Agreement",
    t: "Talks on a bilateral trade deal have been running since 2025.",
    m: ["842"] },
  { s: "talks", y: 2024, d: "Relaunched Mar 2024", n: "India–New Zealand FTA",
    t: "Negotiations restarted after a decade-long pause.",
    m: ["554"] },
  { s: "talks", y: 2023, d: "Under negotiation", n: "India–Australia CECA",
    t: "The full successor to ECTA — services, digital trade, critical minerals.",
    m: ["36"] },
  { s: "talks", y: 2022.5, d: "Relaunched Jun 2022", n: "India–EU Free Trade Agreement",
    t: "One of the biggest deals still on India's table — goods, services, investment and GIs.",
    m: ["EU"] },
  { s: "talks", y: 2022.2, d: "Talks resumed 2022", n: "India–GCC FTA",
    t: "Free-trade talks with the six-nation Gulf Cooperation Council.",
    m: ["48", "414", "512", "634", "682", "784"] },
  { s: "talks", y: 2023.5, d: "Talks agreed", n: "India–EAEU FTA",
    t: "A free-trade agreement with the Russia-led Eurasian Economic Union has been agreed for negotiation.",
    m: ["643", "112", "398", "51", "417"] },
  { s: "talks", y: 2010.5, d: "Paused since 2023", n: "India–Canada CEPA",
    t: "Negotiations began in 2010, were paused amid diplomatic tensions in 2023.",
    m: ["124"] },

  /* ---------------- ended, suspended or walked away ---------------- */
  { s: "ended", y: 2019.9, d: "India walked out Nov 2019", n: "RCEP",
    t: "After six years at the table India left the 15-nation Asian mega-pact, mainly over fears of a Chinese import surge.",
    m: ["156", "392", "410", "36", "554", "96", "104", "116", "360", "418", "458", "608", "702", "704", "764"] },
  { s: "ended", y: 2019.5, d: "Ended 5 Jun 2019", n: "US GSP benefits for India",
    t: "Washington removed India's duty-free access under its Generalized System of Preferences.",
    m: ["842"] },
  { s: "ended", y: 2019.2, d: "Withdrawn Feb 2019", n: "MFN status for Pakistan",
    t: "India revoked most-favoured-nation treatment and imposed 200% duties; bilateral trade has been suspended in practice since.",
    m: ["586"] },
  { s: "ended", y: 2017, d: "Terminated 2016–17", n: "Bilateral Investment Treaty (BIT)",
    t: "India scrapped most of its old investment treaties to renegotiate on a new model text; a replacement is part of current FTA talks.",
    m: ["276", "251", "528", "826", "36", "757", "724", "380", "752", "40", "56", "442",
       "208", "616", "203", "348", "246", "300", "620", "642", "100", "191", "440", "703", "705"] },
  { s: "ended", y: 2013, d: "Suspended 2013", n: "India–EU BTIA",
    t: "Sixteen negotiating rounds between 2007 and 2013, then the talks stalled — succeeded by the current FTA negotiation.",
    m: ["EU"] },
];

const VC_EU = new Set(["40", "56", "100", "191", "196", "203", "208", "233", "246",
  "251", "276", "300", "348", "372", "380", "428", "440", "442", "470", "499",
  "528", "616", "620", "642", "703", "705", "724", "752"]);

function renderAgreements(code, name) {
  const box = document.getElementById("bilat-fta");
  if (!box) return;
  const isEU = VC_EU.has(code);
  const list = VC_AGREEMENTS.filter((a) =>
    a.m.indexOf(code) !== -1 || (isEU && a.m.indexOf("EU") !== -1));
  if (!list.length) {
    box.innerHTML = `<p class="ftamini-none">India has no trade agreement — in force, under negotiation or past — with ${name} that this site tracks.</p>`;
    return;
  }
  const row = (a) => {
    const pill = a.s === "ended" ? "pill pill-ended" : a.s === "talks" ? "pill pill-talks" : "pill";
    const eu = a.m.indexOf("EU") !== -1 ? ' <span class="pill pill-eu">EU-level</span>' : "";
    return `<div class="ftamini"><span class="${pill}">${a.d}</span><div><b>${a.n}</b>${eu}` +
           `<span class="ftamini-t">${a.t}</span></div></div>`;
  };
  const grp = (s, label) => {
    const g = list.filter((a) => a.s === s).sort((a, b) => b.y - a.y);
    return g.length ? `<p class="ftamini-h">${label}</p>` + g.map(row).join("") : "";
  };
  box.innerHTML =
    `<p class="ftamini-top">Trade agreements, India &amp; ${name}${isEU ? " — bilateral and as an EU member" : ""} · newest first</p>` +
    grp("inforce", "In force") +
    grp("talks", "Under negotiation") +
    grp("ended", "Ended, suspended or walked away");
}

function init() {
  const D = window.VC_DATA;
  if (!D || !D.bilateral) throw new Error("data/vc_bilat.js missing — run scripts/fetch_data.py");
  const B = D.bilateral;
  const years = B.years;
  const n = years.length - 1;
  const Y = years[n];

  if (D.meta) {
    document.querySelectorAll(".stamp").forEach((el) => {
      if (!el.textContent) el.textContent = `Data as of ${D.meta.data_as_of} · Source: UN Comtrade`;
    });
  }
  document.querySelectorAll(".yr").forEach((el) => { if (!el.textContent) el.textContent = Y; });

  /* selector, sorted by total trade with India, latest year */
  const sel = document.getElementById("bilat-select");
  // biggest trading partner becomes the default; the list is A–Z, because
  // with 160 countries alphabetical is the only scannable order
  const codes = Object.keys(B.partners).sort((a, b) => {
    const pa = B.partners[a], pb = B.partners[b];
    return (pb.exports[n] + pb.imports[n]) - (pa.exports[n] + pa.imports[n]);
  });
  const codesAZ = Object.keys(B.partners).sort((a, b) =>
    B.partners[a].name.localeCompare(B.partners[b].name));
  for (const c of codesAZ) {
    const p = B.partners[c];
    const o = document.createElement("option");
    o.value = c;
    o.textContent = `${p.name} — ${fmtBn(p.exports[n] + p.imports[n])} total trade`;
    sel.appendChild(o);
  }
  let code = codes[0];
  /* deep link: #c=826 preselects a country */
  const hm = (location.hash || "").match(/c=(\d+)/);
  if (hm && B.partners[hm[1]]) code = hm[1];
  sel.value = code;

  const el = document.getElementById("chart-bilat");
  el.style.height = "360px";
  const chart = echarts.init(el);
  window.addEventListener("resize", () => chart.resize());

  const render = () => {
    const p = B.partners[code];
    const bal = p.exports[n] - p.imports[n];

    document.getElementById("bilat-title").textContent = `India & ${p.name}`;
    document.getElementById("bilat-x").textContent = fmtBn(p.exports[n]);
    document.getElementById("bilat-m").textContent = fmtBn(p.imports[n]);
    const balEl = document.getElementById("bilat-bal");
    balEl.textContent = (bal >= 0 ? "+" : "−") + fmtBn(Math.abs(bal)).slice(1);
    balEl.className = "sr-num " + (bal >= 0 ? "sr-good" : "sr-bad");
    document.getElementById("bilat-bal-lbl").textContent =
      bal >= 0 ? `India's trade surplus, ${Y}` : `India's trade deficit, ${Y}`;

    renderAgreements(code, p.name);

    const balance = years.map((_, i) => p.exports[i] - p.imports[i]);
    chart.setOption({
      grid: { left: 8, right: 8, top: 42, bottom: 4, containLabel: true },
      legend: { top: 0, itemWidth: 14, itemHeight: 9, textStyle: { fontSize: 12 } },
      tooltip: {
        trigger: "axis",
        valueFormatter: (v) => fmtBn(v),
      },
      xAxis: { type: "category", data: years, axisTick: { show: false } },
      yAxis: {
        type: "value",
        axisLabel: { formatter: (v) => (Math.abs(v) >= 1e9 ? v / 1e9 + " bn" : v / 1e6 + " m") },
        splitLine: { lineStyle: { color: "#eee7d9" } },
      },
      series: [
        { name: "India's exports to it", type: "bar", data: p.exports.map(Math.round),
          itemStyle: { color: "#c14e00", borderRadius: [3, 3, 0, 0] } },
        { name: "India's imports from it", type: "bar", data: p.imports.map(Math.round),
          itemStyle: { color: "#3d5a80", borderRadius: [3, 3, 0, 0] } },
        { name: "Balance", type: "line", data: balance, symbolSize: 6,
          lineStyle: { width: 2.5, color: "#a32c22" }, itemStyle: { color: "#a32c22" } },
      ],
    }, true);
  };

  render();
  sel.addEventListener("change", () => { code = sel.value; render(); });

  /* "See the full trade picture" links on the agreement cards (explainers) */
  document.querySelectorAll(".golink").forEach((a) => {
    a.addEventListener("click", () => {
      const c = a.getAttribute("data-c");
      if (B.partners[c]) { code = c; sel.value = c; render(); }
    });
  });

  document.getElementById("dl-bilat").addEventListener("click", () => {
    const p = B.partners[code];
    downloadCSV(`india-trade-${p.name.toLowerCase().replace(/[^a-z]+/g, "-")}.csv`,
      ["year", "india_exports_usd", "india_imports_usd", "balance_usd"],
      years.map((y, i) => [y, p.exports[i], p.imports[i], p.exports[i] - p.imports[i]]));
  });
}

function bilatBoot() {
  try { init(); } catch (e) {
    console.error(e);
    const el = document.getElementById("chart-bilat");
    if (el) el.innerHTML = '<p style="padding:30px;color:#8b8c95;font-size:14px">Could not draw this chart: ' + e.message + "</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("bilat-select")) return;
  if (typeof echarts !== "undefined") { bilatBoot(); return; }
  /* another script on this page may already be loading ECharts — poll for it,
     and only inject our own copy if nothing else is trying */
  let done = false, waited = 0;
  const t = setInterval(() => {
    if (typeof echarts !== "undefined") { clearInterval(t); if (!done) { done = true; bilatBoot(); } return; }
    waited += 250;
    if (waited >= 20000) {
      clearInterval(t);
      const el = document.getElementById("chart-bilat");
      if (el && !done) el.innerHTML = '<p style="padding:30px;color:#8b8c95;font-size:14px">The chart library could not be loaded. Please check your internet connection and reload.</p>';
    }
  }, 250);
  if (!document.querySelector('script[src*="echarts"]')) {
    const cdns = [
      "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js",
    ];
    const tryLoad = (i) => {
      if (i >= cdns.length) return;
      const s = document.createElement("script");
      s.src = cdns[i];
      s.onerror = () => tryLoad(i + 1);
      document.head.appendChild(s);
    };
    tryLoad(0);
  }
});
})();
