/* ValueChain — Head-to-Head page (India vs China, Vietnam, Bangladesh).
   Data comes from data/data.js (window.VC_DATA.headtohead). */
"use strict";

const C_INDIA = "#c14e00";
const C_CHINA = "#8c1d18";
const C_VIETNAM = "#3d5a80";
const C_BANGLA = "#2e7d5b";
const COLORS = { india: C_INDIA, china: C_CHINA, vietnam: C_VIETNAM, bangladesh: C_BANGLA };
const EXP_KEYS = ["india", "china", "vietnam", "bangladesh"];
const SERIES_KEYS = ["world"].concat(EXP_KEYS);
const INK = "#1b1b1f";
const FAINT = "#8b8c95";
const GRID = "#efe9dc";
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

const bn = (v) => v / 1e9;
const fmtBn = (v, dp = 1) =>
  "$" + bn(v).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }) + " bn";
const pc = (v) => v.toFixed(1) + "%";

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

const axisLabel = { fontFamily: FONT, fontSize: 11, color: FAINT };
const tooltipBase = {
  backgroundColor: "#1b1b1f", borderWidth: 0,
  textStyle: { color: "#fff", fontFamily: FONT, fontSize: 12.5 }, confine: true,
};
const legendBase = {
  left: 0, top: 0, itemWidth: 18, itemHeight: 3, icon: "rect",
  textStyle: { fontFamily: FONT, fontSize: 12.5, color: "#55565e" },
};

const addSeries = (a, b) =>
  Object.fromEntries(SERIES_KEYS.map((k) => [k, a[k].map((v, i) => v + b[k][i])]));

/* ---- chart 1: market share over time ---- */
function raceOption(H, s, mode) {
  const mk = (key) => ({
    name: H.exporters[key], type: "line", smooth: 0.25, symbolSize: 5,
    lineStyle: { width: 3, color: COLORS[key] },
    itemStyle: { color: COLORS[key] },
    emphasis: { focus: "series" },
    data: s[key].map((v, i) =>
      mode === "share" ? +(100 * v / s.world[i]).toFixed(2) : +bn(v).toFixed(2)),
  });
  return {
    animationDuration: 600,
    grid: { left: 8, right: 16, top: 40, bottom: 10, containLabel: true },
    legend: legendBase,
    tooltip: {
      ...tooltipBase, trigger: "axis",
      valueFormatter: (v) => (v == null ? "–" : mode === "share" ? v + "%" : fmtBn(v * 1e9)),
    },
    xAxis: { type: "category", data: H.years, boundaryGap: false,
      axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false }, axisLabel },
    yAxis: { type: "value", splitLine: { lineStyle: { color: GRID } },
      axisLabel: { ...axisLabel, formatter: (v) => (mode === "share" ? v + "%" : "$" + v + " bn") } },
    series: EXP_KEYS.map(mk),
  };
}

/* ---- chart 2: latest-year snapshot (chains + Overall + optional custom) ---- */
function snapshotOption(H, cols) {
  const n = H.years.length - 1;
  const mk = (key) => ({
    name: H.exporters[key], type: "bar", barMaxWidth: 26,
    itemStyle: { color: COLORS[key], borderRadius: [3, 3, 0, 0] },
    label: { show: true, position: "top", fontFamily: FONT, fontSize: 10, color: FAINT,
      formatter: ({ value }) => (value >= 1 ? Math.round(value) + "%" : value.toFixed(1) + "%") },
    data: cols.map(({ s }) => +(100 * s[key][n] / s.world[n]).toFixed(2)),
  });
  return {
    animationDurationUpdate: 600,
    grid: { left: 8, right: 16, top: 40, bottom: 10, containLabel: true },
    legend: legendBase,
    tooltip: { ...tooltipBase, trigger: "axis", valueFormatter: (v) => v + "%" },
    xAxis: { type: "category", data: cols.map((c) => c.label),
      axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false },
      axisLabel: { fontFamily: FONT, fontSize: 11, color: INK, interval: 0,
        formatter: (v) => (v.length > 14 ? v.replace(/ /g, "\n") : v) } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: GRID } },
      axisLabel: { ...axisLabel, formatter: (v) => v + "%" } },
    series: EXP_KEYS.map(mk),
  };
}

function init() {
  const D = window.VC_DATA;
  if (!D || !D.headtohead) throw new Error("data/data.js missing headtohead — run scripts/fetch_data.py");
  const H = D.headtohead;
  const meta = D.meta;
  const Y = H.years[H.years.length - 1];
  const n = H.years.length - 1;

  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Data as of ${meta.data_as_of} · Source: UN Comtrade (importer-reported)`;
  });
  document.querySelectorAll(".yr").forEach((el) => { el.textContent = Y; });

  /* per-market "overall" = the four chains combined */
  for (const m of Object.keys(H.markets)) {
    H.series[m].overall = Object.keys(H.chains)
      .map((c) => H.series[m][c])
      .reduce((a, b) => addSeries(a, b));
  }

  const state = { market: "overall", chain: "overall", chapter: null, mode: "share", snapChapter: "" };

  /* populate the custom dropdown, biggest product groups first */
  const sel = document.getElementById("chapter-select");
  // default lands on the biggest market, but the list itself is alphabetical
  // so it can be scanned rather than searched
  const chapCodes = Object.keys(H.chapters).sort((a, b) =>
    (H.chapter_series.usa[b].world[n] + H.chapter_series.eu[b].world[n]) -
    (H.chapter_series.usa[a].world[n] + H.chapter_series.eu[a].world[n]));
  state.chapter = chapCodes[0];
  const chapAZ = Object.keys(H.chapters).sort((a, b) =>
    H.chapters[a].localeCompare(H.chapters[b]));
  for (const hs of chapAZ) {
    const o = document.createElement("option");
    o.value = hs;
    o.textContent = `${H.chapters[hs]} (HS ${hs})`;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => { state.chapter = sel.value; renderRace(); });

  /* second dropdown: append a product group to the scoreboard */
  const snapSel = document.getElementById("snap-select");
  for (const hs of chapAZ) {
    const o = document.createElement("option");
    o.value = hs;
    o.textContent = `${H.chapters[hs]} (HS ${hs})`;
    snapSel.appendChild(o);
  }
  snapSel.addEventListener("change", () => { state.snapChapter = snapSel.value; renderSnap(); });

  /* what is currently being raced? */
  const marketBase = (m) =>
    state.chain === "overall" ? H.series[m].overall
    : state.chain === "custom" ? H.chapter_series[m][state.chapter]
    : H.series[m][state.chain];
  const currentSeries = () =>
    state.market === "overall" ? addSeries(marketBase("usa"), marketBase("eu")) : marketBase(state.market);
  const chainLabel = () =>
    state.chain === "overall" ? "the four value chains combined"
    : state.chain === "custom" ? (H.chapters[state.chapter] || "").toLowerCase()
    : H.chains[state.chain].toLowerCase();
  const marketLabel = () =>
    state.market === "usa" ? "the United States"
    : state.market === "eu" ? "the EU (extra-EU trade)"
    : "the US and EU combined";

  const raceChart = makeChart("chart-race", 380);
  const snapChart = makeChart("chart-snapshot", 380);

  const renderRace = () => {
    sel.hidden = state.chain !== "custom";
    raceChart.setOption(raceOption(H, currentSeries(), state.mode), true);
    document.getElementById("race-title").textContent =
      `Who is winning ${chainLabel()} in ${marketLabel()}?`;
    document.getElementById("race-sub").textContent =
      state.mode === "share"
        ? `Share of ${marketLabel()}'s imports of ${chainLabel()}, ${H.years[0]}–${Y}, per cent.`
        : `${marketLabel()}'s imports of ${chainLabel()} by supplier, ${H.years[0]}–${Y}, US$ billion.`;
  };
  const snapCols = () => {
    const getChain = (c) =>
      state.market === "overall" ? addSeries(H.series.usa[c], H.series.eu[c]) : H.series[state.market][c];
    const getChap = (hs) =>
      state.market === "overall"
        ? addSeries(H.chapter_series.usa[hs], H.chapter_series.eu[hs])
        : H.chapter_series[state.market][hs];
    const cols = Object.keys(H.chains).map((c) => ({ label: H.chains[c], s: getChain(c) }));
    cols.push({ label: "Overall (4 chains)", s: getChain("overall") });
    if (state.snapChapter) cols.push({ label: H.chapters[state.snapChapter], s: getChap(state.snapChapter) });
    return cols;
  };
  const renderSnap = () => {
    snapChart.setOption(snapshotOption(H, snapCols()), true);
    document.getElementById("snap-title").textContent = `The scoreboard in ${marketLabel()}, ${Y}`;
    document.getElementById("snap-sub").textContent =
      `Market share of each supplier: the four value chains, all four combined${state.snapChapter ? ", and your pick" : ""} — ${Y}. Add any product group below.`;
  };

  renderRace(); renderSnap();

  wireSegs((group, v) => {
    if (group === "market") { state.market = v; renderRace(); renderSnap(); }
    if (group === "chain") { state.chain = v; renderRace(); }
    if (group === "mode") { state.mode = v; renderRace(); }
  });

  document.getElementById("dl-race").addEventListener("click", () => {
    const s = currentSeries();
    const what = state.chain === "custom" ? "hs" + state.chapter : state.chain;
    downloadCSV(`h2h-${state.market}-${what}-${H.years[0]}-${Y}.csv`,
      ["year", "world_imports_usd", "india_usd", "china_usd", "vietnam_usd", "bangladesh_usd",
       "india_share_pct", "china_share_pct", "vietnam_share_pct", "bangladesh_share_pct"],
      H.years.map((y, i) => [y, s.world[i], s.india[i], s.china[i], s.vietnam[i], s.bangladesh[i]]
        .concat(EXP_KEYS.map((k) => (100 * s[k][i] / s.world[i]).toFixed(2)))));
  });

  document.getElementById("dl-snapshot").addEventListener("click", () => {
    downloadCSV(`h2h-${state.market}-scoreboard-${Y}.csv`,
      ["group", "world_imports_usd", "india_share_pct", "china_share_pct", "vietnam_share_pct", "bangladesh_share_pct"],
      snapCols().map(({ label, s }) =>
        [label, s.world[n]].concat(EXP_KEYS.map((k) => (100 * s[k][n] / s.world[n]).toFixed(2)))));
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
