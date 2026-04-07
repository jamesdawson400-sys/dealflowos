import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// ── Singleton client (null-safe: if no DATABASE_URL, all ops are no-ops) ──
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

function createClient(): PrismaClient | null {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[DB] No DATABASE_URL configured. Running in stateless mode.");
    return null;
  }
  return new PrismaClient({ log: ["error"] });
}

const prisma: PrismaClient | null =
  globalForPrisma.prisma !== undefined
    ? globalForPrisma.prisma
    : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ── Types (snake_case aliases kept for backward compat with API routes) ──
export interface DbScan {
  id: string;
  theme: string;
  timestamp: string;
  deal_count: number;
  kpi_inbox: number;
  kpi_high: number;
  kpi_partner: number;
  kpi_watchlist: number;
}

export interface DbCompany {
  id: string;
  scan_id: string;
  company: string;
  sector: string;
  stage: string;
  score: number;
  status: string;
  pipeline_stage: string;
  thesis: string;
  risks: string;
  founders: string;
  last_activity: string;
  raised: string;
  location: string;
  website: string | null;
  description: string | null;
  source_url: string | null;
  source_name: string | null;
  is_watchlisted: number;
  growth: number;
  momentum: number;
  volatility: number;
  thematic_fit: number;
  created_at: string;
  updated_at: string;
}

export interface DbNote {
  id: string;
  company_id: string;
  content: string;
  created_at: string;
}

export interface DbActivity {
  id: string;
  company_id: string | null;
  action: string;
  company_name: string;
  type: string;
  created_at: string;
}

// Map Prisma Scan → DbScan
function toDbScan(s: {
  id: string; theme: string; timestamp: string;
  dealCount: number; kpiInbox: number; kpiHigh: number;
  kpiPartner: number; kpiWatchlist: number;
}): DbScan {
  return {
    id: s.id,
    theme: s.theme,
    timestamp: s.timestamp,
    deal_count: s.dealCount,
    kpi_inbox: s.kpiInbox,
    kpi_high: s.kpiHigh,
    kpi_partner: s.kpiPartner,
    kpi_watchlist: s.kpiWatchlist,
  };
}

// Map Prisma Company → DbCompany
function toDbCompany(c: {
  id: string; scanId: string; company: string; sector: string; stage: string;
  score: number; status: string; pipelineStage: string; thesis: string;
  risks: string; founders: string; lastActivity: string; raised: string;
  location: string; website: string | null; description: string | null;
  sourceUrl: string | null; sourceName: string | null; isWatchlisted: number;
  growth: number; momentum: number; volatility: number; thematicFit: number;
  createdAt: string; updatedAt: string;
}): DbCompany {
  return {
    id: c.id,
    scan_id: c.scanId,
    company: c.company,
    sector: c.sector,
    stage: c.stage,
    score: c.score,
    status: c.status,
    pipeline_stage: c.pipelineStage,
    thesis: c.thesis,
    risks: c.risks,
    founders: c.founders,
    last_activity: c.lastActivity,
    raised: c.raised,
    location: c.location,
    website: c.website,
    description: c.description,
    source_url: c.sourceUrl,
    source_name: c.sourceName,
    is_watchlisted: c.isWatchlisted,
    growth: c.growth,
    momentum: c.momentum,
    volatility: c.volatility,
    thematic_fit: c.thematicFit,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

// Map Prisma Note → DbNote
function toDbNote(n: { id: string; companyId: string; content: string; createdAt: string }): DbNote {
  return { id: n.id, company_id: n.companyId, content: n.content, created_at: n.createdAt };
}

// Map Prisma ActivityLog → DbActivity
function toDbActivity(a: {
  id: string; companyId: string | null; action: string; companyName: string; type: string; createdAt: string;
}): DbActivity {
  return {
    id: a.id,
    company_id: a.companyId,
    action: a.action,
    company_name: a.companyName,
    type: a.type,
    created_at: a.createdAt,
  };
}

// ── Scan operations ──
export async function insertScan(data: {
  theme: string;
  timestamp: string;
  dealCount: number;
  kpis: { dealsInInbox: number; highPriority: number; inPartnerReview: number; watchlistCompanies: number };
}): Promise<string> {
  const id = uuid();
  if (!prisma) return id;
  await prisma.scan.create({
    data: {
      id,
      theme: data.theme,
      timestamp: data.timestamp,
      dealCount: data.dealCount,
      kpiInbox: data.kpis.dealsInInbox,
      kpiHigh: data.kpis.highPriority,
      kpiPartner: data.kpis.inPartnerReview,
      kpiWatchlist: data.kpis.watchlistCompanies,
    },
  });
  return id;
}

export async function getScan(id: string): Promise<DbScan | undefined> {
  if (!prisma) return undefined;
  const s = await prisma.scan.findUnique({ where: { id } });
  return s ? toDbScan(s) : undefined;
}

export async function listScans(): Promise<DbScan[]> {
  if (!prisma) return [];
  const scans = await prisma.scan.findMany({ orderBy: { timestamp: "desc" } });
  return scans.map(toDbScan);
}

export async function getLatestScan(): Promise<DbScan | undefined> {
  if (!prisma) return undefined;
  const s = await prisma.scan.findFirst({ orderBy: { timestamp: "desc" } });
  return s ? toDbScan(s) : undefined;
}

// ── Company operations ──
export async function insertCompany(data: {
  scanId: string;
  company: string;
  sector: string;
  stage: string;
  score: number;
  status: string;
  pipelineStage: string;
  thesis: string[];
  risks: string[];
  founders: string;
  lastActivity: string;
  raised: string;
  location: string;
  website?: string;
  description?: string;
  sourceUrl?: string;
  sourceName?: string;
  growth: number;
  momentum: number;
  volatility: number;
  thematicFit: number;
}): Promise<string> {
  const id = uuid();
  if (!prisma) return id;

  await prisma.company.create({
    data: {
      id,
      scanId: data.scanId,
      company: data.company,
      sector: data.sector,
      stage: data.stage,
      score: data.score,
      status: data.status,
      pipelineStage: data.pipelineStage,
      thesis: JSON.stringify(data.thesis),
      risks: JSON.stringify(data.risks),
      founders: data.founders,
      lastActivity: data.lastActivity,
      raised: data.raised,
      location: data.location,
      website: data.website ?? null,
      description: data.description ?? null,
      sourceUrl: data.sourceUrl ?? null,
      sourceName: data.sourceName ?? null,
      growth: data.growth,
      momentum: data.momentum,
      volatility: data.volatility,
      thematicFit: data.thematicFit,
      createdAt: now(),
      updatedAt: now(),
    },
  });

  await prisma.activityLog.create({
    data: {
      id: uuid(),
      companyId: id,
      action: "New deal discovered",
      companyName: data.company,
      type: "new",
      createdAt: now(),
    },
  });

  return id;
}

export async function getCompany(id: string): Promise<DbCompany | undefined> {
  if (!prisma) return undefined;
  const c = await prisma.company.findUnique({ where: { id } });
  return c ? toDbCompany(c) : undefined;
}

export async function getCompaniesByScan(scanId: string): Promise<DbCompany[]> {
  if (!prisma) return [];
  const companies = await prisma.company.findMany({
    where: { scanId },
    orderBy: { score: "desc" },
  });
  return companies.map(toDbCompany);
}

export async function getWatchlistedCompanies(): Promise<DbCompany[]> {
  if (!prisma) return [];
  const companies = await prisma.company.findMany({
    where: { isWatchlisted: 1 },
    orderBy: { score: "desc" },
  });
  return companies.map(toDbCompany);
}

export async function updatePipelineStage(companyId: string, stage: string): Promise<DbCompany | undefined> {
  if (!prisma) return undefined;
  const statusMap: Record<string, string> = {
    "Partner Review": "High Priority",
    "First Pass": "In Review",
    Reviewing: "Reviewing",
    New: "New",
    Watchlist: "Watching",
    Pass: "Pass",
  };
  const status = statusMap[stage] ?? "In Review";

  await prisma.company.update({
    where: { id: companyId },
    data: { pipelineStage: stage, status, updatedAt: now() },
  });

  const company = await getCompany(companyId);
  if (company) {
    await prisma.activityLog.create({
      data: {
        id: uuid(),
        companyId,
        action: `Moved to ${stage}`,
        companyName: company.company,
        type: "pipeline",
        createdAt: now(),
      },
    });
  }
  return company;
}

export async function toggleWatchlist(companyId: string): Promise<DbCompany | undefined> {
  if (!prisma) return undefined;
  const company = await getCompany(companyId);
  if (!company) return undefined;

  const newVal = company.is_watchlisted ? 0 : 1;
  await prisma.company.update({
    where: { id: companyId },
    data: { isWatchlisted: newVal, updatedAt: now() },
  });

  const action = newVal ? "Added to Watchlist" : "Removed from Watchlist";
  await prisma.activityLog.create({
    data: {
      id: uuid(),
      companyId,
      action,
      companyName: company.company,
      type: "watchlist",
      createdAt: now(),
    },
  });

  return getCompany(companyId);
}

// ── Notes ──
export async function insertNote(companyId: string, content: string): Promise<DbNote> {
  const id = uuid();
  const ts = now();
  if (!prisma) return { id, company_id: companyId, content, created_at: ts };

  await prisma.note.create({
    data: { id, companyId, content, createdAt: ts },
  });

  const company = await getCompany(companyId);
  if (company) {
    await prisma.activityLog.create({
      data: {
        id: uuid(),
        companyId,
        action: "Note added",
        companyName: company.company,
        type: "note",
        createdAt: now(),
      },
    });
  }

  const note = await prisma.note.findUnique({ where: { id } });
  return toDbNote(note!);
}

export async function getNotes(companyId: string): Promise<DbNote[]> {
  if (!prisma) return [];
  const notes = await prisma.note.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  return notes.map(toDbNote);
}

// ── Activity log ──
export async function getActivityLog(limit = 20): Promise<DbActivity[]> {
  if (!prisma) return [];
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return logs.map(toDbActivity);
}

// ── Dashboard init ──
export async function getInitData(): Promise<{
  scan: DbScan | null;
  companies: DbCompany[];
  activity: DbActivity[];
  watchlist: DbCompany[];
  scanCount: number;
}> {
  if (!prisma) return { scan: null, companies: [], activity: [], watchlist: [], scanCount: 0 };
  const scan = await getLatestScan() ?? null;
  const companies = scan ? await getCompaniesByScan(scan.id) : [];
  const activity = await getActivityLog(15);
  const watchlist = await getWatchlistedCompanies();
  const scanCount = await prisma.scan.count();
  return { scan, companies, activity, watchlist, scanCount };
}

// Kept for backward compat — no-op with Prisma (schema managed via migrations)
export async function ensureSchema(): Promise<void> {}
