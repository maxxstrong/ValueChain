/* ValueChain — the MSME first-export playbook.
 *
 * SAME MAINTENANCE CONTRACT AS vc_schemes.js / vc_compliance.js:
 * every block carries `as_of`, and anything with a hard date carries
 * `review_by`, which scripts/validate.py enforces. Fees and limits change;
 * the sequence almost never does. Where a number is volatile it is written
 * as "about" and the official link is the authority.
 */
window.VC_DATA = window.VC_DATA || {};
window.VC_DATA.msme = {
"as_of": "July 2026",
"review_by": "2027-01-31",
"disclaimer": "Fees, limits and timelines move. Everything here links to the official portal, which is the authority — use this for the order of operations, not as a substitute for the source.",

/* ---- 01 the five things to understand before anything else ---- */
"basics": [
  { "q": "Do I need a company to export?",
    "a": "No. A sole proprietorship with a current account and a PAN can export. You do not need a private limited company, a warehouse, or an office. What you do need is an IEC and a bank account that can receive foreign currency." },
  { "q": "How much does it cost to get legal?",
    "a": "Very little. The IEC costs about ₹500 one-time. Udyam registration is free. GST LUT is free. The AD code registration is free. The one real cost is your Export Promotion Council membership (RCMC), which runs from a few thousand rupees a year upward depending on the council. Anyone quoting you lakhs to 'set up an export business' is selling you something you can do yourself." },
  { "q": "Do I have to pay GST on exports?",
    "a": "No — exports are zero-rated. But you must file a Letter of Undertaking (LUT) at the start of each financial year, otherwise you pay IGST upfront and claim it back later. Filing the LUT is free and takes minutes. Missing it is the single most common cash-flow mistake new exporters make." },
  { "q": "How do I get paid from abroad?",
    "a": "Through your bank, against an AD (Authorised Dealer) code registered at the port you ship from. Your bank issues the code; you register it on ICEGATE. Without it your shipping bill will not clear. Payment terms are negotiable and matter enormously — see the getting-paid section below." },
  { "q": "What is the smallest realistic first shipment?",
    "a": "There is no legal minimum. Many first exports go by courier or post under simplified procedures. Starting small, with a buyer who pays in advance, is the sane way to learn the paperwork before there is real money at risk." }
],

/* ---- 02 registrations, in the order you actually need them ---- */
"steps": [
  { "n": 1, "name": "PAN + current account",
    "who": "Any bank",
    "cost": "Free to open, varies by bank",
    "time": "Days",
    "what": "A business current account that can receive foreign inward remittance. Tell the bank you intend to export — they will flag the account correctly from the start.",
    "gotcha": "A savings account will not do. Get this right first; every later step references it.",
    "url": "" },
  { "n": 2, "name": "IEC — Importer-Exporter Code",
    "who": "DGFT",
    "cost": "About ₹500, one-time",
    "time": "1–3 working days",
    "what": "Your 10-digit licence to export anything from India. Applied for online at the DGFT portal with PAN, bank details and Aadhaar e-sign or a digital signature.",
    "gotcha": "The IEC never expires but must be e-updated once every financial year, even if nothing changed. Skip the update and it is deactivated — which people discover at the port.",
    "url": "https://www.dgft.gov.in/" },
  { "n": 3, "name": "Udyam registration (MSME)",
    "who": "Ministry of MSME",
    "cost": "Free",
    "time": "Same day",
    "what": "Your official MSME identity, based on self-declared investment and turnover. It is the key that unlocks every MSME-only benefit on this site.",
    "gotcha": "It is genuinely free on udyamregistration.gov.in. Dozens of lookalike sites charge for it — check the URL ends in .gov.in.",
    "url": "https://udyamregistration.gov.in/" },
  { "n": 4, "name": "GST registration + LUT",
    "who": "GST portal",
    "cost": "Free",
    "time": "Registration a few days; LUT immediate",
    "what": "Register for GST, then file Form GST RFD-11 (the Letter of Undertaking) to export without paying IGST upfront. The LUT runs to 31 March and must be refiled every financial year.",
    "gotcha": "The LUT is annual. Exporters routinely forget to refile in April and end up blocking working capital in IGST refunds for months.",
    "url": "https://www.gst.gov.in/" },
  { "n": 5, "name": "AD code registration",
    "who": "Your bank, then ICEGATE",
    "cost": "Free",
    "time": "A few days",
    "what": "Your bank issues a 14-digit Authorised Dealer code on its letterhead. You register it against each customs port you will ship from, on ICEGATE.",
    "gotcha": "The AD code is registered per port. If you ship from Nhava Sheva and later from Delhi air cargo, that is a second registration. Shipping bills cannot be filed at an unregistered port.",
    "url": "https://www.icegate.gov.in/" },
  { "n": 6, "name": "RCMC — Registration cum Membership Certificate",
    "who": "Your Export Promotion Council",
    "cost": "Membership fee, varies by council",
    "time": "Days to weeks",
    "what": "Membership of the council for your product, applied for through the DGFT common portal. Proof you are a recognised exporter in your sector.",
    "gotcha": "Not needed for your very first shipment, but required to claim most incentives and to get subsidised trade-fair stands. Find your council on the toolkit page.",
    "url": "https://www.dgft.gov.in/CP/?opt=rcmc" },
  { "n": 7, "name": "First shipping bill",
    "who": "Customs, via ICEGATE or your CHA",
    "cost": "CHA fees if you use one",
    "time": "Per shipment",
    "what": "The export declaration. Most first-timers use a Customs House Agent (CHA) rather than filing themselves — reasonable for the first few shipments while you learn the fields.",
    "gotcha": "Tick the RoDTEP and drawback declarations on the shipping bill. If you leave them blank you forfeit the refund for that shipment, and it cannot be fixed afterwards.",
    "url": "https://www.icegate.gov.in/" }
],

/* ---- 03 certifications: mandatory vs buyer-demanded ---- */
"certifications": [
  { "name": "Certificate of Origin",
    "kind": "Usually required",
    "who": "Chambers of commerce / EPCs, via the DGFT CoO portal",
    "why": "Proves where the goods were made. A <b>preferential</b> CoO is what actually delivers the zero duty under an FTA — without it your buyer pays full tariff and will not thank you.",
    "how": "Apply on coo.dgft.gov.in. Non-preferential is routine; preferential requires meeting the agreement's rules of origin.",
    "url": "https://coo.dgft.gov.in/" },
  { "name": "Phytosanitary / fumigation certificate",
    "kind": "Mandatory for plant products",
    "who": "Plant Quarantine, Dept of Agriculture",
    "why": "Required for agricultural produce, wood, and wooden packaging. Most countries reject shipments without it.",
    "how": "Inspection and certificate through the plant quarantine station at your port.",
    "url": "https://plantquarantineindia.nic.in/" },
  { "name": "FSSAI licence",
    "kind": "Mandatory for food",
    "who": "FSSAI",
    "why": "Any food business, including food exporters, needs a licence. Buyers and destination regulators both ask for it.",
    "how": "Central licence for exporters, applied online.",
    "url": "https://foscos.fssai.gov.in/" },
  { "name": "BIS certification",
    "kind": "Product-dependent",
    "who": "Bureau of Indian Standards",
    "why": "Mandatory for goods under a Quality Control Order. MSMEs get a substantial concession on marking fees, and the smallest units registered on Udyam can be exempt from some QCOs entirely — worth checking before you assume you must certify.",
    "how": "Apply on the BIS Manakonline portal; check first whether a QCO covers your product.",
    "url": "https://www.bis.gov.in/" },
  { "name": "ZED certification",
    "kind": "Voluntary, subsidised",
    "who": "Ministry of MSME / QCI",
    "why": "Zero Defect Zero Effect. Increasingly asked for by European buyers as evidence of quality and environmental practice, and it improves your standing with lenders.",
    "how": "Register on the ZED portal. Heavily subsidised for micro units, and more so for women-owned and SC/ST-owned enterprises.",
    "url": "https://zed.msme.gov.in/" },
  { "name": "ISO 9001 / ISO 14001",
    "kind": "Voluntary, buyer-driven",
    "who": "Accredited private certification bodies",
    "why": "Not a legal requirement anywhere, but many foreign buyers will not open an account without it. Treat it as a sales cost, not compliance.",
    "how": "Through an accredited certification body. MSME schemes reimburse part of the cost.",
    "url": "https://www.nabcb.qci.org.in/" },
  { "name": "GOTS / OEKO-TEX",
    "kind": "Voluntary, textiles",
    "who": "Approved certifiers",
    "why": "GOTS certifies organic textiles — minimum 70% certified organic fibre — and is effectively the entry ticket to the organic segment in Europe and the US. OEKO-TEX certifies freedom from harmful substances.",
    "how": "Through an approved certification body; requires the whole chain from fibre to garment to be certified.",
    "url": "https://global-standard.org/" },
  { "name": "Social compliance audit (SMETA / BSCI)",
    "kind": "Voluntary, buyer-driven",
    "who": "Audit firms, commissioned by you or your buyer",
    "why": "Large European and US buyers increasingly require an audit of labour conditions, wages and safety before placing orders — and EU due-diligence law is pushing this further down the supply chain.",
    "how": "Book through an audit provider; your buyer often nominates one.",
    "url": "https://www.sedex.com/" }
],

/* ---- 04 getting paid ---- */
"payment": {
  "terms": [
    { "name": "Advance payment", "risk": "Safest for you",
      "note": "Full or part payment before shipping. Realistic for small first orders and samples. Ask for at least a 30% advance if the buyer will not pay fully upfront." },
    { "name": "Letter of Credit (LC)", "risk": "Low risk, higher cost",
      "note": "The buyer's bank guarantees payment against documents. Safe, but bank charges apply and payment depends on your documents matching the LC exactly — a single mismatched word can delay payment for weeks. Read the LC before you ship, not after." },
    { "name": "Documents against Payment (DP)", "risk": "Moderate",
      "note": "The buyer only gets the documents needed to collect the goods once they pay. Cheaper than an LC, but if the buyer walks away your goods are sitting in a foreign port." },
    { "name": "Open account", "risk": "Highest risk",
      "note": "You ship, they pay in 30–90 days. Standard for established relationships and often demanded by large buyers. Never do this with a new buyer without credit insurance." }
  ],
  "protect": [
    { "name": "ECGC credit insurance",
      "note": "Government-backed insurance against a foreign buyer not paying, covering both commercial and political risk. ECGC also sells buyer credit checks — worth the small fee before your first open-account shipment.",
      "url": "https://www.ecgc.in/" },
    { "name": "Check the buyer before you ship",
      "note": "Ask for company registration details, a website that predates last month, and trade references you actually call. A buyer who resists basic verification is telling you something." },
    { "name": "Keep the paperwork exact",
      "note": "Most payment disputes are document disputes. Invoice, packing list, bill of lading and LC terms must agree with each other down to the description of goods." }
  ]
},

/* ---- 05 money ---- */
"finance": [
  { "name": "Pre-shipment credit (packing credit)",
    "what": "Working capital to buy raw material and produce against a confirmed export order. Offered by every commercial bank.",
    "note": "Ask specifically for 'packing credit' — it is a distinct product from a general business loan and is priced for exporters.",
    "url": "" },
  { "name": "Post-shipment credit",
    "what": "Finance against your export receivable, between shipping and getting paid. Bridges the 30–90 day gap on open-account terms.",
    "note": "Your bank can discount the export bill so you are not funding the buyer's credit period yourself.",
    "url": "" },
  { "name": "CGTMSE — collateral-free guarantee",
    "what": "A government trust guarantees your bank loan so you do not have to pledge property. Limits were raised substantially in 2026, and guarantee cover is higher for women-owned units.",
    "note": "This is the answer when a bank asks for collateral you do not have. Ask the branch explicitly for a CGTMSE-covered facility — many will not offer it unprompted.",
    "url": "https://www.cgtmse.in/" },
  { "name": "TReDS — invoice discounting",
    "what": "An RBI-regulated exchange where you auction your receivables from large buyers to financiers, and get paid immediately at a discount.",
    "note": "Only works for invoices to registered large corporate buyers, but it is genuinely cheap money compared with informal lending.",
    "url": "https://www.rbi.org.in/" },
  { "name": "Interest Equalisation Scheme — CLOSED",
    "what": "The export credit interest subsidy ended on 31 December 2024.",
    "note": "Still widely quoted online as available. It is not. Do not build a costing on it.",
    "url": "" }
],

/* ---- 06 the 45-day rule: MSMEs' strongest legal lever ---- */
"samadhaan": {
  "headline": "If a buyer owes you money, the law is unusually on your side — but only if you are Udyam registered.",
  "points": [
    "Under the MSMED Act, a buyer must pay a registered micro or small enterprise within <b>45 days</b> where there is a written agreement, or <b>15 days</b> where there is not.",
    "Since April 2024, Section 43B(h) of the Income Tax Act gives that deadline real teeth: a buyer who pays late <b>cannot claim the expense as a tax deduction</b> in that year. Finance departments at large companies now take MSME ageing seriously for this reason alone.",
    "Overdue payments attract compound interest at three times the RBI bank rate, payable by the buyer.",
    "Unpaid? File on the <b>MSME Samadhaan</b> portal. It is free, online, and goes to a facilitation council rather than a court."
  ],
  "url": "https://samadhaan.msme.gov.in/",
  "caveat": "This protection applies to domestic buyers. It does not reach a foreign buyer — which is exactly why export payment terms and ECGC cover matter so much."
},

/* ---- 07 sectors where MSMEs actually dominate ---- */
"sectors": {
  "note": "Product groups where small units do most of the making. Each links to that product's world market and India's share, so you can see the gap you would be selling into.",
  "rows": [
    { "hs": "57", "label": "Carpets & floor coverings", "why": "Hand-knotted carpets are almost entirely a small-unit and household industry, concentrated around Bhadohi and Mirzapur." },
    { "hs": "42", "label": "Leather goods & bags", "why": "Kanpur, Chennai and Kolkata clusters, dominated by small tanneries and workshops." },
    { "hs": "64", "label": "Footwear", "why": "Agra and Ambur: thousands of small units, plus a large-factory segment competing with Vietnam." },
    { "hs": "61", "label": "Apparel (knitted)", "why": "Tiruppur alone is a dense network of small knitwear units." },
    { "hs": "62", "label": "Apparel (woven)", "why": "The most MSME-heavy manufacturing export India has, spread across a dozen clusters." },
    { "hs": "63", "label": "Made-up textiles", "why": "Home textiles from Karur and Panipat — heavily small-unit." },
    { "hs": "71", "label": "Gems & jewellery", "why": "Surat diamond polishing and Jaipur gemstones: enormous employment in small workshops." },
    { "hs": "69", "label": "Ceramics & pottery", "why": "Khurja and Morbi clusters." },
    { "hs": "70", "label": "Glassware", "why": "Firozabad bangles and glass artware." },
    { "hs": "95", "label": "Toys & sports goods", "why": "Meerut and Jalandhar. India holds under 1% of the US market — the largest untapped gap on this site." },
    { "hs": "44", "label": "Wood & woodcraft", "why": "Saharanpur carving and furniture units." },
    { "hs": "33", "label": "Perfumes & essential oils", "why": "Kannauj attar distillers, mostly family-scale." }
  ]
}
};
