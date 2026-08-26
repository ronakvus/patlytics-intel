/* ============================================================
   Feature Comparison — Mock Dataset
   SAMPLE DATA. Feature-support status, detail notes, and reviews
   below are illustrative placeholders standing in for a future
   feature-level scraping/review-aggregation pipeline (per request,
   that scraper itself is not built yet — this file just gives the
   Feature Comparison tab something real to render and interact
   with). Company profile/activity data still comes from data.js;
   this file only adds the feature-matrix layer on top.
   ============================================================ */

// Companies pre-seeded into the comparison builder by default.
// "patlytics" is a synthetic baseline column (Patlytics itself is
// not in COMPETITORS, since that list is *other* companies) so
// side-by-side questions like "how does Patlytics X differ from
// Y's X" have something to compare against.
const DEFAULT_COMPARISON_COMPANY_IDS = [
  "patlytics",
  "solve-intelligence",
  "deepip",
  "patsnap",
  "iprally",
  "xlscout",
];

const PATLYTICS_PSEUDO_COMPANY = {
  id: "patlytics",
  name: "Patlytics",
  initials: "PA",
  isSelf: true,
};

// status: "yes" | "no" | "partial" | "unknown"
const FEATURE_ROWS = [
  {
    id: "claim-charting",
    name: "AI Claim Charting",
    support: {
      patlytics: { status: "yes", detail: "Auto-generates claim charts directly from claim language against a selected reference set, with inline citation highlighting and exportable tables." },
      "solve-intelligence": { status: "yes", detail: "Ships a claim-charting workflow as part of its litigation/prosecution suite; maps claim elements to reference document passages with manual review built into the flow." },
      deepip: { status: "partial", detail: "Claim-to-reference mapping exists inside its drafting/prosecution flow, but there isn't a dedicated standalone claim-chart export like a litigation team would expect." },
      patsnap: { status: "no", detail: "PatSnap's analytics suite covers landscaping and search; no dedicated claim-charting module was found in its current feature set." },
      iprally: { status: "no", detail: "IPRally is search-first (graph/embedding-based prior art and FTO search); claim charting isn't part of its current product." },
      xlscout: { status: "yes", detail: "XLSCOUT markets claim-chart generation as part of its patent monetization/valuation tooling, positioned toward licensing and enforcement use cases." },
    },
  },
  {
    id: "prior-art-search",
    name: "Prior Art / Novelty Search",
    support: {
      patlytics: { status: "yes", detail: "Natural-language and structured search across prior art with semantic ranking, not just keyword/classification matching." },
      "solve-intelligence": { status: "yes", detail: "Search is built into the drafting flow to support novelty checks while writing claims, rather than as a fully separate search product." },
      deepip: { status: "yes", detail: "Prior-art search is one of its core modules, integrated with drafting and prosecution steps." },
      patsnap: { status: "yes", detail: "One of PatSnap's original core products — large global patent dataset with keyword, semantic, and classification-based search." },
      iprally: { status: "yes", detail: "This is IPRally's core differentiator — graph-embedding based search built specifically to catch prior art that keyword/classification search misses." },
      xlscout: { status: "yes", detail: "AI-driven prior art and invalidity search is a core part of the XLSCOUT platform." },
    },
  },
  {
    id: "office-action-response",
    name: "Office Action Response Drafting",
    support: {
      patlytics: { status: "partial", detail: "Supports drafting assistance for office-action responses today; full end-to-end automated response generation is on the near-term roadmap, not yet shipped." },
      "solve-intelligence": { status: "yes", detail: "Office-action response drafting with claim-amendment suggestions is a shipped, actively marketed feature (see their v2 update)." },
      deepip: { status: "yes", detail: "Office-action response support is part of its core prosecution workflow." },
      patsnap: { status: "no", detail: "No office-action drafting feature found — PatSnap stays on the analytics/search side of the workflow, not drafting." },
      iprally: { status: "no", detail: "Not part of IPRally's product — it's positioned purely as a search tool." },
      xlscout: { status: "partial", detail: "Drafting-assist tooling exists, but office-action response specifically is not called out as a dedicated, named feature." },
    },
  },
  {
    id: "portfolio-analytics",
    name: "Portfolio Analytics & Dashboards",
    support: {
      patlytics: { status: "yes", detail: "Portfolio-level dashboards covering filing trends, technology clustering, and competitive benchmarking." },
      "solve-intelligence": { status: "partial", detail: "Docketing and portfolio tracking exist for managing a firm's own caseload; broader competitive-benchmarking analytics are not the product's focus." },
      deepip: { status: "partial", detail: "Some portfolio-level views exist inside its prosecution product, but it isn't positioned as a standalone analytics suite." },
      patsnap: { status: "yes", detail: "Portfolio analytics and landscaping dashboards are one of PatSnap's most established product areas." },
      iprally: { status: "no", detail: "IPRally stays focused on search; no dedicated portfolio-analytics dashboard product." },
      xlscout: { status: "yes", detail: "Portfolio valuation and benchmarking dashboards are part of its monetization-focused tooling." },
    },
  },
  {
    id: "fto-analysis",
    name: "Freedom-to-Operate (FTO) Analysis",
    support: {
      patlytics: { status: "yes", detail: "Structured FTO workflows that combine search results with claim-scope risk flags for a target product/technology." },
      "solve-intelligence": { status: "no", detail: "FTO is not a named feature; the product is centered on drafting and prosecution rather than clearance work." },
      deepip: { status: "no", detail: "No dedicated FTO workflow found in current product materials." },
      patsnap: { status: "partial", detail: "FTO-style workflows can be built from PatSnap's search and analytics tools, but there isn't a single named 'FTO' product module." },
      iprally: { status: "yes", detail: "FTO search is explicitly named alongside prior-art search as a core IPRally use case." },
      xlscout: { status: "partial", detail: "Search and analytics can support FTO work, but it isn't marketed as a distinct, named module." },
    },
  },
  {
    id: "ptab-litigation-support",
    name: "IPR / PTAB Litigation Support",
    support: {
      patlytics: { status: "partial", detail: "Search and claim-charting tools are usable for IPR petition prep today; a dedicated PTAB-specific workflow is not yet a named product module." },
      "solve-intelligence": { status: "no", detail: "No litigation/PTAB-specific module found — the product is prosecution- and drafting-focused." },
      deepip: { status: "no", detail: "No litigation/PTAB-specific module found in current product materials." },
      patsnap: { status: "partial", detail: "Analytics can support litigation research, but there's no PTAB-specific named workflow." },
      iprally: { status: "partial", detail: "Search quality is relevant to invalidity work, but no dedicated PTAB/IPR workflow module is named." },
      xlscout: { status: "yes", detail: "Invalidity search and claim charting are explicitly positioned toward licensing/enforcement and IPR-style use cases." },
    },
  },
];

// Reviews: keyed by companyId -> featureId -> array of review objects.
// "sourceUrl" only points to a real platform's homepage (never a
// fabricated deep link to a specific review) — see the sample
// banner on this tab for why.
const FEATURE_REVIEWS = {
  "solve-intelligence": {
    "claim-charting": [
      { platform: "G2", author: "Patent Attorney, Mid-size Firm", date: "2026-07-14", text: "The claim charting is genuinely fast once you've mapped the claim elements — cut a task that used to take an associate a full day down to about an hour of review.", sourceUrl: "https://www.g2.com/" },
      { platform: "Reddit r/patentlaw", author: "u/claims_examiner_throwaway", date: "2026-06-02", text: "Solve's chart output is good for a first pass, but I still had to manually fix a couple of citation mappings that were close but not quite right.", sourceUrl: "https://www.reddit.com/" },
    ],
    "office-action-response": [
      { platform: "Capterra", author: "IP Paralegal", date: "2026-05-20", text: "The v2 office-action drafting update is a real improvement — the claim-amendment suggestions actually track the examiner's rejection language now.", sourceUrl: "https://www.capterra.com/" },
    ],
  },
  patsnap: {
    "prior-art-search": [
      { platform: "G2", author: "R&D Program Manager", date: "2026-06-28", text: "Search coverage is huge — great for landscaping. It's less good at surfacing the one obscure reference you actually needed for a novelty opinion.", sourceUrl: "https://www.g2.com/" },
    ],
    "portfolio-analytics": [
      { platform: "TrustRadius", author: "Director of IP Operations", date: "2026-04-11", text: "The portfolio dashboards are the reason we kept renewing — good for board-level reporting on filing trends across business units.", sourceUrl: "https://www.trustradius.com/" },
    ],
  },
  iprally: {
    "prior-art-search": [
      { platform: "LinkedIn", author: "Patent Search Specialist", date: "2026-07-02", text: "The graph-based approach actually found prior art our classification-code search missed on two separate projects this quarter. Worth the switch.", sourceUrl: "https://www.linkedin.com/" },
    ],
    "fto-analysis": [
      { platform: "Reddit r/IPLaw", author: "u/fto_grind", date: "2026-05-30", text: "Good for FTO first passes but you still need a human to sanity-check claim scope on anything with means-plus-function language.", sourceUrl: "https://www.reddit.com/" },
    ],
  },
  deepip: {
    "claim-charting": [
      { platform: "G2", author: "In-house Patent Counsel", date: "2026-06-19", text: "It's fine for internal review but the output isn't polished enough to hand to opposing counsel or a court without reformatting.", sourceUrl: "https://www.g2.com/" },
    ],
  },
  xlscout: {
    "claim-charting": [
      { platform: "TrustRadius", author: "Licensing Manager", date: "2026-03-22", text: "We use this mainly for building licensing packages — the claim charts are geared toward monetization conversations, not litigation-grade detail.", sourceUrl: "https://www.trustradius.com/" },
    ],
  },
};

window.PATLYTICS_FEATURE_DATA = {
  DEFAULT_COMPARISON_COMPANY_IDS,
  PATLYTICS_PSEUDO_COMPANY,
  FEATURE_ROWS,
  FEATURE_REVIEWS,
};
