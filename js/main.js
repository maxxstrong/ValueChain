/* ValueChain — interactive charts (Apache ECharts, bundled locally).
   Data comes from data/data.js (window.VC_DATA) — no network calls at all. */
"use strict";

const ACCENT = "#c14e00";        // exports
const NEUTRAL = "#3d5a80";       // imports
const DEFICIT = "#a32c22";
const INK = "#1b1b1f";
const FAINT = "#8b8c95";
const GRID = "#efe9dc";
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

const bn = (v) => v / 1e9;
const fmtBn = (v, dp = 1) =>
  "$" + bn(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }) + " bn";
const fmtBnShort = (v) => (bn(v) >= 100 ? "$" + Math.round(bn(v)) : "$" + bn(v).toFixed(1)) + " bn";
const pct = (v, total) => (100 * v / total).toFixed(1) + "%";

/* ---------------- CSV download ---------------- */
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

/* ---------------- shared UI helpers ---------------- */
function setStamps(meta) {
  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Data as of ${meta.data_as_of} · Source: UN Comtrade`;
  });
  document.querySelectorAll(".latest-year, .yr").forEach((el) => { el.textContent = meta.latest_year; });
}

function wireSegs(onChange) {
  document.querySelectorAll(".seg").forEach((seg) => {
    seg.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
      onChange(seg.dataset.group, btn.dataset.v);
    });
  });
}

function makeChart(id, height) {
  const el = document.getElementById(id);
  el.style.height = height + "px";
  const c = echarts.init(el, null, { renderer: "canvas" });
  window.addEventListener("resize", () => c.resize());
  return c;
}

function countUp(el, target, fmt, ms = 1300) {
  const t0 = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  (function tick(now) {
    const p = Math.min(1, (now - t0) / ms);
    el.textContent = fmt(target * ease(p));
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

const axisLabel = { fontFamily: FONT, fontSize: 11, color: FAINT };
const tooltipBase = {
  backgroundColor: "#1b1b1f",
  borderWidth: 0,
  textStyle: { color: "#fff", fontFamily: FONT, fontSize: 12.5 },
  confine: true,
};

/* =========================================================
   TREND — three modes: value | growth | deficit
   ========================================================= */
function trendOption(trend, mode) {
  const years = trend.years;
  const common = {
    animationDuration: 700,
    grid: { left: 8, right: 16, top: 42, bottom: 44, containLabel: true },
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: FAINT } } },
    dataZoom: [
      { type: "inside", throttle: 50 },
      { type: "slider", height: 16, bottom: 8, borderColor: GRID, fillerColor: "rgba(193,78,0,0.12)",
        handleStyle: { color: ACCENT }, textStyle: { fontFamily: FONT, fontSize: 10, color: FAINT } },
    ],
    legend: { left: 0, top: 0, itemWidth: 18, itemHeight: 3, icon: "rect",
      textStyle: { fontFamily: FONT, fontSize: 12.5, color: "#55565e" } },
    xAxis: { type: "category", data: years, boundaryGap: mode !== "value",
      axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false }, axisLabel },
    yAxis: { type: "value", splitLine: { lineStyle: { color: GRID } },
      axisLabel: { ...axisLabel, formatter: (v) => (mode === "growth" ? v + "%" : "$" + v + " bn") } },
  };

  if (mode === "value") {
    const area = (hex) => ({
      color: {
        type: "linear", x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: hex + "33" }, { offset: 1, color: hex + "05" }],
      },
    });
    return {
      ...common,
      tooltip: { ...common.tooltip, valueFormatter: (v) => fmtBn(v * 1e9) },
      series: [
        { name: "Exports", type: "line", smooth: 0.3, symbolSize: 6, data: trend.exports.map(bn),
          lineStyle: { width: 3, color: ACCENT }, itemStyle: { color: ACCENT }, areaStyle: area(ACCENT),
          emphasis: { focus: "series" } },
        { name: "Imports", type: "line", smooth: 0.3, symbolSize: 6, data: trend.imports.map(bn),
          lineStyle: { width: 3, color: NEUTRAL }, itemStyle: { color: NEUTRAL }, areaStyle: area(NEUTRAL),
          emphasis: { focus: "series" } },
      ],
    };
  }

  if (mode === "growth") {
    const g = (arr) => arr.map((v, i) => (i === 0 ? null : +((100 * (v - arr[i - 1])) / arr[i - 1]).toFixed(1)));
    return {
      ...common,
      tooltip: { ...common.tooltip, valueFormatter: (v) => (v == null ? "–" : v + "%") },
      series: [
        { name: "Exports", type: "bar", data: g(trend.exports), itemStyle: { color: ACCENT, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 18 },
        { name: "Imports", type: "bar", data: g(trend.imports), itemStyle: { color: NEUTRAL, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 18 },
      ],
    };
  }

  /* deficit */
  return {
    ...common,
    tooltip: { ...common.tooltip, valueFormatter: (v) => fmtBn(v * 1e9) },
    legend: { show: false },
    series: [{
      name: "Trade deficit", type: "bar",
      data: trend.imports.map((m, i) => +bn(m - trend.exports[i]).toFixed(1)),
      itemStyle: { color: DEFICIT, borderRadius: [3, 3, 0, 0] }, barMaxWidth: 34,
      label: { show: true, position: "top", fontFamily: FONT, fontSize: 10, color: FAINT, formatter: ({ value }) => "$" + Math.round(value) },
    }],
  };
}

/* =========================================================
   PARTNERS — flow toggle (x|m) + count toggle (10|25)
   ========================================================= */
function partnersOption(d, flow, count) {
  const rows = d.rows.slice(0, count);
  const color = flow === "x" ? ACCENT : NEUTRAL;
  return {
    animationDurationUpdate: 600,
    grid: { left: 8, right: 70, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltipBase, trigger: "item",
      formatter: (p) => `<b>${p.name}</b><br>${fmtBn(rows[p.dataIndex].value)} · ${pct(rows[p.dataIndex].value, d.world_total)} of total`,
    },
    xAxis: { type: "value", splitLine: { lineStyle: { color: GRID } },
      axisLabel: { ...axisLabel, formatter: (v) => "$" + v + " bn" } },
    yAxis: { type: "category", inverse: true, data: rows.map((r) => r.name),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT, fontSize: 12.5, color: INK } },
    series: [{
      type: "bar", data: rows.map((r) => +bn(r.value).toFixed(2)),
      itemStyle: { color, borderRadius: [0, 4, 4, 0] },
      barMaxWidth: 20,
      label: { show: true, position: "right", fontFamily: FONT, fontSize: 11, color: FAINT,
        formatter: ({ dataIndex }) => fmtBnShort(rows[dataIndex].value) },
      emphasis: { itemStyle: { color: INK } },
    }],
  };
}

/* =========================================================
   PRODUCTS — flow toggle (x|m) + view toggle (treemap|bars)
   ========================================================= */
function productsOption(d, flow, view) {
  const total = d.rows.reduce((s, r) => s + r.value, 0);
  if (view === "bars") {
    const rows = d.rows.slice(0, 10);
    const color = flow === "x" ? ACCENT : NEUTRAL;
    return {
      animationDurationUpdate: 600,
      grid: { left: 8, right: 70, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...tooltipBase, trigger: "item",
        formatter: (p) => `<b>${p.name}</b> (HS ${rows[p.dataIndex].hs2})<br>${fmtBn(rows[p.dataIndex].value)} · ${pct(rows[p.dataIndex].value, total)} of total`,
      },
      xAxis: { type: "value", splitLine: { lineStyle: { color: GRID } },
        axisLabel: { ...axisLabel, formatter: (v) => "$" + v + " bn" } },
      yAxis: { type: "category", inverse: true, data: rows.map((r) => r.label),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontFamily: FONT, fontSize: 12.5, color: INK } },
      series: [{
        type: "bar", data: rows.map((r) => +bn(r.value).toFixed(2)),
        itemStyle: { color, borderRadius: [0, 4, 4, 0] }, barMaxWidth: 20,
        label: { show: true, position: "right", fontFamily: FONT, fontSize: 11, color: FAINT,
          formatter: ({ dataIndex }) => fmtBnShort(rows[dataIndex].value) },
        emphasis: { itemStyle: { color: INK } },
      }],
    };
  }

  /* treemap of every chapter */
  const palette = flow === "x"
    ? ["#8a3300", "#c14e00", "#d96f24", "#e89150", "#f2b585", "#f9d9bf"]
    : ["#22364d", "#3d5a80", "#5c7ba0", "#87a1bf", "#b3c6da", "#dae4ee"];
  const items = d.rows.map((r) => ({ name: r.label, value: +bn(r.value).toFixed(2), hs2: r.hs2, raw: r.value }));
  return {
    animationDurationUpdate: 700,
    tooltip: {
      ...tooltipBase,
      formatter: (p) => `<b>${p.name}</b> (HS ${p.data.hs2})<br>${fmtBn(p.data.raw)} · ${pct(p.data.raw, total)} of total`,
    },
    series: [{
      type: "treemap", roam: false, nodeClick: false,
      breadcrumb: { show: false },
      width: "100%", height: "100%", top: 0, left: 0,
      data: items,
      visualMin: 0, visualMax: bn(items[0].raw),
      visualDimension: 0,
      color: palette,
      colorMappingBy: "value",
      label: {
        fontFamily: FONT, fontSize: 11.5, color: "#fff",
        formatter: (p) => (p.data.raw / total > 0.015 ? `${p.name}\n${fmtBnShort(p.data.raw)}` : ""),
      },
      itemStyle: { borderColor: "#ffffff", borderWidth: 1.5, gapWidth: 1.5 },
      emphasis: { itemStyle: { borderColor: INK } },
    }],
  };
}

/* =========================================================
   Boot
   ========================================================= */
function init() {
  const D = window.VC_DATA;
  if (!D) throw new Error("data/data.js missing — run scripts/fetch_data.py");
  const meta = D.meta, trend = D.trend;
  const px = D.partners_exports, pm = D.partners_imports;
  const cx = D.products_exports, cm = D.products_imports;

  setStamps(meta);
  const Y = meta.latest_year;
  const n = trend.years.length - 1;

  /* animated hero numbers */
  const nums = [
    ["kn-exports", trend.exports[n]],
    ["kn-imports", trend.imports[n]],
    ["kn-deficit", trend.imports[n] - trend.exports[n]],
  ];
  for (const [id, v] of nums) {
    const el = document.getElementById(id);
    if (el) countUp(el, v, (t) => fmtBn(t, 0));
  }

  const state = { trend: "value", pflow: "x", pcount: 10, cflow: "x", cview: "treemap" };
  const P = () => (state.pflow === "x" ? px : pm);
  const C = () => (state.cflow === "x" ? cx : cm);

  const trendChart = makeChart("chart-trend", 360);
  const partnersChart = makeChart("chart-partners", 10 * 30 + 60);
  const productsChart = makeChart("chart-products", 440);

  const renderTrend = () => trendChart.setOption(trendOption(trend, state.trend), true);
  const renderPartners = () => {
    document.getElementById("chart-partners").style.height = (state.pcount * 30 + 60) + "px";
    partnersChart.resize();
    partnersChart.setOption(partnersOption(P(), state.pflow, state.pcount), true);
    document.getElementById("partners-title").textContent =
      state.pflow === "x" ? "Who buys India’s exports?" : "Where do India’s imports come from?";
    document.getElementById("partners-sub").textContent =
      `Top ${state.pcount} ${state.pflow === "x" ? "destinations for India’s goods exports" : "sources of India’s goods imports"}, ${Y}, US$ billion. Tap a bar for its share.`;
  };
  const renderProducts = () => {
    document.getElementById("chart-products").style.height = (state.cview === "treemap" ? 440 : 10 * 30 + 60) + "px";
    productsChart.resize();
    productsChart.setOption(productsOption(C(), state.cflow, state.cview), true);
    document.getElementById("products-title").textContent =
      state.cflow === "x" ? "What does India sell to the world?" : "What does India buy from the world?";
    document.getElementById("products-sub").textContent =
      state.cview === "treemap"
        ? `Every product group India ${state.cflow === "x" ? "exports" : "imports"} (HS 2-digit), ${Y}. Box size = value; tap any box.`
        : `Top 10 ${state.cflow === "x" ? "export" : "import"} product groups (HS 2-digit), ${Y}, US$ billion.`;
  };

  renderTrend(); renderPartners(); renderProducts();

  wireSegs((group, v) => {
    if (group === "trend") { state.trend = v; renderTrend(); }
    if (group === "pflow") { state.pflow = v; renderPartners(); }
    if (group === "pcount") { state.pcount = +v; renderPartners(); }
    if (group === "cflow") { state.cflow = v; renderProducts(); }
    if (group === "cview") { state.cview = v; renderProducts(); }
  });

  /* CSV downloads follow the current view */
  document.getElementById("dl-trend").addEventListener("click", () =>
    downloadCSV(`india-trade-trend-${trend.years[0]}-${Y}.csv`,
      ["year", "exports_usd", "imports_usd", "deficit_usd"],
      trend.years.map((y, i) => [y, trend.exports[i], trend.imports[i], trend.imports[i] - trend.exports[i]])));

  document.getElementById("dl-partners").addEventListener("click", () => {
    const d = P(), f = state.pflow === "x" ? "export" : "import";
    downloadCSV(`india-${f}-partners-${Y}.csv`,
      ["rank", "partner", `${f}s_usd`, "share_of_total_pct"],
      d.rows.map((r, i) => [i + 1, r.name, r.value, (100 * r.value / d.world_total).toFixed(2)])
        .concat([["", "All other partners", d.others, (100 * d.others / d.world_total).toFixed(2)],
                 ["", "World total", d.world_total, "100.00"]]));
  });

  document.getElementById("dl-products").addEventListener("click", () => {
    const d = C(), f = state.cflow === "x" ? "export" : "import";
    downloadCSV(`india-${f}-products-hs2-${Y}.csv`,
      ["rank", "hs2_chapter", "product_group", `${f}s_usd`],
      d.rows.map((r, i) => [i + 1, r.hs2, r.label, r.value]));
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
  /* The local copy (js/vendor/echarts.min.js) is optional — if it is not in
     the folder, load the chart library from a pinned CDN instead. */
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
