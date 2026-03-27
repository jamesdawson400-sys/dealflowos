"use client";
import { useState } from "react";

const navLinks = [
  { name: "Dashboard", href: "#dashboard" },
  { name: "Deal Inbox", href: "#inbox" },
  { name: "Pipeline", href: "#pipeline" },
  { name: "Watchlist", href: "#watchlist" },
  { name: "Activity", href: "#activity" },
];

export default function Navbar() {
  const [active, setActive] = useState("Dashboard");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4L8 1L14 4V12L8 15L2 12V4Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 1V15" stroke="white" strokeWidth="1.5" />
              <path d="M2 4L14 4" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            DealFlow <span className="text-blue-400">OS</span>
          </span>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setActive(link.name)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                active === link.name
                  ? "bg-white/[0.08] text-white"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              }`}
            >
              {link.name}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-sm text-slate-500 md:flex">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Search deals...
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-semibold text-white">
            JD
          </div>
        </div>
      </div>
    </nav>
  );
}
