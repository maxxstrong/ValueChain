/* ValueChain — the exporter's toolkit.
   Combines this site's trade data (NIRYAT-style), agreement coverage
   (TIA-style market access context) and curated scheme matching
   (myScheme-style) into one brief. Runs entirely client-side. */
(function () {
"use strict";

/* markets India has an agreement with — mirrors js/explainers.js.
   Keyed by the market labels used in the products dataset. */
const FTA_BY_MARKET = {
  "United Arab Emirates": { s: "in force", n: "India–UAE CEPA (2022)" },
  "Australia": { s: "in force", n: "India–Australia ECTA (2022); duty-free since Jan 2026" },
  "United Kingdom": { s: "in force", n: "India–UK CETA (in force 15 July 2026)" },
  "Japan": { s: "in force", n: "India–Japan CEPA (2011)" },
  "South Korea": { s: "in force", n: "India–South Korea CEPA (2010)" },
  "Singapore": { s: "in force", n: "India–Singapore CECA (2005); ASEAN–India FTA" },
  "China": { s: "partial", n: "APTA only — limited tariff concessions" },
  "European Union": { s: "talks", n: "India–EU FTA under negotiation" },
  "United States": { s: "talks", n: "Bilateral trade agreement under negotiation; GSP withdrawn 2019" },
  "Canada": { s: "talks", n: "CEPA talks paused since 2023" },
  "Saudi Arabia": { s: "talks", n: "India–GCC FTA under negotiation" },
  "Brazil": { s: "partial", n: "MERCOSUR–India PTA — limited concessions" },
  "Mexico": { s: "none", n: "No trade agreement with India" },
  "Hong Kong SAR": { s: "none", n: "No bilateral agreement" },
};

const bn = (v) => v / 1e9;
const money = (v) => (bn(v) >= 100 ? "$" + Math.round(bn(v)) : "$" + bn(v).toFixed(1)) + " bn";

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

function matches(scheme, ctx) {
  const m = scheme.match || {};
  if (m.exporter_type && m.exporter_type !== "any" && m.exporter_type !== ctx.type) return false;
  if (m.msme && m.msme !== "any" && m.msme !== ctx.msme) return false;
  if (m.chapters && m.chapters !== "all" && m.chapters.indexOf(ctx.hs) === -1) return false;
  return true;
}

function init() {
  const D = window.VC_DATA;
  if (!D || !D.productpages || !D.schemes) {
    throw new Error("data files missing — run scripts/fetch_data.py");
  }
  const P = D.productpages;
  const S = D.schemes;
  const years = P.years;
  const n = years.length - 1;
  const Y = years[n];

  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Trade data: UN Comtrade ${Y} · Scheme status: ${S.as_of}`;
  });
  document.querySelectorAll(".latest-year").forEach((el) => { el.textContent = Y; });
  document.getElementById("tk-asof").textContent = S.as_of;
  document.getElementById("tk-disclaimer").textContent = S.disclaimer;

  /* ---- question 1: product ---- */
  const pSel = document.getElementById("tk-product");
  const codes = Object.keys(P.chapters).sort((a, b) =>
    P.india_trend[b].exports[n] - P.india_trend[a].exports[n]);
  const codesAZ = Object.keys(P.chapters).sort((a, b) =>
    P.chapters[a].localeCompare(P.chapters[b]));
  for (const hs of codesAZ) {
    const o = document.createElement("option");
    o.value = hs;
    o.textContent = `${P.chapters[hs]} (HS ${hs})`;
    pSel.appendChild(o);
  }
  pSel.value = codes[0];

  /* ---- question 2: state ---- */
  const sSel = document.getElementById("tk-state");
  const stateNames = ((D.states && D.states.all_states)
    ? D.states.all_states.rows.map((r) => r.state)
    : ["Uttar Pradesh"]).sort((a, b) => a.localeCompare(b));
  for (const name of stateNames) {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    sSel.appendChild(o);
  }
  sSel.value = stateNames.indexOf("Uttar Pradesh") >= 0 ? "Uttar Pradesh" : stateNames[0];

  const tSel = document.getElementById("tk-type");
  const mSel = document.getElementById("tk-msme");
  if (!tSel.value) tSel.value = "manufacturer";
  if (!mSel.value) mSel.value = "yes";

  let lastRows = [];

  const render = () => {
    const hs = pSel.value;
    const ctx = { hs, state: sSel.value, type: tSel.value, msme: mSel.value };
    const name = P.chapters[hs];

    /* ---------- 02 · markets ranked by opportunity ---------- */
    const rows = Object.values(P.markets).map((m) => {
      const s = m.series[hs] || { world: 0, india: 0 };
      const share = s.world ? (100 * s.india / s.world) : 0;
      return {
        label: m.label, year: m.year, world: s.world, india: s.india, share,
        gap: Math.max(s.world - s.india, 0),
        fta: FTA_BY_MARKET[m.label] || { s: "none", n: "No trade agreement with India" },
      };
    }).filter((r) => r.world > 0).sort((a, b) => b.gap - a.gap);
    lastRows = rows;

    document.getElementById("tk-markets-title").textContent =
      `Your best markets for ${name.toLowerCase()}`;
    document.getElementById("tk-markets-sub").textContent =
      `${rows.length} major markets, ranked by how much of each is not yet supplied by India. ` +
      `India currently exports ${money(P.india_trend[hs].exports[n])} of ${name.toLowerCase()} worldwide.`;

    const ftaClass = { "in force": "pill", "partial": "pill pill-talks",
                       "talks": "pill pill-talks", "none": "pill pill-ended" };
    const ftaWord = { "in force": "FTA in force", "partial": "partial",
                      "talks": "in talks", "none": "no FTA" };

    document.getElementById("tk-markets").innerHTML = rows.slice(0, 10).map((r, i) => `
      <div class="mk">
        <span class="mk-rank">${i + 1}</span>
        <div class="mk-main">
          <b>${r.label}</b>
          <span class="${ftaClass[r.fta.s]}">${ftaWord[r.fta.s]}</span>
          <span class="mk-why">Imports ${money(r.world)} of ${name.toLowerCase()}${r.year !== Y ? ` (${r.year})` : ""} ·
            India supplies ${r.share < 0.1 ? "under 0.1" : r.share.toFixed(1)}% ·
            <b>${money(r.gap)} not supplied by India</b></span>
          <span class="mk-fta">${r.fta.n}</span>
        </div>
      </div>`).join("");

    /* ---------- 03 · schemes ---------- */
    const eligible = S.schemes.filter((s) => matches(s, ctx))
      .sort((a, b) => a.priority - b.priority);
    const badge = { active: "pill", check: "pill pill-talks", ended: "pill pill-ended" };
    const badgeWord = { active: "open", check: "check status", ended: "ended" };

    const live = eligible.filter((s) => s.status !== "ended").length;
    document.getElementById("tk-schemes-sub").textContent =
      `${live} scheme${live === 1 ? "" : "s"} look relevant to ` +
      `${ctx.msme === "yes" ? "an MSME " : "a "}${ctx.type} exporter of ${name.toLowerCase()}.`;

    document.getElementById("tk-schemes").innerHTML = eligible.map((s) => `
      <div class="sch ${s.status === "ended" ? "sch-ended" : ""}">
        <div class="sch-head">
          <b>${s.name}</b>
          <span class="${badge[s.status]}">${badgeWord[s.status]}</span>
        </div>
        <span class="sch-give">${s.gives}</span>
        <span class="sch-who"><b>Who:</b> ${s.who}</span>
        <span class="sch-note">${s.status_note}</span>
        <a class="sch-link" href="${s.url}" target="_blank" rel="noopener">${s.agency} →</a>
      </div>`).join("");

    /* ---------- 04 · compliance radar ---------- */
    const CO = D.compliance;
    if (CO) {
      document.getElementById("tk-comp-asof").textContent = CO.as_of;
      document.getElementById("tk-comp-disclaimer").textContent = CO.disclaimer;
      const hits = CO.rules.filter((r) =>
        r.chapters === "all" || r.chapters.indexOf(hs) !== -1);
      const cBadge = { active: "pill pill-ended", upcoming: "pill pill-talks",
                       proposed: "pill pill-talks", eased: "pill" };
      const cWord = { active: "in force now", upcoming: "coming",
                      proposed: "proposed", eased: "eased" };
      document.getElementById("tk-comp-sub").innerHTML = hits.length
        ? `<b>${hits.length}</b> rule${hits.length === 1 ? "" : "s"} currently bite on ` +
          `${name.toLowerCase()}. These change what you have to <i>prove</i>, not just what duty you pay.`
        : `No market-access regulation on this list currently targets ${name.toLowerCase()} ` +
          `specifically — but buyer contracts increasingly carry their own requirements.`;
      document.getElementById("tk-compliance").innerHTML = hits.map((r) => `
        <div class="sch">
          <div class="sch-head">
            <b>${r.name}</b>
            <span class="${cBadge[r.status]}">${cWord[r.status]}</span>
            <span class="pill">${r.market}</span>
          </div>
          <span class="sch-note"><b>When:</b> ${r.when}</span>
          <span class="sch-give" style="margin-top:7px">${r.what}</span>
          <span class="sch-who"><b>Why it matters for India:</b> ${r.why_india}</span>
          <span class="sch-who"><b>What to do:</b> ${r.do}</span>
          <a class="sch-link" href="${r.url}" target="_blank" rel="noopener">Official text →</a>
        </div>`).join("") ||
        `<p class="dr-why">Nothing on the radar for this product group today. Check again
         before a new season — this list is reviewed monthly.</p>`;
    }

    /* ---------- 05 · where to go ---------- */
    const council = S.councils[hs];
    const statePolicy = (D.policies && D.policies.states[ctx.state]) || null;
    const stateRow = (D.states && D.states.all_states.rows.find((r) => r.state === ctx.state)) || null;

    let html = "";
    if (council) {
      html += `<div class="statecard"><b>Your Export Promotion Council</b>
        <span class="dr-why">Councils issue your RCMC — the membership certificate you need for most
        schemes — and run the subsidised trade-fair stands. This is the first call for a new exporter
        in ${name.toLowerCase()}.</span>
        <div class="chips" style="margin-top:9px">
          <a class="chip-link" href="${council.url}" target="_blank" rel="noopener">${council.name} →</a>
        </div></div>`;
    }
    if (statePolicy) {
      html += `<div class="statecard"><b>${ctx.state} — state support</b>` +
        (stateRow ? `<span class="dr-why">${ctx.state} exported $${stateRow.value >= 1000
          ? (stateRow.value / 1000).toFixed(1) + " bn" : Math.round(stateRow.value) + " m"} of goods in FY 2022-23.</span>` : "") +
        statePolicy.map((p) => `<span class="dr-why" style="margin-top:6px"><b>${p.n}</b> — ${p.t}</span>`).join("") +
        `<div class="chips" style="margin-top:9px">
          <a class="chip-link" href="explainers.html#policies">All ${ctx.state} export policies →</a>
        </div></div>`;
    } else {
      html += `<div class="statecard"><b>${ctx.state} — state support</b>
        <span class="dr-why">No state-specific export policy is tracked here yet for ${ctx.state}.
        Your District Industries Centre and the central schemes above still apply in full.</span>
        <div class="chips" style="margin-top:9px">
          <a class="chip-link" href="explainers.html#policies">See state export policies →</a>
        </div></div>`;
    }
    html += `<div class="statecard"><b>Government desks worth knowing</b>
      <div class="chips" style="margin-top:9px">` +
      S.portals.map((p) => `<a class="chip-link" href="${p.url}" target="_blank" rel="noopener" title="${p.why}">${p.name} →</a>`).join("") +
      `</div>
      <span class="dr-why" style="margin-top:10px">${S.portals.map((p) => `<b>${p.name.split(" — ")[0]}</b> — ${p.why}`).join("<br>")}</span>
      </div>`;
    document.getElementById("tk-where").innerHTML = html;
  };

  render();
  [pSel, sSel, tSel, mSel].forEach((el) => el.addEventListener("change", render));

  document.getElementById("tk-dl").addEventListener("click", () => {
    const hs = pSel.value;
    downloadCSV(`markets-hs${hs}.csv`,
      ["market", "data_year", "market_imports_usd", "from_india_usd", "india_share_pct", "gap_usd", "india_trade_agreement"],
      lastRows.map((r) => [r.label, r.year, Math.round(r.world), Math.round(r.india),
                           r.share.toFixed(2), Math.round(r.gap), r.fta.n]));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  try { init(); } catch (e) {
    console.error(e);
    const el = document.getElementById("tk-markets");
    if (el) el.innerHTML = '<p style="padding:20px;color:#6d6e75">Could not load: ' + e.message + "</p>";
  }
});
})();
