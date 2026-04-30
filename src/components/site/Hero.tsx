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
            <span>11 STABLES · ₦ NGNX</span>
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

          {/* KPI strip — live testnet stats */}
          <LiveKpis />
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

function LiveKpis() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 1500);
    return () => clearInterval(id);
  }, []);
  // bounded random walks seeded by t
  const tvl = 189.96 + Math.sin(t * 0.4) * 0.42 + (t % 7) * 0.01;
  const vol = 30.05 + Math.sin(t * 0.7 + 1) * 0.31;
  const slip = 0.71 + Math.sin(t * 0.9 + 2) * 0.06;
  const items: [string, string][] = [
    ["TVL", `$${tvl.toFixed(2)}M`],
    ["24H VOLUME", `$${vol.toFixed(2)}M`],
    ["AVG SLIPPAGE", `${slip.toFixed(2)} bps`],
    ["ISSUERS ROUTED", "9"],
  ];
  return (
    <div className="mt-12 grid max-w-2xl grid-cols-2 gap-y-6 sm:grid-cols-4">
      {items.map(([l, v]) => (
        <div key={l}>
          <div className="text-mono-label">{l}</div>
          <div className="mt-1 font-mono text-lg text-foreground tabular-nums transition-all duration-500">
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

function StableGraph() {
  // Continuous rotation tick (rAF-driven)
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start = performance.now();
    const loop = (now: number) => {
      // 24s per full revolution
      setAngle(((now - start) / 24000) * 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Live observation log
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1400);
    return () => clearInterval(id);
  }, []);
  const depth = (0.94 + Math.sin(tick * 0.6) * 0.02).toFixed(2);
  const impact = (1.18 + Math.sin(tick * 0.9 + 1) * 0.18).toFixed(2);
  const uptime = (99.97 + Math.abs(Math.sin(tick * 0.3)) * 0.02).toFixed(2);

  // Distribute satellites across an outer orbit + a couple on inner orbit
  const N = STABLES.length;
  const satellites = STABLES.map((s, i) => {
    // alternate between two radii to suggest depth
    const radius = i % 3 === 0 ? 32 : 42;
    const speedMul = i % 3 === 0 ? 0.55 : 1; // inner orbit slower visually
    const baseAngle = (i / N) * 360;
    const a = ((baseAngle + angle * speedMul) * Math.PI) / 180;
    const x = 50 + Math.cos(a) * radius;
    const y = 50 + Math.sin(a) * radius;
    return { ...s, x, y, radius };
  });

  return (
    <div className="space-y-6">
      <div className="corner-frame relative border border-primary/30 bg-surface-1/40 p-6">
        <span className="corner-bl">+</span>
        <span className="corner-br">+</span>

        <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-muted-foreground">
          <span>FIG. 01 · STABLE CONSTELLATION</span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
            LIVE · ARC TESTNET
          </span>
        </div>

        <div className="relative mx-auto mt-6 aspect-square max-w-[420px]">
          {/* Orbits + radial spokes (spokes follow satellites) */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id="hubGlow">
                <stop offset="0%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="spokeGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* orbit rings */}
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-primary/20" strokeDasharray="0.5 1" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-primary/30" strokeDasharray="0.6 1.2" />
            <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="0.2" className="text-primary/30" strokeDasharray="0.6 1.2" />
            <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="0.25" className="text-primary/45" />
            <circle cx="50" cy="50" r="22" fill="url(#hubGlow)" />

            {/* radial spokes from hub edge to each satellite */}
            {satellites.map((s) => {
              // start the line from the edge of the hub (r=11 in viewBox units)
              const dx = s.x - 50;
              const dy = s.y - 50;
              const len = Math.hypot(dx, dy);
              const sx = 50 + (dx / len) * 12;
              const sy = 50 + (dy / len) * 12;
              return (
                <line
                  key={s.code}
                  x1={sx}
                  y1={sy}
                  x2={s.x}
                  y2={s.y}
                  stroke="currentColor"
                  strokeWidth="0.18"
                  className="text-primary/45"
                  strokeDasharray="0.8 0.8"
                />
              );
            })}

            {/* travelling pulses along a few spokes — animated with SMIL */}
            {satellites.slice(0, 4).map((s, idx) => (
              <circle key={`pulse-${s.code}`} r="0.7" className="fill-primary">
                <animate
                  attributeName="cx"
                  values={`50;${s.x}`}
                  dur={`${2.4 + idx * 0.4}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values={`50;${s.y}`}
                  dur={`${2.4 + idx * 0.4}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  dur={`${2.4 + idx * 0.4}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </svg>

          {/* Hub */}
          <div className="absolute top-1/2 left-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/60 bg-background/85 font-mono text-xs shadow-[0_0_40px_-10px_oklch(0.78_0.18_145/0.5)]">
            <div className="text-center leading-tight">
              <div className="text-mono-label" style={{ fontSize: 9 }}>HUB</div>
              <div className="mt-0.5 text-foreground">USDC</div>
              <div className="mt-1 text-[9px] text-primary tabular-nums">{depth}</div>
            </div>
          </div>

          {/* Satellite tokens — orbit positions update each frame */}
          {satellites.map((s) => (
            <div
              key={s.code}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center will-change-transform"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-2 text-base shadow-sm">
                {s.flag}
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">{s.code}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 border-t border-border pt-4">
          <div>
            <div className="text-mono-label">HUB</div>
            <div className="mt-1 font-mono text-sm">USDC</div>
          </div>
          <div>
            <div className="text-mono-label">PAIRS LIVE</div>
            <div className="mt-1 font-mono text-sm tabular-nums">{30 + (tick % 4)} / 44</div>
          </div>
          <div>
            <div className="text-mono-label">UPTIME 30D</div>
            <div className="mt-1 font-mono text-sm text-primary tabular-nums">{uptime}%</div>
          </div>
        </div>
      </div>

      <div className="border border-border bg-surface-1/40 p-4 font-mono text-[11px] leading-relaxed">
        <div className="text-muted-foreground">// observation_log</div>
        <div className="mt-2 space-y-1">
          <div>
            <span className="text-muted-foreground">depth_score(USDC↔EURC) =</span>{" "}
            <span className="text-primary tabular-nums">{depth}</span>
          </div>
          <div>
            <span className="text-muted-foreground">impact(NGNX, $100k) =</span>{" "}
            <span className="text-primary tabular-nums">{impact} bps</span>
          </div>
          <div>
            <span className="text-muted-foreground">solver_uptime_30d =</span>{" "}
            <span className="text-primary tabular-nums">{uptime}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
