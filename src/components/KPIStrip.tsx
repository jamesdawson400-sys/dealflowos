"use client";

import { useScan } from "@/context/ScanContext";

const kpiConfig = [
  {
    key: "dealsInInbox" as const,
    label: "Deals In Inbox",
    color: "from-blue-500 to-blue-600",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <path d="M2 12h7l2 3h2l2-3h7" />
      </svg>
    ),
  },
  {
    key: "highPriority" as const,
    label: "High Priority",
    color: "from-amber-500 to-orange-600",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    key: "inPartnerReview" as const,
    label: "In Partner Review",
    color: "from-violet-500 to-purple-600",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "watchlistCompanies" as const,
    label: "Watchlist Companies",
    color: "from-emerald-500 to-green-600",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export default function KPIStrip() {
  const { kpis, hasScanned } = useScan();

  return (
    <section className="mx-auto max-w-7xl px-6 pb-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiConfig.map((kpi) => (
          <div
            key={kpi.label}
            className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{kpi.label}</p>
                <p className="mt-2 text-3xl font-bold text-white">{kpis[kpi.key]}</p>
                {hasScanned && (
                  <p className="mt-1 text-xs text-blue-400/70">from scan</p>
                )}
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${kpi.color} text-white opacity-80`}
              >
                {kpi.icon}
              </div>
            </div>
            <div
              className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${kpi.color} opacity-[0.04] blur-2xl transition-opacity group-hover:opacity-[0.08]`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
