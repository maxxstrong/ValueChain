/* ValueChain — Sourcing view (importer-facing).
   Data comes from data/vc_core.js + data/vc_sourcing.js (window.VC_DATA.sourcing). */
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

function hBarOption(rows, color, total, extraFmt) {
  return {
    animationDurationUpdate: 600,
    grid: { left: 8, right: 80, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...tooltipBase, trigger: "item",
      formatter: (p) => {
        const r = rows[p.dataIndex];
        let t = `<b>${r.name}</b>${r.year ? " (" + r.year + ")" : ""}<br>${fmtBn(r.value)}`;
        if (total) t += ` · ${(100 * r.value / total).toFixed(1)}%`;
        if (extraFmt) t += extraFmt(r);
        return t;
      },
    },
    xAxis: { type: "value", splitLine: { lineStyle: { color: GRID } },
      axisLabel: { ...axisLabel, formatter: (v) => "$" + v + " bn" } },
    yAxis: { type: "category", inverse: true, data: rows.map((r) => r.axis || r.name),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT, fontSize: 12, color: INK } },
    series: [{
      type: "bar", data: rows.map((r) => +bn(r.value).toFixed(2)),
      itemStyle: { color, borderRadius: [0, 4, 4, 0] }, barMaxWidth: 18,
      label: { show: true, position: "right", fontFamily: FONT, fontSize: 10.5, color: FAINT,
        formatter: ({ dataIndex }) => fmtBnShort(rows[dataIndex].value) },
      emphasis: { itemStyle: { color: INK } },
    }],
  };
}

function init() {
  const D = window.VC_DATA;
  if (!D || !D.sourcing) throw new Error("data/vc_sourcing.js missing — run scripts/fetch_data.py");
  const S = D.sourcing;
  const meta = D.meta;
  const n = S.years.length - 1;
  const Y = S.years[n];

  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Data as of ${meta.data_as_of} · Source: UN Comtrade`;
  });
  document.querySelectorAll(".yr").forEach((el) => { el.textContent = Y; });

  /* selector, sorted by India's import bill */
  const sel = document.getElementById("source-select");
  const codes = Object.keys(S.chapters).sort((a, b) =>
    (S.india_world_imports[b] || 0) - (S.india_world_imports[a] || 0));
  for (const hs of codes) {
    const o = document.createElement("option");
    o.value = hs;
    o.textContent = `${S.chapters[hs]} (HS ${hs}) — ${fmtBnShort(S.india_world_imports[hs] || 0)}`;
    sel.appendChild(o);
  }
  let hs = codes[0];
  /* deep link — sourcing.html#hs=71 preselects a chapter */
  const hm = (location.hash || "").match(/hs=(\d\d)/);
  if (hm && S.chapters[hm[1]]) hs = hm[1];
  sel.value = hs;

  const worldChart = makeChart("chart-world-sup", 12 * 30 + 40);
  const indiaChart = makeChart("chart-india-sup", 11 * 30 + 40);

  const worldRows = () =>
    Object.values(S.world_suppliers)
      .filter((m) => m.exports[hs] != null)
      .map((m) => ({ name: m.label, year: m.year !== Y ? m.year : null, value: m.exports[hs],
                     axis: m.label + (m.year !== Y ? ` ('${String(m.year).slice(2)})` : "") }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

  const indiaRows = () => {
    const sup = S.india_suppliers[hs] || {};
    const total = S.india_world_imports[hs] || 0;
    const rows = Object.entries(sup).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 10);
    const listed = rows.reduce((s, r) => s + r.value, 0);
    if (total > listed) rows.push({ name: "Everywhere else", value: total - listed, rest: true });
    return { rows, total };
  };

  const render = () => {
    const name = S.chapters[hs];
    document.getElementById("world-title").textContent = `Who supplies the world with ${name.toLowerCase()}?`;
    document.getElementById("world-sub").textContent =
      `Exports of ${name.toLowerCase()} (HS ${hs}) by the 16 largest exporter countries, latest reported year, US$ billion.`;
    worldChart.setOption(hBarOption(worldRows(), BLUE, 0), true);

    const { rows, total } = indiaRows();
    document.getElementById("india-title").textContent = `Where does India buy its ${name.toLowerCase()}?`;
    document.getElementById("india-sub").textContent =
      `India's imports of ${name.toLowerCase()}, ${Y}, by supplier, US$ billion. India's total import bill: ${fmtBnShort(total)}.`;
    const colored = rows.map((r) => r);
    const opt = hBarOption(colored, ACCENT, total);
    opt.series[0].itemStyle = { color: (p) => (rows[p.dataIndex].rest ? REST : ACCENT), borderRadius: [0, 4, 4, 0] };
    indiaChart.setOption(opt, true);

    /* chips */
    const t = S.india_import_trend[hs];
    const growth = t[0] > 0 ? Math.round(100 * (t[n] - t[0]) / t[0]) : 0;
    document.getElementById("chip-m").textContent = fmtBnShort(total);
    document.getElementById("chip-mgrowth").textContent = (growth >= 0 ? "+" : "") + growth + "%";
    const top = rows[0];
    document.getElementById("chip-dep").textContent =
      top && total ? `${top.name}: ${(100 * top.value / total).toFixed(0)}%` : "–";
  };

  render();
  sel.addEventListener("change", () => { hs = sel.value; render(); });

  document.getElementById("dl-world-sup").addEventListener("click", () =>
    downloadCSV(`world-suppliers-hs${hs}.csv`,
      ["exporter", "data_year", "exports_usd"],
      worldRows().map((r) => [r.name, r.year || Y, r.value])));

  document.getElementById("dl-india-sup").addEventListener("click", () => {
    const { rows, total } = indiaRows();
    downloadCSV(`india-suppliers-hs${hs}-${Y}.csv`,
      ["supplier", "imports_usd", "share_of_india_total_pct"],
      rows.map((r) => [r.name, r.value, total ? (100 * r.value / total).toFixed(2) : ""]));
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
