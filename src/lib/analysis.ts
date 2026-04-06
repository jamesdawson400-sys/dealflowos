// ──────────────────────────────────────────────────────────────────────────────
// Investment Analysis Engine
// Deterministic, no AI calls. Ported from the VC Deal Sourcing Agent scoring
// and memo generator, adapted to work with real YC Directory data.
// ──────────────────────────────────────────────────────────────────────────────

import type { WebDeal } from "./webRetrieval";

// ── Sector growth multipliers ─────────────────────────────────────────────────
const SECTOR_GROWTH: Record<string, number> = {
  "ai": 1.0, "artificial intelligence": 1.0, "machine learning": 0.95,
  "infrastructure": 0.85, "ai infrastructure": 1.0,
  "developer tools": 0.85, "devtools": 0.85,
  "climate": 0.90, "climate tech": 0.90, "cleantech": 0.90,
  "fintech": 0.80, "financial technology": 0.80, "payments": 0.80,
  "health": 0.80, "healthtech": 0.80, "biotech": 0.75, "digital health": 0.80,
  "cybersecurity": 0.85, "security": 0.85,
  "saas": 0.80, "b2b": 0.78, "enterprise software": 0.75,
  "robotics": 0.80, "logistics": 0.72,
  "marketplace": 0.70, "marketplaces": 0.70,
  "space": 0.70, "spacetech": 0.70,
  "crypto": 0.55, "web3": 0.55, "blockchain": 0.55,
  "ecommerce": 0.60, "consumer": 0.55,
  "edtech": 0.60, "media": 0.50, "gaming": 0.60,
  "regtech": 0.72, "legaltech": 0.68, "proptech": 0.65,
};

// ── Funding stage → momentum score ────────────────────────────────────────────
const FUNDING_MOMENTUM: Record<string, number> = {
  "pre-seed": 8, "early": 9, "seed": 12,
  "series a": 16, "series b": 18, "series c": 20,
  "series c+": 19, "series d+": 19, "growth": 18,
  "public": 15, "acquired": 14, "unknown": 5,
};

// ── Differentiation keywords ──────────────────────────────────────────────────
const DIFFERENTIATOR_KEYWORDS = [
  "proprietary", "patented", "first", "only", "unique", "novel", "breakthrough",
  "10x", "rethinking", "reimagining", "foundational", "platform",
  "moat", "network effect", "data advantage", "vertical", "native",
  "fastest", "largest", "leading", "world's first", "open source",
];

// ── Market context paragraphs (sector-specific) ───────────────────────────────
const MARKET_CONTEXT: Record<string, string> = {
  ai: "The artificial intelligence software market is undergoing a generational expansion, with estimates projecting $500B+ in annual spend by 2030 driven by enterprise adoption of foundation models, AI infrastructure, and automation tooling. Capital deployment has been unprecedented, with AI startups raising over $50B globally in 2023 alone.",
  developer: "Developer tooling represents a durable and expanding market as software engineering teams grow globally and developer productivity becomes a strategic priority. The shift to cloud-native development, platform engineering, and AI-assisted coding is creating new categories and displacing legacy vendors.",
  climate: "The global energy transition represents one of the largest capital reallocation events in history, estimated at $5T+ in annual investment required by 2030. Policy tailwinds including the US Inflation Reduction Act and EU Green Deal are accelerating commercial deployment across carbon removal, clean energy, and industrial decarbonisation.",
  fintech: "Financial technology continues to disrupt a $20T+ global financial services industry. Enterprise adoption of embedded finance, automated spend management, and API-driven banking infrastructure is growing rapidly, aided by open banking regulation globally.",
  health: "Digital health and AI-assisted clinical tools are addressing a $4T+ US healthcare market burdened by administrative inefficiency and physician burnout. Regulatory progress on AI medical device clearance and EHR interoperability is lowering adoption barriers for software solutions.",
  security: "Cybersecurity spend is growing at 12–15% annually, driven by expanding attack surfaces in cloud infrastructure, AI-generated phishing, and regulatory requirements. Enterprise security budgets are consolidating around platform vendors, creating opportunity for comprehensive, identity-first platforms.",
  robotics: "Robotics and physical automation is entering an inflection point, enabled by advances in embodied AI, lower sensor costs, and acute labour shortages across logistics, manufacturing, and warehousing. The market for general-purpose robots could exceed $1T in annual revenue within a decade.",
  marketplace: "B2B and vertical marketplaces continue to capture share from fragmented, relationship-driven industries. Successful marketplace businesses benefit from compounding network effects and can achieve high take rates and strong retention once liquidity is established on both sides.",
  saas: "B2B SaaS maintains strong fundamentals with predictable recurring revenue, high gross margins, and compounding net revenue retention. Vertical software, workflow automation, and AI co-pilots are the current high-growth themes within the category.",
  logistics: "Supply chain technology accelerated post-COVID as shippers prioritised resilience over efficiency. Real-time visibility, freight intelligence, and autonomous fulfillment are the core investment focus, with incumbents at risk of disruption from data-native challengers.",
  default: "This sector is experiencing meaningful investment activity and commercial traction. The total addressable market is substantial, and early indicators suggest structural tailwinds supporting sustained growth in the category.",
};

// ── Stage context sentences ───────────────────────────────────────────────────
const STAGE_SENTENCES: Record<string, string> = {
  "pre-seed": "The company is at the earliest stage of development, with product and market assumptions still being validated.",
  "early": "The company is at the earliest stage of development, with product and market assumptions still being validated.",
  "seed": "The company has completed initial product development and is beginning to validate product-market fit with early customers.",
  "series a": "The company has demonstrated initial product-market fit and is scaling go-to-market. Key metrics are beginning to emerge.",
  "series b": "The company has validated its core go-to-market motion and is scaling revenue and operations. Unit economics are becoming clearer.",
  "series c": "The company is a proven growth-stage business scaling into new markets or segments. Revenue and retention metrics should be strong.",
  "series c+": "The company is a late-stage growth business, likely with significant revenue scale and a clear path to liquidity.",
  "series d+": "The company is a late-stage growth business, likely with significant revenue scale and a clear path to liquidity.",
  "growth": "The company is a scaled growth-stage business with demonstrated commercial traction and a path toward liquidity.",
  "public": "The company is publicly listed, providing transparent financial disclosure and an established market valuation.",
  "acquired": "The company has been acquired, providing validation of its technology or market position.",
};

// ── Data confidence ───────────────────────────────────────────────────────────
function dataConfidence(deal: WebDeal): "HIGH" | "MEDIUM" | "LOW" {
  let score = 0;
  if (deal.description && deal.description.length > 80) score++;
  if (deal.oneLiner && deal.oneLiner.length > 20) score++;
  if (deal.teamSize > 0) score++;
  if (deal.batch) score++;
  if (deal.tags.length >= 3) score++;
  if (deal.isTopCompany) score++;
  if (score >= 5) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

// ── Score breakdown ───────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  marketOpportunity: number;   // 0–25
  sectorGrowth: number;        // 0–20
  founderCredibility: number;  // 0–20
  fundingMomentum: number;     // 0–20
  productDifferentiation: number; // 0–15
  total: number;               // 0–100
}

export function computeScoreBreakdown(deal: WebDeal, stage: string): ScoreBreakdown {
  const desc = (deal.description + " " + deal.oneLiner).toLowerCase();
  const tags = deal.tags.join(" ").toLowerCase();
  const corpus = desc + " " + tags + " " + deal.industry.toLowerCase() + " " + deal.subindustry.toLowerCase();

  // 1. Market Opportunity (0–25)
  let market = 10;
  if (/\$[0-9]+[tb]/i.test(corpus) || /trillion|billion/i.test(corpus)) market += 10;
  else if (/million/i.test(corpus)) market += 5;
  if (/saas|enterprise|platform|b2b/i.test(corpus)) market += 5;
  market = Math.min(25, market);

  // 2. Sector Growth (0–20)
  const sectorKey = (deal.industry + " " + deal.subindustry).toLowerCase();
  let sectorMult = 0.50;
  for (const [key, val] of Object.entries(SECTOR_GROWTH)) {
    if (sectorKey.includes(key) || tags.includes(key)) {
      sectorMult = Math.max(sectorMult, val);
    }
  }
  const sectorGrowth = Math.round(sectorMult * 20 * 10) / 10;

  // 3. Founder Credibility (0–20)
  // Use YC signals as proxy (no direct founder data from API)
  let founder = 5;
  if (deal.isTopCompany) founder += 8;         // Top company = credible team
  if (deal.ycStatus === "Active" && deal.ycStage === "Growth") founder += 4;
  if (/yc|y combinator|ycombinator/i.test(corpus)) founder += 3;
  // YC itself is a credibility signal — all companies get base 5
  const batchYear = parseInt(deal.batch.match(/\d{4}/)?.[0] ?? "0");
  if (batchYear >= 2020) founder = Math.min(20, founder + 2); // Recent batch = active vetting
  founder = Math.min(20, founder);

  // 4. Funding Momentum (0–20)
  const stageLower = stage.toLowerCase();
  let fundingBase = FUNDING_MOMENTUM[stageLower] ?? 5;
  if (deal.isTopCompany) fundingBase = Math.min(20, fundingBase + 3);
  // Batch recency = recent fundraising signal
  const currentYear = new Date().getFullYear();
  const batchAge = batchYear > 0 ? currentYear - batchYear : 10;
  if (batchAge <= 1) fundingBase = Math.min(20, fundingBase + 2);
  const fundingMomentum = Math.min(20, fundingBase);

  // 5. Product Differentiation (0–15)
  let diff = 3;
  const hits = DIFFERENTIATOR_KEYWORDS.filter(kw => corpus.includes(kw)).length;
  diff += Math.min(hits * 2, 10);
  const confidence = dataConfidence(deal);
  if (confidence === "HIGH") diff += 2;
  else if (confidence === "MEDIUM") diff += 1;
  diff = Math.min(15, diff);

  const total = Math.round((market + sectorGrowth + founder + fundingMomentum + diff) * 10) / 10;

  return {
    marketOpportunity: Math.round(market * 10) / 10,
    sectorGrowth: Math.round(sectorGrowth * 10) / 10,
    founderCredibility: Math.round(founder * 10) / 10,
    fundingMomentum: Math.round(fundingMomentum * 10) / 10,
    productDifferentiation: Math.round(diff * 10) / 10,
    total: Math.min(100, total),
  };
}

// ── Market context ────────────────────────────────────────────────────────────
function getMarketContext(industry: string, tags: string[]): string {
  const lower = (industry + " " + tags.join(" ")).toLowerCase();
  for (const [key, text] of Object.entries(MARKET_CONTEXT)) {
    if (key !== "default" && lower.includes(key)) return text;
  }
  return MARKET_CONTEXT.default!;
}

// ── Score conviction label ────────────────────────────────────────────────────
function convictionLabel(score: number): string {
  if (score >= 75) return "strong conviction";
  if (score >= 60) return "above-average conviction";
  if (score >= 45) return "moderate conviction";
  return "early-stage";
}

// ── Why interesting bullets ───────────────────────────────────────────────────
function buildInterestingSignals(deal: WebDeal, theme: string): string[] {
  const signals: string[] = [];

  // What they do
  if (deal.oneLiner) {
    signals.push(`**Product:** ${deal.oneLiner}`);
  }

  // YC signal
  if (deal.batch) {
    signals.push(`**Backing:** Y Combinator ${deal.batch}${deal.isTopCompany ? " — listed as a YC Top Company, indicating above-average cohort performance" : ""}`);
  }

  // Team scale
  if (deal.teamSize > 0) {
    const label =
      deal.teamSize > 200 ? "indicating a scaled organisation with significant operational capacity" :
      deal.teamSize > 50 ? "suggesting successful Series A–B scale" :
      deal.teamSize > 15 ? "consistent with post-seed or Series A growth" :
      "at an early stage with lean founding team structure";
    signals.push(`**Team:** ${deal.teamSize} people — ${label}`);
  }

  // Theme alignment
  const themeWords = theme.split(/\s+/).filter(w => w.length > 2);
  const tagMatches = deal.tags.filter(t =>
    themeWords.some(w => t.toLowerCase().includes(w.toLowerCase()))
  );
  if (tagMatches.length > 0) {
    signals.push(`**Theme alignment:** Directly relevant to "${theme}" via ${tagMatches.join(", ")}`);
  }

  // Sector
  if (deal.subindustry && deal.subindustry !== deal.industry) {
    signals.push(`**Vertical:** ${deal.subindustry} — a sub-sector with targeted competitive dynamics`);
  }

  // Status
  if (deal.ycStatus === "Active") {
    signals.push("**Status:** Active and operating — confirmed via YC public directory");
  }

  if (signals.length === 0) {
    signals.push("Specific commercial traction signals are not yet publicly available. Independent diligence is required.");
  }

  return signals;
}

// ── Thesis paragraph ──────────────────────────────────────────────────────────
function buildThesisParagraph(deal: WebDeal, stage: string, score: number): string {
  const conviction = convictionLabel(score);
  const sector = deal.industry || "technology";
  const stageLower = stage.toLowerCase();

  let stageClause =
    stageLower.includes("series a") || stageLower.includes("series b")
      ? "at an inflection point between product validation and scaled growth"
      : stageLower.includes("series c") || stageLower.includes("growth")
        ? "at growth scale with demonstrated commercial traction"
        : stageLower.includes("seed") || stageLower.includes("pre-seed") || stageLower.includes("early")
          ? "at early stage with significant de-risking still ahead"
          : "at its current stage of development";

  const diffClause = deal.oneLiner
    ? `with a product centred on ${deal.oneLiner.toLowerCase().replace(/\.$/, "")}`
    : "operating in an attractive and growing market";

  return (
    `${deal.name} represents a **${conviction}** opportunity in ${sector}, ` +
    `${diffClause}, ${stageClause}. ` +
    `An investment thesis would centre on the company's ability to maintain its competitive position ` +
    `and convert early momentum into durable, scaled revenue. ` +
    `Further diligence on financials, customer retention, and competitive dynamics is recommended before forming a final view.`
  );
}

// ── Risk bullets ──────────────────────────────────────────────────────────────
function buildRiskBullets(deal: WebDeal, stage: string): string[] {
  const risks: string[] = [];
  const batchYear = parseInt(deal.batch.match(/\d{4}/)?.[0] ?? "0");
  const currentYear = new Date().getFullYear();
  const batchAge = batchYear > 0 ? currentYear - batchYear : 0;

  if (deal.ycStatus === "Inactive") {
    risks.push("Company is listed as Inactive on YC directory — verify current operational status before any engagement");
  }
  if (deal.ycStatus === "Acquired") {
    risks.push("Company has been acquired — no longer an independent investment opportunity");
  }
  if (deal.teamSize > 0 && deal.teamSize < 6) {
    risks.push(`Very small team (${deal.teamSize} people) — key-person concentration risk and limited execution bandwidth`);
  }
  if (batchAge > 5) {
    risks.push(`Older YC cohort (${deal.batch}) — ${batchAge} years since batch; verify current traction and whether commercial momentum has been maintained`);
  }
  if (batchAge >= 3 && deal.ycStage === "Early") {
    risks.push(`Still at Early stage ${batchAge} years post-YC — growth velocity may be below expected trajectory`);
  }

  // Generic risks always appended
  risks.push("Limited public financial data available; further diligence required to assess revenue scale and unit economics");
  risks.push("Competitive dynamics in the sector are intensifying; incumbent response and new entrant activity warrant monitoring");
  if (stage.toLowerCase().includes("early") || stage.toLowerCase().includes("seed")) {
    risks.push("Macro environment uncertainty could affect funding access and enterprise customer procurement timelines");
  }

  return risks;
}

// ── Full investment memo (markdown) ──────────────────────────────────────────
export function generateMemo(deal: WebDeal, stage: string, score: ScoreBreakdown, theme: string): string {
  const confidence = dataConfidence(deal);
  const stageSentence = STAGE_SENTENCES[stage.toLowerCase()] ?? STAGE_SENTENCES["unknown"] ?? "";
  const marketContext = getMarketContext(deal.industry, deal.tags);
  const interestingSignals = buildInterestingSignals(deal, theme);
  const thesis = buildThesisParagraph(deal, stage, score.total);
  const risks = buildRiskBullets(deal, stage);
  const websiteNote = deal.website ? ` · [${deal.website.replace(/^https?:\/\//, "")}](${deal.website})` : "";
  const location = deal.location ? `, headquartered in ${deal.location}` : "";
  const batchNote = deal.batch ? ` (Y Combinator ${deal.batch})` : "";

  const interestingMd = interestingSignals.map(s => `- ${s}`).join("\n");
  const risksMd = risks.map(r => `- ${r}`).join("\n");

  return `## Company Overview

**${deal.name}** is a ${deal.industry || "technology"} company${location}${batchNote}.${websiteNote}

${deal.description || deal.oneLiner || "No description is publicly available."}

${stageSentence} Funding stage: **${stage}**.

---

## Market Opportunity

${marketContext}

---

## Why This Company May Be Interesting

${interestingMd}

---

## Key Risks

${risksMd}

---

## Potential Investment Thesis

${thesis}

---

*Composite Score: **${score.total.toFixed(0)} / 100** · Market: ${score.marketOpportunity}/25 · Sector Growth: ${score.sectorGrowth}/20 · Founders: ${score.founderCredibility}/20 · Funding: ${score.fundingMomentum}/20 · Product: ${score.productDifferentiation}/15*

*Data Confidence: **${confidence}** — This memo is generated from publicly available YC Directory information. Figures should be independently verified prior to any investment decision.*`;
}
