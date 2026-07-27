/* ValueChain — research & data page.
   Reads window.VC_DATA.research (built by scripts/build_research.py). */
(function () {
"use strict";

const ACCENT = "#c14e00", BLUE = "#3d5a80", RED = "#a32c22", GREY = "#b9b4a8";

const money = (v) => {
  const b = v / 1e9;
  if (Math.abs(b) >= 100) return "$" + Math.round(b) + " bn";
  if (Math.abs(b) >= 1) return "$" + b.toFixed(1) + " bn";
  return "$" + Math.round(v / 1e6) + " m";
};

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

function makeChart(id, h) {
  const el = document.getElementById(id);
  el.style.height = h + "px";
  return echarts.init(el);
}

function hBar(labels, values, colors, fmt, axisMax) {
  return {
    grid: { left: 8, right: 78, top: 6, bottom: 6, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: fmt },
    xAxis: { type: "value", max: axisMax, axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: {
      type: "category", data: labels.slice().reverse(),
      axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { fontSize: 12.5, color: "#1b1b1f" },
    },
    series: [{
      type: "bar", barWidth: "62%",
      data: values.slice().reverse().map((v, i) => ({
        value: v,
        itemStyle: { color: colors[values.length - 1 - i], borderRadius: [0, 4, 4, 0] },
      })),
      label: { show: true, position: "right", fontSize: 11.5, color: "#55565e",
               formatter: (p) => fmt(p.value) },
    }],
  };
}

function wireSeg(group, onPick) {
  const seg = document.querySelector(`.seg[data-group="${group}"]`);
  if (!seg) return;
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    seg.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    onPick(b.getAttribute("data-v"));
  });
}

function init() {
  const D = window.VC_DATA;
  if (!D || !D.research) throw new Error("data/vc_research.js missing — run scripts/build_research.py");
  const R = D.research;
  const Y = R.year;

  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Computed from UN Comtrade ${Y} · Source: UN Comtrade`;
  });
  document.querySelectorAll(".latest-year").forEach((el) => { el.textContent = Y; });

  /* ---- 01 revealed advantage ---- */
  const A = R.advantage;
  document.getElementById("rca-baseline").textContent = A.baseline_share + "%";
  const rcaChart = makeChart("chart-rca", 12 * 32 + 40);
  let rcaView = "top";
  const rcaRows = () => (rcaView === "top"
    ? A.rows.slice(0, 12)
    : A.rows.slice(-12).reverse());
  const renderRca = () => {
    const rows = rcaRows();
    document.getElementById("rca-sub").textContent = rcaView === "top"
      ? `The twelve product groups where India is most over-represented, ${Y}. Index of 1.0 = India's average.`
      : `The twelve product groups where India is most under-represented, ${Y}. These are the open goals.`;
    rcaChart.setOption(hBar(
      rows.map((r) => r.label),
      rows.map((r) => r.rca),
      rows.map((r) => (r.rca >= 1 ? ACCENT : BLUE)),
      (v) => v.toFixed(2) + "×"), true);
  };
  renderRca();
  wireSeg("rcaview", (v) => { rcaView = v; renderRca(); });
  document.getElementById("dl-rca").addEventListener("click", () =>
    downloadCSV("revealed-advantage.csv",
      ["hs2", "product", "tracked_market_imports_usd", "from_india_usd", "india_share_pct", "advantage_index", "india_world_exports_usd"],
      A.rows.map((r) => [r.hs, r.label, r.market_size, r.from_india, r.share, r.rca, r.exports])));

  /* ---- 02 import dependence ---- */
  const dep = R.dependence.slice(0, 12);
  const depChart = makeChart("chart-dep", 12 * 32 + 40);
  depChart.setOption(hBar(
    dep.map((r) => `${r.label} · ${r.top}`),
    dep.map((r) => r.top_share),
    dep.map((r) => (r.top_share >= 50 ? RED : r.top_share >= 30 ? ACCENT : BLUE)),
    (v) => v.toFixed(0) + "%", 100));
  const over50 = R.dependence.filter((r) => r.top_share >= 50).length;
  const china = R.dependence.filter((r) => r.top === "China" && r.top_share >= 50).length;
  document.getElementById("dep-note").innerHTML =
    `<i>What this shows.</i> In <b>${over50}</b> of the ${R.dependence.length} product groups tracked, ` +
    `a single country supplies half or more of everything India imports` +
    (china ? ` — and in <b>${china}</b> of those the supplier is China` : "") +
    `. Read it as exposure, not a verdict: concentration is efficient until it isn't. ` +
    `The denominator is India's own reported world imports of the chapter, so these shares are exact.`;
  document.getElementById("dl-dep").addEventListener("click", () =>
    downloadCSV("import-dependence.csv",
      ["hs2", "product", "india_imports_usd", "largest_supplier", "largest_supplier_share_pct", "top3_share_pct"],
      R.dependence.map((r) => [r.hs, r.label, r.imports, r.top, r.top_share, r.top3_share])));

  /* ---- 03 export concentration ---- */
  const C = R.concentration;
  document.getElementById("conc-top1").textContent = C.top1.share + "%";
  document.getElementById("conc-top1-lbl").textContent = `Largest single market (${C.top1.name})`;
  document.getElementById("conc-top5").textContent = C.top5_share + "%";
  document.getElementById("conc-hhi").textContent = C.hhi;
  document.getElementById("conc-sub").textContent =
    `India's goods exports are spread across ${C.partners} partner countries, ${Y}.`;
  const concChart = makeChart("chart-conc", 15 * 30 + 40);
  concChart.setOption(hBar(
    C.rows.map((r) => r.name),
    C.rows.map((r) => r.share),
    C.rows.map((_, i) => (i < 5 ? ACCENT : BLUE)),
    (v) => v.toFixed(1) + "%"));
  document.getElementById("dl-conc").addEventListener("click", () =>
    downloadCSV("export-concentration.csv",
      ["destination", "exports_usd", "share_pct"],
      C.rows.map((r) => [r.name, r.value, r.share])));

  /* ---- 04 mirror gaps ---- */
  const M = R.mirror;
  const mirrorChart = makeChart("chart-mirror", M.length * 30 + 40);
  mirrorChart.setOption({
    grid: { left: 8, right: 78, top: 6, bottom: 6, containLabel: true },
    tooltip: {
      trigger: "axis", axisPointer: { type: "shadow" },
      formatter: (ps) => {
        const r = M.slice().reverse()[ps[0].dataIndex];
        return `<b>${r.name}</b><br>They report: ${money(r.they_report)}` +
               `<br>India reports: ${money(r.india_reports)}` +
               `<br>Gap: ${r.gap_pct > 0 ? "+" : ""}${r.gap_pct}%`;
      },
    },
    xAxis: { type: "value", axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: {
      type: "category", data: M.slice().reverse().map((r) => r.name),
      axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { fontSize: 12.5, color: "#1b1b1f" },
    },
    series: [{
      type: "bar", barWidth: "62%",
      data: M.slice().reverse().map((r) => ({
        value: r.gap_pct,
        itemStyle: {
          color: r.gap_pct < 0 ? BLUE : r.gap_pct > 20 ? RED : GREY,
          borderRadius: r.gap_pct < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0],
        },
      })),
      label: { show: true, position: "right", fontSize: 11.5, color: "#55565e",
               formatter: (p) => (p.value > 0 ? "+" : "") + p.value.toFixed(0) + "%" },
      markLine: {
        silent: true, symbol: "none",
        lineStyle: { color: "#8b8c95", type: "dashed" },
        label: { formatter: "CIF/FOB\nnormal range", fontSize: 10, color: "#6d6e75" },
        data: [{ xAxis: 15 }],
      },
    }],
  }, true);
  document.getElementById("dl-mirror").addEventListener("click", () =>
    downloadCSV("mirror-statistics.csv",
      ["partner", "year", "partner_reported_imports_from_india_usd", "india_reported_exports_usd", "gap_pct"],
      M.map((r) => [r.name, r.year, r.they_report, r.india_reports, r.gap_pct])));

  /* ---- 05 downloads ---- */
  const files = [
    ["trend.json", "India's total goods exports and imports, 2016 onwards"],
    ["partners_exports.json", "Top export destinations, latest year"],
    ["partners_imports.json", "Top import sources, latest year"],
    ["products_exports.json", "Exports by HS 2-digit chapter"],
    ["products_imports.json", "Imports by HS 2-digit chapter"],
    ["productpages.json", "Per-chapter trend plus 14 markets' imports and India's share"],
    ["headtohead.json", "US and EU market share: India vs China, Vietnam, Bangladesh"],
    ["sourcing.json", "World's largest exporters and India's suppliers, by chapter"],
    ["bilateral.json", "India's exports and imports with every partner, 2016 onwards"],
    ["research.json", "The four measures on this page"],
    ["meta.json", "Refresh timestamps, source periods and row counts"],
  ];
  document.getElementById("dl-list").innerHTML = files.map(([f, why]) => `
    <div class="dlrow">
      <div class="dl-main"><b>${f}</b><span class="dr-why">${why}</span></div>
      <a class="chip-link" href="data/${f}" download>Download →</a>
    </div>`).join("");

  window.addEventListener("resize", () => {
    rcaChart.resize(); depChart.resize(); concChart.resize(); mirrorChart.resize();
  });
}

function boot() {
  try { init(); } catch (e) {
    console.error(e);
    document.querySelectorAll(".echart").forEach((f) => {
      f.innerHTML = '<p style="padding:30px;color:#6d6e75;font-size:14px">Could not draw this chart: ' + e.message + "</p>";
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
        f.innerHTML = '<p style="padding:30px;color:#6d6e75;font-size:14px">The chart library could not be loaded. Please check your connection and reload.</p>';
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
})();
