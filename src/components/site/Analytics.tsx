import { SectionHeader } from "./Capabilities";

export function Analytics() {
  return (
    <section id="analytics" className="border-t border-border bg-surface-1/30">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader eyebrow="/ ANALYTICS" tag="04 · telemetry" />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
              Numbers <span className="font-serif-italic text-primary">don't lie.</span>
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Real-time view into FX flows on Arc. Built for traders, treasurers,
              and protocols moving size.
            </p>
          </div>
          <div className="flex border border-border font-mono text-[11px]">
            {["24h", "7d", "30d", "all"].map((p, i) => (
              <button
                key={p}
                className={
                  "px-3 py-1.5 " +
                  (i === 0
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-surface-1")
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="border border-border bg-background p-6 lg:col-span-2">
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span className="tracking-widest">CROSS-CURRENCY VOLUME · 48H ROLLING</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-primary" /> volume</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-chart-2" /> fees</span>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-mono text-3xl">$30,051,420</span>
              <span className="font-mono text-sm text-primary">+18.4% wow</span>
            </div>
            <div className="mt-6 h-56">
              <svg viewBox="0 0 400 160" className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="volGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[40, 80, 120].map((y) => (
                  <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth="0.5" strokeDasharray="2 3" />
                ))}
                <path
                  d="M0,120 L40,110 L80,95 L120,100 L160,75 L200,82 L240,55 L280,68 L320,40 L360,48 L400,25 L400,160 L0,160 Z"
                  fill="url(#volGrad)"
                  stroke="oklch(0.78 0.18 145)"
                  strokeWidth="1"
                />
                <polyline
                  fill="none"
                  stroke="oklch(0.7 0.16 220)"
                  strokeWidth="1"
                  points="0,140 40,138 80,132 120,135 160,125 200,128 240,118 280,122 320,110 360,114 400,102"
                />
              </svg>
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              {["48h ago", "36h", "24h", "12h", "now"].map((l) => <span key={l}>{l}</span>)}
            </div>
          </div>

          <div className="space-y-6">
            {[
              ["UNIQUE ROUTERS", "2,184", "wallets · 7d"],
              ["MEDIAN IMPACT", "0.71 bps", "all pairs"],
              ["SOLVER UPTIME", "99.98%", "30d"],
            ].map(([l, v, sub]) => (
              <div key={l} className="border border-border bg-background p-5">
                <div className="text-mono-label">{l}</div>
                <div className="mt-2 font-mono text-2xl">{v}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            ["28% share", "USDC → EURC", "$8.41M", "0.42 bps"],
            ["14% share", "USDC → KRW1", "$4.12M", "1.18 bps"],
            ["7% share", "EURC → GBPT", "$1.96M", "1.84 bps"],
          ].map(([share, route, vol, impact]) => (
            <div key={route} className="border border-border bg-background p-5">
              <div className="flex items-center justify-between text-mono-label">
                <span>TOP ROUTE</span>
                <span className="text-primary">{share}</span>
              </div>
              <div className="mt-2 font-mono text-lg">{route}</div>
              <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>vol 24h <span className="text-foreground">{vol}</span></span>
                <span>impact <span className="text-foreground">{impact}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
