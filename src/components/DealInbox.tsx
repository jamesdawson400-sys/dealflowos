"use client";

import { useScan } from "@/context/ScanContext";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : score >= 80
        ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
        : score >= 70
          ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
          : "text-slate-400 bg-slate-500/10 border-slate-500/20";

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${color}`}>
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "High Priority": "text-amber-400 bg-amber-500/10 border-amber-500/20",
    New: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    "In Review": "text-violet-400 bg-violet-500/10 border-violet-500/20",
    Reviewing: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    Watching: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Pass: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles["New"]}`}
    >
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const styles: Record<string, string> = {
    "YC Directory": "text-orange-400/70 bg-orange-500/8 border-orange-500/15",
    "Hacker News (Algolia API)": "text-orange-400/70 bg-orange-500/8 border-orange-500/15",
    GitHub: "text-slate-300/70 bg-slate-500/8 border-slate-500/15",
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${styles[source] ?? "text-blue-400/70 bg-blue-500/8 border-blue-500/15"}`}>
      {source}
    </span>
  );
}

export default function DealInbox() {
  const { deals, scanDeals, hasScanned, lastTheme, isScanning, toggleWatchlist, selectCompany, selectedDeal } = useScan();

  // Build a lookup for scan deal metadata (website, source)
  const scanDealMap = new Map(scanDeals.map((sd) => [sd.id, sd]));

  return (
    <section id="inbox" className="mx-auto max-w-7xl px-6 pb-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Deal Inbox</h2>
          <p className="mt-1 text-sm text-slate-500">
            {hasScanned
              ? <>Scan results for <span className="text-blue-400">&ldquo;{lastTheme}&rdquo;</span> · {deals.length} {deals.length === 1 ? "company" : "companies"} found</>
              : "Recent inbound deals and sourced opportunities"}
          </p>
        </div>
        <button className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.06]">
          View All
        </button>
      </div>

      {hasScanned && deals.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <p className="text-sm text-slate-400">No real companies found for this theme. Try a broader search.</p>
        </div>
      )}

      {deals.length > 0 && (
        <div className={`overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-opacity ${isScanning ? "opacity-40" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Company
                  </th>
                  {hasScanned && (
                    <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Source
                    </th>
                  )}
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Sector
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Stage
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Score
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Activity
                  </th>
                  {hasScanned && (
                    <th className="px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wider text-slate-500 w-10">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {deals.slice(0, 10).map((deal) => {
                  const sd = scanDealMap.get(deal.id);
                  const website = sd?.website;
                  const sourceUrl = sd?.sourceUrl;
                  const sourceName = sd?.sourceName;

                  return (
                    <tr
                      key={deal.id}
                      onClick={() => hasScanned && selectCompany(deal.id)}
                      className={`transition-colors ${hasScanned ? "cursor-pointer hover:bg-white/[0.03]" : ""} ${selectedDeal?.id === deal.id ? "bg-blue-500/[0.06] border-l-2 border-l-blue-500/40" : ""}`}
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-bold text-white">
                            {deal.company
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            {website ? (
                              <a
                                href={website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
                              >
                                {deal.company}
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1 inline-block opacity-40">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-white">{deal.company}</p>
                            )}
                            <p className="text-xs text-slate-500">{deal.location}</p>
                          </div>
                        </div>
                      </td>
                      {hasScanned && (
                        <td className="whitespace-nowrap px-5 py-4">
                          {sourceUrl ? (
                            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                              <SourceBadge source={sourceName} />
                            </a>
                          ) : (
                            <SourceBadge source={sourceName} />
                          )}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="text-sm text-slate-300">{deal.sector}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="text-sm text-slate-400">{deal.stage}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-center">
                        <ScoreBadge score={deal.score} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge status={deal.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-slate-500">
                        {deal.lastActivity}
                      </td>
                      {hasScanned && (
                        <td className="whitespace-nowrap px-3 py-4 text-center">
                          <button
                            onClick={() => toggleWatchlist(deal.id)}
                            className="rounded p-1 text-slate-600 transition-all hover:text-amber-400"
                            title="Add to watchlist"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
