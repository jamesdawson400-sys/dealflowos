"use client";

import { useScan } from "@/context/ScanContext";

export default function TopOpportunities() {
  const { topOpportunities, hasScanned, selectCompany, selectedDeal } = useScan();

  if (!hasScanned || topOpportunities.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 pb-8">
      <div className="mb-4 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <h2 className="text-lg font-semibold text-white">Top Opportunities</h2>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
          Top 3
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {topOpportunities.slice(0, 3).map((deal, idx) => (
          <div
            key={deal.id}
            onClick={() => selectCompany(deal.id)}
            className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-gradient-to-br from-amber-950/20 to-[#0a0e1a] p-5 transition-all hover:border-amber-500/20 ${selectedDeal?.id === deal.id ? "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.07)]" : "border-amber-500/10"}`}
          >
            {/* Rank badge */}
            <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400">
              {idx + 1}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 text-xs font-bold text-amber-400">
                {deal.company
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{deal.company}</p>
                <p className="text-xs text-slate-500">
                  {deal.sector} · {deal.stage}
                </p>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-slate-500">Deal Score</span>
                <span className="text-sm font-bold text-emerald-400">{deal.score}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${deal.score}%` }}
                />
              </div>
            </div>

            {/* Thesis points */}
            <div className="mt-3 space-y-1.5">
              {deal.thesis.slice(0, 2).map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mt-0.5 shrink-0 text-emerald-500"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-xs leading-relaxed text-slate-400">{t}</span>
                </div>
              ))}
            </div>

            {/* Metrics row */}
            <div className="mt-3 flex items-center gap-3 border-t border-white/[0.04] pt-3">
              <div className="text-center">
                <p className="text-[10px] uppercase text-slate-600">Growth</p>
                <p className="text-xs font-semibold text-blue-400">{deal.growth}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase text-slate-600">Momentum</p>
                <p className="text-xs font-semibold text-violet-400">{deal.momentum}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase text-slate-600">Risk</p>
                <p className="text-xs font-semibold text-rose-400">{deal.volatility}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase text-slate-600">Fit</p>
                <p className="text-xs font-semibold text-emerald-400">{deal.thematicFit}</p>
              </div>
            </div>

            {/* Subtle glow */}
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-amber-500/[0.04] blur-xl transition-opacity group-hover:opacity-150" />
          </div>
        ))}
      </div>
    </section>
  );
}
