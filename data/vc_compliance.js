/* ValueChain — the compliance radar: rules in destination markets that change
 * what an Indian exporter has to prove, not just what duty they pay.
 *
 * SAME MAINTENANCE CONTRACT AS vc_schemes.js:
 *   status: active | upcoming | proposed | eased
 *   `review_by` (YYYY-MM-DD) is enforced by scripts/validate.py — once that
 *   date passes the build fails until the entry is re-checked. Regulatory
 *   dates move (EUDR has already been delayed twice), so nothing here is
 *   allowed to sit unreviewed.
 *
 * chapters: HS 2-digit codes the rule bites on, or "all".
 */
window.VC_DATA = window.VC_DATA || {};
window.VC_DATA.compliance = {
"as_of": "July 2026",
"disclaimer": "Compliance rules are summarised for orientation. Scope, thresholds and dates change — several of these have already been delayed once. Confirm against the official text and your buyer's contract before committing to a shipment.",

"rules": [
  {
    "id": "cbam",
    "name": "CBAM — EU Carbon Border Adjustment Mechanism",
    "market": "European Union",
    "status": "active", "as_of": "2026-07", "review_by": "2026-12-31",
    "when": "Definitive regime since 1 January 2026",
    "what": "Importers must declare the embedded carbon emissions of covered goods and buy CBAM certificates against them, priced off the EU carbon market. The transitional reporting-only phase is over — 2026 imports create real cost exposure.",
    "why_india": "Covers iron and steel, aluminium, cement, fertilisers, electricity and hydrogen. India is unusually exposed: much of its aluminium and steel is made with coal-based captive power, so its emissions intensity is among the highest of the EU's suppliers, which translates directly into a higher certificate bill than competitors face.",
    "do": "Get verified emissions data per product from your plant now — your EU buyer will ask for it, and a missing number is treated as a default (high) value. Note that the India–EU FTA under negotiation does not remove CBAM: a tariff concession and a carbon charge are separate things.",
    "url": "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en",
    "chapters": ["72", "73", "76", "25", "31"]
  },
  {
    "id": "eudr",
    "name": "EUDR — EU Deforestation Regulation",
    "market": "European Union",
    "status": "upcoming", "as_of": "2026-07", "review_by": "2026-11-30",
    "when": "Large and medium operators from 30 December 2026; small and micro operators from 30 June 2027",
    "what": "Goods must be proven deforestation-free, with geolocation coordinates of the plot of land where the raw material was produced, plus a due-diligence statement. Applies whether or not the product is legal in the country of origin.",
    "why_india": "Bites on leather and hides (cattle), wood and wooden furniture, paper, coffee, cocoa, rubber and palm oil derivatives — which covers Kanpur and Agra leather, Saharanpur woodcraft and a large share of India's furniture exports. The geolocation requirement is the hard part for supply chains that run through aggregators and small tanneries.",
    "do": "Start mapping your raw material back to source now; traceability cannot be retrofitted at the port. The timeline has already been delayed twice, so check the current date before planning around it.",
    "url": "https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en",
    "chapters": ["41", "42", "43", "44", "48", "94", "09", "18", "40", "15"]
  },
  {
    "id": "reach",
    "name": "REACH — EU chemicals registration",
    "market": "European Union",
    "status": "active", "as_of": "2026-07", "review_by": "2027-06-30",
    "when": "In force",
    "what": "Substances placed on the EU market must be registered, and restricted substances must be absent or below threshold. Obligations fall on the EU importer, who pushes them back to you contractually.",
    "why_india": "Affects chemicals and dyes directly, and reaches into textiles, leather and toys through restricted-substance limits — azo dyes, chromium VI in leather, phthalates in toys.",
    "do": "Get substance testing from an accredited lab and keep the certificates current; buyers increasingly ask for them before the first order, not after.",
    "url": "https://echa.europa.eu/regulations/reach/understanding-reach",
    "chapters": ["29", "32", "33", "34", "39", "41", "42", "61", "62", "64", "95"]
  },
  {
    "id": "cbam_uk",
    "name": "UK CBAM",
    "market": "United Kingdom",
    "status": "upcoming", "as_of": "2026-07", "review_by": "2026-12-31",
    "when": "Announced for 2027",
    "what": "The UK's own carbon border levy, broadly mirroring the EU's on aluminium, cement, fertiliser, hydrogen, iron and steel.",
    "why_india": "Matters more now that the India–UK CETA has removed tariffs: a carbon charge can quietly replace the duty saving on exactly the metals sectors CETA opened up.",
    "do": "Track it alongside EU CBAM — the emissions data you gather for one will largely serve the other.",
    "url": "https://www.gov.uk/government/consultations/introduction-of-a-uk-carbon-border-adjustment-mechanism",
    "chapters": ["72", "73", "76", "25", "31"]
  },
  {
    "id": "fda",
    "name": "US FDA registration & prior notice",
    "market": "United States",
    "status": "active", "as_of": "2026-07", "review_by": "2027-06-30",
    "when": "In force",
    "what": "Food, drug, medical device and cosmetic facilities exporting to the US must register with the FDA, renew biennially, and file prior notice before each shipment arrives.",
    "why_india": "Pharmaceuticals are India's strongest US export, and FDA inspection outcomes at Indian plants regularly move company fortunes. Food and spice exporters face import alerts and detention-without-physical-examination listings.",
    "do": "Keep facility registration current and watch the FDA import alert list for your product category — a listing stops shipments at the border, not at the buyer.",
    "url": "https://www.fda.gov/industry/import-basics",
    "chapters": ["30", "90", "33", "03", "09", "16", "20", "21"]
  },
  {
    "id": "cscp",
    "name": "EU CSDDD — corporate sustainability due diligence",
    "market": "European Union",
    "status": "proposed", "as_of": "2026-07", "review_by": "2026-12-31",
    "when": "Being phased in, with scope and timing under active revision",
    "what": "Large EU companies must identify and address human-rights and environmental harms in their value chains — including at their suppliers.",
    "why_india": "You will feel this as buyer questionnaires and audit clauses rather than as a border check: labour conditions, wages and effluent treatment at your plant become your customer's legal problem, so they become your contractual problem.",
    "do": "Social-compliance audits (SEDEX/SMETA, BSCI) and ZED certification are what buyers are asking for. The MSME ZED scheme subsidises exactly this — see the schemes above.",
    "url": "https://commission.europa.eu/business-economy-euro/doing-business-eu/sustainability-due-diligence-responsible-business_en",
    "chapters": "all"
  }
]
};
