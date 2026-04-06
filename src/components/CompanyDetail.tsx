"use client";

import { useState, useEffect, useCallback } from "react";
import { useScan } from "@/context/ScanContext";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

// ── Radar chart (pure SVG, no library) ───────────────────────────────────────
function RadarChart({ breakdown }: {
  breakdown: { marketOpportunity: number; sectorGrowth: number; founderCredibility: number; fundingMomentum: number; productDifferentiation: number }
}) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 72;
  const axes = [
    { label: "Market", max: 25, value: breakdown.marketOpportunity },
    { label: "Sector", max: 20, value: breakdown.sectorGrowth },
    { label: "Founders", max: 20, value: breakdown.founderCredibility },
    { label: "Funding", max: 20, value: breakdown.fundingMomentum },
    { label: "Product", max: 15, value: breakdown.productDifferentiation },
  ];
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const toXY = (ratio: number, index: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  };

  const dataPoints = axes.map((a, i) => toXY(a.value / a.max, i));
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const axisEndPoints = axes.map((_, i) => toXY(1.0, i));
  const labelPoints = axes.map((_, i) => toXY(1.28, i));

  const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {gridLevels.map((level) => {
        const pts = axes.map((_, i) => {
          const p = toXY(level, i);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={level} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
      })}

      {/* Axis lines */}
      {axisEndPoints.map((pt, i) => (
        <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}

      {/* Data polygon */}
      <polygon
        points={polyPoints}
        fill="rgba(99,102,241,0.18)"
        stroke="#6366f1"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#818cf8" />
      ))}

      {/* Labels */}
      {labelPoints.map((pt, i) => (
        <text
          key={i}
          x={pt.x}
          y={pt.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fill="rgba(148,163,184,0.8)"
          fontFamily="system-ui, sans-serif"
        >
          {axes[i]!.label}
        </text>
      ))}
    </svg>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold text-slate-300">{value}<span className="text-slate-600">/{max}</span></span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Memo renderer (markdown-lite) ─────────────────────────────────────────────
function MemoRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");

  return (
    <div className="space-y-0">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h3 key={i} className="mb-3 mt-6 text-base font-semibold text-white first:mt-0">{line.slice(3)}</h3>;
        }
        if (line === "---") {
          return <hr key={i} className="my-4 border-white/[0.06]" />;
        }
        if (line.startsWith("- ")) {
          const content = line.slice(2);
          return (
            <div key={i} className="flex items-start gap-2.5 py-1">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/60" />
              <p className="text-sm leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: renderInline(content) }} />
            </div>
          );
        }
        if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
          return <p key={i} className="mt-4 text-xs leading-relaxed text-slate-500" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(1, -1)) }} />;
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />;
      })}
    </div>
  );
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2">$1</a>');
}

// ── Pill ──────────────────────────────────────────────────────────────────────
function Pill({ text, variant = "default" }: { text: string; variant?: "orange" | "blue" | "green" | "violet" | "default" }) {
  const styles = {
    orange: "border-orange-500/20 bg-orange-500/10 text-orange-400",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-400",
    default: "border-white/[0.08] bg-white/[0.04] text-slate-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {text}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CompanyDetail() {
  const { selectedDeal, hasScanned, isScanning, toggleWatchlist, addNote, scanDeals } = useScan();
  const deal = selectedDeal;
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<"memo" | "profile" | "scores">("memo");

  const loadNotes = useCallback(async () => {
    if (!deal || !hasScanned) return;
    try {
      const res = await fetch(`/api/companies/${deal.id}/notes`);
      if (res.ok) setNotes((await res.json()).notes ?? []);
    } catch { /* ignore */ }
  }, [deal, hasScanned]);

  useEffect(() => { loadNotes(); }, [loadNotes]);
  useEffect(() => { setActiveTab("memo"); }, [deal?.id]);

  if (!deal) return null;

  const yc = deal.ycData;
  const bd = deal.scoreBreakdown;

  const scoreColor =
    deal.score >= 75 ? "text-emerald-400" :
    deal.score >= 60 ? "text-blue-400" :
    deal.score >= 45 ? "text-amber-400" : "text-slate-400";

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    await addNote(deal.id, text);
    setNoteText("");
    loadNotes();
  };

  return (
    <section id="company-detail" className="mx-auto max-w-7xl px-6 pb-12 scroll-mt-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Investment Memo — {deal.company}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Score: {deal.score}/100 · {deal.sector} · {deal.stage}
            {hasScanned && scanDeals.length > 1 && (
              <span className="ml-3 text-slate-600">
                {scanDeals.findIndex(d => d.id === deal.id) + 1} of {scanDeals.length} — click any row to switch
              </span>
            )}
          </p>
        </div>
        {deal.website && (
          <a
            href={deal.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-white/[0.06]"
          >
            Visit Website
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        )}
      </div>

      <div className={`overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-opacity ${isScanning ? "opacity-40" : ""}`}>

        {/* ── Header ── */}
        <div className="border-b border-white/[0.06] bg-gradient-to-r from-blue-600/[0.07] to-violet-600/[0.05] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/80 to-violet-600/80 text-lg font-bold text-white shadow-lg">
                {deal.company.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                {yc?.isTopCompany && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">★</span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {deal.website ? (
                    <a href={deal.website} target="_blank" rel="noopener noreferrer"
                      className="text-2xl font-bold text-white transition-colors hover:text-blue-400">
                      {deal.company}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1.5 inline-block opacity-40">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <h3 className="text-2xl font-bold text-white">{deal.company}</h3>
                  )}
                  {yc?.isTopCompany && <Pill text="YC Top Company" variant="orange" />}
                  {yc?.ycStatus === "Active" && <Pill text="Active" variant="green" />}
                  {yc?.ycStatus === "Acquired" && <Pill text="Acquired" variant="blue" />}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                  <span>{deal.sector}</span>
                  <span className="text-slate-700">·</span>
                  <span>{deal.stage}</span>
                  {deal.location && <><span className="text-slate-700">·</span><span>{deal.location}</span></>}
                  {yc?.batch && <><span className="text-slate-700">·</span><span className="text-orange-400/80">{yc.batch}</span></>}
                </div>
                {(yc?.oneLiner || deal.description) && (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                    {yc?.oneLiner || deal.description}
                  </p>
                )}
              </div>
            </div>

            {/* Score + watchlist */}
            <div className="flex items-start gap-3">
              {hasScanned && (
                <button onClick={() => { toggleWatchlist(deal.id); setIsWatchlisted(!isWatchlisted); }}
                  className={`rounded-lg border p-2.5 transition-all ${isWatchlisted ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-white/[0.06] bg-white/[0.03] text-slate-500 hover:border-amber-500/20 hover:text-amber-400"}`}
                  title="Toggle watchlist">
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
              {yc.tags.slice(0, 7).map(tag => <Pill key={tag} text={tag} variant="default" />)}
              {deal.sourceUrl && (
                <a href={deal.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-orange-500/15 bg-orange-500/8 px-2.5 py-0.5 text-xs text-orange-400/70 transition-colors hover:text-orange-400">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  {deal.sourceName}
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b border-white/[0.04]">
          {([
            { key: "memo", label: "Investment Memo" },
            { key: "scores", label: "Score Breakdown" },
            { key: "profile", label: "Notes" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${activeTab === tab.key ? "border-b-2 border-violet-500 text-white" : "text-slate-500 hover:text-slate-300"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Investment Memo tab ── */}
        {activeTab === "memo" && (
          <div className="p-6 lg:p-8">
            {deal.memo ? (
              <MemoRenderer markdown={deal.memo} />
            ) : (
              <p className="text-sm text-slate-500">Run a scan to generate a full investment memo.</p>
            )}
          </div>
        )}

        {/* ── Score Breakdown tab ── */}
        {activeTab === "scores" && bd && (
          <div className="grid gap-px bg-white/[0.04] lg:grid-cols-2">
            {/* Left: bars */}
            <div className="bg-[#080c18] p-6">
              <h4 className="mb-5 text-sm font-semibold text-white">Composite Score: {bd.total.toFixed(0)} / 100</h4>
              <div className="space-y-4">
                <ScoreBar label="Market Opportunity" value={bd.marketOpportunity} max={25} color="bg-blue-500" />
                <ScoreBar label="Sector Growth" value={bd.sectorGrowth} max={20} color="bg-violet-500" />
                <ScoreBar label="Founder Credibility" value={bd.founderCredibility} max={20} color="bg-emerald-500" />
                <ScoreBar label="Funding Momentum" value={bd.fundingMomentum} max={20} color="bg-amber-500" />
                <ScoreBar label="Product Differentiation" value={bd.productDifferentiation} max={15} color="bg-rose-500" />
              </div>
              <p className="mt-6 text-xs leading-relaxed text-slate-500">
                Scoring is deterministic and data-driven, derived from YC Directory signals: team size, batch recency, top-company status, sector growth rates, and description keyword analysis. No AI generation.
              </p>
            </div>
            {/* Right: radar */}
            <div className="flex flex-col items-center justify-center bg-[#080c18] p-6">
              <h4 className="mb-4 text-sm font-semibold text-white">Score Profile</h4>
              <RadarChart breakdown={bd} />
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-center">
                {[
                  { label: "Market", val: bd.marketOpportunity, max: 25 },
                  { label: "Sector", val: bd.sectorGrowth, max: 20 },
                  { label: "Founders", val: bd.founderCredibility, max: 20 },
                  { label: "Funding", val: bd.fundingMomentum, max: 20 },
                  { label: "Product", val: bd.productDifferentiation, max: 15 },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] text-slate-500">{item.label}</p>
                    <p className="text-sm font-semibold text-white">{item.val}<span className="text-[10px] text-slate-600">/{item.max}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Notes tab ── */}
        {activeTab === "profile" && (
          <div className="p-6">
            {hasScanned ? (
              <>
                <div className="flex gap-2">
                  <input type="text" value={noteText} onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddNote()}
                    placeholder={`Add a note on ${deal.company}...`}
                    className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/40" />
                  <button onClick={handleAddNote} disabled={!noteText.trim()}
                    className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/[0.1] disabled:opacity-30">
                    Save
                  </button>
                </div>
                {notes.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {notes.map(note => (
                      <div key={note.id} className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                        <p className="text-sm text-slate-300">{note.content}</p>
                        <p className="mt-1 text-[10px] text-slate-600">{new Date(note.created_at + "Z").toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No notes yet. Add your first note above.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">Run a scan to enable notes.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
