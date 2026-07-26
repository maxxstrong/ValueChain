/* ValueChain — services trade. Reads window.VC_DATA.services
   (built by scripts/fetch_services.py from World Bank data). */
(function () {
"use strict";

const ACCENT = "#c14e00", BLUE = "#3d5a80", RED = "#a32c22", GREEN = "#2c7a3f";
const bn = (v) => v / 1e9;
const money = (v) => (Math.abs(bn(v)) >= 100 ? "$" + Math.round(bn(v)) : "$" + bn(v).toFixed(1)) + " bn";

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

const axis = {
  axisLabel: { formatter: (v) => (Math.abs(v) >= 1e9 ? v / 1e9 : v / 1e6) },
  splitLine: { lineStyle: { color: "#eee7d9" } },
};

function init() {
  const D = window.VC_DATA;
  if (!D || !D.services) throw new Error("data/vc_services.js missing — run scripts/fetch_services.py");
  const S = D.services;
  const years = S.years;
  const n = years.length - 1;
  const Y = S.latest_year;
  const I = S.india;

  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Services: World Bank, ${Y} · Goods: UN Comtrade`;
  });
  document.querySelectorAll(".sv-year").forEach((el) => { el.textContent = Y; });
  document.querySelectorAll(".latest-year").forEach((el) => { el.textContent = Y; });

  /* hero */
  const goodsY = I.goods_exports[n];
  document.getElementById("sv-x").textContent = money(I.exports[n]);
  document.getElementById("sv-ratio").textContent =
    goodsY ? Math.round(100 * I.exports[n] / goodsY) + "%" : "—";
  document.getElementById("sv-surplus").textContent = "+" + money(I.surplus[n]).slice(1);

  /* 01 — services vs goods */
  const scaleChart = makeChart("chart-scale", 360);
  scaleChart.setOption({
    grid: { left: 8, right: 8, top: 42, bottom: 4, containLabel: true },
    legend: { top: 0, itemWidth: 14, itemHeight: 9, textStyle: { fontSize: 12 } },
    tooltip: { trigger: "axis", valueFormatter: (v) => money(v) },
    xAxis: { type: "category", data: years, axisTick: { show: false } },
    yAxis: Object.assign({ type: "value", name: "US$ bn", nameTextStyle: { fontSize: 11 } }, axis),
    series: [
      { name: "Goods exports", type: "bar", data: I.goods_exports,
        itemStyle: { color: BLUE, borderRadius: [3, 3, 0, 0] } },
      { name: "Services exports", type: "bar", data: I.exports,
        itemStyle: { color: ACCENT, borderRadius: [3, 3, 0, 0] } },
    ],
  }, true);
  const gGrowth = I.goods_exports[0] ? I.goods_exports[n] / I.goods_exports[0] : 0;
  const sGrowth = I.exports[0] ? I.exports[n] / I.exports[0] : 0;
  document.getElementById("scale-sub").textContent =
    `India's exports, both kinds, ${years[0]}–${Y}. Services reached ${money(I.exports[n])} against ${money(goodsY)} of goods.`;
  document.getElementById("scale-note").innerHTML =
    `Since ${years[0]} services exports have grown <b>${sGrowth.toFixed(1)}×</b> against ` +
    `<b>${gGrowth.toFixed(1)}×</b> for goods. On present trends the two lines meet: services are now ` +
    `<b>${Math.round(100 * I.exports[n] / goodsY)}%</b> the size of goods exports, up from ` +
    `${Math.round(100 * I.exports[0] / I.goods_exports[0])}% in ${years[0]}. And unlike goods, ` +
    `services need no port, face no tariff and clear no customs.`;
  document.getElementById("dl-scale").addEventListener("click", () =>
    downloadCSV("india-services-vs-goods.csv",
      ["year", "services_exports_usd", "goods_exports_usd", "services_imports_usd", "services_surplus_usd"],
      years.map((y, i) => [y, I.exports[i], I.goods_exports[i], I.imports[i], I.surplus[i]])));

  /* 02 — what pays for the goods deficit */
  const core = D.trend || null;
  const gmap = {};
  if (core) core.years.forEach((y, i) => { gmap[y] = core.exports[i] - core.imports[i]; });
  const goodsBal = years.map((y) => gmap[y] || 0);
  const balChart = makeChart("chart-balance", 360);
  balChart.setOption({
    grid: { left: 8, right: 8, top: 42, bottom: 4, containLabel: true },
    legend: { top: 0, itemWidth: 14, itemHeight: 9, textStyle: { fontSize: 12 } },
    tooltip: { trigger: "axis", valueFormatter: (v) => money(v) },
    xAxis: { type: "category", data: years, axisTick: { show: false } },
    yAxis: Object.assign({ type: "value", name: "US$ bn", nameTextStyle: { fontSize: 11 } }, axis),
    series: [
      { name: "Goods balance", type: "bar", data: goodsBal,
        itemStyle: { color: RED, borderRadius: [0, 0, 3, 3] } },
      { name: "Services balance", type: "bar", data: I.surplus,
        itemStyle: { color: GREEN, borderRadius: [3, 3, 0, 0] } },
      { name: "Combined", type: "line", data: years.map((y, i) => goodsBal[i] + I.surplus[i]),
        symbolSize: 6, lineStyle: { width: 2.5, color: "#1b1b1f" }, itemStyle: { color: "#1b1b1f" } },
    ],
  }, true);
  const gd = goodsBal[n], ss = I.surplus[n];
  const covered = gd < 0 ? Math.min(100, Math.round(100 * ss / Math.abs(gd))) : 100;
  document.getElementById("balance-note").innerHTML =
    `<i>The number that changes the story.</i> In ${Y} India ran a goods deficit of ` +
    `<b>${money(Math.abs(gd))}</b> and a services surplus of <b>${money(ss)}</b> — so services ` +
    `covered about <b>${covered}%</b> of the goods gap. Read the goods deficit alone and India ` +
    `looks structurally dependent on the rest of the world; read both and the picture is a country ` +
    `that buys physical things and sells knowledge work. Neither number is wrong; quoting only one is.`;
  document.getElementById("dl-balance").addEventListener("click", () =>
    downloadCSV("india-trade-balance-goods-and-services.csv",
      ["year", "goods_balance_usd", "services_balance_usd", "combined_usd"],
      years.map((y, i) => [y, goodsBal[i], I.surplus[i], goodsBal[i] + I.surplus[i]])));

  /* 03 — world ranking */
  const R = S.ranking;
  const rankChart = makeChart("chart-rank", R.length * 32 + 40);
  rankChart.setOption({
    grid: { left: 8, right: 80, top: 6, bottom: 6, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v) => money(v) },
    xAxis: { type: "value", axisLabel: { show: false }, splitLine: { show: false } },
    yAxis: {
      type: "category", data: R.slice().reverse().map((r) => r.name),
      axisTick: { show: false }, axisLine: { show: false },
      axisLabel: { fontSize: 12.5, color: "#1b1b1f" },
    },
    series: [{
      type: "bar", barWidth: "62%",
      data: R.slice().reverse().map((r) => ({
        value: r.value,
        itemStyle: { color: r.iso === "IND" ? ACCENT : BLUE, borderRadius: [0, 4, 4, 0] },
      })),
      label: { show: true, position: "right", fontSize: 11.5, color: "#55565e",
               formatter: (p) => money(p.value) },
    }],
  }, true);
  const idx = R.findIndex((r) => r.iso === "IND");
  const china = R.find((r) => r.iso === "CHN");
  document.getElementById("rank-sub").textContent =
    `Services exports, ${Y}, US$ billion — India highlighted.`;
  document.getElementById("rank-note").innerHTML =
    `Among these large exporters India ranks <b>${idx + 1}</b>` +
    (china && R[idx].value > china.value
      ? ` — and sells <b>more services than China</b>, which is the reverse of the goods picture, `
        + `where China outsells India several times over.`
      : ".") +
    ` This is a selection of major services exporters rather than the complete world ranking; ` +
    `Ireland's and the Netherlands' figures are inflated by multinational profit-routing.`;
  document.getElementById("dl-rank").addEventListener("click", () =>
    downloadCSV("services-exports-by-country.csv", ["country", "year", "services_exports_usd"],
      R.map((r) => [r.name, Y, r.value])));

  /* 04 — composition */
  const C = S.composition || [];
  document.getElementById("what-sub").textContent =
    `Composition of India's services exports, ${C.length ? C[0].year : Y}.`;
  document.getElementById("what-rows").innerHTML = C.map((c) => `
    <div class="mk">
      <span class="mk-rank">${c.share.toFixed(0)}%</span>
      <div class="mk-main">
        <b>${c.label}</b>
        <span class="mk-why">${money(I.exports[n] * c.share / 100)} of India's ${money(I.exports[n])} services exports</span>
      </div>
    </div>`).join("") ||
    '<p class="dr-why">Composition data unavailable in this refresh.</p>';

  window.addEventListener("resize", () => {
    scaleChart.resize(); balChart.resize(); rankChart.resize();
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
        f.innerHTML = '<p style="padding:30px;color:#6d6e75;font-size:14px">The chart library could not be loaded.</p>';
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
