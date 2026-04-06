// ──────────────────────────────────────────────
// Deterministic Deal Scan Engine
// No LLM. No external APIs. Pure data-driven logic.
// Designed to be replaceable with real data sources later.
// ──────────────────────────────────────────────

export interface ScanDeal {
  id: string;
  company: string;
  sector: string;
  stage: string;
  score: number;
  status: string;
  pipelineStage: string;
  thesis: string[];
  risks: string[];
  diligence?: string[];
  founders: string;
  lastActivity: string;
  raised: string;
  location: string;
  growth: number;
  momentum: number;
  volatility: number;
  thematicFit: number;
  isTopOpportunity: boolean;
  website?: string;
  description?: string;
  sourceUrl?: string;
  sourceName?: string;
  ycData?: {
    batch: string;
    teamSize: number;
    isTopCompany: boolean;
    ycStatus: string;
    ycStage: string;
    tags: string[];
    subindustry: string;
    logoUrl: string;
    oneLiner: string;
  };
  memo?: string;
  scoreBreakdown?: {
    marketOpportunity: number;
    sectorGrowth: number;
    founderCredibility: number;
    fundingMomentum: number;
    productDifferentiation: number;
    total: number;
  };
}

export interface ScanResult {
  deals: ScanDeal[];
  theme: string;
  timestamp: string;
  kpis: {
    dealsInInbox: number;
    highPriority: number;
    inPartnerReview: number;
    watchlistCompanies: number;
  };
}

// ── Deterministic pseudo-random from string seed ──
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Theme parsing ──
interface ParsedTheme {
  keywords: string[];
  sectors: string[];
  stages: string[];
  locations: string[];
  raw: string;
}

const SECTOR_KEYWORDS: Record<string, string[]> = {
  ai: ["AI / ML", "Enterprise AI", "AI Infrastructure", "Applied AI"],
  fintech: ["Fintech", "Payments", "Lending", "InsurTech", "WealthTech"],
  health: ["Digital Health", "BioTech", "HealthTech", "MedTech"],
  healthcare: ["Digital Health", "BioTech", "HealthTech", "MedTech"],
  biotech: ["BioTech", "Genomics", "Drug Discovery"],
  saas: ["B2B SaaS", "Enterprise Software", "DevTools", "Vertical SaaS"],
  b2b: ["B2B SaaS", "Enterprise Software", "Infrastructure"],
  climate: ["Climate Tech", "Clean Energy", "Carbon Tech", "AgTech"],
  green: ["Climate Tech", "Clean Energy", "Sustainability"],
  energy: ["Clean Energy", "Energy Storage", "Grid Tech"],
  cyber: ["Cybersecurity", "Identity Security", "Cloud Security"],
  security: ["Cybersecurity", "Identity Security", "AppSec"],
  data: ["Data Infrastructure", "Analytics", "Data Governance"],
  infra: ["Infrastructure", "Cloud Infrastructure", "DevOps"],
  defi: ["DeFi", "Web3 Infrastructure", "Digital Assets"],
  crypto: ["Digital Assets", "Web3 Infrastructure", "DeFi"],
  web3: ["Web3 Infrastructure", "NFT Infrastructure", "DAOs"],
  robotics: ["Robotics", "Industrial Automation", "Autonomous Systems"],
  logistics: ["Logistics", "Supply Chain", "Last-Mile Delivery"],
  edtech: ["EdTech", "Workforce Development", "Learning Platforms"],
  defense: ["Defense Tech", "GovTech", "Dual-Use Tech"],
  space: ["SpaceTech", "Satellite Infrastructure", "Remote Sensing"],
  food: ["FoodTech", "AgTech", "Alternative Protein"],
  real: ["PropTech", "Real Estate Tech", "Construction Tech"],
  proptech: ["PropTech", "Real Estate Tech", "Construction Tech"],
  commerce: ["E-Commerce", "Marketplace", "Retail Tech"],
  media: ["Media Tech", "Creator Economy", "Content Infrastructure"],
  legal: ["LegalTech", "Compliance", "RegTech"],
  hr: ["HR Tech", "Talent", "Workforce Management"],
  insurance: ["InsurTech", "Risk Analytics", "Claims Automation"],
};

const STAGE_KEYWORDS: Record<string, string> = {
  "pre-seed": "Pre-Seed",
  preseed: "Pre-Seed",
  seed: "Seed",
  "series a": "Series A",
  "series b": "Series B",
  a: "Series A",
  b: "Series B",
  early: "Seed",
  growth: "Series B",
  late: "Series B",
};

const LOCATION_KEYWORDS: Record<string, string[]> = {
  nyc: ["New York, NY"],
  "new york": ["New York, NY"],
  sf: ["San Francisco, CA", "Palo Alto, CA", "Mountain View, CA"],
  "san francisco": ["San Francisco, CA", "Palo Alto, CA"],
  bay: ["San Francisco, CA", "Palo Alto, CA", "Oakland, CA"],
  la: ["Los Angeles, CA", "Santa Monica, CA"],
  "los angeles": ["Los Angeles, CA", "Santa Monica, CA"],
  boston: ["Boston, MA", "Cambridge, MA"],
  austin: ["Austin, TX"],
  seattle: ["Seattle, WA", "Bellevue, WA"],
  chicago: ["Chicago, IL"],
  miami: ["Miami, FL"],
  london: ["London, UK"],
  berlin: ["Berlin, Germany"],
  remote: ["Remote"],
};

function parseTheme(raw: string): ParsedTheme {
  const lower = raw.toLowerCase().trim();
  const tokens = lower.split(/[\s,;+&]+/).filter(Boolean);
  const sectors: string[] = [];
  const stages: string[] = [];
  const locations: string[] = [];
  const keywords: string[] = [];

  // Check multi-word matches first
  for (const [key, vals] of Object.entries(LOCATION_KEYWORDS)) {
    if (lower.includes(key)) {
      locations.push(...vals);
    }
  }
  for (const [key, val] of Object.entries(STAGE_KEYWORDS)) {
    if (lower.includes(key)) {
      stages.push(val);
    }
  }

  for (const token of tokens) {
    if (SECTOR_KEYWORDS[token]) {
      sectors.push(...SECTOR_KEYWORDS[token]);
    }
    keywords.push(token);
  }

  // If no sectors matched, derive from all keywords
  if (sectors.length === 0) {
    sectors.push("Enterprise Software", "B2B SaaS", "Applied AI");
  }
  if (stages.length === 0) {
    stages.push("Seed", "Series A");
  }
  if (locations.length === 0) {
    locations.push(
      "San Francisco, CA",
      "New York, NY",
      "Austin, TX",
      "Boston, MA",
      "Seattle, WA",
      "Chicago, IL",
      "Los Angeles, CA",
      "Denver, CO",
      "Miami, FL",
      "London, UK",
    );
  }

  return {
    keywords,
    sectors: [...new Set(sectors)],
    stages: [...new Set(stages)],
    locations: [...new Set(locations)],
    raw,
  };
}

// ── Company name generation pools ──
const PREFIXES: Record<string, string[]> = {
  "AI / ML": ["Neural", "Cortex", "Synapse", "Axiom", "Tensor", "Prism", "Helix", "Lattice"],
  "Enterprise AI": ["Luminance", "Vertex", "Opal", "Kinetic", "Beacon", "Archon", "Stratify", "Cognify"],
  "AI Infrastructure": ["Basalt", "Foundry", "Nimbus", "Forge", "Lattice", "Vector", "Stratus", "Conduit"],
  "Applied AI": ["Halo", "Mosaic", "Catalyst", "Polaris", "Apex", "Meridian", "Praxis", "Augment"],
  Fintech: ["Ledger", "Meridian", "Clearing", "Vantage", "Summit", "Harbor", "Crest", "Prism"],
  Payments: ["Relay", "Conduit", "Swift", "Nexus", "Bridge", "Arc", "Flow", "Pulse"],
  Lending: ["Ascend", "Tenor", "Yield", "Copper", "Fern", "Sequoia", "Canopy", "Branch"],
  InsurTech: ["Shield", "Haven", "Aegis", "Bastion", "Sentinel", "Garrison", "Rampart", "Citadel"],
  WealthTech: ["Estate", "Legacy", "Patrimony", "Endow", "Revere", "Sterling", "Vanguard", "Capital"],
  "Digital Health": ["Parabolic", "Meridian", "Vitalis", "Cura", "Helix", "Zenith", "Cascade", "Radiant"],
  BioTech: ["Genome", "Helix", "Strand", "Celera", "Lyra", "Novus", "Aria", "Evo"],
  HealthTech: ["Pulse", "Aura", "Beacon", "MedVault", "HealthOS", "CareNet", "VitalLink", "Remedy"],
  MedTech: ["Scalpel", "Optix", "Resonance", "Caliber", "Precision", "Clarity", "Acuity", "Luminos"],
  "B2B SaaS": ["Atlas", "Orbit", "Zenith", "Pillar", "Apex", "Keystone", "Spire", "Summit"],
  "Enterprise Software": ["Monolith", "Bastion", "Citadel", "Aegis", "Paragon", "Pinnacle", "Nexus", "Core"],
  DevTools: ["Anvil", "Forge", "Loom", "Shuttle", "Stack", "Build", "Deploy", "Cipher"],
  "Vertical SaaS": ["Niche", "Sector", "Domain", "Silo", "Craft", "Guild", "Trade", "Field"],
  "Climate Tech": ["Vantage", "Canopy", "Solaris", "Terranova", "Verdant", "Ember", "Glacier", "Tide"],
  "Clean Energy": ["Helios", "Solstice", "Voltaic", "Radiance", "Aurora", "Zenith", "Lumina", "Flux"],
  "Carbon Tech": ["Offset", "Sequester", "Capture", "Netzero", "Carbon", "Verde", "Terra", "Aire"],
  AgTech: ["Harvest", "Bloom", "Cultivar", "Terrace", "Verdure", "Sprout", "Root", "Grove"],
  Cybersecurity: ["Canopy", "Sentinel", "Obsidian", "Nightfall", "Aegis", "Bastion", "Rampart", "Cipher"],
  "Identity Security": ["Persona", "Auth", "Verity", "Trust", "Keystone", "Iris", "Gate", "Vault"],
  "Cloud Security": ["Nimbus", "Stratos", "Cirrus", "Cumulus", "Vapor", "Aether", "Nebula", "Alto"],
  AppSec: ["Guard", "Shield", "Armor", "Fortify", "Secure", "Proof", "Defend", "Patrol"],
  "Data Infrastructure": ["Stratum", "Schema", "Pipeline", "Conduit", "Reservoir", "Basin", "Delta", "Lake"],
  Analytics: ["Prism", "Lens", "Insight", "Scope", "Metric", "Signal", "Index", "Chart"],
  "Data Governance": ["Registry", "Catalog", "Atlas", "Compass", "Archive", "Ledger", "Census", "Map"],
  Infrastructure: ["Bedrock", "Foundation", "Substrate", "Core", "Base", "Platform", "Grid", "Mesh"],
  "Cloud Infrastructure": ["Nimbus", "Cumulus", "Stratos", "Alto", "Vapor", "Azure", "Cirrus", "Ether"],
  DeFi: ["Protocol", "Swap", "Yield", "Vault", "Pool", "Bridge", "Chain", "Anchor"],
  "Web3 Infrastructure": ["Block", "Node", "Chain", "Layer", "Mesh", "Link", "Hash", "Ledger"],
  "Digital Assets": ["Token", "Mint", "Vault", "Treasury", "Reserve", "Forge", "Stamp", "Mark"],
  Robotics: ["Archetype", "Kinetic", "Automata", "Servo", "Axis", "Mech", "Droid", "Bot"],
  "Industrial Automation": ["Factory", "Line", "Assembly", "Process", "Flow", "System", "Control", "Optimize"],
  "Autonomous Systems": ["Pilot", "Navigate", "Drive", "Guide", "Path", "Route", "Course", "Vector"],
  Logistics: ["Nexus", "Route", "Freight", "Cargo", "Harbor", "Transit", "Relay", "Dispatch"],
  "Supply Chain": ["Link", "Chain", "Track", "Trace", "Source", "Origin", "Supply", "Flow"],
  "Last-Mile Delivery": ["Doorstep", "Local", "Swift", "Dash", "Sprint", "Quick", "Instant", "Near"],
  EdTech: ["Clearpath", "Academy", "Scholar", "Campus", "Syllabus", "Lecture", "Mentor", "Tutor"],
  "Workforce Development": ["Upskill", "Talent", "Career", "Path", "Grow", "Evolve", "Level", "Skill"],
  "Learning Platforms": ["Course", "Module", "Lesson", "Study", "Learn", "Teach", "Train", "Coach"],
  "Defense Tech": ["Paladin", "Aegis", "Spectra", "Vanguard", "Recon", "Sentinel", "Atlas", "Shield"],
  GovTech: ["Civic", "Public", "Federal", "State", "Bureau", "Agency", "Office", "Council"],
  "Dual-Use Tech": ["Omni", "Dual", "Flex", "Adapt", "Multi", "Cross", "Bridge", "Pivot"],
  SpaceTech: ["Orbit", "Stellar", "Nova", "Cosmos", "Astral", "Lunar", "Solar", "Star"],
  "Satellite Infrastructure": ["Sat", "Relay", "Beacon", "Signal", "Antenna", "Link", "Array", "Tower"],
  "Remote Sensing": ["Spectra", "Image", "Scan", "Survey", "Map", "View", "Observe", "Detect"],
  FoodTech: ["Harvest", "Plate", "Kitchen", "Taste", "Nourish", "Feed", "Grain", "Meal"],
  "Alternative Protein": ["Protein", "Cell", "Culture", "Green", "Plant", "Bio", "Lab", "Grow"],
  PropTech: ["Dwelling", "Estate", "Lot", "Parcel", "Block", "Tower", "Roof", "Foundation"],
  "Real Estate Tech": ["Realty", "Property", "Land", "Home", "Space", "Place", "Site", "Locale"],
  "Construction Tech": ["Build", "Frame", "Structure", "Construct", "Crane", "Beam", "Layer", "Form"],
  "E-Commerce": ["Cart", "Shop", "Market", "Store", "Bazaar", "Trade", "Deal", "Buy"],
  Marketplace: ["Hub", "Exchange", "Forum", "Agora", "Plaza", "Center", "Depot", "Port"],
  "Retail Tech": ["Shelf", "Aisle", "Counter", "Register", "Display", "Front", "Window", "Floor"],
  "Media Tech": ["Stream", "Cast", "Channel", "Signal", "Broadcast", "Feed", "Reel", "Frame"],
  "Creator Economy": ["Create", "Studio", "Canvas", "Palette", "Brush", "Design", "Craft", "Make"],
  "Content Infrastructure": ["Publish", "Archive", "Library", "Index", "Catalog", "Vault", "Store", "Base"],
  LegalTech: ["Brief", "Clause", "Contract", "Verdict", "Counsel", "Justice", "Law", "Court"],
  Compliance: ["Comply", "Audit", "Check", "Verify", "Assure", "Certify", "Attest", "Review"],
  RegTech: ["Forge", "Regulate", "Monitor", "Report", "Track", "File", "Submit", "Govern"],
  "HR Tech": ["People", "Team", "Hire", "Talent", "Staff", "Recruit", "Engage", "Retain"],
  Talent: ["Scout", "Match", "Find", "Source", "Select", "Screen", "Assess", "Rank"],
  "Workforce Management": ["Shift", "Schedule", "Clock", "Time", "Plan", "Roster", "Assign", "Deploy"],
  "Risk Analytics": ["Risk", "Peril", "Hazard", "Exposure", "Threat", "Danger", "Chance", "Odds"],
  "Claims Automation": ["Claim", "File", "Process", "Settle", "Resolve", "Adjust", "Pay", "Clear"],
  Genomics: ["Gene", "Helix", "Strand", "Code", "Sequence", "Map", "Read", "Edit"],
  "Drug Discovery": ["Pharma", "Compound", "Molecule", "Target", "Screen", "Assay", "Trial", "Dose"],
  "Energy Storage": ["Battery", "Cell", "Store", "Charge", "Power", "Watt", "Amp", "Volt"],
  "Grid Tech": ["Grid", "Meter", "Switch", "Transformer", "Wire", "Cable", "Line", "Network"],
  "NFT Infrastructure": ["Mint", "Token", "Asset", "Collection", "Gallery", "Vault", "Registry", "Forge"],
  DAOs: ["Govern", "Vote", "Propose", "Council", "Assembly", "Forum", "Senate", "Guild"],
  Sustainability: ["Green", "Eco", "Sustain", "Renew", "Cycle", "Conserve", "Preserve", "Restore"],
};

const SUFFIXES = [
  "AI", "Labs", "Systems", "Tech", "HQ", "Cloud", "Data", "io",
  "Works", "Logic", "Base", "Net", "OS", "Hub", "Stack", "Core",
  "X", "Up", "Fy", "", "", "", "", "",
];

const FOUNDER_FIRST = [
  "Sarah", "Marcus", "Priya", "Tom", "James", "Anna", "Raj", "Elena",
  "Alex", "Yuki", "David", "Lisa", "Nina", "Kevin", "Michael", "Aisha",
  "Ryan", "Sophie", "Maria", "Daniel", "Wei", "Fatima", "Carlos", "Anya",
  "Obi", "Sven", "Mei", "Hassan", "Laura", "Viktor", "Zara", "Noah",
];

const FOUNDER_LAST = [
  "Chen", "Webb", "Anand", "Fischer", "Liu", "Kowalski", "Patel", "Vasquez",
  "Drummond", "Tanaka", "Park", "Chang", "Okafor", "Zhang", "Torres", "Rahman",
  "Kim", "Laurent", "Santos", "Wright", "Nakamura", "Al-Rashid", "Morales", "Petrov",
  "Okonkwo", "Lindqvist", "Huang", "Abboud", "Reeves", "Volkov", "Osei", "Berg",
];

const FOUNDER_ROLES = [
  "ex-Google", "ex-Meta", "ex-Stripe", "ex-Databricks", "ex-Palantir",
  "ex-Coinbase", "ex-Shopify", "ex-Uber", "ex-Airbnb", "ex-Amazon",
  "Stanford CS", "MIT CSAIL", "CMU Robotics", "Harvard Business",
  "ex-McKinsey", "ex-Goldman Sachs", "ex-a16z", "ex-Sequoia",
  "ex-YC Founder", "ex-CTO at Series C startup", "PhD Stanford",
  "ex-Apple", "ex-Microsoft", "ex-Netflix", "ex-SpaceX", "ex-Twilio",
];

const LOCATIONS_POOL = [
  "San Francisco, CA", "New York, NY", "Austin, TX", "Boston, MA",
  "Seattle, WA", "Chicago, IL", "Los Angeles, CA", "Denver, CO",
  "Miami, FL", "Palo Alto, CA", "Cambridge, MA", "Pittsburgh, PA",
  "Nashville, TN", "Salt Lake City, UT", "Atlanta, GA", "Portland, OR",
  "London, UK", "Berlin, Germany", "Toronto, Canada", "Tel Aviv, Israel",
];

const RAISE_AMOUNTS = [
  "$500K Friends & Family", "$750K Pre-Seed", "$1.2M Pre-Seed", "$1.8M Pre-Seed",
  "$2M Pre-Seed", "$2.5M Seed", "$3M Seed", "$3.5M Seed", "$4M Seed",
  "$5M Seed", "$6M Seed", "$8M Seed", "$10M Series A", "$12M Series A",
  "$15M Series A", "$18M Series A", "$22M Series A", "$30M Series B",
];

// ── Thesis & risk generation templates ──
const GROWTH_THESES = [
  "Revenue growing {pct}% MoM with strong unit economics",
  "{pct}% quarter-over-quarter user growth with low CAC",
  "Net revenue retention of {nrr}%, indicating strong product-market fit",
  "Customer base expanded {pct}% in last 6 months organically",
  "ARR reached ${arr}K with healthy {pct}% gross margins",
];

const MOMENTUM_THESES = [
  "Strong tailwind from {trend} adoption across enterprise",
  "Regulatory changes in {sector} creating new demand",
  "Market timing aligned with {trend} maturation cycle",
  "Category-defining positioning in emerging {sector} space",
  "Strategic partnerships with {n} Fortune 500 companies",
];

const FIT_THESES = [
  "Directly aligned with {theme} investment thesis",
  "Core technology maps to {sector} transformation",
  "Team background perfectly suited for {sector} disruption",
  "Product addresses critical gap in {sector} infrastructure",
];

const RISK_TEMPLATES = [
  "Early-stage with limited revenue traction",
  "Competitive market with well-funded incumbents",
  "High burn rate relative to current ARR",
  "Regulatory uncertainty in {sector}",
  "Key-person dependency on founding team",
  "Long enterprise sales cycles may slow growth",
  "Technology risk in core product differentiation",
  "Market timing risk — category may be too early",
  "Customer concentration in top 3 accounts",
  "Capital-intensive go-to-market strategy",
  "Open-source alternatives could commoditize core offering",
  "Platform risk from major cloud providers",
  "Geographic concentration limits addressable market",
  "Integration complexity may increase churn",
];

// ── Score computation ──
function computeScore(growth: number, momentum: number, volatility: number, thematicFit: number): number {
  const raw = 0.4 * growth + 0.3 * momentum - 0.2 * volatility + 0.1 * thematicFit;
  return Math.max(15, Math.min(98, Math.round(raw)));
}

function assignPipelineStage(score: number): string {
  if (score > 80) return "Partner Review";
  if (score >= 60) return "First Pass";
  if (score >= 40) return "Reviewing";
  return "Pass";
}

function assignStatus(score: number): string {
  if (score > 85) return "High Priority";
  if (score > 70) return "In Review";
  if (score > 50) return "Reviewing";
  return "Pass";
}

// ── Main scan function ──
export function runScan(theme: string): ScanResult {
  const parsed = parseTheme(theme);
  const seed = hashCode(theme.toLowerCase().trim());
  const rand = seededRandom(seed);

  const numDeals = 8 + Math.floor(rand() * 5); // 8–12 deals
  const deals: ScanDeal[] = [];

  for (let i = 0; i < numDeals; i++) {
    const dealSeed = seed + i * 7919; // distinct per deal
    const r = seededRandom(dealSeed);

    // Pick sector
    const sectorIdx = Math.floor(r() * parsed.sectors.length);
    const sector = parsed.sectors[sectorIdx];

    // Pick stage
    const stageIdx = Math.floor(r() * parsed.stages.length);
    const stage = parsed.stages[stageIdx];

    // Generate company name
    const prefixPool = PREFIXES[sector] || PREFIXES["Enterprise Software"]!;
    const prefix = prefixPool[Math.floor(r() * prefixPool.length)]!;
    const suffix = SUFFIXES[Math.floor(r() * SUFFIXES.length)]!;
    const company = suffix ? `${prefix} ${suffix}` : prefix;

    // Location
    const locPool = parsed.locations.length > 0 ? parsed.locations : LOCATIONS_POOL;
    const location = locPool[Math.floor(r() * locPool.length)]!;

    // Generate proxies (0–100)
    const growth = 30 + Math.floor(r() * 70);
    const momentum = 25 + Math.floor(r() * 70);
    const volatility = 10 + Math.floor(r() * 60);
    const thematicFit = 40 + Math.floor(r() * 60);

    const score = computeScore(growth, momentum, volatility, thematicFit);
    const pipelineStage = assignPipelineStage(score);
    const status = assignStatus(score);

    // Founders
    const f1First = FOUNDER_FIRST[Math.floor(r() * FOUNDER_FIRST.length)]!;
    const f1Last = FOUNDER_LAST[Math.floor(r() * FOUNDER_LAST.length)]!;
    const f1Role = FOUNDER_ROLES[Math.floor(r() * FOUNDER_ROLES.length)]!;
    const f2First = FOUNDER_FIRST[Math.floor(r() * FOUNDER_FIRST.length)]!;
    const f2Last = FOUNDER_LAST[Math.floor(r() * FOUNDER_LAST.length)]!;
    const f2Role = FOUNDER_ROLES[Math.floor(r() * FOUNDER_ROLES.length)]!;
    const founders = `${f1First} ${f1Last} (${f1Role}), ${f2First} ${f2Last} (${f2Role})`;

    // Raised
    const stageRaiseMap: Record<string, number[]> = {
      "Pre-Seed": [0, 4],
      Seed: [3, 11],
      "Series A": [9, 16],
      "Series B": [15, 17],
    };
    const raiseRange = stageRaiseMap[stage] || [3, 11];
    const raiseIdx = raiseRange[0]! + Math.floor(r() * (raiseRange[1]! - raiseRange[0]! + 1));
    const raised = RAISE_AMOUNTS[Math.min(raiseIdx, RAISE_AMOUNTS.length - 1)]!;

    // Thesis generation
    const thesis: string[] = [];
    const growthT = GROWTH_THESES[Math.floor(r() * GROWTH_THESES.length)]!
      .replace("{pct}", String(15 + Math.floor(r() * 40)))
      .replace("{nrr}", String(120 + Math.floor(r() * 60)))
      .replace("{arr}", String(100 + Math.floor(r() * 900)));
    thesis.push(growthT);

    const momentumT = MOMENTUM_THESES[Math.floor(r() * MOMENTUM_THESES.length)]!
      .replace("{trend}", parsed.keywords[0] || "technology")
      .replace("{sector}", sector)
      .replace("{n}", String(2 + Math.floor(r() * 6)));
    thesis.push(momentumT);

    const fitT = FIT_THESES[Math.floor(r() * FIT_THESES.length)]!
      .replace("{theme}", parsed.raw)
      .replace("{sector}", sector);
    thesis.push(fitT);

    // Risks
    const riskCount = 2 + Math.floor(r() * 2);
    const risks: string[] = [];
    const usedRiskIdx = new Set<number>();
    for (let ri = 0; ri < riskCount; ri++) {
      let idx = Math.floor(r() * RISK_TEMPLATES.length);
      while (usedRiskIdx.has(idx)) idx = (idx + 1) % RISK_TEMPLATES.length;
      usedRiskIdx.add(idx);
      risks.push(RISK_TEMPLATES[idx]!.replace("{sector}", sector));
    }

    // Last activity
    const activityTimes = ["1h ago", "2h ago", "4h ago", "6h ago", "8h ago", "12h ago", "1d ago"];
    const lastActivity = activityTimes[Math.floor(r() * activityTimes.length)]!;

    deals.push({
      id: `scan-${i + 1}`,
      company,
      sector,
      stage,
      score,
      status,
      pipelineStage,
      thesis,
      risks,
      founders,
      lastActivity,
      raised,
      location,
      growth,
      momentum,
      volatility,
      thematicFit,
      isTopOpportunity: false,
    });
  }

  // Sort by score descending
  deals.sort((a, b) => b.score - a.score);

  // Mark top 3
  for (let i = 0; i < Math.min(3, deals.length); i++) {
    deals[i]!.isTopOpportunity = true;
  }

  // Compute KPIs
  const highPriority = deals.filter((d) => d.score > 85).length;
  const inPartnerReview = deals.filter((d) => d.pipelineStage === "Partner Review").length;
  const watchlistCandidates = deals.filter((d) => d.score >= 70 && d.score <= 85).length;

  return {
    deals,
    theme: parsed.raw,
    timestamp: new Date().toISOString(),
    kpis: {
      dealsInInbox: deals.length,
      highPriority,
      inPartnerReview,
      watchlistCompanies: watchlistCandidates,
    },
  };
}
