import { useEffect, useState } from "react";
import { SectionHeader } from "./Capabilities";

export function RouterSection() {
  return (
    <section id="router" className="border-t border-border bg-surface-1/30">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader eyebrow="/ ROUTER" tag="02 · router" />
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr,auto] lg:items-end">
          <h2 className="max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
            Quote, route, <span className="font-serif-italic text-primary">settle.</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Every swap is solved across all live Arc pools. The solver searches
            direct pairs, USDC bridges, and 3-hop graphs in parallel —
            selecting the cheapest path before broadcast.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
          <span>quote · <span className="text-primary">82 ms</span></span>
          <span className="text-border-strong">·</span>
          <span>solver · v0.3</span>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1.1fr)]">
          <SwapPanel />
          <div className="space-y-6">
            <DepthChart />
            <RouteTrace />
          </div>
        </div>
      </div>
    </section>
  );
}

function SwapPanel() {
  return (
    <div className="border border-border bg-background p-6">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2 tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-foreground">SWAP</span>
          <span>/ MARKET / LIMIT / TWAP</span>
        </div>
        <span className="border border-border px-2 py-0.5 text-muted-foreground">0.1% slip</span>
      </div>

      {/* You pay */}
      <div className="mt-5 border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between text-mono-label">
          <span>YOU PAY</span>
          <span>BAL · 124,500.00</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <input
            defaultValue="10000"
            className="w-full bg-transparent font-mono text-3xl text-foreground outline-none"
          />
          <button className="flex items-center gap-2 border border-border bg-surface-2 px-3 py-2 font-mono text-sm">
            <span>🇺🇸</span>
            <span>USDC</span>
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>≈ $10,000.00</span>
          <div className="flex gap-2">
            {["25%", "50%", "MAX"].map((p) => (
              <button key={p} className="border border-border px-2 py-0.5 hover:bg-surface-2">{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Flip */}
      <div className="my-2 flex justify-center">
        <button className="grid h-8 w-8 place-items-center border border-border bg-surface-1 text-primary">↓</button>
      </div>

      {/* You receive */}
      <div className="border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between text-mono-label">
          <span>YOU RECEIVE</span>
          <span>MIN · 9,220.82</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="font-mono text-3xl text-foreground">9,230.0591</div>
          <button className="flex items-center gap-2 border border-border bg-surface-2 px-3 py-2 font-mono text-sm">
            <span>🇪🇺</span>
            <span>EURC</span>
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>≈ $9,998.00</span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
            live oracle
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 space-y-1.5 font-mono text-[12px]">
        {[
          ["Rate", "1 USDC = 0.923006 EURC"],
          ["Price impact", "0.020%"],
          ["Protocol fee", "$4.0000 · 4 bps"],
          ["Network gas", "$0.0120"],
          ["Route", "USDC → EURC"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground">{v}</span>
          </div>
        ))}
      </div>

      <button className="mt-5 flex w-full items-center justify-center gap-2 bg-primary py-3 font-mono text-sm font-semibold tracking-wider text-primary-foreground hover:opacity-90">
        EXECUTE SWAP →
      </button>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>Permit2 enabled · 0 approvals</span>
        <span className="text-primary">▌ready</span>
      </div>
    </div>
  );
}

function DepthChart() {
  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2 tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>DEPTH / USDC / EURC</span>
        </div>
        <div className="flex gap-3 text-[11px]">
          <span className="text-primary">▲ bids $84.21M</span>
          <span className="text-destructive">▼ asks $83.92M</span>
        </div>
      </div>

      {/* Depth curve */}
      <div className="relative mt-4 h-32">
        <svg viewBox="0 0 200 80" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bidGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="askGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.22 28)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(0.65 0.22 28)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,75 L20,60 L40,45 L60,32 L80,20 L100,12 L100,80 L0,80 Z" fill="url(#bidGrad)" stroke="oklch(0.78 0.18 145)" strokeWidth="0.6" />
          <path d="M100,12 L120,18 L140,30 L160,42 L180,58 L200,72 L200,80 L100,80 Z" fill="url(#askGrad)" stroke="oklch(0.65 0.22 28)" strokeWidth="0.6" />
          <line x1="100" y1="0" x2="100" y2="80" stroke="currentColor" className="text-border-strong" strokeWidth="0.3" strokeDasharray="1 1" />
        </svg>
        <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 font-mono text-[10px] text-muted-foreground">
          0.92308
        </div>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>-2.0%</span><span>-1.0%</span><span>mid</span><span>+1.0%</span><span>+2.0%</span>
      </div>

      <div className="mt-4 grid grid-cols-4 border-t border-border pt-3">
        {[["SPREAD", "0.4 bps"], ["DEPTH ±1%", "$48.1M"], ["24H VOL", "$12.4M"], ["POOL FEE", "4 bps"]].map(([l, v]) => (
          <div key={l}>
            <div className="text-mono-label" style={{ fontSize: 10 }}>{l}</div>
            <div className="mt-1 font-mono text-sm">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteTrace() {
  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2 tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>ROUTE TRACE</span>
        </div>
        <span className="text-primary">solving · 8 candidates</span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-1">🇺🇸</div>
          <div className="font-mono text-xs">
            <div>USDC</div>
            <div className="text-mono-label" style={{ fontSize: 9 }}>SOURCE</div>
          </div>
        </div>
        <div className="relative h-px flex-1 bg-border">
          <div className="absolute inset-y-0 left-0 w-2/3 bg-primary/60" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 font-mono text-[10px] text-primary">
            1 hop · 0.4s
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs text-right">
            <div>EURC</div>
            <div className="text-mono-label" style={{ fontSize: 9 }}>DEST</div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-1">🇪🇺</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 border-t border-border pt-3 font-mono text-[12px]">
        {[["HOPS", "1"], ["NOTIONAL", "$10,000"], ["POOLS", "1"], ["SETTLEMENT", "~ 0.4s"]].map(([l, v]) => (
          <div key={l}>
            <div className="text-mono-label" style={{ fontSize: 10 }}>{l}</div>
            <div className="mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-3 font-mono text-[11px] leading-relaxed">
        <div className="text-muted-foreground">// solver_log</div>
        <div className="mt-1 text-foreground/80">
          fetched 8 pools · sized 1 candidate path · saved{" "}
          <span className="text-primary">1.42 bps</span> vs naive quote
        </div>
        <div className="mt-1 text-muted-foreground">
          tx_hash <span className="text-foreground/80">0x71e…a3f9</span> · arc-testnet ·{" "}
          <span className="text-primary">ready to broadcast ▌</span>
        </div>
      </div>
    </div>
  );
}
