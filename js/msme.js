/* ValueChain — MSME first-export playbook. Reads window.VC_DATA.msme,
   and pulls live market sizes from productpages for the sectors table. */
(function () {
"use strict";

const money = (v) => {
  const b = v / 1e9;
  if (b >= 100) return "$" + Math.round(b) + " bn";
  if (b >= 1) return "$" + b.toFixed(1) + " bn";
  return "$" + Math.round(v / 1e6) + " m";
};

function init() {
  const D = window.VC_DATA;
  if (!D || !D.msme) throw new Error("data/vc_msme.js missing");
  const M = D.msme;

  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Process checked ${M.as_of} · Market data: UN Comtrade`;
  });
  const asof = document.getElementById("ms-asof");
  if (asof) asof.textContent = M.as_of;
  if (D.meta) {
    document.querySelectorAll(".latest-year").forEach((el) => {
      el.textContent = D.meta.latest_year;
    });
  }

  /* 01 basics */
  document.getElementById("ms-basics").innerHTML = M.basics.map((b) => `
    <div class="sch">
      <div class="sch-head"><b>${b.q}</b></div>
      <span class="sch-give">${b.a}</span>
    </div>`).join("");

  /* 02 steps */
  document.getElementById("ms-steps").innerHTML = M.steps.map((s) => `
    <div class="mk">
      <span class="mk-rank">${s.n}</span>
      <div class="mk-main">
        <b>${s.name}</b>
        <span class="pill">${s.who}</span>
        <span class="mk-why">${s.what}</span>
        <span class="mk-why"><b>Cost:</b> ${s.cost} &nbsp;·&nbsp; <b>Time:</b> ${s.time}</span>
        <span class="sch-note"><b>What people get wrong:</b> ${s.gotcha}</span>
        ${s.url ? `<a class="sch-link" href="${s.url}" target="_blank" rel="noopener">Official portal →</a>` : ""}
      </div>
    </div>`).join("");

  /* 03 certifications */
  const kindClass = (k) => k.toLowerCase().indexOf("mandatory") !== -1
    ? "pill pill-ended"
    : k.toLowerCase().indexOf("voluntary") !== -1 ? "pill pill-talks" : "pill";
  document.getElementById("ms-certs").innerHTML = M.certifications.map((c) => `
    <div class="sch">
      <div class="sch-head">
        <b>${c.name}</b>
        <span class="${kindClass(c.kind)}">${c.kind}</span>
      </div>
      <span class="sch-give">${c.why}</span>
      <span class="sch-who"><b>Who issues it:</b> ${c.who}</span>
      <span class="sch-who"><b>How:</b> ${c.how}</span>
      <a class="sch-link" href="${c.url}" target="_blank" rel="noopener">Official site →</a>
    </div>`).join("");

  /* 04 payment */
  const riskClass = (r) => /safest|low/i.test(r) ? "pill"
    : /highest/i.test(r) ? "pill pill-ended" : "pill pill-talks";
  document.getElementById("ms-terms").innerHTML = M.payment.terms.map((t) => `
    <div class="sch">
      <div class="sch-head"><b>${t.name}</b><span class="${riskClass(t.risk)}">${t.risk}</span></div>
      <span class="sch-give">${t.note}</span>
    </div>`).join("");
  document.getElementById("ms-protect").innerHTML = M.payment.protect.map((p) => `
    <div class="mk">
      <span class="mk-rank">✓</span>
      <div class="mk-main">
        <b>${p.name}</b>
        <span class="mk-why">${p.note}</span>
        ${p.url ? `<a class="sch-link" href="${p.url}" target="_blank" rel="noopener">Official site →</a>` : ""}
      </div>
    </div>`).join("");

  /* 05 finance */
  document.getElementById("ms-finance").innerHTML = M.finance.map((f) => {
    const closed = /CLOSED/.test(f.name);
    return `
    <div class="sch${closed ? " sch-ended" : ""}">
      <div class="sch-head"><b>${f.name}</b>${closed ? '<span class="pill pill-ended">ended</span>' : ""}</div>
      <span class="sch-give">${f.what}</span>
      <span class="sch-note">${f.note}</span>
      ${f.url ? `<a class="sch-link" href="${f.url}" target="_blank" rel="noopener">Official site →</a>` : ""}
    </div>`;
  }).join("");

  /* 06 samadhaan */
  const S = M.samadhaan;
  document.getElementById("ms-sam-head").textContent = S.headline;
  document.getElementById("ms-samadhaan").innerHTML =
    S.points.map((p) => `
      <div class="mk"><span class="mk-rank">§</span>
        <div class="mk-main"><span class="mk-why" style="margin-top:2px">${p}</span></div>
      </div>`).join("") +
    `<p class="note note-strong"><i>The limit of this protection.</i> ${S.caveat}</p>
     <p><a class="hero-cta" style="background:var(--accent);color:#fff"
        href="${S.url}" target="_blank" rel="noopener">File on MSME Samadhaan →</a></p>`;

  /* 07 MSME-heavy sectors, with live market data */
  const P = D.productpages;
  const rows = M.sectors.rows.map((r) => {
    let world = 0, india = 0;
    if (P && P.markets) {
      for (const m of Object.values(P.markets)) {
        const s = m.series[r.hs];
        if (s) { world += s.world; india += s.india; }
      }
    }
    return Object.assign({}, r, {
      world, india,
      share: world ? (100 * india / world) : 0,
      gap: Math.max(world - india, 0),
    });
  }).sort((a, b) => b.gap - a.gap);

  if (P) {
    document.getElementById("ms-sect-sub").textContent =
      `Product groups made largely by small units, ranked by how much of the tracked world market India does not yet supply.`;
  }

  document.getElementById("ms-sectors").innerHTML = rows.map((r) => `
    <a class="mk" href="products.html#hs=${r.hs}" style="text-decoration:none;color:inherit">
      <span class="mk-rank">${r.hs}</span>
      <div class="mk-main">
        <b>${r.label}</b>
        ${r.world ? `<span class="pill">${r.share < 0.1 ? "under 0.1" : r.share.toFixed(1)}% from India</span>` : ""}
        <span class="mk-why">${r.why}</span>
        ${r.world ? `<span class="mk-why">Tracked markets buy <b>${money(r.world)}</b> ·
          <b>${money(r.gap)}</b> of that is not supplied by India</span>` : ""}
      </div>
    </a>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  try { init(); } catch (e) {
    console.error(e);
    const el = document.getElementById("ms-steps");
    if (el) el.innerHTML = '<p style="padding:20px;color:#6d6e75">Could not load: ' + e.message + "</p>";
  }
});
})();
