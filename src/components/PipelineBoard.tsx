"use client";

import { useState } from "react";
import { useScan } from "@/context/ScanContext";
import { pipelineStages } from "@/lib/mockData";

const stageColors: Record<string, string> = {
  New: "bg-blue-500",
  Reviewing: "bg-violet-500",
  "First Pass": "bg-indigo-500",
  "Partner Review": "bg-amber-500",
  Watchlist: "bg-emerald-500",
  Pass: "bg-slate-600",
};

function StageMenu({
  companyId,
  currentStage,
  onClose,
}: {
  companyId: string;
  currentStage: string;
  onClose: () => void;
}) {
  const { updatePipelineStage } = useScan();

  const handleMove = async (stage: string) => {
    if (stage === currentStage) { onClose(); return; }
    await updatePipelineStage(companyId, stage);
    onClose();
  };

  return (
    <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-white/[0.08] bg-[#111827] py-1 shadow-xl">
      {pipelineStages.map((stage) => (
        <button
          key={stage}
          onClick={() => handleMove(stage)}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06] ${
            stage === currentStage ? "text-blue-400" : "text-slate-300"
          }`}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${stageColors[stage]}`} />
          {stage}
          {stage === currentStage && <span className="ml-auto text-blue-400">✓</span>}
        </button>
      ))}
    </div>
  );
}

export default function PipelineBoard() {
  const { deals, isScanning, hasScanned } = useScan();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <section id="pipeline" className="mx-auto max-w-7xl px-6 pb-12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Pipeline</h2>
        <p className="mt-1 text-sm text-slate-500">
          {hasScanned ? "Click any card to change its stage" : "Current deal flow across all stages"}
        </p>
      </div>
      <div className={`flex gap-4 overflow-x-auto pb-4 transition-opacity ${isScanning ? "opacity-40" : ""}`}>
        {pipelineStages.map((stage) => {
          const stageDeals = deals.filter((d) => d.pipelineStage === stage);
          return (
            <div key={stage} className="min-w-[240px] flex-1">
              <div className="mb-3 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${stageColors[stage]}`} />
                <h3 className="text-sm font-medium text-slate-300">{stage}</h3>
                <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-slate-500">
                  {stageDeals.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.1] hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-[10px] font-bold text-white">
                          {deal.company
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{deal.company}</p>
                          <p className="text-xs text-slate-500">{deal.sector}</p>
                        </div>
                      </div>
                      {hasScanned && (
                        <button
                          onClick={() => setMenuOpen(menuOpen === deal.id ? null : deal.id)}
                          className="rounded p-1 text-slate-600 opacity-0 transition-all hover:bg-white/[0.06] hover:text-slate-400 group-hover:opacity-100"
                          title="Move to stage"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{deal.stage}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                          deal.score >= 90
                            ? "bg-emerald-500/10 text-emerald-400"
                            : deal.score >= 80
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {deal.score}
                      </span>
                    </div>
                    {menuOpen === deal.id && (
                      <StageMenu
                        companyId={deal.id}
                        currentStage={deal.pipelineStage}
                        onClose={() => setMenuOpen(null)}
                      />
                    )}
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/[0.06] p-6 text-center text-xs text-slate-600">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
