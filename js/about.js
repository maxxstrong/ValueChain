/* ValueChain — about page. No charts; just fills the dates from meta. */
(function () {
"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const D = window.VC_DATA;
  if (!D || !D.meta) return;
  const m = D.meta;
  document.querySelectorAll(".latest-year, .yr").forEach((el) => {
    el.textContent = m.latest_year;
  });
  document.querySelectorAll(".stamp").forEach((el) => {
    el.textContent = `Data as of ${m.data_as_of} · Source: UN Comtrade`;
  });
});
})();
