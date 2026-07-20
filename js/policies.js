/* ValueChain — state export-policy picker (explainers page).
   Reads window.VC_DATA.policies from data/vc_policies.js. No charts needed. */
(function () {
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const sel = document.getElementById("policy-select");
  const out = document.getElementById("policy-out");
  if (!sel || !out || !window.VC_DATA || !window.VC_DATA.policies) return;
  const P = window.VC_DATA.policies;

  for (const name of P.all_names) {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name + (P.states[name] ? "" : " (national schemes only)");
    sel.appendChild(o);
  }

  const row = (it) =>
    `<div class="ftamini"><div><b>${it.n}</b><span class="ftamini-t">${it.t}</span></div></div>`;

  const render = () => {
    const name = sel.value;
    const items = P.states[name];
    let html = `<p class="ftamini-top">What ${name} is doing for its exporters</p>`;
    html += items ? items.map(row).join("")
                  : `<p class="ftamini-none">${P.generic}</p>`;
    html += `<p class="ftamini-h" style="margin-top:14px">Central schemes that apply in every state</p>` +
            P.common.map(row).join("");
    out.innerHTML = html;
  };

  sel.addEventListener("change", render);
  sel.value = "Uttar Pradesh";
  render();
});
})();
