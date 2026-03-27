export default function HeroHeader() {
  return (
    <section className="relative overflow-hidden pb-8 pt-28">
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute -top-20 left-1/3 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-violet-600/[0.05] blur-[100px]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-3 py-1 text-xs font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Live Pipeline
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            DealFlow <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">OS</span>
          </h1>
          <p className="max-w-xl text-lg text-slate-400">
            Agent-powered sourcing and pipeline operating system for investors
          </p>
        </div>
      </div>
    </section>
  );
}
