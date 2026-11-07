import type { PdfSection } from "./files";

// Fictional RFP and vendor content for demos. All organizations are invented.

export const SAMPLE_RFP_SECTIONS: PdfSection[] = [
  {
    heading: "1. Background and objectives",
    paragraphs: [
      "Riverbend Industries is a mid-market manufacturer of industrial fluid-handling components with four plants, two distribution centers, and approximately 650 system users across finance, procurement, production, quality, warehousing, and customer service.",
      "The current ERP is a heavily customized on-premise system running on unsupported infrastructure. Month-end close takes 11 business days, inventory accuracy averages 91%, and reporting depends on spreadsheets maintained outside the system.",
      "Riverbend seeks a cloud ERP and an implementation partner to: shorten close to 5 days; reach 98% inventory accuracy; standardize processes across plants; and give leadership a single source of truth.",
    ],
  },
  {
    heading: "2. Scope",
    bullets: [
      "Finance: multi-entity general ledger (3 legal entities, USD/CAD/MXN), AP, AR, fixed assets, cash management, consolidation.",
      "Procurement: requisition-to-pay, supplier portal, contract pricing, three-way match.",
      "Inventory and warehouse: lot and serial tracking, cycle counting, barcode/RF scanning, multi-site transfers.",
      "Manufacturing: BOMs and routings, MRP, shop-floor data collection, quality holds and non-conformance.",
      "Order-to-cash: quoting, configure-to-order for pump assemblies, EDI with 14 major distributors.",
      "Integrations: Salesforce CRM, ADP payroll, existing MES at Plant 2, banking (BAI2), EDI VAN.",
      "Data migration: 7 years of GL history, open transactions, item master (~42,000 SKUs), customers and suppliers.",
    ],
  },
  {
    heading: "3. Timeline and approach",
    paragraphs: [
      "Target go-live for finance and procurement is within 9 months of contract signature, with manufacturing and warehouse phases completing within 14 months. Riverbend will dedicate a core team of 8 internal subject-matter experts at 50% allocation.",
      "Vendors must describe their implementation methodology, phase plan, staffing model (onshore/offshore mix), testing approach, data migration approach, organizational change management, and cutover plan.",
    ],
  },
  {
    heading: "4. Mandatory requirements",
    bullets: [
      "SOC 1 Type II and SOC 2 Type II reports available for the hosted service.",
      "Data residency in the United States.",
      "Native multi-entity, multi-currency general ledger.",
      "Pricing submitted on the required pricing sheet with a 5-year total cost.",
      "Named implementation lead with at least two comparable ERP go-lives.",
    ],
  },
  {
    heading: "5. Response format and pricing",
    paragraphs: [
      "Responses must be submitted as a presentation deck (PowerPoint or PDF) of no more than 30 pages, plus the required pricing sheet. The pricing sheet must show subscription fees by year, implementation fees by phase, support fees, any optional modules, rate cards for change orders, and all assumptions. Prices should be stated for a 5-year term with annual escalators disclosed.",
      "Responses will be evaluated against the published weighted criteria: Functional Fit 20%, Technical Fit and Integration 10%, Security, Privacy and Compliance 10%, Usability and Adoption 10%, Implementation and Delivery Approach 15%, Relevant Experience and Team Capability 10%, Support and Ongoing Service 5%, Total Cost and Commercial Value 15%, Strategic Fit and Future Readiness 5%.",
    ],
  },
];

export type Vendor = {
  name: string;
  contact: string;
  email: string;
  color: [number, number, number];
  notes: string;
  sections: PdfSection[];
  pricing: { name: string; rows: (string | number | null)[][] }[];
};

const years = ["Item", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "5-yr total"];
function row(label: string, vals: number[]): (string | number)[] {
  return [label, ...vals, vals.reduce((a, b) => a + b, 0)];
}

export const SAMPLE_VENDORS: Vendor[] = [
  {
    name: "Northline Cloud ERP",
    contact: "Jamie Ortega",
    email: "jamie.ortega@northline.example",
    color: [0.05, 0.3, 0.45],
    notes: "Submitted on time. Joint response: Northline software with its in-house professional services team.",
    sections: [
      {
        heading: "Executive summary",
        paragraphs: [
          "Northline proposes its Northline Manufacturing Cloud suite with Northline Professional Services as implementation lead. Our discrete and process manufacturing customers in industrial components typically close in 4–5 days within the first year after go-live.",
          "We will deliver finance and procurement in 8 months and manufacturing and warehouse in 13 months, using a fixed-fee, phase-gated approach.",
        ],
      },
      {
        heading: "Functional coverage",
        table: {
          headers: ["Area", "Coverage", "Notes"],
          rows: [
            ["Multi-entity GL, consolidation", "Standard", "Native multi-currency; automated intercompany eliminations"],
            ["Procure-to-pay, supplier portal", "Standard", "Three-way match, contract pricing, portal included"],
            ["Lot/serial, cycle counting, RF", "Standard", "Mobile scanning app included; works offline"],
            ["MRP, routings, shop floor", "Standard", "Finite scheduling is an optional add-on module"],
            ["Configure-to-order (pumps)", "Configuration", "Rules-based configurator; 6–8 weeks to model product lines"],
            ["EDI with distributors", "Partner", "Certified EDI partner; 14 trading partners in scope"],
            ["Quality / non-conformance", "Standard", "Quality holds, CAPA workflow"],
          ],
        },
      },
      {
        heading: "Architecture, integration and security",
        bullets: [
          "Multi-tenant SaaS on a US-only hosting region; quarterly releases with a 4-week sandbox preview.",
          "REST and event APIs; prebuilt connectors for Salesforce and ADP. MES integration at Plant 2 via the integration platform (included).",
          "SOC 1 Type II and SOC 2 Type II reports issued annually (latest: June 2026); ISO 27001 certified.",
          "SSO via SAML/OIDC, role-based access with segregation-of-duties rule library, full audit trail.",
        ],
      },
      {
        heading: "Implementation approach",
        paragraphs: [
          "Phase 1 (months 1–8): finance, procurement, data migration of GL history and masters. Phase 2 (months 6–13): inventory, warehouse, manufacturing, EDI. Each phase has design, build, three test cycles (SIT, UAT, parallel close), and a cutover rehearsal.",
          "Staffing: 11 consultants at peak, 80% onshore. Organizational change management is included: stakeholder analysis, role-based training, super-user network.",
        ],
        bullets: [
          "Implementation lead: Priya Raman, 14 years, led 6 cloud ERP go-lives in industrial manufacturing (references provided).",
          "Riverbend dependencies: 8 SMEs at 50%, data cleansing of item master before month 3.",
        ],
      },
      {
        heading: "Experience and references",
        bullets: [
          "Three references in industrial components (250–900 users), each live within 12–15 months.",
          "Average close time at reference clients reduced from 9 to 4.5 days.",
        ],
      },
      {
        heading: "Support, roadmap and commercial summary",
        bullets: [
          "24x7 Priority 1 support, 1-hour response SLA, named customer success manager.",
          "Roadmap: AI-assisted demand planning (general availability planned for 2027 — not included in scope).",
          // Deliberately doesn't match the pricing sheet ($6.52M) — a discrepancy for the AI to catch in demos.
          "5-year total cost of ownership: $6.84M (see pricing sheet). Subscription escalator capped at 4% per year.",
        ],
      },
    ],
    pricing: [
      {
        name: "Summary",
        rows: [
          years,
          row("Subscription (650 users, all modules in scope)", [690000, 717600, 746300, 776200, 807200]),
          row("Implementation services (fixed fee)", [1450000, 820000, 0, 0, 0]),
          row("Integration platform & EDI partner", [95000, 60000, 60000, 60000, 60000]),
          row("Premium support", [0, 0, 0, 0, 0]),
          row("Training & change management", [120000, 60000, 0, 0, 0]),
          row("Total", [2355000, 1657600, 806300, 836200, 867200]),
        ],
      },
      {
        name: "Optional",
        rows: [
          ["Optional item", "Annual cost", "Notes"],
          ["Finite scheduling module", 54000, "Not required for go-live"],
          ["Additional sandbox environment", 18000, ""],
        ],
      },
      {
        name: "Assumptions",
        rows: [
          ["Assumption", "Detail"],
          ["Subscription escalator", "Capped at 4% annually; renewal at same terms for years 6–7"],
          ["Implementation", "Fixed fee per phase; change orders at $210/hr blended"],
          ["Travel", "Included up to 10% of services fees"],
          ["Exit", "Data export in standard formats at no charge within 90 days of termination"],
        ],
      },
    ],
  },
  {
    name: "Cypress Ridge Systems",
    contact: "Morgan Hale",
    email: "mhale@cypressridge.example",
    color: [0.15, 0.4, 0.25],
    notes: "Submitted on time. Software vendor partnering with an offshore-led systems integrator.",
    sections: [
      {
        heading: "Executive summary",
        paragraphs: [
          "Cypress Ridge offers the most cost-effective path to a modern ERP. Our platform covers finance, supply chain and manufacturing out of the box, and our delivery partner brings a scalable global delivery model.",
          "We propose a single-phase go-live in 10 months for all modules.",
        ],
      },
      {
        heading: "Functional coverage",
        bullets: [
          "Multi-entity, multi-currency general ledger with consolidation.",
          "Purchasing and AP; supplier portal available in a future release (roadmap 2027).",
          "Inventory with lot tracking; serial tracking via customization.",
          "MRP and work orders; shop-floor data collection through a third-party add-on.",
          "Product configurator: custom development required for pump assemblies (estimate 400 hours).",
        ],
      },
      {
        heading: "Security and hosting",
        bullets: [
          "Hosted on a major public cloud in US regions.",
          "SOC 2 Type II report available. SOC 1 Type II audit is in progress, expected Q3 2027.",
          "Role-based security; audit logging available.",
        ],
      },
      {
        heading: "Implementation approach",
        paragraphs: [
          "Our partner will run an agile implementation with a single go-live in month 10. Delivery team: 3 onshore consultants and 9 offshore. Testing includes one SIT cycle and UAT. Training is delivered as train-the-trainer.",
          "Data migration: client to extract and cleanse data into our templates; partner loads.",
        ],
        bullets: ["Implementation lead to be named at contract signature."],
      },
      {
        heading: "Commercial summary",
        bullets: [
          "Lowest 5-year cost: $4.09M (see pricing sheet).",
          "Implementation on time-and-materials, estimate provided.",
          "Subscription escalator: 7% annually after year 2.",
        ],
      },
    ],
    pricing: [
      {
        name: "Pricing",
        rows: [
          years,
          row("Subscription", [480000, 480000, 513600, 549600, 588000]),
          row("Implementation (T&M estimate)", [1150000, 0, 0, 0, 0]),
          row("Configurator customization (estimate)", [72000, 0, 0, 0, 0]),
          row("Support", [48000, 48000, 51400, 55000, 58800]),
          row("Total", [1750000, 528000, 565000, 604600, 646800]),
        ],
      },
      {
        name: "Notes",
        rows: [
          ["Note"],
          ["Implementation is time and materials; estimate assumes client-prepared data templates."],
          ["Third-party shop-floor add-on licensed separately by the client (not included)."],
          ["EDI services quoted separately upon request."],
          ["Travel and expenses billed at cost."],
        ],
      },
    ],
  },
  {
    name: "Harbor & Vine Digital",
    contact: "Taylor Brooks",
    email: "tbrooks@harborvine.example",
    color: [0.4, 0.18, 0.3],
    notes: "Submitted on time. Systems integrator proposing a leading cloud ERP platform licensed through H&V.",
    sections: [
      {
        heading: "Executive summary",
        paragraphs: [
          "Harbor & Vine Digital is a manufacturing-focused ERP systems integrator. We propose the Meridian Cloud ERP platform, licensed through us, with a two-phase rollout and a strong emphasis on adoption.",
          "Phase 1 finance and procurement go-live in month 9; Phase 2 operations in month 14.",
        ],
      },
      {
        heading: "Functional fit",
        bullets: [
          "Native multi-entity GL and consolidation; 3 entities and 3 currencies standard.",
          "Full procure-to-pay including supplier portal.",
          "Lot and serial tracking, RF scanning, cycle counting — standard.",
          "MRP and routings standard; we recommend the Meridian MES connector for Plant 2.",
          "Configure-to-order: we have built 4 pump and valve configurators on Meridian; accelerator included.",
        ],
      },
      {
        heading: "Technical and security",
        bullets: [
          "Meridian runs in US data centers; SOC 1 Type II and SOC 2 Type II reports issued annually.",
          "Integration via Meridian Integration Cloud; Salesforce and ADP connectors prebuilt; EDI through our managed service.",
          "Twice-yearly releases with regression-test automation provided by H&V.",
        ],
      },
      {
        heading: "Implementation and change management",
        paragraphs: [
          "Our Adopt-First methodology starts with day-in-the-life prototypes per role in month 2. Testing: SIT, two UAT cycles, a parallel month-end close, and two cutover rehearsals per phase.",
          "Change management is a dedicated workstream (2 FTE): impact assessments, role-based training, floor support for 4 weeks after each go-live.",
        ],
        bullets: [
          "Implementation lead: Chris Dunleavy — 4 Meridian go-lives in industrial manufacturing (2 references attached).",
          "Team: 10 consultants at peak, 100% onshore.",
        ],
      },
      {
        heading: "Experience",
        bullets: [
          "22 Meridian implementations for manufacturers between $150M and $1B revenue.",
          "References: a valve manufacturer (5 plants, live in 13 months) and a pump OEM (3 plants, live in 11 months).",
        ],
      },
      {
        heading: "Support and commercials",
        bullets: [
          "Post-go-live managed services: 12x5 support with 2-hour P1 response; 24x7 available as an option.",
          "5-year total: $5.58M. Subscription escalator 3% annually.",
          "Implementation: fixed fee per phase with a 10% contingency held by the client.",
        ],
      },
    ],
    pricing: [
      {
        name: "5-Year Pricing",
        rows: [
          years,
          row("Meridian subscription", [560000, 576800, 594100, 611900, 630300]),
          row("Implementation — Phase 1 (fixed)", [980000, 0, 0, 0, 0]),
          row("Implementation — Phase 2 (fixed)", [310000, 520000, 0, 0, 0]),
          row("Change management workstream", [140000, 90000, 0, 0, 0]),
          row("Managed services (12x5)", [0, 96000, 96000, 96000, 96000]),
          row("EDI managed service", [36000, 36000, 36000, 36000, 36000]),
          row("Total", [2026000, 1318800, 726100, 743900, 762300]),
        ],
      },
      {
        name: "Options & Rates",
        rows: [
          ["Item", "Price", "Notes"],
          ["24x7 support uplift (annual)", 42000, "Optional"],
          ["Change order blended rate (per hour)", 195, "Onshore"],
          ["Contingency (client-held)", 129000, "10% of fixed implementation fees"],
        ],
      },
    ],
  },
];

// A fourth firm that is NOT preloaded — its files are offered for download on the
// upload page so someone taking the demo can try the upload + AI evaluation flow.
export const SAMPLE_UPLOAD_VENDOR: Vendor = {
  name: "Lakeshore Business Systems",
  contact: "Riley Chen",
  email: "rchen@lakeshore.example",
  color: [0.55, 0.3, 0.08],
  notes: "Late entrant — response received one day after the deadline with the coordinator's approval.",
  sections: [
    {
      heading: "Executive summary",
      paragraphs: [
        "Lakeshore Business Systems is a regional ERP reseller and implementer serving mid-market manufacturers across the Gulf South. We propose the Keystone Manufacturing ERP cloud edition with a three-phase rollout and a local, onshore delivery team based in New Orleans and Houston.",
        "Our plan delivers finance and procurement in month 8, inventory and warehouse in month 12, and manufacturing and EDI in month 15.",
      ],
    },
    {
      heading: "Functional fit",
      table: {
        headers: ["Requirement", "Fit", "How"],
        rows: [
          ["Multi-entity, multi-currency GL", "Standard", "USD, CAD and MXN; consolidation module included"],
          ["Procure-to-pay and supplier portal", "Standard", "Supplier portal included; three-way match standard"],
          ["Lot and serial tracking, RF scanning", "Standard", "Handheld scanning app; cycle counting"],
          ["MRP, routings, shop floor", "Standard", "Shop-floor terminals included for 4 plants"],
          ["Configure-to-order for pumps", "Customization", "Configurator built by Lakeshore (estimated 320 hours)"],
          ["EDI with 14 distributors", "Partner", "Through our EDI partner; 9 of 14 maps already exist"],
        ],
      },
    },
    {
      heading: "Security and hosting",
      bullets: [
        "Keystone cloud is hosted in US data centers (two regions, active-passive).",
        "SOC 1 Type II and SOC 2 Type II reports issued annually; bridge letters available.",
        "SSO via SAML, MFA enforced, role-based security with field-level audit trail.",
      ],
    },
    {
      heading: "Implementation and team",
      paragraphs: [
        "Three phases with a design sprint, two build sprints, SIT, UAT and a dress rehearsal per phase. Data migration uses Keystone's migration workbench with three mock conversions, including 7 years of GL balances by period.",
      ],
      bullets: [
        "Implementation lead: Dana Okafor — 9 Keystone go-lives, including 3 multi-plant manufacturers.",
        "Team of 7 consultants at peak, all onshore. Riverbend SMEs expected at 50% during design and testing.",
        "Phase 3 (month 15) extends one month past the RFP's 14-month target.",
      ],
    },
    {
      heading: "Support and commercials",
      bullets: [
        "Local support desk 7am–7pm Central, P1 response within 1 hour, 24x7 emergency line.",
        "5-year total cost: $4.72M plus travel at cost. Subscription escalator 3.5% per year, renewal capped at 5%.",
        "Implementation: fixed fee per phase; configurator customization priced separately.",
      ],
    },
  ],
  pricing: [
    {
      name: "5-Year Cost",
      rows: [
        years,
        row("Keystone subscription (650 users)", [520000, 538200, 557000, 576500, 596700]),
        row("Implementation — Phase 1 (fixed)", [690000, 0, 0, 0, 0]),
        row("Implementation — Phases 2 and 3 (fixed)", [310000, 420000, 0, 0, 0]),
        row("Pump configurator customization", [0, 52000, 0, 0, 0]),
        row("Support and managed services", [60000, 60000, 62100, 64300, 66500]),
        row("EDI partner services", [30000, 30000, 30000, 30000, 30000]),
        row("Total", [1610000, 1100200, 649100, 670800, 693200]),
      ],
    },
    {
      name: "Assumptions",
      rows: [
        ["Assumption", "Detail"],
        ["Escalator", "3.5% per year on subscription; renewal increase capped at 5%"],
        ["Travel", "Not included; billed at cost, estimated $45K over the project"],
        ["Change orders", "$185/hr blended onshore rate"],
        ["Exit", "Full data export in CSV and SQL formats within 60 days of termination"],
      ],
    },
  ],
};
