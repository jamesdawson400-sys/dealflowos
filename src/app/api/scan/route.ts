import { NextRequest, NextResponse } from "next/server";
import { fetchRealDeals, type WebDeal } from "@/lib/webRetrieval";
import { computeScoreBreakdown, generateMemo, type ScoreBreakdown } from "@/lib/analysis";
import { insertScan, insertCompany } from "@/lib/db";
import type { ScanDeal } from "@/lib/scanEngine";

function mapStage(deal: WebDeal): string {
  if (deal.ycStatus === "Acquired") return "Acquired";
  if (deal.ycStage === "Growth") {
    if (deal.teamSize > 200) return "Series C+";
    if (deal.teamSize > 80) return "Series B";
    return "Series A";
  }
  if (deal.teamSize > 100) return "Series B";
  if (deal.teamSize > 40) return "Series A";
  if (deal.teamSize > 12) return "Seed";
  if (deal.teamSize > 4) return "Pre-Seed";
  return "Early";
}

function assignStatus(score: number): string {
  if (score >= 75) return "High Priority";
  if (score >= 60) return "In Review";
  if (score >= 45) return "Reviewing";
  return "Pass";
}

function assignPipelineStage(score: number): string {
  if (score >= 75) return "Partner Review";
  if (score >= 60) return "First Pass";
  if (score >= 40) return "Reviewing";
  return "Pass";
}

function buildThesisBullets(deal: WebDeal, breakdown: ScoreBreakdown, theme: string): string[] {
  const bullets: string[] = [];
  if (deal.oneLiner) bullets.push(deal.oneLiner);
  if (deal.batch) bullets.push(`Y Combinator ${deal.batch}${deal.isTopCompany ? " — Top Company" : ""}`);
  if (deal.teamSize > 0) bullets.push(`Team of ${deal.teamSize} · ${deal.ycStage} stage`);
  const themeWords = theme.split(/\s+/).filter(w => w.length > 2);
  const tagMatches = deal.tags.filter(t => themeWords.some(w => t.toLowerCase().includes(w.toLowerCase())));
  if (tagMatches.length > 0) bullets.push(`Theme alignment: ${tagMatches.join(", ")}`);
  else if (deal.tags.length > 0) bullets.push(`Categories: ${deal.tags.slice(0, 4).join(", ")}`);
  if (deal.location) bullets.push(`HQ: ${deal.location}`);
  return bullets;
}

function buildRiskBullets(deal: WebDeal): string[] {
  const risks: string[] = [];
  if (deal.ycStatus === "Inactive") risks.push("Listed as Inactive on YC directory — verify current operational status");
  if (deal.ycStatus === "Acquired") risks.push("Company has been acquired — no longer an independent opportunity");
  if (deal.teamSize > 0 && deal.teamSize < 6) risks.push(`Very small team (${deal.teamSize}) — key-person concentration risk`);
  const batchYear = parseInt(deal.batch.match(/\d{4}/)?.[0] ?? "0");
  const age = batchYear > 0 ? new Date().getFullYear() - batchYear : 0;
  if (age > 5) risks.push(`Older YC batch (${deal.batch}) — verify current growth trajectory`);
  risks.push("Limited public financial data — diligence required on revenue and unit economics");
  risks.push("Competitive dynamics warrant monitoring — assess incumbent response");
  return risks;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  if (!theme) return NextResponse.json({ error: "Missing theme" }, { status: 400 });
  if (theme.length > 200) return NextResponse.json({ error: "Theme too long" }, { status: 400 });

  const webDeals = await fetchRealDeals(theme);

  const allDeals: (ScanDeal & { memo: string; scoreBreakdown: ScoreBreakdown })[] = webDeals.map((wd, i) => {
    const stage = mapStage(wd);
    const breakdown = computeScoreBreakdown(wd, stage);
    const memo = generateMemo(wd, stage, breakdown, theme);

    return {
      id: `yc-${i + 1}`,
      company: wd.name,
      sector: wd.industry || wd.subindustry || "Technology",
      stage,
      score: breakdown.total,
      status: assignStatus(breakdown.total),
      pipelineStage: assignPipelineStage(breakdown.total),
      thesis: buildThesisBullets(wd, breakdown, theme),
      risks: buildRiskBullets(wd),
      diligence: [],
      founders: `Team of ${wd.teamSize || "—"}`,
      lastActivity: wd.batch || "—",
      raised: "—",
      location: wd.location || "—",
      growth: breakdown.marketOpportunity,       // repurpose for UI bars
      momentum: breakdown.sectorGrowth,
      volatility: breakdown.founderCredibility,
      thematicFit: breakdown.fundingMomentum,
      isTopOpportunity: false,
      website: wd.website,
      description: wd.oneLiner || wd.description,
      sourceUrl: wd.sourceUrl,
      sourceName: wd.sourceName,
      memo,
      scoreBreakdown: breakdown,
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

  const highPriority = allDeals.filter(d => d.score >= 75).length;
  const inPartnerReview = allDeals.filter(d => d.pipelineStage === "Partner Review").length;
  const watchlistCandidates = allDeals.filter(d => d.score >= 60 && d.score < 75).length;
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
