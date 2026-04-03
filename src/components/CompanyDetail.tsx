"use client";

import { useState, useEffect, useCallback } from "react";
import { useScan } from "@/context/ScanContext";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-slate-300">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Pill({ text, variant = "default" }: { text: string; variant?: "orange" | "blue" | "green" | "default" }) {
  const styles = {
    orange: "border-orange-500/20 bg-orange-500/10 text-orange-400",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    default: "border-white/[0.08] bg-white/[0.04] text-slate-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {text}
    </span>
  );
}

export default function CompanyDetail() {
  const { selectedDeal, hasScanned, isScanning, toggleWatchlist, addNote, scanDeals } = useScan();
  const deal = selectedDeal;
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<"thesis" | "risks" | "diligence">("thesis");

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

  // Reset tab when deal changes
  useEffect(() => { setActiveTab("thesis"); }, [deal?.id]);

  if (!deal) return null;

  const yc = deal.ycData;
  const scoreColor =
    deal.score >= 85 ? "text-emerald-400" :
    deal.score >= 70 ? "text-blue-400" :
    deal.score >= 55 ? "text-amber-400" : "text-slate-400";

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

  const thesisItems = Array.isArray(deal.thesis) ? deal.thesis : [deal.thesis];
  const riskItems = Array.isArray(deal.risks) ? deal.risks : [deal.risks];
  const diligenceItems = Array.isArray(deal.diligence) ? deal.diligence : [];

  return (
    <section id="company-detail" className="mx-auto max-w-7xl px-6 pb-12 scroll-mt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Company Detail</h2>
          <p className="mt-1 text-sm text-slate-500">
            {hasScanned
              ? `Viewing ${deal.company} — click any row in the Deal Inbox to switch`
              : "Deep dive on featured deal"}
          </p>
        </div>
        {hasScanned && scanDeals.length > 1 && (
          <span className="text-xs text-slate-600">{scanDeals.findIndex(d => d.id === deal.id) + 1} of {scanDeals.length}</span>
        )}
      </div>

      <div className={`overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-opacity ${isScanning ? "opacity-40" : ""}`}>

        {/* ── Hero Header ── */}
        <div className="border-b border-white/[0.06] bg-gradient-to-r from-blue-600/[0.07] to-violet-600/[0.05] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Logo or initials */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/80 to-violet-600/80 text-lg font-bold text-white shadow-lg">
                {deal.company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                {yc?.isTopCompany && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white" title="YC Top Company">★</span>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {deal.website ? (
                    <a
                      href={deal.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xl font-bold text-white transition-colors hover:text-blue-400"
                    >
                      {deal.company}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1.5 inline-block opacity-40">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <h3 className="text-2xl font-bold text-white">{deal.company}</h3>
                  )}
                  {yc?.isTopCompany && <Pill text="YC Top Company" variant="orange" />}
                  {yc?.ycStatus === "Acquired" && <Pill text="Acquired" variant="blue" />}
                  {yc?.ycStatus === "Active" && <Pill text="Active" variant="green" />}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                  <span>{deal.sector}</span>
                  <span className="text-slate-700">·</span>
                  <span>{deal.stage}</span>
                  {deal.location && <><span className="text-slate-700">·</span><span>{deal.location}</span></>}
                  {yc?.batch && <><span className="text-slate-700">·</span><span className="text-orange-400/80">{yc.batch}</span></>}
                </div>

                {/* One-liner */}
                {(yc?.oneLiner || deal.description) && (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                    {yc?.oneLiner || deal.description}
                  </p>
                )}
              </div>
            </div>

            {/* Score + actions */}
            <div className="flex items-start gap-3">
              {hasScanned && (
                <button
                  onClick={handleWatchlist}
                  className={`rounded-lg border p-2.5 transition-all ${
                    isWatchlisted
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : "border-white/[0.06] bg-white/[0.03] text-slate-500 hover:border-amber-500/20 hover:text-amber-400"
                  }`}
                  title="Toggle watchlist"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={isWatchlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              )}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Deal Score</p>
                <p className={`mt-0.5 text-3xl font-bold ${scoreColor}`}>{deal.score}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">{deal.pipelineStage}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {yc?.tags && yc.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {yc.tags.slice(0, 6).map((tag) => (
                <Pill key={tag} text={tag} variant="default" />
              ))}
              {deal.sourceUrl && (
                <a
                  href={deal.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-orange-500/15 bg-orange-500/8 px-2.5 py-0.5 text-xs text-orange-400/70 transition-colors hover:text-orange-400"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  {deal.sourceName}
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Two-column body ── */}
        <div className="grid gap-px bg-white/[0.04] lg:grid-cols-3">

          {/* Left: Analysis tabs (2/3 width) */}
          <div className="col-span-2 bg-[#080c18] p-6">

            {/* Tab bar */}
            <div className="mb-5 flex gap-1 rounded-lg border border-white/[0.04] bg-white/[0.02] p-1">
              {(["thesis", "risks", "diligence"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all ${
                    activeTab === tab
                      ? "bg-white/[0.08] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-400"
                  }`}
                >
                  {tab === "thesis" ? "Investment Thesis" : tab === "risks" ? "Key Risks" : "Diligence"}
                </button>
              ))}
            </div>

            {/* Thesis tab */}
            {activeTab === "thesis" && (
              <div className="space-y-3">
                {thesisItems.map((point, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">{point}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Risks tab */}
            {activeTab === "risks" && (
              <div className="space-y-3">
                {riskItems.map((risk, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-rose-500/[0.08] bg-rose-500/[0.03] px-4 py-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-rose-400">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="text-sm leading-relaxed text-slate-300">{risk}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Diligence tab */}
            {activeTab === "diligence" && (
              <div className="space-y-2">
                <p className="mb-3 text-xs text-slate-500">Standard first-pass diligence questions for this company</p>
                {diligenceItems.length > 0 ? (
                  diligenceItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-blue-400/60">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <p className="text-sm leading-relaxed text-slate-300">{item}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Run a scan to generate company-specific diligence questions.</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Metrics + details (1/3 width) */}
          <div className="bg-[#080c18] p-6">

            {/* Score breakdown */}
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Score Breakdown</h4>
            <div className="space-y-3">
              <ScoreBar label="Growth Signal" value={deal.growth} color="bg-emerald-500" />
              <ScoreBar label="Momentum" value={deal.momentum} color="bg-blue-500" />
              <ScoreBar label="Risk / Volatility" value={deal.volatility} color="bg-rose-500" />
              <ScoreBar label="Thematic Fit" value={deal.thematicFit} color="bg-violet-500" />
            </div>

            <div className="my-5 border-t border-white/[0.04]" />

            {/* Key facts */}
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Company Facts</h4>
            <div className="space-y-2.5">
              {[
                ["Pipeline", deal.pipelineStage],
                ["Stage", deal.stage],
                ["Team Size", yc?.teamSize ? `${yc.teamSize} people` : deal.founders],
                ["YC Batch", yc?.batch || deal.lastActivity],
                ["Location", deal.location || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="shrink-0 text-xs text-slate-600">{label}</span>
                  <span className="text-right text-xs font-medium text-slate-300">{value}</span>
                </div>
              ))}
              {deal.website && (
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0 text-xs text-slate-600">Website</span>
                  <a
                    href={deal.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-right text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                  >
                    {deal.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>

            {/* Notes section */}
            {hasScanned && (
              <>
                <div className="my-5 border-t border-white/[0.04]" />
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    placeholder="Add a note..."
                    className="h-8 flex-1 min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500/40"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-all hover:bg-white/[0.1] disabled:opacity-30"
                  >
                    Add
                  </button>
                </div>
                {notes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {notes.map((note) => (
                      <div key={note.id} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                        <p className="text-xs text-slate-300">{note.content}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600">
                          {new Date(note.created_at + "Z").toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
