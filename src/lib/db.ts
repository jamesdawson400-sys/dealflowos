import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

// ── Singleton connection ──
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.join(process.cwd(), "data", "dealflow.db");
  _db = new Database(dbPath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Create schema
  _db.exec(`
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

  return _db;
}

function uuid(): string {
  return crypto.randomUUID();
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
  thesis: string; // JSON array
  risks: string;  // JSON array
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
export function insertScan(data: {
  theme: string;
  timestamp: string;
  dealCount: number;
  kpis: { dealsInInbox: number; highPriority: number; inPartnerReview: number; watchlistCompanies: number };
}): string {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO scans (id, theme, timestamp, deal_count, kpi_inbox, kpi_high, kpi_partner, kpi_watchlist)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.theme,
    data.timestamp,
    data.dealCount,
    data.kpis.dealsInInbox,
    data.kpis.highPriority,
    data.kpis.inPartnerReview,
    data.kpis.watchlistCompanies,
  );
  return id;
}

export function getScan(id: string): DbScan | undefined {
  return getDb().prepare("SELECT * FROM scans WHERE id = ?").get(id) as DbScan | undefined;
}

export function listScans(): DbScan[] {
  return getDb().prepare("SELECT * FROM scans ORDER BY timestamp DESC").all() as DbScan[];
}

export function getLatestScan(): DbScan | undefined {
  return getDb().prepare("SELECT * FROM scans ORDER BY timestamp DESC LIMIT 1").get() as DbScan | undefined;
}

// ── Company operations ──
export function insertCompany(data: {
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
}): string {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO companies (
      id, scan_id, company, sector, stage, score, status, pipeline_stage,
      thesis, risks, founders, last_activity, raised, location,
      website, description, source_url, source_name,
      growth, momentum, volatility, thematic_fit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.scanId, data.company, data.sector, data.stage, data.score,
    data.status, data.pipelineStage,
    JSON.stringify(data.thesis), JSON.stringify(data.risks),
    data.founders, data.lastActivity, data.raised, data.location,
    data.website ?? null, data.description ?? null,
    data.sourceUrl ?? null, data.sourceName ?? null,
    data.growth, data.momentum, data.volatility, data.thematicFit,
  );

  // Score breakdown
  db.prepare(`
    INSERT INTO score_breakdowns (company_id, growth, momentum, volatility, thematic_fit)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.growth, data.momentum, data.volatility, data.thematicFit);

  // Activity log
  db.prepare(`
    INSERT INTO activity_log (id, company_id, action, company_name, type, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(uuid(), id, "New deal discovered", data.company, "new");

  return id;
}

export function getCompany(id: string): DbCompany | undefined {
  return getDb().prepare("SELECT * FROM companies WHERE id = ?").get(id) as DbCompany | undefined;
}

export function getCompaniesByScan(scanId: string): DbCompany[] {
  return getDb()
    .prepare("SELECT * FROM companies WHERE scan_id = ? ORDER BY score DESC")
    .all(scanId) as DbCompany[];
}

export function getWatchlistedCompanies(): DbCompany[] {
  return getDb()
    .prepare("SELECT * FROM companies WHERE is_watchlisted = 1 ORDER BY score DESC")
    .all() as DbCompany[];
}

export function updatePipelineStage(companyId: string, stage: string): DbCompany | undefined {
  const db = getDb();
  // Derive status from stage
  const statusMap: Record<string, string> = {
    "Partner Review": "High Priority",
    "First Pass": "In Review",
    Reviewing: "Reviewing",
    New: "New",
    Watchlist: "Watching",
    Pass: "Pass",
  };
  const status = statusMap[stage] ?? "In Review";

  db.prepare(`
    UPDATE companies SET pipeline_stage = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(stage, status, companyId);

  const company = getCompany(companyId);
  if (company) {
    db.prepare(`
      INSERT INTO activity_log (id, company_id, action, company_name, type, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(uuid(), companyId, `Moved to ${stage}`, company.company, "pipeline");
  }
  return company;
}

export function toggleWatchlist(companyId: string): DbCompany | undefined {
  const db = getDb();
  const company = getCompany(companyId);
  if (!company) return undefined;

  const newVal = company.is_watchlisted ? 0 : 1;
  db.prepare("UPDATE companies SET is_watchlisted = ?, updated_at = datetime('now') WHERE id = ?").run(
    newVal,
    companyId,
  );

  const action = newVal ? "Added to Watchlist" : "Removed from Watchlist";
  db.prepare(`
    INSERT INTO activity_log (id, company_id, action, company_name, type, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(uuid(), companyId, action, company.company, "watchlist");

  return getCompany(companyId);
}

// ── Notes ──
export function insertNote(companyId: string, content: string): DbNote {
  const db = getDb();
  const id = uuid();
  db.prepare("INSERT INTO notes (id, company_id, content) VALUES (?, ?, ?)").run(id, companyId, content);

  const company = getCompany(companyId);
  if (company) {
    db.prepare(`
      INSERT INTO activity_log (id, company_id, action, company_name, type, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(uuid(), companyId, "Note added", company.company, "note");
  }

  return db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as DbNote;
}

export function getNotes(companyId: string): DbNote[] {
  return getDb()
    .prepare("SELECT * FROM notes WHERE company_id = ? ORDER BY created_at DESC")
    .all(companyId) as DbNote[];
}

// ── Activity log ──
export function getActivityLog(limit = 20): DbActivity[] {
  return getDb()
    .prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?")
    .all(limit) as DbActivity[];
}

// ── Dashboard init (latest state) ──
export function getInitData(): {
  scan: DbScan | null;
  companies: DbCompany[];
  activity: DbActivity[];
  watchlist: DbCompany[];
  scanCount: number;
} {
  const scan = getLatestScan() ?? null;
  const companies = scan ? getCompaniesByScan(scan.id) : [];
  const activity = getActivityLog(15);
  const watchlist = getWatchlistedCompanies();
  const scanCount = (getDb().prepare("SELECT COUNT(*) as cnt FROM scans").get() as { cnt: number }).cnt;
  return { scan, companies, activity, watchlist, scanCount };
}
