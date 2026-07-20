/* ValueChain — Product pages (exporter-facing).
   Data comes from data/data.js (window.VC_DATA.productpages). */
"use strict";

const ACCENT = "#c14e00";
const BLUE = "#3d5a80";
const REST = "#e4ddd0";
const INK = "#1b1b1f";
const FAINT = "#8b8c95";
const GRID = "#efe9dc";
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

const bn = (v) => v / 1e9;
const fmtBn = (v, dp = 1) =>
  "$" + bn(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }) + " bn";
const fmtBnShort = (v) => (bn(v) >= 100 ? "$" + Math.round(bn(v)) : "$" + bn(v).toFixed(1)) + " bn";

function downloadCSV(filename, header, rows) {
  const esc = (s) => (/[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s));
  const lines = [header.map(esc).join(",")].concat(rows.map((r) => r.map(esc).join(",")));
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 300);
}

function makeChart(id, height) {
  const el = document.getElementById(id);
  el.style.height = height + "px";
  const c = echarts.init(el, null, { renderer: "canvas" });
  window.addEventListener("resize", () => c.resize());
  return c;
}

const axisLabel = { fontFamily: FONT, fontSize: 11, color: FAINT };
const tooltipBase = {
  backgroundColor: "#1b1b1f", borderWidth: 0,
  textStyle: { color: "#fff", fontFamily: FONT, fontSize: 12.5 }, confine: true,
};

function trendOption(P, hs) {
  const t = P.india_trend[hs];
  const area = (hex) => ({
    color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: hex + "33" }, { offset: 1, color: hex + "05" }] },
  });
  return {
    animationDuration: 600,
    grid: { left: 8, right: 16, top: 40, bottom: 10, containLabel: true },
    legend: { left: 0, top: 0, itemWidth: 18, itemHeight: 3, icon: "rect",
      textStyle: { fontFamily: FONT, fontSize: 12.5, color: "#55565e" } },
    tooltip: { ...tooltipBase, trigger: "axis", valueFormatter: (v) => fmtBn(v * 1e9) },
    xAxis: { type: "category", data: P.years, boundaryGap: false,
      axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false }, axisLabel },
    yAxis: { type: "value", splitLine: { lineStyle: { color: GRID } },
      axisLabel: { ...axisLabel, formatter: (v) => "$" + v + " bn" } },
    series: [
      { name: "India's exports", type: "line", smooth: 0.3, symbolSize: 6,
        lineStyle: { width: 3, color: ACCENT }, itemStyle: { color: ACCENT },
        areaStyle: area(ACCENT), data: t.exports.map(bn) },
      { name: "India's imports", type: "line", smooth: 0.3, symbolSize: 5,
        lineStyle: { width: 2.5, color: BLUE, type: "dashed" }, itemStyle: { color: BLUE },
        data: t.imports.map(bn) },
    ],
  };
}

function gapOption(P, hs, ranked) {
  return {
    animationDurationUpdate: 600,
    grid: { left: 8, right: 90, top: 34, bottom: 8, containLabel: true },
    legend: { left: 0, top: 0, itemWidth: 14, itemHeight: 10, icon: "rect",
      data: ["From India", "From everywhere else"],
      textStyle: { fontFamily: FONT, fontSize: 12, color: "#55565e" } },
    tooltip: {
      ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow" },
      formatter: (ps) => {
        const r = ranked[ps[0].dataIndex];
        return `<b>${r.label}</b> (${r.year})<br>Imports of this product: ${fmtBn(r.world)}<br>` +
               `From India: ${fmtBn(r.india)} · <b>${(100 * r.india / r.world).toFixed(1)}%</b>`;
      },
    },
    xAxis: { type: "value", splitLine: { lineStyle: { color: GRID } },
      axisLabel: { ...axisLabel, formatter: (v) => "$" + v + " bn" } },
    yAxis: { type: "category", inverse: true, data: ranked.map((r) => r.axis),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT, fontSize: 12, color: INK } },
    series: [
      { name: "From India", type: "bar", stack: "m", barMaxWidth: 18,
        itemStyle: { color: ACCENT }, data: ranked.map((r) => +bn(r.india).toFixed(2)) },
      { name: "From everywhere else", type: "bar", stack: "m", barMaxWidth: 18,
        itemStyle: { color: REST, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: "right", fontFamily: FONT, fontSize: 10.5, color: FAINT,
          formatter: ({ dataIndex }) => (100 * ranked[dataIndex].india / ranked[dataIndex].world).toFixed(1) + "%" },
        data: ranked.map((r) => +bn(r.world - r.india).toFixed(2)) },
    ],
  };
}

function init() {
  const D = window.VC_DATA;
  if (!D || !D.productpages) throw new Error("data/data.js missing productpages — run scripts/fetch_data.py");
  const P = D.productpages;
  const meta = D.meta;
  const n = P.years.length - 1;
  const Y = P.years[n];

  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Data as of ${meta.data_as_of} · Source: UN Comtrade`;
  });
  document.querySelectorAll(".yr").forEach((el) => { el.textContent = Y; });

  /* selector, sorted by India's latest exports */
  const sel = document.getElementById("product-select");
  const codes = Object.keys(P.chapters).sort((a, b) =>
    P.india_trend[b].exports[n] - P.india_trend[a].exports[n]);
  for (const hs of codes) {
    const o = document.createElement("option");
    o.value = hs;
    o.textContent = `${P.chapters[hs]} (HS ${hs}) — ${fmtBnShort(P.india_trend[hs].exports[n])}`;
    sel.appendChild(o);
  }
  let hs = codes[0];
  /* deep link — products.html#hs=57 preselects a chapter */
  const hm = (location.hash || "").match(/hs=(\d\d)/);
  if (hm && P.chapters[hm[1]]) hs = hm[1];
  sel.value = hs;

  const trendChart = makeChart("chart-ptrend", 340);
  const gapChart = makeChart("chart-gap", 14 * 30 + 70);

  const rankedMarkets = () =>
    Object.values(P.markets)
      .map((m) => ({ label: m.label, year: m.year, world: m.series[hs].world, india: m.series[hs].india,
                     axis: m.label + (m.year !== Y ? ` ('${String(m.year).slice(2)})` : "") }))
      .sort((a, b) => b.world - a.world);

  const render = () => {
    const name = P.chapters[hs];
    const t = P.india_trend[hs];
    document.getElementById("ptrend-title").textContent = `India's trade in ${name.toLowerCase()}`;
    document.getElementById("ptrend-sub").textContent =
      `India's worldwide exports and imports of ${name.toLowerCase()} (HS ${hs}), ${P.years[0]}–${Y}, US$ billion.`;
    trendChart.setOption(trendOption(P, hs), true);

    const ranked = rankedMarkets();
    document.getElementById("gap-title").textContent = `Where are the buyers of ${name.toLowerCase()} — and how much reaches them from India?`;
    document.getElementById("gap-sub").textContent =
      `Imports of ${name.toLowerCase()} in 14 major markets, latest available year, US$ billion. The orange slice is India; the label is India's share. The grey area is the gap — and the opportunity.`;
    gapChart.setOption(gapOption(P, hs, ranked), true);

    /* headline chips */
    const g0 = t.exports[0], g9 = t.exports[n];
    const growth = g0 > 0 ? (100 * (g9 - g0) / g0) : 0;
    document.getElementById("chip-x").textContent = fmtBnShort(g9);
    document.getElementById("chip-growth").textContent = (growth >= 0 ? "+" : "") + Math.round(growth) + "%";
    const top = ranked[0];
    document.getElementById("chip-gap").textContent =
      top ? `${top.label}: ${(100 * top.india / top.world).toFixed(1)}%` : "–";
  };

  render();
  sel.addEventListener("change", () => { hs = sel.value; render(); });

  document.getElementById("dl-ptrend").addEventListener("click", () => {
    const t = P.india_trend[hs];
    downloadCSV(`india-trade-hs${hs}-${P.years[0]}-${Y}.csv`,
      ["year", "india_exports_usd", "india_imports_usd"],
      P.years.map((y, i) => [y, t.exports[i], t.imports[i]]));
  });
  document.getElementById("dl-gap").addEventListener("click", () => {
    downloadCSV(`markets-hs${hs}.csv`,
      ["market", "data_year", "imports_of_product_usd", "imports_from_india_usd", "india_share_pct"],
      rankedMarkets().map((r) => [r.label, r.year, r.world, r.india, (100 * r.india / r.world).toFixed(2)]));
  });
}

function boot() {
  try { init(); } catch (e) {
    console.error(e);
    document.querySelectorAll(".echart").forEach((f) => {
      f.innerHTML = '<p style="padding:30px;color:#8b8c95;font-size:14px">Could not draw this chart: ' + e.message + "</p>";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof echarts !== "undefined") { boot(); return; }
  const cdns = [
    "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js",
  ];
  const tryLoad = (i) => {
    if (i >= cdns.length) {
      document.querySelectorAll(".echart").forEach((f) => {
        f.innerHTML = '<p style="padding:30px;color:#8b8c95;font-size:14px">The chart library could not be loaded. Please check your internet connection and reload.</p>';
      });
      return;
    }
    const s = document.createElement("script");
    s.src = cdns[i];
    s.onload = boot;
    s.onerror = () => tryLoad(i + 1);
    document.head.appendChild(s);
  };
  tryLoad(0);
});
