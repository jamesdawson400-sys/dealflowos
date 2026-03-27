import { createClient, type Client, type InArgs } from "@libsql/client";
import path from "path";
import crypto from "crypto";

// ── Singleton client ──
let _client: Client | null = null;
let _dbAvailable: boolean | null = null;

function isLocalEnv(): boolean {
  return process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production";
}

function getClient(): Client | null {
  if (_dbAvailable === false) return null;
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && url.startsWith("libsql://")) {
    _client = createClient({ url, authToken: authToken ?? "" });
    _dbAvailable = true;
  } else if (url && url.startsWith("file:")) {
    _client = createClient({ url });
    _dbAvailable = true;
  } else if (isLocalEnv()) {
    // Local dev: use file-based SQLite
    const dbPath = path.join(process.cwd(), "data", "dealflow.db");
    _client = createClient({ url: `file:${dbPath}` });
    _dbAvailable = true;
  } else {
    // Vercel without Turso — skip DB, scans still work
    console.log("[DB] No database configured. Running in stateless mode.");
    _dbAvailable = false;
    return null;
  }

  return _client;
}

// ── Schema init (called once at startup / on first API request) ──
let schemaInitialised = false;

export async function ensureSchema(): Promise<void> {
  if (schemaInitialised) return;
  const db = getClient();
  if (!db) { schemaInitialised = true; return; }

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS scans (
      id            TEXT PRIMARY KEY,
      theme         TEXT NOT NULL,
      timestamp     TEXT NOT NULL,
      deal_count    INTEGER NOT NULL,
      kpi_inbox     INTEGER NOT NULL,
      kpi_high      INTEGER NOT NULL,
      kpi_partner   INTEGER NOT NULL,
      kpi_watchlist INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      id              TEXT PRIMARY KEY,
      scan_id         TEXT NOT NULL REFERENCES scans(id),
      company         TEXT NOT NULL,
      sector          TEXT NOT NULL,
      stage           TEXT NOT NULL,
      score           INTEGER NOT NULL,
      status          TEXT NOT NULL,
      pipeline_stage  TEXT NOT NULL,
      thesis          TEXT NOT NULL,
      risks           TEXT NOT NULL,
      founders        TEXT NOT NULL,
      last_activity   TEXT NOT NULL,
      raised          TEXT NOT NULL,
      location        TEXT NOT NULL,
      website         TEXT,
      description     TEXT,
      source_url      TEXT,
      source_name     TEXT,
      is_watchlisted  INTEGER NOT NULL DEFAULT 0,
      growth          INTEGER NOT NULL DEFAULT 50,
      momentum        INTEGER NOT NULL DEFAULT 50,
      volatility      INTEGER NOT NULL DEFAULT 50,
      thematic_fit    INTEGER NOT NULL DEFAULT 50,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS score_breakdowns (
      company_id    TEXT PRIMARY KEY REFERENCES companies(id),
      growth        INTEGER NOT NULL,
      momentum      INTEGER NOT NULL,
      volatility    INTEGER NOT NULL,
      thematic_fit  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY,
      company_id  TEXT NOT NULL REFERENCES companies(id),
      content     TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id            TEXT PRIMARY KEY,
      company_id    TEXT REFERENCES companies(id),
      action        TEXT NOT NULL,
      company_name  TEXT NOT NULL,
      type          TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_companies_scan ON companies(scan_id);
    CREATE INDEX IF NOT EXISTS idx_companies_watchlist ON companies(is_watchlisted);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_company ON notes(company_id);
  `);

  schemaInitialised = true;
}

function uuid(): string {
  return crypto.randomUUID();
}

// Helper: extract rows as typed objects
function rows<T>(result: Awaited<ReturnType<Client["execute"]>>): T[] {
  const { columns, rows } = result;
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj as T;
  });
}

function firstRow<T>(result: Awaited<ReturnType<Client["execute"]>>): T | undefined {
  return rows<T>(result)[0];
}

// ── Types ──
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

// ── Scan operations ──
export async function insertScan(data: {
  theme: string;
  timestamp: string;
  dealCount: number;
  kpis: { dealsInInbox: number; highPriority: number; inPartnerReview: number; watchlistCompanies: number };
}): Promise<string> {
  await ensureSchema();
  const db = getClient();
  const id = uuid();
  if (!db) return id; // stateless mode — return a fake id, scan still works
  await db.execute({
    sql: `INSERT INTO scans (id, theme, timestamp, deal_count, kpi_inbox, kpi_high, kpi_partner, kpi_watchlist)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.theme, data.timestamp, data.dealCount,
      data.kpis.dealsInInbox, data.kpis.highPriority,
      data.kpis.inPartnerReview, data.kpis.watchlistCompanies] as InArgs,
  });
  return id;
}

export async function getScan(id: string): Promise<DbScan | undefined> {
  await ensureSchema();
  const db = getClient();
  if (!db) return undefined;
  const result = await db.execute({ sql: "SELECT * FROM scans WHERE id = ?", args: [id] });
  return firstRow<DbScan>(result);
}

export async function listScans(): Promise<DbScan[]> {
  await ensureSchema();
  const db = getClient();
  if (!db) return [];
  const result = await db.execute("SELECT * FROM scans ORDER BY timestamp DESC");
  return rows<DbScan>(result);
}

export async function getLatestScan(): Promise<DbScan | undefined> {
  await ensureSchema();
  const db = getClient();
  if (!db) return undefined;
  const result = await db.execute("SELECT * FROM scans ORDER BY timestamp DESC LIMIT 1");
  return firstRow<DbScan>(result);
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
  await ensureSchema();
  const db = getClient();
  const id = uuid();
  if (!db) return id; // stateless mode

  await db.execute({
    sql: `INSERT INTO companies (
            id, scan_id, company, sector, stage, score, status, pipeline_stage,
            thesis, risks, founders, last_activity, raised, location,
            website, description, source_url, source_name,
            growth, momentum, volatility, thematic_fit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, data.scanId, data.company, data.sector, data.stage, data.score,
      data.status, data.pipelineStage,
      JSON.stringify(data.thesis), JSON.stringify(data.risks),
      data.founders, data.lastActivity, data.raised, data.location,
      data.website ?? null, data.description ?? null,
      data.sourceUrl ?? null, data.sourceName ?? null,
      data.growth, data.momentum, data.volatility, data.thematicFit,
    ] as InArgs,
  });

  await db.execute({
    sql: `INSERT INTO score_breakdowns (company_id, growth, momentum, volatility, thematic_fit)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, data.growth, data.momentum, data.volatility, data.thematicFit] as InArgs,
  });

  await db.execute({
    sql: `INSERT INTO activity_log (id, company_id, action, company_name, type, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    args: [uuid(), id, "New deal discovered", data.company, "new"] as InArgs,
  });

  return id;
}

export async function getCompany(id: string): Promise<DbCompany | undefined> {
  await ensureSchema();
  const db = getClient();
  if (!db) return undefined;
  const result = await db.execute({ sql: "SELECT * FROM companies WHERE id = ?", args: [id] });
  return firstRow<DbCompany>(result);
}

export async function getCompaniesByScan(scanId: string): Promise<DbCompany[]> {
  await ensureSchema();
  const db = getClient();
  if (!db) return [];
  const result = await db.execute({
    sql: "SELECT * FROM companies WHERE scan_id = ? ORDER BY score DESC",
    args: [scanId],
  });
  return rows<DbCompany>(result);
}

export async function getWatchlistedCompanies(): Promise<DbCompany[]> {
  await ensureSchema();
  const db = getClient();
  if (!db) return [];
  const result = await db.execute(
    "SELECT * FROM companies WHERE is_watchlisted = 1 ORDER BY score DESC"
  );
  return rows<DbCompany>(result);
}

export async function updatePipelineStage(companyId: string, stage: string): Promise<DbCompany | undefined> {
  await ensureSchema();
  const db = getClient();
  if (!db) return undefined;
  const statusMap: Record<string, string> = {
    "Partner Review": "High Priority",
    "First Pass": "In Review",
    Reviewing: "Reviewing",
    New: "New",
    Watchlist: "Watching",
    Pass: "Pass",
  };
  const status = statusMap[stage] ?? "In Review";

  await db.execute({
    sql: `UPDATE companies SET pipeline_stage = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [stage, status, companyId] as InArgs,
  });

  const company = await getCompany(companyId);
  if (company) {
    await db.execute({
      sql: `INSERT INTO activity_log (id, company_id, action, company_name, type, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [uuid(), companyId, `Moved to ${stage}`, company.company, "pipeline"] as InArgs,
    });
  }
  return company;
}

export async function toggleWatchlist(companyId: string): Promise<DbCompany | undefined> {
  await ensureSchema();
  const db = getClient();
  if (!db) return undefined;
  const company = await getCompany(companyId);
  if (!company) return undefined;

  const newVal = company.is_watchlisted ? 0 : 1;
  await db.execute({
    sql: "UPDATE companies SET is_watchlisted = ?, updated_at = datetime('now') WHERE id = ?",
    args: [newVal, companyId] as InArgs,
  });

  const action = newVal ? "Added to Watchlist" : "Removed from Watchlist";
  await db.execute({
    sql: `INSERT INTO activity_log (id, company_id, action, company_name, type, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    args: [uuid(), companyId, action, company.company, "watchlist"] as InArgs,
  });

  return getCompany(companyId);
}

// ── Notes ──
export async function insertNote(companyId: string, content: string): Promise<DbNote> {
  await ensureSchema();
  const db = getClient();
  const id = uuid();
  if (!db) return { id, company_id: companyId, content, created_at: new Date().toISOString() };

  await db.execute({
    sql: "INSERT INTO notes (id, company_id, content) VALUES (?, ?, ?)",
    args: [id, companyId, content] as InArgs,
  });

  const company = await getCompany(companyId);
  if (company) {
    await db.execute({
      sql: `INSERT INTO activity_log (id, company_id, action, company_name, type, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [uuid(), companyId, "Note added", company.company, "note"] as InArgs,
    });
  }

  const result = await db.execute({ sql: "SELECT * FROM notes WHERE id = ?", args: [id] });
  return firstRow<DbNote>(result)!;
}

export async function getNotes(companyId: string): Promise<DbNote[]> {
  await ensureSchema();
  const db = getClient();
  if (!db) return [];
  const result = await db.execute({
    sql: "SELECT * FROM notes WHERE company_id = ? ORDER BY created_at DESC",
    args: [companyId],
  });
  return rows<DbNote>(result);
}

// ── Activity log ──
export async function getActivityLog(limit = 20): Promise<DbActivity[]> {
  await ensureSchema();
  const db = getClient();
  if (!db) return [];
  const result = await db.execute({
    sql: "SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?",
    args: [limit],
  });
  return rows<DbActivity>(result);
}

// ── Dashboard init ──
export async function getInitData(): Promise<{
  scan: DbScan | null;
  companies: DbCompany[];
  activity: DbActivity[];
  watchlist: DbCompany[];
  scanCount: number;
}> {
  await ensureSchema();
  const db = getClient();
  if (!db) return { scan: null, companies: [], activity: [], watchlist: [], scanCount: 0 };
  const scan = await getLatestScan() ?? null;
  const companies = scan ? await getCompaniesByScan(scan.id) : [];
  const activity = await getActivityLog(15);
  const watchlist = await getWatchlistedCompanies();
  const countResult = await db.execute("SELECT COUNT(*) as cnt FROM scans");
  const scanCount = Number(firstRow<{ cnt: number }>(countResult)?.cnt ?? 0);
  return { scan, companies, activity, watchlist, scanCount };
}
