import { NextRequest, NextResponse } from "next/server";
import { fetchRealDeals, scoreWebDeal, type WebDeal } from "@/lib/webRetrieval";
import { insertScan, insertCompany } from "@/lib/db";
import type { ScanDeal } from "@/lib/scanEngine";

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

function mapStage(deal: WebDeal): string {
  if (deal.ycStatus === "Acquired") return "Acquired";
  if (deal.ycStage === "Growth") {
    if (deal.teamSize > 200) return "Series C+";
    if (deal.teamSize > 80) return "Series B";
    return "Series A";
  }
  if (deal.teamSize > 50) return "Series A";
  if (deal.teamSize > 15) return "Seed";
  if (deal.teamSize > 5) return "Pre-Seed";
  return "Early";
}

// ── Analyst-grade investment thesis ──
function buildThesis(deal: WebDeal, theme: string): string[] {
  const points: string[] = [];

  // 1. What they do — real one-liner
  if (deal.oneLiner) {
    points.push(deal.oneLiner);
  }

  // 2. YC signal
  if (deal.batch) {
    const topStr = deal.isTopCompany ? " — flagged as a YC Top Company" : "";
    points.push(`Y Combinator ${deal.batch}${topStr}`);
  }

  // 3. Scale signal
  if (deal.teamSize > 0) {
    const scaleLabel =
      deal.teamSize > 500 ? "large-scale organisation" :
      deal.teamSize > 100 ? "scaled team" :
      deal.teamSize > 30 ? "growth-stage team" :
      deal.teamSize > 10 ? "early-growth team" :
      "founding team";
    points.push(`${deal.teamSize}-person ${scaleLabel} — ${deal.ycStage} stage`);
  }

  // 4. Sector context
  const sectorContext = getSectorContext(deal.industry, deal.subindustry, deal.tags);
  if (sectorContext) points.push(sectorContext);

  // 5. Thematic alignment
  const themeWords = theme.split(/\s+/).filter(w => w.length > 2);
  const tagMatches = deal.tags.filter(t =>
    themeWords.some(w => t.toLowerCase().includes(w.toLowerCase()))
  );
  if (tagMatches.length > 0) {
    points.push(`Directly aligned with search theme via: ${tagMatches.join(", ")}`);
  } else if (deal.tags.length > 0) {
    points.push(`Category tags: ${deal.tags.slice(0, 4).join(", ")}`);
  }

  // 6. Status
  if (deal.ycStatus === "Active") {
    points.push("Company status: Active — currently operating");
  } else if (deal.ycStatus === "Acquired") {
    points.push("Company was acquired — potential acqui-hire or strategic exit signal for sector");
  }

  return points;
}

// ── Sector context — what makes this market interesting ──
function getSectorContext(industry: string, subindustry: string, tags: string[]): string {
  const all = [industry, subindustry, ...tags].join(" ").toLowerCase();

  if (all.includes("fintech") || all.includes("payments") || all.includes("banking")) {
    return "Fintech remains one of the largest VC categories globally — payments, lending, and embedded finance are high-velocity segments";
  }
  if (all.includes("ai") || all.includes("machine learning") || all.includes("llm")) {
    return "AI infrastructure and application layer are experiencing historic capital deployment — enterprise AI adoption is accelerating across verticals";
  }
  if (all.includes("health") || all.includes("medical") || all.includes("clinical")) {
    return "Digital health saw $29B+ in global investment — care delivery, clinical AI, and payer tech remain priority verticals";
  }
  if (all.includes("security") || all.includes("cyber") || all.includes("identity")) {
    return "Cybersecurity spending continues to grow above GDP — identity, cloud security, and threat intelligence are high-demand categories";
  }
  if (all.includes("climate") || all.includes("energy") || all.includes("carbon")) {
    return "Climate tech is attracting record sovereign and institutional capital — energy transition, carbon markets, and grid infrastructure are priority areas";
  }
  if (all.includes("saas") || all.includes("b2b") || all.includes("enterprise")) {
    return "B2B SaaS maintains strong fundamentals — vertical software, workflow automation, and AI co-pilots are current high-growth themes";
  }
  if (all.includes("devtools") || all.includes("developer") || all.includes("infrastructure")) {
    return "Developer tools and infrastructure see strong net revenue retention — bottom-up adoption with enterprise upsell is a proven GTM model";
  }
  if (all.includes("logistics") || all.includes("supply chain") || all.includes("freight")) {
    return "Supply chain tech accelerated post-COVID — real-time visibility, freight intelligence, and automation are the current investment focus";
  }
  if (all.includes("real estate") || all.includes("proptech")) {
    return "Proptech is at an inflection point — digital transaction infrastructure and data-driven underwriting are the core investment thesis";
  }
  return "";
}

// ── Data-driven risks ──
function buildRisks(deal: WebDeal): string[] {
  const risks: string[] = [];

  if (deal.ycStatus === "Inactive") {
    risks.push("Company is listed as Inactive on YC directory — verify current operational status before any engagement");
  }
  if (deal.ycStatus === "Acquired") {
    risks.push("Company has been acquired — no longer an independent investment opportunity");
  }
  if (deal.teamSize > 0 && deal.teamSize < 6) {
    risks.push(`Very small team (${deal.teamSize} people) — key-person concentration risk and limited execution capacity`);
  }

  const batchYear = parseInt(deal.batch.match(/\d{4}/)?.[0] ?? "0");
  const currentYear = new Date().getFullYear();
  const batchAge = batchYear > 0 ? currentYear - batchYear : 0;

  if (batchAge > 5) {
    risks.push(`Older YC cohort (${deal.batch}) — ${batchAge} years since batch, verify current traction and whether still relevant`);
  }
  if (batchAge >= 3 && batchAge <= 5 && deal.ycStage === "Early") {
    risks.push(`Still at Early stage ${batchAge} years post-YC — growth velocity may be lower than expected`);
  }
  if (!deal.description || deal.description.length < 50) {
    risks.push("Limited public description available — harder to assess product differentiation without further diligence");
  }

  if (risks.length === 0) {
    risks.push("No material risk flags from available YC data — full diligence required before assessment");
  }

  return risks;
}

// ── Standard VC diligence checklist ──
function buildDiligence(deal: WebDeal): string[] {
  const items = [
    `Review ${deal.name}'s current revenue, ARR, and growth rate`,
    "Map the competitive landscape — who else is solving this problem and with what differentiation",
    `Understand customer acquisition model — PLG, direct sales, or channel for ${deal.industry} sector`,
    "Validate founding team background and relevant domain expertise",
    "Request cap table and any existing term sheets or soft circles",
    `For ${deal.teamSize > 50 ? "a scaled team" : "an early-stage team"} — assess burn rate and runway to next milestone`,
  ];

  if (deal.ycStatus === "Active") {
    items.push("Confirm YC office hours / alumni network leverage being utilised");
  }
  if (deal.tags.includes("B2B") || deal.industry?.toLowerCase().includes("b2b")) {
    items.push("Review top 5 customer contracts — assess churn, NRR, and ICP clarity");
  }
  if (deal.tags.includes("API") || deal.tags.includes("Infrastructure")) {
    items.push("Assess API usage metrics, developer adoption curves, and pricing model");
  }

  return items;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";

  if (!theme) return NextResponse.json({ error: "Missing theme" }, { status: 400 });
  if (theme.length > 200) return NextResponse.json({ error: "Theme too long" }, { status: 400 });

  const webDeals = await fetchRealDeals(theme);
  const keywords = theme.toLowerCase().split(/[\s,;+&]+/).filter((t: string) => t.length > 1);

  const allDeals: ScanDeal[] = webDeals.map((wd, i) => {
    const scores = scoreWebDeal(wd, keywords);
    return {
      id: `yc-${i + 1}`,
      company: wd.name,
      sector: wd.industry || wd.subindustry || "Technology",
      stage: mapStage(wd),
      score: scores.total,
      status: assignStatus(scores.total),
      pipelineStage: assignPipelineStage(scores.total),
      thesis: buildThesis(wd, theme),
      risks: buildRisks(wd),
      diligence: buildDiligence(wd),
      founders: `Team of ${wd.teamSize || "—"}`,
      lastActivity: wd.batch || "—",
      raised: "—",
      location: wd.location || "—",
      growth: scores.growth,
      momentum: scores.momentum,
      volatility: scores.volatility,
      thematicFit: scores.thematicFit,
      isTopOpportunity: false,
      website: wd.website,
      description: wd.oneLiner || wd.description,
      sourceUrl: wd.sourceUrl,
      sourceName: wd.sourceName,
      ycData: {
        batch: wd.batch,
        teamSize: wd.teamSize,
        isTopCompany: wd.isTopCompany,
        ycStatus: wd.ycStatus,
        ycStage: wd.ycStage,
        tags: wd.tags,
        subindustry: wd.subindustry,
        logoUrl: wd.logoUrl,
        oneLiner: wd.oneLiner,
      },
    };
  });

  allDeals.sort((a, b) => b.score - a.score);
  for (let i = 0; i < Math.min(3, allDeals.length); i++) {
    allDeals[i]!.isTopOpportunity = true;
  }

  const highPriority = allDeals.filter((d) => d.score > 85).length;
  const inPartnerReview = allDeals.filter((d) => d.pipelineStage === "Partner Review").length;
  const watchlistCandidates = allDeals.filter((d) => d.score >= 70 && d.score <= 85).length;
  const kpis = {
    dealsInInbox: allDeals.length,
    highPriority,
    inPartnerReview,
    watchlistCompanies: watchlistCandidates,
  };

  const timestamp = new Date().toISOString();
  const scanId = await insertScan({ theme, timestamp, dealCount: allDeals.length, kpis });

  const companyIds: string[] = [];
  for (const deal of allDeals) {
    const cid = await insertCompany({
      scanId,
      company: deal.company,
      sector: deal.sector,
      stage: deal.stage,
      score: deal.score,
      status: deal.status,
      pipelineStage: deal.pipelineStage,
      thesis: deal.thesis,
      risks: deal.risks,
      founders: deal.founders,
      lastActivity: deal.lastActivity,
      raised: deal.raised,
      location: deal.location,
      website: deal.website,
      description: deal.description,
      sourceUrl: deal.sourceUrl,
      sourceName: deal.sourceName,
      growth: deal.growth,
      momentum: deal.momentum,
      volatility: deal.volatility,
      thematicFit: deal.thematicFit,
    });
    companyIds.push(cid);
  }

  const dealsWithIds = allDeals.map((d, i) => ({ ...d, id: companyIds[i]! }));

  return NextResponse.json({
    scanId,
    deals: dealsWithIds,
    theme,
    timestamp,
    kpis,
    webDealCount: allDeals.length,
    generatedDealCount: 0,
  });
}
