"use client";

import { useState, useEffect, useCallback } from "react";
import { useScan } from "@/context/ScanContext";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

export default function CompanyDetail() {
  const { deals, scanDeals, hasScanned, isScanning, toggleWatchlist, addNote } = useScan();
  const deal = deals[0];
  const scanDeal = hasScanned ? scanDeals[0] : null;
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!deal || !hasScanned) return;
    try {
      const res = await fetch(`/api/companies/${deal.id}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes ?? []);
      }
    } catch { /* ignore */ }
  }, [deal, hasScanned]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  if (!deal) return null;

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    await addNote(deal.id, text);
    setNoteText("");
    loadNotes();
  };

  const handleWatchlist = async () => {
    await toggleWatchlist(deal.id);
    setIsWatchlisted(!isWatchlisted);
  };

  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Company Detail</h2>
        <p className="mt-1 text-sm text-slate-500">
          {hasScanned ? "Top-scoring deal from scan" : "Deep dive on featured deal"}
        </p>
      </div>
      <div className={`overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-opacity ${isScanning ? "opacity-40" : ""}`}>
        {/* Header */}
        <div className="border-b border-white/[0.06] bg-gradient-to-r from-blue-600/[0.06] to-violet-600/[0.06] p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-lg font-bold text-white">
                {deal.company.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
              <div>
                {scanDeal?.website ? (
                  <a
                    href={scanDeal.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl font-bold text-white hover:text-blue-400 transition-colors"
                  >
                    {deal.company}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-2 inline-block opacity-40">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ) : (
                  <h3 className="text-2xl font-bold text-white">{deal.company}</h3>
                )}
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-sm text-slate-400">{deal.sector}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-sm text-slate-400">{deal.stage}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-sm text-slate-400">{deal.location}</span>
                  {scanDeal?.sourceName && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-blue-400/70">via {scanDeal.sourceName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasScanned && (
                <button
                  onClick={handleWatchlist}
                  className={`rounded-lg border p-2 transition-all ${
                    isWatchlisted
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-white/[0.06] bg-white/[0.03] text-slate-500 hover:text-amber-400"
                  }`}
                  title="Toggle watchlist"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isWatchlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              )}
              <div className="text-right">
                <p className="text-xs font-medium uppercase text-slate-500">Deal Score</p>
                <p className="text-3xl font-bold text-emerald-400">{deal.score}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
                deal.status === "High Priority"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  : deal.status === "In Review"
                    ? "border-violet-500/20 bg-violet-500/10 text-violet-400"
                    : "border-blue-500/20 bg-blue-500/10 text-blue-400"
              }`}>
                {deal.status}
              </span>
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid gap-px bg-white/[0.04] md:grid-cols-2">
          {/* Thesis */}
          <div className="bg-[#0a0e1a] p-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Investment Thesis
            </h4>
            {scanDeal ? (
              <ul className="space-y-2">
                {scanDeal.thesis.map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 shrink-0 text-emerald-500">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm leading-relaxed text-slate-300">{t}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-slate-300">{deal.thesis}</p>
            )}
          </div>

          {/* Key Risks */}
          <div className="bg-[#0a0e1a] p-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Key Risks
            </h4>
            {scanDeal ? (
              <ul className="space-y-2">
                {scanDeal.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 shrink-0 text-rose-400">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span className="text-sm leading-relaxed text-slate-300">{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-slate-300">{deal.risks}</p>
            )}
          </div>

          {/* Founders */}
          <div className="bg-[#0a0e1a] p-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              {scanDeal?.sourceName ? "Source & Origin" : "Founders"}
            </h4>
            {scanDeal?.sourceUrl ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  Source:{" "}
                  <a
                    href={scanDeal.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {scanDeal.sourceName}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1 inline-block opacity-50">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </p>
                {scanDeal.website && (
                  <p className="text-sm text-slate-400 truncate">
                    <a
                      href={scanDeal.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition-colors"
                    >
                      {scanDeal.website}
                    </a>
                  </p>
                )}
                {scanDeal.description && (
                  <p className="text-sm leading-relaxed text-slate-400">{scanDeal.description}</p>
                )}
                {deal.founders !== "—" && (
                  <p className="text-sm text-slate-300">{deal.founders}</p>
                )}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-300">{deal.founders}</p>
            )}
          </div>

          {/* Details + Score breakdown */}
          <div className="bg-[#0a0e1a] p-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Details
            </h4>
            <div className="space-y-2.5">
              {[
                ["Pipeline Stage", deal.pipelineStage],
                ["Prior Raise", deal.raised],
                ["Last Activity", deal.lastActivity],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-300">{value}</span>
                </div>
              ))}
              {scanDeal && (
                <>
                  <div className="my-2 border-t border-white/[0.04]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Score Formula</span>
                    <span className="text-[10px] font-mono text-slate-500">0.4g + 0.3m - 0.2r + 0.1f</span>
                  </div>
                  {[
                    ["Growth Proxy", scanDeal.growth],
                    ["Momentum Proxy", scanDeal.momentum],
                    ["Volatility (Risk)", scanDeal.volatility],
                    ["Thematic Fit", scanDeal.thematicFit],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{label as string}</span>
                      <span className="text-sm font-medium text-slate-300">{value as number}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notes section (only after scan) */}
        {hasScanned && (
          <div className="border-t border-white/[0.06] bg-[#0a0e1a] p-6">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Notes
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                placeholder="Add a note about this company..."
                className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/40"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/[0.1] disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {notes.length > 0 && (
              <div className="mt-3 space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <p className="text-sm text-slate-300">{note.content}</p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      {new Date(note.created_at + "Z").toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
