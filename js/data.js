/* ============================================================
   Patlytics Competitive Intelligence — Mock Dataset
   PREVIEW / SAMPLE DATA. This file stands in for the live
   scraping + aggregation pipeline. Company identities, websites,
   LinkedIn URLs, founder names/backgrounds, and the New Market
   Entrants section have been checked against real public sources
   (company sites, LinkedIn, press coverage) where noted below.
   Day-to-day "activity" items (today/this-week feeds, hiring
   counts, marketing items) are still illustrative placeholders
   standing in for the live scraper, unless a field says otherwise.
   Swap this module out for a fetch() to the aggregation API once
   scraping is wired up.
   ============================================================ */

// Fixed "as of" anchor so the demo dataset stays coherent no matter
// when the static preview is actually opened.
const ANCHOR_DATE = "2026-08-25";
const EARLIEST_DATE = "2026-08-05"; // oldest date the mock archive covers

function d(offsetDays) {
  const base = new Date(ANCHOR_DATE + "T12:00:00Z");
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function siteUrl(domain) {
  return domain ? `https://${domain}` : null;
}

/* ---------------- General Daily Highlights ---------------- */
const HIGHLIGHTS = [
  {
    id: "hl-1",
    date: d(-1),
    priority: "critical",
    category: "Partnership",
    title: "Thomson Reuters and Solve Intelligence announce strategic partnership",
    summary:
      "Thomson Reuters is integrating Solve Intelligence's AI drafting and prosecution copilot into its IP workflow suite, pairing Reuters' Practical Law / Westlaw IP content and firm-side distribution with Solve's generative drafting engine.",
    whyItMatters:
      "This is the single biggest competitive signal of the quarter. It gives a direct, well-funded competitor an enterprise distribution channel into exactly the law-firm and corporate IP-counsel accounts Patlytics is targeting. Expect Solve to lean on this in every enterprise sales conversation for the next 6–12 months.",
    companies: ["Solve Intelligence"],
    source: "Reported partnership — not yet independently confirmed by our search pass",
    sourceType: "press-release",
    url: "https://ipwatchdog.com/",
  },
  {
    id: "hl-2",
    date: d(-1),
    priority: "high",
    category: "Funding",
    title: "IPRally closes extended seed round led by European deep-tech investors",
    summary:
      "IPRally raised an extension to its seed round to accelerate its graph-based prior-art search engine and expand go-to-market into the US, its first real push outside the Nordics/EU.",
    whyItMatters:
      "IPRally's search technology is architecturally closest to Patlytics' own approach (embedding + graph retrieval over prior art). A US expansion puts them in direct account contention for the first time.",
    companies: ["IPRally"],
    source: "IPRally newsroom (sample framing — see company site for actual funding history)",
    sourceType: "news",
    url: "https://www.iprally.com/news",
  },
  {
    id: "hl-3",
    date: d(0),
    priority: "high",
    category: "Product",
    title: "PatSnap ships 'Insights Copilot', a conversational layer over its analytics suite",
    summary:
      "PatSnap's new copilot lets users ask natural-language questions over its existing patent analytics and landscape datasets, generating charts and competitive landscape summaries on demand.",
    whyItMatters:
      "This narrows the perceived gap between PatSnap's legacy analytics platform and Patlytics' natural-language-native product. Sales should expect prospects to ask 'how is this different from PatSnap Copilot.'",
    companies: ["PatSnap"],
    source: "PatSnap product blog (sample framing)",
    sourceType: "product",
    url: "https://www.patsnap.com",
  },
  {
    id: "hl-4",
    date: d(0),
    priority: "medium",
    category: "Hiring",
    title: "Clarivate posts VP of AI Product Strategy role reporting into IP leadership",
    summary:
      "The role description references building 'agentic patent research workflows,' signaling Clarivate intends to modernize its IP intelligence platforms rather than sunset them.",
    whyItMatters:
      "A sign the largest incumbent in the space is investing rather than retreating. Worth tracking who fills this seat — likely a strong proxy for Clarivate's AI roadmap and urgency.",
    companies: ["Clarivate (Innography)"],
    source: "LinkedIn Jobs (sample framing)",
    sourceType: "hiring",
    url: "https://clarivate.com/intellectual-property/",
  },
  {
    id: "hl-5",
    date: d(-2),
    priority: "medium",
    category: "Market",
    title: "USPTO updates guidance on AI-assisted inventorship disclosure",
    summary:
      "New guidance clarifies disclosure expectations when generative AI tools are used in the drafting or ideation process for a patent application.",
    whyItMatters:
      "Directly relevant to every AI-drafting vendor in this space, including us. Expect competitor marketing (especially Solve Intelligence, &AI, Fearn, and other AI-drafting tools) to publish compliance positioning within days.",
    companies: ["Industry-wide"],
    source: "USPTO.gov",
    sourceType: "regulatory",
    url: "https://www.uspto.gov/about-us/news-updates",
  },
  {
    id: "hl-6",
    date: d(-3),
    priority: "high",
    category: "Funding",
    title: "Stilta raises $10.5M seed led by a16z for agentic patent litigation AI",
    summary:
      "Stockholm-based Stilta (YC W26), founded by four former McKinsey/QuantumBlack engineers, closed a $10.5M seed round led by Andreessen Horowitz to build source-backed, auditable agentic AI for patent litigation and invalidity work. Already used by multiple AmLaw 100 firms within months of launch.",
    whyItMatters:
      "A very well-capitalized, fast-moving new entrant with immediate BigLaw traction — see the New Market Entrants tab for the full profile.",
    companies: ["Stilta"],
    source: "TechCrunch",
    sourceType: "funding",
    url: "https://techcrunch.com/2026/05/19/legal-tech-announced-stilta-announces-10m-seed-backed-by-yc-and-a16z-months-after-launch/",
  },
  {
    id: "hl-7",
    date: d(-4),
    priority: "low",
    category: "Marketing",
    title: "Anaqua publishes benchmark report on IP department budget allocation",
    summary:
      "Annual survey-based report positions Anaqua as the thought leader on IP operations spend; report is being widely shared by in-house IP counsel on LinkedIn.",
    whyItMatters:
      "Good content-marketing pattern to study, even though Anaqua is only an adjacent competitor. The distribution (in-house counsel sharing organically) is the notable part.",
    companies: ["Anaqua"],
    source: "Anaqua Research (sample framing)",
    sourceType: "marketing",
    url: "https://anaqua.com",
  },
  {
    id: "hl-8",
    date: d(-5),
    priority: "low",
    category: "Webinar",
    title: "LexisNexis Cipher to host webinar on AI patent landscaping for semiconductor portfolios",
    summary:
      "Cipher — acquired by RELX/LexisNexis in 2023 — is running a vertical-specific session aimed at semiconductor IP teams, a segment Patlytics has been expanding into.",
    whyItMatters:
      "Direct audience overlap with our semiconductor vertical push. Consider having someone from the team attend.",
    companies: ["Cipher"],
    source: "Cipher events page (sample framing)",
    sourceType: "webinar",
    url: "https://www.lexisnexisip.com",
  },
  {
    id: "hl-9",
    date: d(-6),
    priority: "high",
    category: "Funding",
    title: "Fearn raises $5.5M seed led by Kindred Ventures for AI-native patent drafting",
    summary:
      "San Francisco-based Fearn, founded by Han Kim (ex-Morrison Foerster, Caltech) and Angela Gao (Caltech PhD, ex-Google Research), raised a $5.5M seed round with participation from a16z speedrun to build a purpose-built patent drafting model targeting a ~20 minute first-draft turnaround.",
    whyItMatters:
      "Direct overlap with Patlytics' and Solve Intelligence's drafting use case, aimed initially at solo inventors and startups rather than enterprise IP departments — worth watching for upmarket movement.",
    companies: ["Fearn"],
    source: "PR Newswire",
    sourceType: "funding",
    url: "https://www.prnewswire.com/news-releases/fearn-raises-5-5-million-seed-to-end-the-two-tier-patent-system-302796012.html",
  },
];

/* ---------------- Competitors ---------------- */
// rank = correlation/threat ranking used to order sidebar tabs (1 = highest)
// website / linkedin URLs below have been verified against real company
// sites and LinkedIn company pages. Founder bios are verified only where
// explicitly noted; otherwise they are placeholders pending the scraping
// pipeline. Day-to-day activity/hiring/marketing items remain illustrative.
const COMPETITORS = [
  {
    id: "solve-intelligence",
    name: "Solve Intelligence",
    rank: 2,
    tier: "Tier 1 — Direct Competitor",
    initials: "SI",
    tagline: "AI copilot for patent drafting, prosecution, and portfolio management.",
    description:
      "Solve Intelligence builds an AI-native workspace for patent attorneys and agents, covering claim drafting, office-action response drafting, and prosecution docketing. Its core wedge is generative drafting assistance embedded directly into attorneys' existing workflows, and it has moved quickly from a drafting tool into a broader prosecution platform, including the 2026 acquisition of ClaimWise to deepen European litigation/opposition coverage.",
    employeeCount: "~90 (est.)",
    founded: "2023",
    hq: "San Francisco, CA",
    website: "solveintelligence.com",
    websiteUrl: siteUrl("solveintelligence.com"),
    careersUrl: siteUrl("solveintelligence.com") + "/careers",
    linkedin: "https://uk.linkedin.com/company/solve-intelligence",
    founders: [
      {
        name: "Dr. Chris Parsonson",
        title: "Co-Founder & CEO",
        note: "MRes, University of Cambridge; MEng, Imperial College London; PhD in machine learning, UCL. Previously at The Alan Turing Institute, InstaDeep, and Dyson. (Verified via press coverage.)",
      },
      {
        name: "Dr. Sanj Ahilan",
        title: "Co-Founder",
        note: "MSci in Physics, University of Cambridge; PhD in machine learning, UCL. Previously at Magic Carpet AI and Huawei Technologies. (Verified via press coverage.)",
      },
      {
        name: "Angus Parsonson",
        title: "Co-Founder & CTO",
        note: "Background details pending further verification.",
      },
    ],
    todayActivity: [
      {
        time: "9:14 AM",
        tag: "Partnership",
        title: "Thomson Reuters partnership goes live",
        body: "Reported integration announcement with Thomson Reuters distributing Solve's drafting copilot through Practical Law / Westlaw IP channels. See General Highlights — this specific item could not be independently confirmed in our search pass.",
        url: null,
      },
    ],
    weekActivity: [
      {
        date: d(-3),
        tag: "Product",
        title: "Shipped office-action response drafting v2",
        body: "Rolled out an updated model for drafting office-action responses with claim-amendment suggestions inline.",
        url: siteUrl("solveintelligence.com"),
      },
      {
        date: d(-4),
        tag: "Content",
        title: "Published benchmark comparing drafting speed vs. traditional workflows",
        body: "Marketing report claiming ~40% reduction in first-draft turnaround time, widely shared by patent attorneys on LinkedIn.",
        url: siteUrl("solveintelligence.com"),
      },
      {
        date: d(-6),
        tag: "Hiring",
        title: "Opened first Solutions Engineering role",
        body: "Signals a push toward more hands-on enterprise/firm onboarding rather than pure self-serve.",
        url: siteUrl("solveintelligence.com") + "/careers",
      },
    ],
    hiring: {
      openRoles: 14,
      newRolesToday: [
        { title: "Enterprise Account Executive", dept: "Sales", location: "Remote (US)" },
      ],
      recentHires: [
        { name: "Sample Hire A", role: "Head of Partnerships", from: "Prior role: BigLaw-adjacent legal tech (sample)", date: d(-2) },
        { name: "Sample Hire B", role: "Senior ML Engineer", from: "Prior role: large-model applied research (sample)", date: d(-5) },
      ],
      topRoles: [
        { title: "Software Engineer, Full-Stack", count: 4 },
        { title: "Enterprise Account Executive", count: 3 },
        { title: "Patent Attorney (In-House SME)", count: 2 },
      ],
    },
    marketing: [
      {
        title: "“Drafting at the speed of thought” LinkedIn campaign",
        body: "Short-form video series featuring attorneys narrating drafting workflows in real time; strong engagement from IP counsel audience.",
        channel: "LinkedIn",
        date: d(-2),
        url: "https://uk.linkedin.com/company/solve-intelligence",
      },
      {
        title: "Sponsored AIPLA newsletter placement",
        body: "Recurring sponsor slot in a widely-read patent bar newsletter, reinforcing top-of-funnel brand presence with attorneys.",
        channel: "Newsletter",
        date: d(-6),
        url: siteUrl("solveintelligence.com"),
      },
    ],
  },
  {
    id: "patsnap",
    name: "PatSnap",
    rank: 3,
    tier: "Tier 1 — Direct Competitor",
    initials: "PS",
    tagline: "Global patent analytics and IP intelligence platform.",
    description:
      "PatSnap is an established IP intelligence platform offering patent search, analytics, landscaping, and competitive monitoring across a large global dataset. It has recently pushed into generative AI features layered on top of its existing analytics core, competing for the same 'ask questions of your patent data' use case Patlytics targets natively.",
    employeeCount: "~800 (est.)",
    founded: "2007",
    hq: "Singapore / London",
    website: "patsnap.com",
    websiteUrl: siteUrl("patsnap.com"),
    careersUrl: siteUrl("patsnap.com") + "/careers",
    linkedin: "https://www.linkedin.com/company/patsnap",
    founders: [
      {
        name: "Sample Founder Profile",
        title: "Co-Founder & CEO",
        note: "Placeholder — bio pending verification via scraping pipeline.",
      },
    ],
    todayActivity: [
      {
        time: "7:40 AM",
        tag: "Product",
        title: "Launched “Insights Copilot” conversational analytics layer",
        body: "New natural-language query layer sits on top of PatSnap's existing landscape and analytics datasets. See General Highlights.",
        url: siteUrl("patsnap.com"),
      },
    ],
    weekActivity: [
      {
        date: d(-2),
        tag: "Sales",
        title: "Announced renewal of a large pharma enterprise account",
        body: "Case study published highlighting multi-year renewal with a top-20 pharma IP department.",
        url: siteUrl("patsnap.com"),
      },
      {
        date: d(-5),
        tag: "Event",
        title: "Exhibited at INTA Annual Meeting",
        body: "Large booth presence with live product demos of the new copilot feature.",
        url: siteUrl("patsnap.com"),
      },
    ],
    hiring: {
      openRoles: 37,
      newRolesToday: [
        { title: "Solutions Consultant, EMEA", dept: "Customer Success", location: "London, UK" },
        { title: "Data Engineer", dept: "Engineering", location: "Singapore" },
      ],
      recentHires: [
        { name: "Sample Hire C", role: "VP, Product (AI)", from: "Prior role: enterprise SaaS analytics (sample)", date: d(-3) },
      ],
      topRoles: [
        { title: "Account Executive", count: 9 },
        { title: "Data/ML Engineer", count: 6 },
        { title: "Customer Success Manager", count: 5 },
      ],
    },
    marketing: [
      {
        title: "“State of Patent Analytics 2026” gated report",
        body: "Large lead-gen content push distributed via LinkedIn ads targeting in-house IP counsel and R&D leaders.",
        channel: "LinkedIn Ads",
        date: d(-1),
        url: siteUrl("patsnap.com"),
      },
    ],
  },
  {
    id: "iprally",
    name: "IPRally",
    rank: 5,
    tier: "Tier 1 — Direct Competitor",
    initials: "IR",
    tagline: "AI-native graph search engine for prior art and freedom-to-operate.",
    description:
      "IPRally built a graph-embedding based search engine specifically for prior-art and freedom-to-operate search, arguing traditional keyword/classification search misses semantically relevant results. Historically focused on the Nordics/EU market, now expanding into the US.",
    employeeCount: "~45 (est.)",
    founded: "2018",
    hq: "Helsinki, Finland",
    website: "iprally.com",
    websiteUrl: siteUrl("iprally.com"),
    careersUrl: siteUrl("iprally.com") + "/careers",
    linkedin: "https://fi.linkedin.com/company/iprally",
    founders: [
      {
        name: "Sample Founder Profile",
        title: "Co-Founder & CTO",
        note: "Placeholder — technical background pending verification via scraping pipeline.",
      },
    ],
    todayActivity: [],
    weekActivity: [
      {
        date: d(-1),
        tag: "Funding",
        title: "Closed extended seed round for US expansion",
        body: "Round earmarked for opening a US commercial presence and localized go-to-market. See General Highlights.",
        url: siteUrl("iprally.com") + "/news",
      },
      {
        date: d(-4),
        tag: "Hiring",
        title: "Opened first US-based sales role",
        body: "First indication of direct US account coverage rather than partner-led sales.",
        url: siteUrl("iprally.com") + "/careers",
      },
    ],
    hiring: {
      openRoles: 8,
      newRolesToday: [],
      recentHires: [
        { name: "Sample Hire D", role: "Head of US Expansion", from: "Prior role: EU-to-US SaaS GTM (sample)", date: d(-4) },
      ],
      topRoles: [
        { title: "Search/ML Research Engineer", count: 3 },
        { title: "Account Executive (US)", count: 2 },
      ],
    },
    marketing: [
      {
        title: "Technical blog: “Why embeddings beat classification codes”",
        body: "Deep technical post aimed at patent search professionals, positioning against classification-code-based search (a subtle jab at legacy platforms).",
        channel: "Company Blog",
        date: d(-3),
        url: siteUrl("iprally.com"),
      },
    ],
  },
  {
    id: "clarivate-innography",
    name: "Clarivate (Innography)",
    rank: 10,
    tier: "Tier 2 — Strong Overlap",
    initials: "CL",
    tagline: "Large incumbent IP intelligence suite under the Clarivate umbrella.",
    description:
      "Clarivate's IP Solutions division (which absorbed the Innography patent-analytics platform) is a long-standing patent analytics and portfolio management suite serving large enterprise and law-firm accounts, now unified under the 'IPOne' AI-enabled IP intelligence ecosystem. Recent signals suggest Clarivate is investing in AI-native features rather than treating the platform as legacy.",
    employeeCount: "Clarivate: ~9,000 (IP Solutions unit est. ~150)",
    founded: "Innography: 2006 (acquired by Clarivate 2021)",
    hq: "Philadelphia, PA (Clarivate global HQ: London, UK)",
    website: "clarivate.com/intellectual-property",
    websiteUrl: "https://clarivate.com/intellectual-property/",
    careersUrl: "https://clarivate.com/careers/",
    linkedin: "https://www.linkedin.com/company/clarivate",
    founders: [
      {
        name: "N/A — division of public company",
        title: "Business unit leadership",
        note: "Operates as a business unit inside Clarivate (NYSE: CLVT); tracked at leadership/org level rather than founder level.",
      },
    ],
    todayActivity: [
      {
        time: "11:02 AM",
        tag: "Hiring",
        title: "Posted VP of AI Product Strategy role",
        body: "Role reports into IP Solutions leadership and references 'agentic patent research workflows.' See General Highlights.",
        url: "https://clarivate.com/careers/",
      },
    ],
    weekActivity: [
      {
        date: d(-3),
        tag: "Corporate",
        title: "Clarivate earnings call referenced AI investment across IP segment",
        body: "Leadership called out AI feature velocity in the IP Solutions segment as a retention priority for FY26.",
        url: "https://clarivate.com/intellectual-property/",
      },
    ],
    hiring: {
      openRoles: 22,
      newRolesToday: [
        { title: "VP, AI Product Strategy", dept: "Product", location: "Remote (US)" },
      ],
      recentHires: [],
      topRoles: [
        { title: "Product Manager, AI", count: 3 },
        { title: "Enterprise Account Manager", count: 5 },
      ],
    },
    marketing: [
      {
        title: "Webinar series: “Modernizing Legacy IP Data Infrastructure”",
        body: "Multi-part webinar aimed at retaining large legacy accounts considering newer AI-native tools.",
        channel: "Webinar",
        date: d(-5),
        url: "https://clarivate.com/intellectual-property/",
      },
    ],
  },
  {
    id: "anaqua",
    name: "Anaqua",
    rank: 11,
    tier: "Tier 2 — Strong Overlap",
    initials: "AQ",
    tagline: "End-to-end IP management software for corporate and law-firm IP departments.",
    description:
      "Anaqua provides IP lifecycle management software — docketing, portfolio management, renewals, and increasingly analytics — for corporate IP departments and law firms. Overlaps with Patlytics primarily where IP operations and analytics intersect rather than on core AI search/drafting.",
    employeeCount: "~700 (est.)",
    founded: "2004",
    hq: "Boston, MA",
    website: "anaqua.com",
    websiteUrl: siteUrl("anaqua.com"),
    careersUrl: siteUrl("anaqua.com") + "/careers",
    linkedin: "https://www.linkedin.com/company/anaqua",
    founders: [
      {
        name: "Sample Founder Profile",
        title: "Founder & Executive Chairman",
        note: "Placeholder — bio pending verification via scraping pipeline.",
      },
    ],
    todayActivity: [],
    weekActivity: [
      {
        date: d(-4),
        tag: "Marketing",
        title: "Published annual IP department budget benchmark report",
        body: "Survey-based report widely shared organically by in-house IP counsel on LinkedIn. See General Highlights.",
        url: siteUrl("anaqua.com"),
      },
    ],
    hiring: {
      openRoles: 19,
      newRolesToday: [],
      recentHires: [
        { name: "Sample Hire E", role: "Director, Analytics Product", from: "Prior role: legal-ops analytics (sample)", date: d(-6) },
      ],
      topRoles: [
        { title: "Implementation Consultant", count: 6 },
        { title: "Account Manager", count: 4 },
      ],
    },
    marketing: [
      {
        title: "“IP Ops Benchmark 2026” report",
        body: "Annual survey report driving strong organic LinkedIn distribution among in-house counsel.",
        channel: "Content / Organic Social",
        date: d(-4),
        url: siteUrl("anaqua.com"),
      },
    ],
  },
  {
    id: "cipher",
    name: "Cipher (a LexisNexis company)",
    rank: 22,
    tier: "Tier 3 — Adjacent",
    initials: "CI",
    tagline: "AI-driven IP intelligence and visualization for technical due diligence.",
    description:
      "Cipher focuses on applied-science-heavy patent landscaping and visualization, often used for technical due diligence and R&D strategy rather than pure legal workflows. Cipher was acquired by RELX (LexisNexis' parent company) in 2023 and now operates as LexisNexis Cipher, giving it access to LexisNexis' broader IP data and distribution.",
    employeeCount: "~120 (est.)",
    founded: "2013 (acquired by RELX/LexisNexis, 2023)",
    hq: "Paris, France",
    website: "lexisnexisip.com",
    websiteUrl: siteUrl("lexisnexisip.com"),
    careersUrl: "https://www.lexisnexis.com/en-us/careers.page",
    linkedin: "https://www.linkedin.com/company/cipher-strategicpatentintelligence",
    founders: [
      {
        name: "Sample Founder Profile",
        title: "Co-Founder (pre-acquisition)",
        note: "Placeholder — bio pending verification via scraping pipeline.",
      },
    ],
    todayActivity: [],
    weekActivity: [
      {
        date: d(-5),
        tag: "Webinar",
        title: "Announced webinar: AI Patent Landscaping for Semiconductor Portfolios",
        body: "Vertical-specific session targeting semiconductor IP teams. See General Highlights and the Webinars tab.",
        url: siteUrl("lexisnexisip.com"),
      },
    ],
    hiring: {
      openRoles: 6,
      newRolesToday: [],
      recentHires: [],
      topRoles: [
        { title: "Patent Analyst (Semiconductor)", count: 2 },
        { title: "Data Scientist", count: 2 },
      ],
    },
    marketing: [
      {
        title: "Vertical webinar push into semiconductors",
        body: "Applied-science team running a dedicated session for semiconductor IP portfolios — direct overlap with our vertical expansion.",
        channel: "Webinar",
        date: d(-5),
        url: siteUrl("lexisnexisip.com"),
      },
    ],
  },
  {
    id: "ktmine",
    name: "ktMINE",
    rank: 23,
    tier: "Tier 3 — Adjacent",
    initials: "KT",
    tagline: "IP and royalty rate benchmarking data intelligence.",
    description:
      "ktMINE specializes in licensing and royalty-rate benchmarking data alongside patent data services, serving valuation, licensing, and transfer-pricing use cases. Overlap with Patlytics is narrow but relevant for valuation-adjacent enterprise deals.",
    employeeCount: "~90 (est.)",
    founded: "2010",
    hq: "Chicago, IL",
    website: "ktmine.com",
    websiteUrl: siteUrl("ktmine.com"),
    careersUrl: siteUrl("ktmine.com") + "/careers",
    linkedin: "https://www.linkedin.com/company/ktmine",
    founders: [
      {
        name: "Sample Founder Profile",
        title: "Founder & CEO",
        note: "Placeholder — bio pending verification via scraping pipeline.",
      },
    ],
    todayActivity: [],
    weekActivity: [],
    hiring: {
      openRoles: 4,
      newRolesToday: [],
      recentHires: [],
      topRoles: [{ title: "Licensing Data Analyst", count: 2 }],
    },
    marketing: [],
  },
  {
    id: "ipwe",
    name: "IPwe",
    rank: 24,
    tier: "Tier 3 — Adjacent",
    initials: "IW",
    tagline: "AI and blockchain-based patent data and marketplace platform.",
    description:
      "IPwe combines AI-driven patent data normalization with a blockchain-based patent registry and marketplace concept, targeting patent monetization and portfolio valuation use cases more than core search/drafting workflows.",
    employeeCount: "~60 (est.)",
    founded: "2017",
    hq: "New York, NY",
    website: "ipwe.com",
    websiteUrl: siteUrl("ipwe.com"),
    careersUrl: siteUrl("ipwe.com") + "/careers",
    linkedin: "https://www.linkedin.com/company/ipwe-com",
    founders: [
      {
        name: "Sample Founder Profile",
        title: "Co-Founder & CEO",
        note: "Placeholder — bio pending verification via scraping pipeline.",
      },
    ],
    todayActivity: [],
    weekActivity: [],
    hiring: {
      openRoles: 3,
      newRolesToday: [],
      recentHires: [],
      topRoles: [{ title: "Business Development Manager", count: 1 }],
    },
    marketing: [],
  },
];

// Additional competitors surfaced via (a) Patlytics' own internal Notion
// "Competitor Analysis" workspace — DeepIP, Junior, Ankar AI, Edge, and
// Patented.ai are all explicitly tracked there — and (b) a broader,
// individually-verified sweep of the AI-patent and AI-legal landscape.
// Website/LinkedIn URLs are verified real destinations. Day-to-day
// activity, hiring counts, and founder bios have not been scraped yet for
// these, so those fields are intentionally left as "not yet verified"
// rather than guessed.
function stubCompetitor({ id, name, rank, tier, initials, tagline, description, website, linkedin }) {
  return {
    id,
    name,
    rank,
    tier,
    initials,
    tagline,
    description,
    employeeCount: "Not yet verified — pending scrape",
    founded: "Not yet verified",
    hq: "Not yet verified — pending scrape",
    website,
    websiteUrl: siteUrl(website),
    careersUrl: siteUrl(website) + "/careers",
    linkedin,
    founders: [
      { name: "Not yet verified", title: "Founder/CEO", note: "Placeholder — pending verification via scraping pipeline." },
    ],
    todayActivity: [],
    weekActivity: [],
    hiring: { openRoles: null, newRolesToday: [], recentHires: [], topRoles: [] },
    marketing: [],
  };
}

COMPETITORS.push(
  stubCompetitor({
    id: "deepip",
    name: "DeepIP",
    rank: 1,
    tier: "Tier 1 — Direct Competitor",
    initials: "DI",
    tagline: "AI patent drafting and prosecution platform.",
    description: "Repeatedly identified inside Patlytics' own competitive-analysis tracking as the closest direct competitor — an AI drafting and prosecution platform with significant product overlap. Highest-priority watch-list entry.",
    website: "deepip.ai",
    linkedin: "https://www.linkedin.com/company/deep-ip",
  }),
  stubCompetitor({
    id: "junior",
    name: "Junior",
    rank: 6,
    tier: "Tier 1 — Direct Competitor",
    initials: "JR",
    tagline: "AI-native patent drafting inside Microsoft Word.",
    description: "Atlanta-based Junior builds AI-native patent drafting tooling that works directly inside Microsoft Word, targeting the same drafting workflow Patlytics and Solve Intelligence compete for.",
    website: "junior.law",
    linkedin: "https://www.linkedin.com/company/junior-ai-drafting",
  }),
  stubCompetitor({
    id: "ankar-ai",
    name: "Ankar AI",
    rank: 7,
    tier: "Tier 1 — Direct Competitor",
    initials: "AN",
    tagline: "AI operating system for patent prosecution and portfolio management.",
    description: "UK-based Ankar AI is building an AI-driven operating system spanning patent prosecution and portfolio management workflows.",
    website: "ankar.ai",
    linkedin: "https://www.linkedin.com/company/ankar-ai",
  }),
  stubCompetitor({
    id: "edge",
    name: "Edge",
    rank: 8,
    tier: "Tier 1 — Direct Competitor",
    initials: "ED",
    tagline: "AI patent drafting (\"Ingenia\") and trademark clearance.",
    description: "Edge offers AI patent drafting under its \"Ingenia\" product alongside trademark-clearance tooling, giving it a foothold in both patent and trademark AI workflows.",
    website: "withedge.com",
    linkedin: "https://www.linkedin.com/company/workwithedge",
  }),
  stubCompetitor({
    id: "patented-ai",
    name: "Patented.ai",
    rank: 9,
    tier: "Tier 1 — Direct Competitor",
    initials: "PA",
    tagline: "AI infringement detection via claim-to-code mapping.",
    description: "Patented.ai focuses on infringement analysis, mapping patent claims directly to product code/implementation to generate infringement evidence — tracked with its own dedicated page in Patlytics' internal competitor analysis.",
    website: "patented.ai",
    linkedin: "https://www.linkedin.com/company/patented",
  }),
  stubCompetitor({
    id: "xlscout",
    name: "XLSCOUT",
    rank: 4,
    tier: "Tier 1 — Direct Competitor",
    initials: "XL",
    tagline: "AI patent search, drafting-assist, and monetization platform.",
    description: "XLSCOUT offers AI-driven patent search, drafting assistance, and monetization/valuation tooling. Named directly in a real Patlytics customer call as running a parallel evaluation trial alongside PatSnap against Patlytics.",
    website: "xlscout.ai",
    linkedin: "https://www.linkedin.com/company/xlscout-ai",
  }),
  stubCompetitor({
    id: "nlpatent",
    name: "NLPatent",
    rank: 12,
    tier: "Tier 2 — Strong Overlap",
    initials: "NL",
    tagline: "LLM-based semantic prior-art search.",
    description: "NLPatent offers large-language-model-based semantic search over prior art, competing on the same natural-language search use case as Patlytics.",
    website: "nlpatent.com",
    linkedin: "https://www.linkedin.com/company/nlpatent",
  }),
  stubCompetitor({
    id: "patentpal",
    name: "PatentPal",
    rank: 13,
    tier: "Tier 2 — Strong Overlap",
    initials: "PP",
    tagline: "Generative AI patent drafting, including figures and specifications.",
    description: "PatentPal automates generation of patent drafting elements including figures and specifications using generative AI.",
    website: "patentpal.com",
    linkedin: "https://www.linkedin.com/company/patentpal",
  }),
  stubCompetitor({
    id: "amplified-ai",
    name: "Amplified AI",
    rank: 14,
    tier: "Tier 2 — Strong Overlap",
    initials: "AA",
    tagline: "AI-powered prior-art and patent search.",
    description: "Amplified AI provides AI-driven prior-art and patent search tooling for patent professionals.",
    website: "amplified.ai",
    linkedin: "https://www.linkedin.com/company/amplified-ai",
  }),
  stubCompetitor({
    id: "iprova",
    name: "Iprova",
    rank: 15,
    tier: "Tier 2 — Strong Overlap",
    initials: "IP",
    tagline: "AI-driven invention generation for R&D and IP teams.",
    description: "Iprova uses AI to help R&D and IP teams generate and identify patentable inventions earlier in the innovation cycle — adjacent to Patlytics' search/analytics focus.",
    website: "iprova.com",
    linkedin: "https://www.linkedin.com/company/iprova",
  }),
  stubCompetitor({
    id: "minesoft",
    name: "Minesoft",
    rank: 16,
    tier: "Tier 2 — Strong Overlap",
    initials: "MS",
    tagline: "Patent search and analytics (PatBase).",
    description: "Minesoft operates PatBase, a long-standing patent search and analytics platform used broadly across the IP professional community.",
    website: "minesoft.com",
    linkedin: "https://www.linkedin.com/company/minesoft-ltd",
  }),
  stubCompetitor({
    id: "questel",
    name: "Questel",
    rank: 17,
    tier: "Tier 2 — Strong Overlap",
    initials: "QU",
    tagline: "Global IP management and Orbit Intelligence analytics.",
    description: "Questel is a global IP management provider whose Orbit Intelligence product competes on patent analytics and search, similar in scope to Clarivate's IP offering.",
    website: "questel.com",
    linkedin: "https://www.linkedin.com/company/questel",
  }),
  stubCompetitor({
    id: "juristat",
    name: "Juristat",
    rank: 18,
    tier: "Tier 2 — Strong Overlap",
    initials: "JU",
    tagline: "AI patent prosecution analytics and examiner statistics.",
    description: "Juristat provides AI-driven analytics on patent prosecution, including examiner-level statistics, to help attorneys plan prosecution strategy.",
    website: "juristat.com",
    linkedin: "https://www.linkedin.com/company/juristat",
  }),
  stubCompetitor({
    id: "patent-bots",
    name: "Patent Bots",
    rank: 19,
    tier: "Tier 2 — Strong Overlap",
    initials: "PB",
    tagline: "AI and rules-based patent drafting, proofreading, and examiner stats.",
    description: "Patent Bots combines rules-based and AI tooling for patent drafting, proofreading, and examiner statistics.",
    website: "patentbots.com",
    linkedin: "https://www.linkedin.com/company/patent-bots",
  }),
  stubCompetitor({
    id: "alt-legal",
    name: "Alt Legal",
    rank: 20,
    tier: "Tier 2 — Strong Overlap",
    initials: "AL",
    tagline: "AI-assisted IP and trademark docketing.",
    description: "Alt Legal provides AI-assisted docketing software for IP and trademark portfolios, overlapping with Patlytics primarily on the operations/docketing side.",
    website: "altlegal.com",
    linkedin: "https://www.linkedin.com/company/alt-legal-ip-management-software",
  }),
  stubCompetitor({
    id: "pqai",
    name: "PQAI",
    rank: 21,
    tier: "Tier 2 — Strong Overlap",
    initials: "PQ",
    tagline: "Free, open-source AI prior-art search (nonprofit, AT&T-backed).",
    description: "PQAI is a free, open-source AI-powered prior-art search tool backed by AT&T, notable as a nonprofit/open alternative in the same search category Patlytics competes in.",
    website: "projectpq.ai",
    linkedin: "https://www.linkedin.com/company/pqai",
  }),
  stubCompetitor({
    id: "harvey",
    name: "Harvey",
    rank: 25,
    tier: "Tier 3 — Adjacent",
    initials: "HV",
    tagline: "Domain-specific generative AI for law firms and professional services.",
    description: "Harvey provides generalist domain-specific AI for AmLaw firms and professional services. Internally, Patlytics reps treat Harvey as a 'generalist AI' wedge competitor — the pitch being that Patlytics offers real IP-specific depth where Harvey is broad but shallow on patents.",
    website: "harvey.ai",
    linkedin: "https://www.linkedin.com/company/harvey-ai",
  }),
  stubCompetitor({
    id: "legora",
    name: "Legora",
    rank: 26,
    tier: "Tier 3 — Adjacent",
    initials: "LG",
    tagline: "Collaborative generative AI for lawyers (review, drafting, research).",
    description: "Legora offers collaborative generative AI for legal review, drafting, and research. Like Harvey, it's used internally as a generalist-AI comparison point in sales conversations rather than a head-to-head IP competitor.",
    website: "legora.com",
    linkedin: "https://www.linkedin.com/company/wearelegora",
  }),
  stubCompetitor({
    id: "spellbook",
    name: "Spellbook",
    rank: 27,
    tier: "Tier 3 — Adjacent",
    initials: "SB",
    tagline: "AI contract review and drafting inside Microsoft Word.",
    description: "Spellbook provides AI-assisted contract review and drafting directly inside Microsoft Word, primarily for transactional/commercial legal work rather than patents.",
    website: "spellbook.legal",
    linkedin: "https://www.linkedin.com/company/spellbookai",
  }),
  stubCompetitor({
    id: "robin-ai",
    name: "Robin AI",
    rank: 28,
    tier: "Tier 3 — Adjacent",
    initials: "RA",
    tagline: "AI contract copilot for review and negotiation.",
    description: "Robin AI offers an AI copilot for contract review and negotiation, adjacent to Patlytics primarily as a broader legal-AI budget competitor rather than a direct patent-tech rival.",
    website: "robinai.com",
    linkedin: "https://www.linkedin.com/company/robinai",
  }),
  stubCompetitor({
    id: "leya",
    name: "Leya",
    rank: 29,
    tier: "Tier 3 — Adjacent",
    initials: "LY",
    tagline: "Generative AI for legal workflows (Nordics/Europe).",
    description: "Leya provides generative AI tooling across general legal workflows, primarily in the Nordics/European market.",
    website: "leyalaw.com",
    linkedin: "https://www.linkedin.com/company/leyalaw",
  }),
  stubCompetitor({
    id: "cocounsel",
    name: "Casetext (CoCounsel)",
    rank: 30,
    tier: "Tier 3 — Adjacent",
    initials: "CC",
    tagline: "AI legal assistant, now part of Thomson Reuters.",
    description: "Casetext's CoCounsel AI legal assistant was acquired by Thomson Reuters and is now distributed as part of its broader legal AI suite — relevant to watch given Thomson Reuters' expanding legal-AI partnership activity.",
    website: "legal.thomsonreuters.com",
    linkedin: "https://www.linkedin.com/company/casetext",
  }),
  stubCompetitor({
    id: "ironclad",
    name: "Ironclad",
    rank: 31,
    tier: "Tier 3 — Adjacent",
    initials: "IC",
    tagline: "AI-powered contract lifecycle management.",
    description: "Ironclad provides AI-powered contract lifecycle management software, adjacent to Patlytics mainly as a broader legal-tech budget line item.",
    website: "ironcladapp.com",
    linkedin: "https://www.linkedin.com/company/ironclad-inc-",
  }),
  stubCompetitor({
    id: "linksquares",
    name: "LinkSquares",
    rank: 32,
    tier: "Tier 3 — Adjacent",
    initials: "LS",
    tagline: "AI-powered contract lifecycle management (\"LinkAI\").",
    description: "LinkSquares offers AI-powered contract lifecycle management under its LinkAI branding, competing in the broader legal-AI category.",
    website: "linksquares.com",
    linkedin: "https://www.linkedin.com/company/linksquares",
  }),
  stubCompetitor({
    id: "draftwise",
    name: "DraftWise",
    rank: 33,
    tier: "Tier 3 — Adjacent",
    initials: "DW",
    tagline: "AI contract drafting and negotiation using firm knowledge.",
    description: "DraftWise uses a law firm's own historical documents to power AI-assisted contract drafting and negotiation — a broader legal-AI adjacent player.",
    website: "draftwise.com",
    linkedin: "https://www.linkedin.com/company/draftwise-ai",
  }),
  stubCompetitor({
    id: "genie-ai",
    name: "Genie AI",
    rank: 34,
    tier: "Tier 3 — Adjacent",
    initials: "GA",
    tagline: "AI legal contract drafting and templates.",
    description: "Genie AI provides AI-assisted legal contract drafting and template generation for a broad legal audience.",
    website: "genieai.co",
    linkedin: "https://www.linkedin.com/company/genie-ai",
  }),
  stubCompetitor({
    id: "eve-legal",
    name: "Eve",
    rank: 35,
    tier: "Tier 3 — Adjacent",
    initials: "EV",
    tagline: "AI legal assistant for plaintiff firms.",
    description: "Eve provides an AI legal assistant built specifically for plaintiff-side law firms, a niche broader-legal-AI adjacent player.",
    website: "eve.legal",
    linkedin: "https://www.linkedin.com/company/eve-legal",
  })
);

/* ---------------- New Market Entrants ---------------- */
// Every entrant below is a REAL, currently active company, verified via
// press coverage / YC / Crunchbase / the company's own site at the time
// this file was written. Specific hiring-volume numbers are not yet
// scraped from live careers pages, so that field is intentionally left
// as "not yet verified" rather than guessed.
const NEW_ENTRANTS = [
  {
    id: "stilta",
    name: "Stilta",
    threat: "high",
    backing: "a16z-led $10.5M seed (Y Combinator W26)",
    stage: "Seed",
    tagline: "Agentic AI for patent litigation, invalidity, and infringement analysis.",
    website: "https://stilta.com",
    linkedin: null,
    description:
      "Stockholm-based Stilta builds agentic AI for IP work, starting with patent litigation — every output is source-backed and auditable. Already used by multiple AmLaw 100 firms and Fortune 500 in-house IP teams within months of its December 2025 founding.",
    foundingTeam: [
      { name: "Oskar Block", background: "CEO. Previously McKinsey, Goldman Sachs, and Swedish unicorns." },
      { name: "3 additional co-founders", background: "Also former McKinsey/QuantumBlack engineers (names pending verification)." },
    ],
    hiring: {
      openRoles: null,
      focus: "Not yet verified — careers page not yet scraped",
      hiringProfile: "Not yet verified.",
    },
    date: d(-6),
    source: "TechCrunch, LawNext",
    sourceUrl: "https://techcrunch.com/2026/05/19/legal-tech-announced-stilta-announces-10m-seed-backed-by-yc-and-a16z-months-after-launch/",
  },
  {
    id: "and-ai",
    name: "&AI",
    threat: "high",
    backing: "$6.5M seed led by First Round (Y Combinator)",
    stage: "Seed",
    tagline: "\"Andy\" — an AI agent for patent prior art search, claim charts, and office actions.",
    website: "https://www.tryandai.com",
    linkedin: "https://www.linkedin.com/company/and-ai",
    description:
      "San Francisco-based &AI built Andy, an AI agent for patent attorneys handling prior art search, claim chart drafting, and office-action responses. Early large-firm customers report 70-90% time savings on claim-chart work.",
    foundingTeam: [
      { name: "Caleb Harris", background: "Co-Founder. MIT. Previously a technical advisor to law firms on patent issues." },
      { name: "Herbert Turner", background: "Co-Founder. MIT." },
    ],
    hiring: {
      openRoles: null,
      focus: "Not yet verified — careers page not yet scraped",
      hiringProfile: "Not yet verified.",
    },
    date: d(-9),
    source: "Artificial Lawyer, IPWatchdog",
    sourceUrl: "https://www.artificiallawyer.com/2025/02/06/yc-backed-ai-raises-6-5m-launches-ai-agent-for-patent-work/",
  },
  {
    id: "fearn",
    name: "Fearn",
    threat: "high",
    backing: "$5.5M seed led by Kindred Ventures, w/ a16z speedrun",
    stage: "Seed",
    tagline: "AI-native patent drafting platform — draft a full patent application in ~20 minutes.",
    website: "https://fearn.ai",
    linkedin: null,
    description:
      "San Francisco-based Fearn pairs purpose-built, hallucination-resistant drafting models with automated labeled-figure generation, aiming to cut patent drafting time by ~96% and bring Big-Law-quality drafting to solo inventors and startups first.",
    foundingTeam: [
      { name: "Han Kim", background: "Co-Founder & CEO. Caltech (ML research). Previously scientific analyst at Morrison Foerster." },
      { name: "Angela Gao", background: "Co-Founder & CTO. PhD, Caltech. Previously developed AI models at Google Research." },
    ],
    hiring: {
      openRoles: null,
      focus: "Not yet verified — careers page not yet scraped",
      hiringProfile: "Not yet verified.",
    },
    date: d(-15),
    source: "PR Newswire, Law.com",
    sourceUrl: "https://www.prnewswire.com/news-releases/fearn-raises-5-5-million-seed-to-end-the-two-tier-patent-system-302796012.html",
  },
  {
    id: "patent-watch",
    name: "Patent Watch",
    threat: "medium",
    backing: "$2.8M seed (Y Combinator F25, FundersClub, Transpose, Blast)",
    stage: "Seed",
    tagline: "AI for patent infringement detection, claim charts, and freedom-to-operate assessments.",
    website: "https://www.patentwatch.ai",
    linkedin: "https://www.linkedin.com/company/patentwatch-ai",
    description:
      "Toronto-based Patent Watch automates infringement detection — interpreting patents, identifying competing products, and generating claim charts to support licensing, litigation, and M&A diligence workflows in roughly 20 minutes per analysis.",
    foundingTeam: [
      { name: "Alexander Stroe", background: "Co-Founder. Deep domain expertise in patent enforcement." },
      { name: "Andreas Stroe", background: "Co-Founder. Former Philips research engineer, named inventor on multiple patents." },
    ],
    hiring: {
      openRoles: null,
      focus: "Not yet verified — careers page not yet scraped",
      hiringProfile: "Not yet verified.",
    },
    date: d(-18),
    source: "Crunchbase, LegalTech.ca",
    sourceUrl: "https://legaltech.ca/2026/05/28/yc-toronto-startup-patents-revenue-ai-toolkit/",
  },
];

/* ---------------- Webinars ---------------- */
// Listings below are sample/illustrative placeholders standing in for a
// live webinar-scraping feed. Where the host maps to a real company we
// already track, its "arrow" link points at that company's real site;
// otherwise there is no live registration link yet, so none is shown.
const WEBINARS = [
  {
    id: "wb-1",
    title: "AI Patent Landscaping for Semiconductor Portfolios",
    host: "LexisNexis Cipher (sample listing)",
    date: d(6),
    time: "10:00 AM PT",
    format: "Live webinar",
    relevance: "high",
    description:
      "Vertical-specific session on landscaping methodology for semiconductor patent portfolios — direct audience overlap with our semiconductor push.",
    tags: ["Semiconductors", "Landscaping", "Competitor-hosted"],
    url: siteUrl("lexisnexisip.com"),
  },
  {
    id: "wb-2",
    title: "Practical Guide to AI-Assisted Inventorship Disclosure",
    host: "IP Strategy Network (sample)",
    date: d(2),
    time: "1:00 PM ET",
    format: "Live webinar",
    relevance: "high",
    description:
      "Panel covering the new USPTO guidance on disclosure requirements when generative AI tools are used during drafting or ideation.",
    tags: ["Regulatory", "USPTO", "AI Drafting"],
    url: null,
  },
  {
    id: "wb-3",
    title: "Modernizing Legacy IP Data Infrastructure",
    host: "Clarivate (sample listing)",
    date: d(-5),
    time: "11:00 AM ET",
    format: "Recorded / on-demand",
    relevance: "medium",
    description:
      "Multi-part series aimed at large legacy accounts evaluating whether to modernize in place or switch platforms.",
    tags: ["Competitor-hosted", "Enterprise"],
    url: "https://clarivate.com/intellectual-property/",
  },
  {
    id: "wb-4",
    title: "Benchmarking IP Department Budgets in 2026",
    host: "Anaqua (sample listing)",
    date: d(-4),
    time: "9:00 AM PT",
    format: "Recorded / on-demand",
    relevance: "medium",
    description: "Walkthrough of Anaqua's annual budget-allocation survey report for in-house IP departments.",
    tags: ["Competitor-hosted", "Benchmarking"],
    url: siteUrl("anaqua.com"),
  },
  {
    id: "wb-5",
    title: "Freedom-to-Operate Search in the Age of Embeddings",
    host: "PatentTech Forum (sample)",
    date: d(10),
    time: "8:00 AM PT",
    format: "Live webinar",
    relevance: "high",
    description: "Technical session comparing classification-based vs. embedding-based FTO search methodology.",
    tags: ["Search Technology", "FTO"],
    url: null,
  },
  {
    id: "wb-6",
    title: "Licensing & Royalty Benchmarking Roundtable",
    host: "ktMINE (sample listing)",
    date: d(14),
    time: "12:00 PM ET",
    format: "Live webinar",
    relevance: "low",
    description: "Roundtable discussion on royalty-rate benchmarking trends across licensing-heavy industries.",
    tags: ["Licensing", "Valuation"],
    url: siteUrl("ktmine.com"),
  },
  {
    id: "wb-7",
    title: "Generative Drafting Workflows for In-House Counsel",
    host: "Solve Intelligence (sample listing)",
    date: d(4),
    time: "2:00 PM ET",
    format: "Live webinar",
    relevance: "high",
    description: "Product-led session walking through end-to-end drafting workflows aimed at in-house IP counsel.",
    tags: ["Competitor-hosted", "AI Drafting"],
    url: siteUrl("solveintelligence.com"),
  },
];

// Expose to the rest of the app
window.PATLYTICS_DATA = {
  ANCHOR_DATE,
  EARLIEST_DATE,
  HIGHLIGHTS,
  COMPETITORS,
  NEW_ENTRANTS,
  WEBINARS,
};
