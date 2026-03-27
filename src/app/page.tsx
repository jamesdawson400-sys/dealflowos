import Navbar from "@/components/Navbar";
import HeroHeader from "@/components/HeroHeader";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#060a14]">
      <Navbar />
      <HeroHeader />
      <Dashboard />
      <footer className="border-t border-white/[0.04] py-8 text-center text-xs text-slate-600">
        DealFlow OS · Phase 1 · Pipeline Operating System for Investors
      </footer>
    </main>
  );
}
