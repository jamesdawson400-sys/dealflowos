"use client";

import { useScan } from "@/context/ScanContext";
import { recentActivity } from "@/lib/mockData";

const activityColors: Record<string, string> = {
  pipeline: "bg-violet-400",
  score: "bg-blue-400",
  watchlist: "bg-emerald-400",
  new: "bg-blue-400",
  note: "bg-slate-400",
  pass: "bg-slate-500",
  meeting: "bg-amber-400",
  diligence: "bg-indigo-400",
};

export default function WatchlistActivity() {
  const { deals, hasScanned, lastTheme, activity, watchlist, toggleWatchlist } = useScan();

  // Watchlist: DB-backed or mock
  const watchlistDeals = hasScanned
    ? watchlist.length > 0
      ? watchlist
      : deals.filter((d) => d.pipelineStage === "First Pass" || d.pipelineStage === "Reviewing").slice(0, 5)
    : deals.filter((d) => d.pipelineStage === "Watchlist" || d.status === "Watching");

  // Activity: DB-backed or mock
  const displayActivity = hasScanned && activity.length > 0
    ? activity.slice(0, 8).map((a) => ({
        action: a.action,
        company: a.company_name,
        time: formatDbTime(a.created_at),
        type: a.type,
      }))
    : recentActivity;

  return (
    <section id="watchlist" className="mx-auto max-w-7xl px-6 pb-20">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Watchlist */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">
              {hasScanned ? "Watchlist" : "Watchlist"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasScanned
                ? <>Saved companies{lastTheme ? <> from <span className="text-blue-400">&ldquo;{lastTheme}&rdquo;</span></> : ""}</>
                : "Companies you're tracking"}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {watchlistDeals.length > 0 ? (
              watchlistDeals.slice(0, 6).map((deal) => (
                <div
                  key={deal.id}
                  className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 text-xs font-bold text-emerald-400">
                    {deal.company
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{deal.company}</p>
                    <p className="text-xs text-slate-500">
                      {deal.sector} · {deal.stage}
                    </p>
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    {deal.score}
                  </span>
                  {hasScanned && (
                    <button
                      onClick={() => toggleWatchlist(deal.id)}
                      className="rounded p-1 text-slate-600 transition-all hover:text-amber-400"
                      title="Toggle watchlist"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.06] p-8 text-center text-sm text-slate-600">
                No companies on watchlist yet
              </div>
            )}
            {/* Extra mock items only when no real data */}
            {!hasScanned &&
              [
                { name: "Helios Energy", sector: "Clean Energy", stage: "Series A", score: 78 },
                { name: "Quantum Mesh", sector: "Infrastructure", stage: "Seed", score: 81 },
                { name: "Nura Diagnostics", sector: "Biotech", stage: "Series A", score: 76 },
              ].map((item) => (
                <div
                  key={item.name}
                  className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 text-xs font-bold text-emerald-400">
                    {item.name.split(" ").map((w) => w[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.sector} · {item.stage}</p>
                  </div>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    {item.score}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div id="activity">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasScanned && activity.length > 0 ? "Real actions from database" : "Latest actions across your pipeline"}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="divide-y divide-white/[0.04]">
              {displayActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
                  <div className={`flex h-2 w-2 rounded-full ${activityColors[item.type] ?? "bg-slate-500"}`} />
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">
                      <span className="font-medium text-white">{item.company}</span>{" "}
                      <span className="text-slate-500">—</span> {item.action}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-600">{item.time}</span>
                </div>
              ))}
              {displayActivity.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-slate-600">No recent activity</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDbTime(isoString: string): string {
  try {
    const date = new Date(isoString + "Z"); // SQLite datetime is UTC
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return isoString;
  }
}
