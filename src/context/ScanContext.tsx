"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { ScanDeal } from "@/lib/scanEngine";
import { deals as defaultDeals, kpiData as defaultKpis, type Deal } from "@/lib/mockData";
import type { DbCompany, DbActivity, DbScan } from "@/lib/db";

export interface ScanHistoryItem {
  id: string;
  theme: string;
  timestamp: string;
  dealCount: number;
}

interface ScanState {
  hasScanned: boolean;
  isScanning: boolean;
  isLoading: boolean;
  lastTheme: string | null;
  lastScanTime: Date | null;
  lastScanId: string | null;
  deals: Deal[];
  kpis: typeof defaultKpis;
  scanDeals: ScanDeal[];
  topOpportunities: ScanDeal[];
  activity: DbActivity[];
  watchlist: Deal[];
  scanHistory: ScanHistoryItem[];
  webDealCount: number;
  generatedDealCount: number;
  runScan: (theme: string) => Promise<void>;
  resetToDefault: () => void;
  loadScan: (scanId: string) => Promise<void>;
  loadScanHistory: () => Promise<void>;
  updatePipelineStage: (companyId: string, newStage: string) => Promise<void>;
  toggleWatchlist: (companyId: string) => Promise<void>;
  addNote: (companyId: string, content: string) => Promise<void>;
}

const ScanContext = createContext<ScanState | null>(null);

export function useScan(): ScanState {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScan must be used within ScanProvider");
  return ctx;
}

// Convert DB company to Deal shape
function dbCompanyToDeal(c: DbCompany): Deal {
  return {
    id: c.id,
    company: c.company,
    sector: c.sector,
    stage: c.stage,
    score: c.score,
    status: c.status,
    pipelineStage: c.pipeline_stage,
    thesis: (() => { try { return JSON.parse(c.thesis).join(". "); } catch { return c.thesis; } })(),
    risks: (() => { try { return JSON.parse(c.risks).join(". "); } catch { return c.risks; } })(),
    founders: c.founders,
    lastActivity: c.last_activity,
    raised: c.raised,
    location: c.location,
  };
}

// Convert DB company to ScanDeal shape
function dbCompanyToScanDeal(c: DbCompany): ScanDeal {
  return {
    id: c.id,
    company: c.company,
    sector: c.sector,
    stage: c.stage,
    score: c.score,
    status: c.status,
    pipelineStage: c.pipeline_stage,
    thesis: (() => { try { return JSON.parse(c.thesis); } catch { return [c.thesis]; } })(),
    risks: (() => { try { return JSON.parse(c.risks); } catch { return [c.risks]; } })(),
    founders: c.founders,
    lastActivity: c.last_activity,
    raised: c.raised,
    location: c.location,
    growth: c.growth,
    momentum: c.momentum,
    volatility: c.volatility,
    thematicFit: c.thematic_fit,
    isTopOpportunity: false,
    website: c.website ?? undefined,
    description: c.description ?? undefined,
    sourceUrl: c.source_url ?? undefined,
    sourceName: c.source_name ?? undefined,
  };
}

function scanDealToDeal(sd: ScanDeal): Deal {
  return {
    id: sd.id,
    company: sd.company,
    sector: sd.sector,
    stage: sd.stage,
    score: sd.score,
    status: sd.status,
    pipelineStage: sd.pipelineStage,
    thesis: Array.isArray(sd.thesis) ? sd.thesis.join(". ") : sd.thesis,
    risks: Array.isArray(sd.risks) ? sd.risks.join(". ") : sd.risks,
    founders: sd.founders,
    lastActivity: sd.lastActivity,
    raised: sd.raised,
    location: sd.location,
  };
}

export function ScanProvider({ children }: { children: ReactNode }) {
  const [hasScanned, setHasScanned] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTheme, setLastTheme] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [lastScanId, setLastScanId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>(defaultDeals);
  const [kpis, setKpis] = useState(defaultKpis);
  const [scanDeals, setScanDeals] = useState<ScanDeal[]>([]);
  const [topOpportunities, setTopOpportunities] = useState<ScanDeal[]>([]);
  const [activity, setActivity] = useState<DbActivity[]>([]);
  const [watchlist, setWatchlist] = useState<Deal[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [webDealCount, setWebDealCount] = useState(0);
  const [generatedDealCount, setGeneratedDealCount] = useState(0);

  // Load persisted state on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/init");
        if (!res.ok) throw new Error("init failed");
        const data = await res.json();

        if (data.scan && data.companies.length > 0) {
          const dbDeals = data.companies.map(dbCompanyToDeal);
          const dbScanDeals = data.companies.map(dbCompanyToScanDeal);
          // Mark top 3
          dbScanDeals.sort((a: ScanDeal, b: ScanDeal) => b.score - a.score);
          for (let i = 0; i < Math.min(3, dbScanDeals.length); i++) {
            dbScanDeals[i].isTopOpportunity = true;
          }

          setDeals(dbDeals);
          setScanDeals(dbScanDeals);
          setTopOpportunities(dbScanDeals.filter((d: ScanDeal) => d.isTopOpportunity));
          setLastTheme(data.scan.theme);
          setLastScanTime(new Date(data.scan.timestamp));
          setLastScanId(data.scan.id);
          setHasScanned(true);
          setKpis({
            dealsInInbox: data.scan.kpi_inbox,
            highPriority: data.scan.kpi_high,
            inPartnerReview: data.scan.kpi_partner,
            watchlistCompanies: data.scan.kpi_watchlist,
          });
        }

        if (data.activity) setActivity(data.activity);
        if (data.watchlist) setWatchlist(data.watchlist.map(dbCompanyToDeal));
      } catch {
        // DB not ready or first run — use defaults
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const loadScanHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/scans");
      if (!res.ok) return;
      const data = await res.json();
      setScanHistory(
        (data.scans ?? []).map((s: DbScan) => ({
          id: s.id,
          theme: s.theme,
          timestamp: s.timestamp,
          dealCount: s.deal_count,
        })),
      );
    } catch { /* ignore */ }
  }, []);

  // Load scan history on mount
  useEffect(() => { loadScanHistory(); }, [loadScanHistory]);

  const runScan = useCallback(async (theme: string) => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) throw new Error("Scan failed");
      const result = await res.json();

      const convertedDeals = result.deals.map(scanDealToDeal);
      const sDeals: ScanDeal[] = result.deals;
      sDeals.sort((a: ScanDeal, b: ScanDeal) => b.score - a.score);
      for (let i = 0; i < Math.min(3, sDeals.length); i++) {
        sDeals[i]!.isTopOpportunity = true;
      }

      setDeals(convertedDeals);
      setKpis(result.kpis);
      setScanDeals(sDeals);
      setTopOpportunities(sDeals.filter((d: ScanDeal) => d.isTopOpportunity));
      setLastTheme(theme);
      setLastScanTime(new Date());
      setLastScanId(result.scanId);
      setHasScanned(true);
      setWebDealCount(result.webDealCount ?? 0);
      setGeneratedDealCount(result.generatedDealCount ?? 0);

      // Refresh activity + history
      const [actRes] = await Promise.all([
        fetch("/api/activity"),
        loadScanHistory(),
      ]);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivity(actData.activity ?? []);
      }
    } finally {
      setIsScanning(false);
    }
  }, [loadScanHistory]);

  const loadScan = useCallback(async (scanId: string) => {
    setIsScanning(true);
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (!res.ok) throw new Error("Load failed");
      const data = await res.json();
      const scan: DbScan = data.scan;
      const companies: DbCompany[] = data.companies;

      const dbDeals = companies.map(dbCompanyToDeal);
      const dbScanDeals = companies.map(dbCompanyToScanDeal);
      dbScanDeals.sort((a, b) => b.score - a.score);
      for (let i = 0; i < Math.min(3, dbScanDeals.length); i++) {
        dbScanDeals[i]!.isTopOpportunity = true;
      }

      setDeals(dbDeals);
      setScanDeals(dbScanDeals);
      setTopOpportunities(dbScanDeals.filter((d) => d.isTopOpportunity));
      setLastTheme(scan.theme);
      setLastScanTime(new Date(scan.timestamp));
      setLastScanId(scan.id);
      setHasScanned(true);
      setKpis({
        dealsInInbox: scan.kpi_inbox,
        highPriority: scan.kpi_high,
        inPartnerReview: scan.kpi_partner,
        watchlistCompanies: scan.kpi_watchlist,
      });
    } finally {
      setIsScanning(false);
    }
  }, []);

  const updatePipelineStage = useCallback(async (companyId: string, newStage: string) => {
    const res = await fetch(`/api/companies/${companyId}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    if (!res.ok) return;
    const { company: updated } = await res.json();

    // Update local state
    setDeals((prev) =>
      prev.map((d) =>
        d.id === companyId ? { ...d, pipelineStage: updated.pipeline_stage, status: updated.status } : d,
      ),
    );
    setScanDeals((prev) =>
      prev.map((d) =>
        d.id === companyId ? { ...d, pipelineStage: updated.pipeline_stage, status: updated.status } : d,
      ),
    );

    // Refresh activity
    const actRes = await fetch("/api/activity");
    if (actRes.ok) {
      const actData = await actRes.json();
      setActivity(actData.activity ?? []);
    }
  }, []);

  const toggleWatchlistFn = useCallback(async (companyId: string) => {
    const res = await fetch(`/api/companies/${companyId}/watchlist`, {
      method: "PATCH",
    });
    if (!res.ok) return;
    const { company: updated } = await res.json();

    // Update local state
    setDeals((prev) =>
      prev.map((d) => (d.id === companyId ? { ...d } : d)),
    );

    // Refresh watchlist
    if (updated.is_watchlisted) {
      setWatchlist((prev) => {
        if (prev.some((d) => d.id === companyId)) return prev;
        const deal = deals.find((d) => d.id === companyId);
        return deal ? [deal, ...prev] : prev;
      });
    } else {
      setWatchlist((prev) => prev.filter((d) => d.id !== companyId));
    }

    // Refresh activity
    const actRes = await fetch("/api/activity");
    if (actRes.ok) {
      const actData = await actRes.json();
      setActivity(actData.activity ?? []);
    }
  }, [deals]);

  const addNote = useCallback(async (companyId: string, content: string) => {
    await fetch(`/api/companies/${companyId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    // Refresh activity
    const actRes = await fetch("/api/activity");
    if (actRes.ok) {
      const actData = await actRes.json();
      setActivity(actData.activity ?? []);
    }
  }, []);

  const resetToDefault = useCallback(() => {
    setDeals(defaultDeals);
    setKpis(defaultKpis);
    setScanDeals([]);
    setTopOpportunities([]);
    setHasScanned(false);
    setLastTheme(null);
    setLastScanTime(null);
    setLastScanId(null);
    setWebDealCount(0);
    setGeneratedDealCount(0);
  }, []);

  return (
    <ScanContext.Provider
      value={{
        hasScanned,
        isScanning,
        isLoading,
        lastTheme,
        lastScanTime,
        lastScanId,
        deals,
        kpis,
        scanDeals,
        topOpportunities,
        activity,
        watchlist,
        scanHistory,
        webDealCount,
        generatedDealCount,
        runScan,
        resetToDefault,
        loadScan,
        loadScanHistory,
        updatePipelineStage,
        toggleWatchlist: toggleWatchlistFn,
        addNote,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}
