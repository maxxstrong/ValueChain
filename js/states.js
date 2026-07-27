/* ValueChain — states page: who inside India does the exporting.
   Reads window.VC_DATA.states from data/vc_states.js (DGCIS, not Comtrade). */
(function () {
"use strict";

const ACCENT = "#c14e00", BLUE = "#3d5a80", REST = "#b9b4a8";

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

function hBar(labels, values, colors, fmt) {
  return {
    grid: { left: 8, right: 70, top: 6, bottom: 6, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: fmt },
    xAxis: { type: "value", axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: { type: "category", data: labels.slice().reverse(),
             axisTick: { show: false }, axisLine: { show: false },
             axisLabel: { fontSize: 12.5, color: "#1b1b1f" } },
    series: [{ type: "bar", data: values.slice().reverse().map((v, i) => ({
        value: v, itemStyle: { color: colors[values.length - 1 - i], borderRadius: [0, 4, 4, 0] } })),
      barWidth: "62%",
      label: { show: true, position: "right", fontSize: 11.5, color: "#55565e",
               formatter: (p) => fmt(p.value) } }],
  };
}

function init() {
  const S = window.VC_DATA.states;
  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Source: DGCIS / NIRYAT, Ministry of Commerce · periods labelled per card`;
  });

  /* hero chips */
  const q = S.quarter.rows;
  document.getElementById("chip-guj").textContent = q[0].share.toFixed(0) + "%";
  const top3 = q[0].share + q[1].share + q[2].share;
  document.getElementById("chip-top3").textContent = top3.toFixed(0) + "%";
  document.getElementById("chip-dist").textContent =
    S.districts.rows.reduce((a, d) => a + d.share, 0).toFixed(0) + "%";

  /* 05 — quarterly snapshot (demoted; no YoY chips — see brief P1.5) */
  const qc = makeChart("chart-quarter", q.length * 30 + 40);
  qc.setOption(hBar(
    q.map((r) => r.state),
    q.map((r) => r.cur),
    q.map((r, i) => r.state.indexOf("other") !== -1 ? REST : (i < 3 ? ACCENT : BLUE)),
    (v) => "$" + v.toFixed(1) + " bn"));
  document.getElementById("dl-quarter").addEventListener("click", () =>
    downloadCSV("states-latest-quarter.csv",
      ["state", "exports_prev_year_same_quarter_bn_usd", "exports_prev_quarter_bn_usd",
       "exports_" + S.meta.quarter_short.toLowerCase().replace(/[^a-z0-9]+/g, "") + "_bn_usd",
       "share_pct", "qoq_pct", "yoy_pct"],
      q.map((r) => [r.state, r.prev_yr, r.prev_q, r.cur, r.share, r.qoq, r.yoy])));

  /* 02 — full year top 8 */
  const fy = S.full_year.rows;
  const fc = makeChart("chart-fy", fy.length * 32 + 40);
  fc.setOption(hBar(fy.map((r) => r.state), fy.map((r) => r.value),
    fy.map((_, i) => (i === 0 ? ACCENT : BLUE)), (v) => "$" + v.toFixed(1) + " bn"));
  document.getElementById("dl-fy").addEventListener("click", () =>
    downloadCSV("states-full-year-fy2425.csv", ["state", "exports_bn_usd"],
      fy.map((r) => [r.state, r.value])));

  /* 03 — sector cards */
  const IN_PICKER = new Set(["27","29","30","33","39","40","41","42","43","44","48","50","51","52","53","54","55","56","57","58","59","60","61","62","63","64","69","70","71","72","73","76","82","84","85","87","88","90","94","95"]);
  document.getElementById("sector-cards").innerHTML = S.sectors.rows.map((s) =>
    `<div class="statecard"><b>${s.state}</b><div class="chips">` +
    s.items.map((it) => {
      const label = `${it.name} · ${it.share.toFixed(0)}%`;
      return IN_PICKER.has(it.hs)
        ? `<a class="chip-link" href="products.html#hs=${it.hs}">${label}</a>`
        : `<span class="chip-plain">${label}</span>`;
    }).join("") + `</div></div>`).join("");

  /* 04 — districts */
  document.getElementById("district-rows").innerHTML = S.districts.rows.map((d, i) =>
    `<div class="distrow"><span class="dr-rank">${i + 1}</span>` +
    `<div class="dr-main"><b>${d.district}</b><span class="dr-state">${d.state}</span>` +
    `<span class="dr-why">${d.why}</span></div>` +
    `<span class="dr-val">$${d.value.toFixed(1)} bn</span></div>`).join("");
  document.getElementById("dl-districts").addEventListener("click", () =>
    downloadCSV("top-districts.csv", ["district", "state", "exports_bn_usd", "share_pct"],
      S.districts.rows.map((d) => [d.district, d.state, d.value, d.share])));

  /* 05 — all states & UTs */
  const all = S.all_states.rows;
  const ac = makeChart("chart-all", all.length * 26 + 40);
  ac.setOption(hBar(all.map((r) => r.state), all.map((r) => r.value),
    all.map((_, i) => (i < 3 ? ACCENT : BLUE)),
    (v) => v >= 1000 ? "$" + (v / 1000).toFixed(1) + " bn" : "$" + Math.round(v) + " m"));
  document.getElementById("dl-all").addEventListener("click", () =>
    downloadCSV("all-states-fy2223.csv", ["state", "exports_mn_usd", "leading_export"],
      all.map((r) => [r.state, r.value, r.top])));

  /* 03b — custom state picker */
  const GOOD_HS = { "Petroleum products": "27", "Engineering goods": "84",
    "Electronic goods": "85", "Pharmaceuticals": "30" };
  // listed A–Z; the option value stays the row's rank index, so the card
  // can still show "India's #7 exporter state"
  const ssel = document.getElementById("state-select");
  all.map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.state.localeCompare(b.r.state))
    .forEach(({ r, i }) => {
      const o = document.createElement("option");
      o.value = String(i);
      const v = r.value >= 1000 ? "$" + (r.value / 1000).toFixed(1) + " bn" : "$" + Math.round(r.value) + " m";
      o.textContent = `${r.state} — ${v}`;
      ssel.appendChild(o);
    });
  const renderState = () => {
    const i = parseInt(ssel.value, 10);
    const r = all[Number.isFinite(i) ? i : 0];
    if (!r) return;
    const qrow = q.find((x) => x.state === r.state);
    const srow = S.sectors.rows.find((x) => x.state === r.state);
    const v = r.value >= 1000 ? "$" + (r.value / 1000).toFixed(1) + " bn" : "$" + Math.round(r.value) + " m";
    let chips = "";
    if (srow) {
      chips = srow.items.map((it) => {
        const label = `${it.name} · ${it.share.toFixed(0)}%`;
        return IN_PICKER.has(it.hs)
          ? `<a class="chip-link" href="products.html#hs=${it.hs}">${label}</a>`
          : `<span class="chip-plain">${label}</span>`;
      }).join("");
    } else {
      const hs = GOOD_HS[r.top];
      chips = hs
        ? `<a class="chip-link" href="products.html#hs=${hs}">Leading export: ${r.top}</a>`
        : `<span class="chip-plain">Leading export: ${r.top}</span>`;
    }
    let qline = "";
    if (qrow) {
      qline = `<span class="dr-why">${S.meta.quarter_long}: $${qrow.cur.toFixed(1)} bn — ` +
        `${qrow.share.toFixed(1)}% of India's exports that quarter.</span>`;
    } else if (r.state !== "Lakshadweep") {
      const named = S.quarter.rows.filter((x) => x.state.indexOf("other") === -1).length;
      qline = `<span class="dr-why">Not among the top ${named} states DGCIS names individually in the ${S.meta.quarter_short} review — figure is for FY 2022-23, the most recent year with complete official coverage.</span>`;
    }
    document.getElementById("state-custom").innerHTML =
      `<div class="statecard"><b>${r.state}</b>` +
      `<span class="dr-why">India's #${i + 1} exporter state · ${v} of goods exported in FY 2022-23.</span>` +
      qline + `<div class="chips" style="margin-top:9px">${chips}</div></div>`;
  };
  ssel.addEventListener("change", renderState);
  renderState();

  window.addEventListener("resize", () => { qc.resize(); fc.resize(); ac.resize(); });
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
})();
