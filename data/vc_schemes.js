/* ValueChain — export schemes, incentives and institutions.
 *
 * MAINTENANCE CONTRACT (read before editing):
 *  - every entry carries `status` and `as_of`. Never write "active" without
 *    checking the official link on that date.
 *  - `expires` (YYYY-MM-DD) is enforced: scripts/validate.py FAILS the build
 *    once the date has passed, so an expired scheme cannot sit on the site
 *    pretending to be current. Re-check the source, then update or retire it.
 *  - status values:
 *      active  — verified open on `as_of`
 *      check   — was open, validity window ended or unclear; shown with a warning
 *      ended   — closed. Kept deliberately: exporters still ask about these.
 *
 * status_note is shown verbatim to the user, so write it plainly.
 */
window.VC_DATA = window.VC_DATA || {};
window.VC_DATA.schemes = {
"as_of": "July 2026",
"disclaimer": "Eligibility here is indicative, matched on a few broad criteria. Every scheme has detailed conditions, notified product lists and deadlines. Confirm on the official link before you rely on any of it.",

"schemes": [
  {
    "id": "rodtep",
    "name": "RoDTEP — Remission of Duties and Taxes on Export Products",
    "agency": "DGFT / CBIC (claimed through ICEGATE)",
    "gives": "Refunds embedded central, state and local duties and taxes that are not otherwise credited — paid as a transferable e-scrip, typically 0.3%–4.3% of FOB value depending on the HS code.",
    "who": "Exporters of notified products — manufacturer and merchant exporters alike. SEZ and EOU units are covered subject to conditions.",
    "status": "active", "as_of": "2026-07", "expires": "2026-09-30",
    "status_note": "Notified through 30 September 2026 — check the current notification for rates and the extension.",
    "url": "https://www.dgft.gov.in/CP/?opt=RoDTEP",
    "match": { "exporter_type": "any", "msme": "any", "chapters": "all" },
    "priority": 1
  },
  {
    "id": "drawback",
    "name": "Duty Drawback",
    "agency": "CBIC (Customs)",
    "gives": "Refund of customs duty paid on imported inputs used in goods you export. Claimed at the time of export on the shipping bill.",
    "who": "All exporters. You cannot claim drawback and certain other input-duty benefits on the same inputs — pick the route that pays more.",
    "status": "active", "as_of": "2026-07", "expires": null,
    "status_note": "Long-standing scheme; rate schedule is revised periodically.",
    "url": "https://www.cbic.gov.in/entities/view-sticker-new?path=DrawBack",
    "match": { "exporter_type": "any", "msme": "any", "chapters": "all" },
    "priority": 2
  },
  {
    "id": "advance_auth",
    "name": "Advance Authorisation",
    "agency": "DGFT",
    "gives": "Import your raw materials and inputs duty-free, against a commitment to export the finished goods (an export obligation).",
    "who": "Manufacturer exporters, and merchant exporters tied to a supporting manufacturer.",
    "status": "active", "as_of": "2026-07", "expires": null,
    "status_note": "Export obligation periods were extended to 31 August 2026 automatically, without any application, in view of shipping disruptions.",
    "url": "https://www.dgft.gov.in/CP/?opt=advance-authorisation",
    "match": { "exporter_type": "manufacturer", "msme": "any", "chapters": "all" },
    "priority": 3
  },
  {
    "id": "epcg",
    "name": "EPCG — Export Promotion Capital Goods",
    "agency": "DGFT",
    "gives": "Import machinery and capital goods at zero customs duty, against an export obligation of six times the duty saved over six years.",
    "who": "Manufacturer exporters; merchant exporters linked to a supporting manufacturer; service providers too.",
    "status": "active", "as_of": "2026-07", "expires": null,
    "status_note": "Export obligation periods extended to 31 August 2026 automatically.",
    "url": "https://www.dgft.gov.in/CP/?opt=epcg",
    "match": { "exporter_type": "manufacturer", "msme": "any", "chapters": "all" },
    "priority": 4
  },
  {
    "id": "rosctl",
    "name": "RoSCTL — Rebate of State and Central Taxes and Levies",
    "agency": "Ministry of Textiles / DGFT",
    "gives": "Rebate of embedded state and central taxes on exported garments and made-ups, on top of RoDTEP where applicable.",
    "who": "Exporters of apparel and made-up textile articles (HS 61, 62 and made-ups in 63).",
    "status": "check", "as_of": "2026-07", "expires": "2026-03-31",
    "status_note": "The scheme has run in extensions; confirm the current notified period before assuming cover.",
    "url": "https://texmin.nic.in/",
    "match": { "exporter_type": "any", "msme": "any", "chapters": ["61", "62", "63"] },
    "priority": 5
  },
  {
    "id": "status_holder",
    "name": "Status Holder certification (One to Five Star Export House)",
    "agency": "DGFT",
    "gives": "Recognition based on your export performance. Brings self-certification of origin, faster clearances, exemption from some bank guarantees, and real credibility with foreign buyers.",
    "who": "Any exporter meeting the export-value thresholds over the reference period.",
    "status": "active", "as_of": "2026-07", "expires": null,
    "status_note": "Applied for on the DGFT portal; thresholds are set in the Foreign Trade Policy.",
    "url": "https://www.dgft.gov.in/CP/?opt=status-holder",
    "match": { "exporter_type": "any", "msme": "any", "chapters": "all" },
    "priority": 6
  },
  {
    "id": "ecgc",
    "name": "ECGC export credit insurance",
    "agency": "ECGC Ltd (Government of India)",
    "gives": "Insurance against a foreign buyer not paying you — commercial and political risk. Also makes banks more willing to lend against your export orders.",
    "who": "All exporters. Especially worth it for new buyers and new markets.",
    "status": "active", "as_of": "2026-07", "expires": null,
    "status_note": "Not a subsidy — a paid policy. Also offers buyer credit-worthiness checks, useful before you ship on open account.",
    "url": "https://www.ecgc.in/",
    "match": { "exporter_type": "any", "msme": "any", "chapters": "all" },
    "priority": 7
  },
  {
    "id": "deh",
    "name": "Districts as Export Hubs",
    "agency": "DGFT, through your District Industries Centre",
    "gives": "Every district has a District Export Action Plan and an export promotion committee — the local route to hand-holding, cluster infrastructure and identified products.",
    "who": "Any exporter, especially first-time and small exporters outside the metros.",
    "status": "active", "as_of": "2026-07", "expires": null,
    "status_note": "Start with your District Industries Centre or the DGFT regional authority.",
    "url": "https://dgft.gov.in/CP/?opt=districts-export-hub",
    "match": { "exporter_type": "any", "msme": "any", "chapters": "all" },
    "priority": 8
  },
  {
    "id": "mai",
    "name": "MAI — Market Access Initiative",
    "agency": "Department of Commerce, via Export Promotion Councils",
    "gives": "Funds overseas marketing: trade fair participation, buyer-seller meets, market studies and compliance costs. Individual exporters normally access it through their Export Promotion Council.",
    "who": "EPCs, trade bodies and recognised clusters — with member exporters as the beneficiaries.",
    "status": "check", "as_of": "2026-07", "expires": "2026-03-31",
    "status_note": "The published validity ran to 31 March 2026. Ask your EPC what is currently funded before booking a stand.",
    "url": "https://commerce.gov.in/trade-promotion/schemes-and-guidelines/",
    "match": { "exporter_type": "any", "msme": "any", "chapters": "all" },
    "priority": 9
  },
  {
    "id": "msme_ic",
    "name": "MSME International Cooperation & marketing support",
    "agency": "Ministry of MSME",
    "gives": "Reimbursement of costs for exhibiting abroad, international trade fairs and delegations, plus domestic marketing support — for registered MSMEs.",
    "who": "Udyam-registered MSMEs.",
    "status": "active", "as_of": "2026-07", "expires": null,
    "status_note": "Udyam registration is the gateway to almost every MSME benefit — it is free and takes minutes.",
    "url": "https://msme.gov.in/schemes",
    "match": { "exporter_type": "any", "msme": "yes", "chapters": "all" },
    "priority": 10
  },
  {
    "id": "zed",
    "name": "MSME Sustainable (ZED) certification",
    "agency": "Ministry of MSME",
    "gives": "Subsidised certification for quality and environmental standards, plus joining fees support — increasingly asked for by European buyers.",
    "who": "Udyam-registered MSMEs.",
    "status": "active", "as_of": "2026-07", "expires": null,
    "status_note": "Subsidy is higher for micro units and for women-owned and SC/ST-owned enterprises.",
    "url": "https://zed.msme.gov.in/",
    "match": { "exporter_type": "manufacturer", "msme": "yes", "chapters": "all" },
    "priority": 11
  },
  {
    "id": "pli",
    "name": "PLI — Production Linked Incentive",
    "agency": "Various ministries, by sector",
    "gives": "Cash incentive on incremental sales for approved manufacturers in notified sectors — electronics, pharma, textiles, food processing, autos and others.",
    "who": "Manufacturers meeting substantial investment and turnover thresholds. Application windows open and close by sector.",
    "status": "check", "as_of": "2026-07", "expires": null,
    "status_note": "Sector schemes have their own windows, many of which have closed to new applicants. Check your sector's scheme before planning around it.",
    "url": "https://www.investindia.gov.in/production-linked-incentives-schemes-india",
    "match": { "exporter_type": "manufacturer", "msme": "any",
               "chapters": ["30", "61", "62", "63", "85", "87", "90", "84"] },
    "priority": 12
  },
  {
    "id": "ies",
    "name": "Interest Equalisation Scheme (export credit subsidy)",
    "agency": "RBI / DGFT",
    "gives": "Subsidised interest on pre- and post-shipment rupee export credit.",
    "who": "Was restricted to MSME manufacturer exporters in its final phase.",
    "status": "ended", "as_of": "2026-07", "expires": null,
    "status_note": "Closed on 31 December 2024. Industry bodies have asked for it to be revived and it is periodically reported as under consideration — but it is not available today. Do not budget for it.",
    "url": "https://www.dgft.gov.in/CP/",
    "match": { "exporter_type": "any", "msme": "any", "chapters": "all" },
    "priority": 90
  }
],

/* Export Promotion Council for each HS chapter. These mappings are stable —
   the council for leather has not changed in decades. This is the single most
   useful "where do I actually go" answer for a first-time exporter. */
"councils": {
  "27": { "name": "DGFT regional authority (no dedicated council for petroleum)", "url": "https://www.dgft.gov.in/" },
  "29": { "name": "CHEMEXCIL — Basic Chemicals, Cosmetics & Dyes EPC", "url": "https://chemexcil.in/" },
  "30": { "name": "Pharmexcil — Pharmaceuticals EPC", "url": "https://pharmexcil.com/" },
  "33": { "name": "CHEMEXCIL — Basic Chemicals, Cosmetics & Dyes EPC", "url": "https://chemexcil.in/" },
  "39": { "name": "PLEXCONCIL — Plastics EPC", "url": "https://plexconcil.co.in/" },
  "40": { "name": "CAPEXIL / Rubber Board", "url": "https://capexil.in/" },
  "41": { "name": "CLE — Council for Leather Exports", "url": "https://leatherindia.org/" },
  "42": { "name": "CLE — Council for Leather Exports", "url": "https://leatherindia.org/" },
  "43": { "name": "CLE — Council for Leather Exports", "url": "https://leatherindia.org/" },
  "44": { "name": "EPCH — Handicrafts EPC", "url": "https://www.epch.in/" },
  "48": { "name": "CAPEXIL", "url": "https://capexil.in/" },
  "50": { "name": "ISEPC — Indian Silk EPC", "url": "https://www.silkepc.org/" },
  "51": { "name": "Wool & Woollens EPC", "url": "https://wwepcindia.com/" },
  "52": { "name": "TEXPROCIL — Cotton Textiles EPC", "url": "https://texprocil.org/" },
  "53": { "name": "Jute Products EPC / National Jute Board", "url": "https://jute.com/" },
  "54": { "name": "SRTEPC — Synthetic & Rayon Textiles EPC", "url": "https://www.srtepc.org/" },
  "55": { "name": "SRTEPC — Synthetic & Rayon Textiles EPC", "url": "https://www.srtepc.org/" },
  "56": { "name": "SRTEPC — Synthetic & Rayon Textiles EPC", "url": "https://www.srtepc.org/" },
  "57": { "name": "CEPC — Carpet EPC", "url": "https://indiancarpets.com/" },
  "58": { "name": "TEXPROCIL — Cotton Textiles EPC", "url": "https://texprocil.org/" },
  "59": { "name": "SRTEPC — Synthetic & Rayon Textiles EPC", "url": "https://www.srtepc.org/" },
  "60": { "name": "SRTEPC / TEXPROCIL", "url": "https://www.srtepc.org/" },
  "61": { "name": "AEPC — Apparel EPC", "url": "https://aepcindia.com/" },
  "62": { "name": "AEPC — Apparel EPC", "url": "https://aepcindia.com/" },
  "63": { "name": "TEXPROCIL (made-ups) / HEPC (handloom)", "url": "https://texprocil.org/" },
  "64": { "name": "CLE — Council for Leather Exports", "url": "https://leatherindia.org/" },
  "69": { "name": "CAPEXIL (ceramics) / EPCH", "url": "https://capexil.in/" },
  "70": { "name": "CAPEXIL / EPCH (glassware & handicrafts)", "url": "https://capexil.in/" },
  "71": { "name": "GJEPC — Gem & Jewellery EPC", "url": "https://gjepc.org/" },
  "72": { "name": "EEPC India — Engineering EPC", "url": "https://www.eepcindia.org/" },
  "73": { "name": "EEPC India — Engineering EPC", "url": "https://www.eepcindia.org/" },
  "76": { "name": "EEPC India — Engineering EPC", "url": "https://www.eepcindia.org/" },
  "82": { "name": "EEPC India — Engineering EPC", "url": "https://www.eepcindia.org/" },
  "84": { "name": "EEPC India — Engineering EPC", "url": "https://www.eepcindia.org/" },
  "85": { "name": "ESC — Electronics & Computer Software EPC", "url": "https://www.escindia.in/" },
  "87": { "name": "EEPC India (auto components)", "url": "https://www.eepcindia.org/" },
  "88": { "name": "EEPC India", "url": "https://www.eepcindia.org/" },
  "90": { "name": "EEPC India / Pharmexcil (medical devices)", "url": "https://www.eepcindia.org/" },
  "94": { "name": "EPCH — Handicrafts EPC", "url": "https://www.epch.in/" },
  "95": { "name": "SGEPC — Sports Goods EPC", "url": "https://sgepc.in/" }
},

/* Where an exporter actually has to go. Stable government infrastructure. */
"portals": [
  { "name": "DGFT — IEC, licences, RoDTEP, status holder", "url": "https://www.dgft.gov.in/", "why": "Your Importer-Exporter Code lives here. Nothing legal happens without it, and it is free." },
  { "name": "ICEGATE — customs filing and scrip claims", "url": "https://www.icegate.gov.in/", "why": "Shipping bills and RoDTEP/drawback credits flow through here." },
  { "name": "NIRYAT — official India trade statistics", "url": "https://niryat.gov.in/", "why": "The Ministry's own product and country export data." },
  { "name": "TIA — Trade Intelligence & Analytics portal", "url": "https://trade-analytics.commerce.gov.in/public", "why": "Government analytics platform launched in late 2025: market intelligence, competitor analysis and FTA utilisation tools." },
  { "name": "Indian Trade Portal — tariffs and FTA duty rates", "url": "https://www.indiantradeportal.in/", "why": "The place to look up the actual duty your product faces in a given market. This site does not reproduce duty rates — always check them here." },
  { "name": "myScheme — all government schemes", "url": "https://www.myscheme.gov.in/", "why": "Government's own eligibility finder across every ministry, not just trade." },
  { "name": "Udyam — MSME registration", "url": "https://udyamregistration.gov.in/", "why": "Free, and the gateway to MSME-only benefits." }
]
};
