import { useEffect, useState } from "react";

const STABLES = [
  { code: "EURC", flag: "🇪🇺" },
  { code: "KRW1", flag: "🇰🇷" },
  { code: "JPYC", flag: "🇯🇵" },
  { code: "GBPT", flag: "🇬🇧" },
  { code: "BRZ", flag: "🇧🇷" },
  { code: "MXNB", flag: "🇲🇽" },
  { code: "SGDX", flag: "🇸🇬" },
  { code: "NGNX", flag: "🇳🇬" },
];

export function Hero() {
  return (
    <section className="bg-radial-mint relative overflow-hidden">
      <div className="bg-grid bg-grid-fade absolute inset-0 opacity-50" />
      <div className="relative mx-auto grid max-w-[1400px] gap-12 px-6 pt-20 pb-24 lg:grid-cols-[1.15fr,1fr] lg:gap-10">
        {/* Left: copy + command bar */}
        <div className="relative">
          <div className="mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-2 py-1 text-primary">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
              LIVE
            </span>
            <span>ED. 0001</span>
            <span className="text-border-strong">·</span>
            <span>SOLVER V0.3</span>
            <span className="text-border-strong">·</span>
            <span>11 STABLES</span>
          </div>

          <h1 className="text-[clamp(2.75rem,7vw,5.5rem)] leading-[1.02] font-medium tracking-[-0.02em]">
            The native{" "}
            <span className="font-serif-italic text-primary">FX layer</span>
            <br />
            for stablecoin
            <br />
            money.
          </h1>

          <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Liquira settles cross-currency payments on Arc through depth-aware,
            multi-stablecoin liquidity. Eleven native stables — USDC, EURC, KRW1,
            JPYC and more — routed at sub-basis-point slippage in{" "}
            <span className="text-foreground">under 400 ms</span>.
          </p>

          {/* Command bar */}
          <div className="mt-10 max-w-xl">
            <div className="flex items-center gap-3 border border-border bg-surface-1 px-4 py-3 font-mono text-[13px]">
              <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘</span>
              <span className="text-foreground/80">
                swap <span className="text-foreground">10,000 USDC</span>{" "}
                <span className="text-primary">→</span>{" "}
                <span className="text-foreground">KRW1</span>
              </span>
              <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                ROUTE <span className="text-primary">↵</span>
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>
                Try: <span className="text-foreground/70">EURC → JPYC</span> ,{" "}
                <span className="text-foreground/70">100k USDC → BRZ</span>
              </span>
              <span>esc · clear</span>
            </div>
          </div>

          {/* KPI strip */}
          <div className="mt-12 grid max-w-2xl grid-cols-2 gap-y-6 sm:grid-cols-4">
            {[
              ["TVL", "$189.96M"],
              ["24H VOLUME", "$30.05M"],
              ["AVG SLIPPAGE", "0.71 bps"],
              ["ISSUERS ROUTED", "8"],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="text-mono-label">{l}</div>
                <div className="mt-1 font-mono text-lg text-foreground">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-widest text-muted-foreground/70">
            {["Circle", "BDACS", "JPYC", "STRAITSX", "Bitso", "Transfero", "POUNDTOKEN"].map((i) => (
              <span key={i}>{i.toUpperCase()}</span>
            ))}
          </div>
        </div>

        {/* Right: stable graph */}
        <StableGraph />
      </div>
    </section>
  );
}

function StableGraph() {
  return (
    <div className="space-y-6">
      <div className="corner-frame relative border border-primary/30 bg-surface-1/40 p-6">
        <span className="corner-bl">+</span>
        <span className="corner-br">+</span>

        <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-muted-foreground">
          <span>FIG. 01 · STABLE GRAPH</span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
            LIVE
          </span>
        </div>

        <div className="relative mx-auto mt-6 aspect-square max-w-[420px]">
          {/* Concentric rings */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id="hubGlow">
                <stop offset="0%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-primary/30" strokeDasharray="0.5 1" />
            <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-primary/25" strokeDasharray="0.5 1" />
            <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-primary/40" />
            <circle cx="50" cy="50" r="22" fill="url(#hubGlow)" />
            {STABLES.map((s) => (
              <line key={s.code} x1="50" y1="50" x2={s.x} y2={s.y} stroke="currentColor" strokeWidth="0.15" className="text-primary/30" strokeDasharray="0.6 0.8" />
            ))}
          </svg>

          {/* Hub */}
          <div className="absolute top-1/2 left-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/50 bg-background/80 font-mono text-xs">
            <div className="text-center leading-tight">
              <div className="text-mono-label" style={{ fontSize: 9 }}>HUB</div>
              <div className="mt-0.5 text-foreground">USDC</div>
            </div>
          </div>

          {/* Satellite tokens */}
          {STABLES.map((s) => (
            <div
              key={s.code}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-2 text-base">
                {s.flag}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">{s.code}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 border-t border-border pt-4">
          <div>
            <div className="text-mono-label">HUB</div>
            <div className="mt-1 font-mono text-sm">USDC</div>
          </div>
          <div>
            <div className="text-mono-label">PAIRS LIVE</div>
            <div className="mt-1 font-mono text-sm">28 / 36</div>
          </div>
        </div>
      </div>

      <div className="border border-border bg-surface-1/40 p-4 font-mono text-[11px] leading-relaxed">
        <div className="text-muted-foreground">// observation_log</div>
        <div className="mt-2 space-y-1">
          <div><span className="text-muted-foreground">depth_score(USDC↔EURC) =</span> <span className="text-primary">0.94</span></div>
          <div><span className="text-muted-foreground">impact(KRW1, $100k) =</span> <span className="text-primary">1.18 bps</span></div>
          <div><span className="text-muted-foreground">solver_uptime_30d =</span> <span className="text-primary">99.98%</span></div>
        </div>
      </div>
    </div>
  );
}
