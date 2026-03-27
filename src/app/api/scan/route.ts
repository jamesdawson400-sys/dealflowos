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

// Map YC stage to investment-relevant stage
function mapStage(deal: WebDeal): string {
  if (deal.ycStage === "Growth") return "Growth";
  if (deal.ycStatus === "Acquired") return "Acquired";
  if (deal.teamSize > 100) return "Series B+";
  if (deal.teamSize > 30) return "Series A";
  if (deal.teamSize > 10) return "Seed";
  return "Early";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";

  if (!theme) {
    return NextResponse.json({ error: "Missing theme parameter" }, { status: 400 });
  }
  if (theme.length > 200) {
    return NextResponse.json({ error: "Theme too long (max 200 chars)" }, { status: 400 });
  }

  // 1. Fetch ONLY real, validated companies from YC Directory
  const webDeals = await fetchRealDeals(theme);
  const keywords = theme.toLowerCase().split(/[\s,;+&]+/).filter((t: string) => t.length > 1);

  // 2. Score and structure — every company is real and URL-validated
  const allDeals: ScanDeal[] = webDeals.map((wd, i) => {
    const scores = scoreWebDeal(wd, keywords);
    const pipelineStage = assignPipelineStage(scores.total);
    const status = assignStatus(scores.total);

    return {
      id: `yc-${i + 1}`,
      company: wd.name,
      sector: wd.industry || wd.subindustry || "Technology",
      stage: mapStage(wd),
      score: scores.total,
      status,
      pipelineStage,
      thesis: buildThesis(wd),
      risks: buildRisks(wd),
      founders: `Team of ${wd.teamSize || "?"}`,
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
    };
  });

  // 3. Sort by score, mark top 3
  allDeals.sort((a, b) => b.score - a.score);
  for (let i = 0; i < Math.min(3, allDeals.length); i++) {
    allDeals[i]!.isTopOpportunity = true;
  }

  // 4. Compute KPIs
  const highPriority = allDeals.filter((d) => d.score > 85).length;
  const inPartnerReview = allDeals.filter((d) => d.pipelineStage === "Partner Review").length;
  const watchlistCandidates = allDeals.filter((d) => d.score >= 70 && d.score <= 85).length;
  const kpis = {
    dealsInInbox: allDeals.length,
    highPriority,
    inPartnerReview,
    watchlistCompanies: watchlistCandidates,
  };

  // 5. Persist to SQLite
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

  // 6. Return with real IDs
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

// ── Factual thesis from YC data ──
function buildThesis(deal: WebDeal): string[] {
  const facts: string[] = [];

  // Real one-liner from YC
  if (deal.oneLiner) {
    facts.push(deal.oneLiner);
  }

  // YC batch + status
  if (deal.batch) {
    facts.push(`Y Combinator ${deal.batch}${deal.isTopCompany ? " (Top Company)" : ""}`);
  }

  // Team size
  if (deal.teamSize > 0) {
    facts.push(`Team size: ${deal.teamSize} employees`);
  }

  // Industry tags from YC
  if (deal.tags.length > 0) {
    facts.push(`YC tags: ${deal.tags.join(", ")}`);
  }

  // Location
  if (deal.location) {
    facts.push(`HQ: ${deal.location}`);
  }

  return facts;
}

// ── Factual risks from YC data ──
function buildRisks(deal: WebDeal): string[] {
  const risks: string[] = [];

  if (deal.ycStatus === "Inactive") {
    risks.push("Company status listed as Inactive on YC directory");
  }
  if (deal.ycStatus === "Acquired") {
    risks.push(`Company has been acquired — no longer independent`);
  }
  if (deal.teamSize > 0 && deal.teamSize < 5) {
    risks.push(`Very small team (${deal.teamSize} people)`);
  }

  const batchYear = parseInt(deal.batch.match(/\d{4}/)?.[0] ?? "0");
  if (batchYear > 0 && batchYear < 2020) {
    risks.push(`Older YC batch (${deal.batch}) — verify current activity`);
  }

  if (risks.length === 0) {
    risks.push("No specific risk flags from available YC data");
  }

  return risks;
}
