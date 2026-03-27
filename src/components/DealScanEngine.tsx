"use client";

import { useState, useEffect } from "react";
import { useScan } from "@/context/ScanContext";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const SUGGESTIONS = [
  "fintech",
  "AI infrastructure",
  "cybersecurity",
  "climate tech",
  "digital health",
  "developer tools",
  "B2B SaaS",
  "logistics",
];

export default function DealScanEngine() {
  const {
    isScanning, lastTheme, lastScanTime, hasScanned, runScan,
    scanHistory, loadScan, webDealCount, generatedDealCount,
  } = useScan();
  const [theme, setTheme] = useState("");
  const [displayTime, setDisplayTime] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!lastScanTime) return;
    setDisplayTime(timeAgo(lastScanTime));
    const interval = setInterval(() => setDisplayTime(timeAgo(lastScanTime)), 30_000);
    return () => clearInterval(interval);
  }, [lastScanTime]);

  const handleScan = () => {
    const t = theme.trim();
    if (!t || isScanning) return;
    runScan(t);
    setShowHistory(false);
  };

  return (
    <section className="mx-auto max-w-7xl px-6 pb-8">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-blue-950/40 via-[#0a0e1a] to-violet-950/30">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-600/[0.06] blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-violet-600/[0.04] blur-[60px]" />

        <div className="relative p-6">
          {/* Header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Run Deal Scan</h2>
              <p className="text-xs text-slate-500">
                Real companies from YC Directory — scored and persisted to SQLite
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {hasScanned && displayTime && (
                <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-400">Last scan: {displayTime}</span>
                </div>
              )}
              {scanHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-white/[0.06] hover:text-slate-300"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  History ({scanHistory.length})
                </button>
              )}
            </div>
          </div>

          {/* Input row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder='Investment theme — e.g. "AI fintech NYC", "B2B SaaS Series A"'
                disabled={isScanning}
                className="h-11 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-blue-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={isScanning || !theme.trim()}
              className="flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-medium text-white transition-all hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Run Scan
                </>
              )}
            </button>
          </div>

          {/* Suggestions (only if no scan yet) */}
          {!hasScanned && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setTheme(s)}
                  className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-xs text-slate-400 transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-slate-300"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Active theme + source stats */}
          {hasScanned && lastTheme && !isScanning && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-slate-500">Active theme:</span>
              <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-2.5 py-0.5 text-xs font-medium text-blue-400">
                {lastTheme}
              </span>
              {webDealCount > 0 && (
                <>
                  <span className="text-slate-700">|</span>
                  <span className="text-xs text-emerald-400/70">
                    {webDealCount} verified {webDealCount === 1 ? "company" : "companies"}
                  </span>
                </>
              )}
              {webDealCount === 0 && (
                <>
                  <span className="text-slate-700">|</span>
                  <span className="text-xs text-slate-500">
                    No real companies found for this theme
                  </span>
                </>
              )}
            </div>
          )}

          {/* Scan History dropdown */}
          {showHistory && scanHistory.length > 0 && (
            <div className="mt-4 rounded-lg border border-white/[0.06] bg-[#0a0e1a]">
              <div className="border-b border-white/[0.04] px-4 py-2.5">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Scan History</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {scanHistory.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => {
                      loadScan(scan.id);
                      setShowHistory(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <div>
                      <span className="text-sm text-white">{scan.theme}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {new Date(scan.timestamp).toLocaleDateString()} at{" "}
                        {new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-slate-400">
                      {scan.dealCount} deals
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#060a14]/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-blue-500/20" />
                <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
                <div className="absolute inset-2 h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-violet-500" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Scanning the web for deals...</p>
                <p className="mt-1 text-xs text-slate-500">Querying YC Directory and validating company websites</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
