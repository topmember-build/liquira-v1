import { useEffect, useState } from "react";
import { midCrossRate } from "@/lib/quote-engine";

const PAIRS = [
  "USDC/EURC",
  "EURC/USDC",
  "USDC/KRW1",
  "USDC/JPYC",
  "USDC/GBPT",
  "USDC/BRZ",
  "USDC/MXNB",
  "USDC/SGDX",
  "USDC/NGNX",
  "EURC/JPYC",
  "GBPT/EURC",
  "NGNX/USDC",
] as const;

type Tick = {
  pair: string;
  price: number;
  prev: number;
  pct: number;
  up: boolean;
  flash: number; // timestamp of last change for flash effect
};

function formatPrice(p: number): string {
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  return p.toFixed(7);
}

function quote(pair: string, jitterBps: number): number {
  const [a, b] = pair.split("/");
  const mid = midCrossRate(a, b);
  // small additive jitter so it ticks even within the same minute
  const j = (Math.random() * 2 - 1) * (jitterBps / 10_000);
  return mid * (1 + j);
}

export function Ticker() {
  const [ticks, setTicks] = useState<Tick[]>(() =>
    PAIRS.map((pair) => {
      const p = quote(pair, 0);
      return { pair, price: p, prev: p, pct: 0, up: true, flash: 0 };
    }),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTicks((prev) =>
        prev.map((t) => {
          // each tick, only some pairs move — feels organic
          if (Math.random() > 0.55) return t;
          const next = quote(t.pair, 12);
          const pct = ((next - t.price) / t.price) * 100;
          return {
            ...t,
            prev: t.price,
            price: next,
            pct: Math.abs(pct) < 0.001 ? t.pct : pct,
            up: next >= t.price,
            flash: Date.now(),
          };
        }),
      );
    }, 1100);
    return () => clearInterval(id);
  }, []);

  // duplicate three times for seamless scroll
  const items = [...ticks, ...ticks, ...ticks];

  return (
    <div className="overflow-hidden border-y border-border bg-surface-1/50 py-2">
      <div className="flex w-max animate-ticker gap-8 font-mono text-[11px] whitespace-nowrap">
        {items.map((t, i) => {
          const fresh = Date.now() - t.flash < 900;
          return (
            <span key={`${t.pair}-${i}`} className="flex items-center gap-2 text-muted-foreground">
              <span className="text-foreground/80">{t.pair}</span>
              <span
                className={`tabular-nums transition-colors duration-500 ${
                  fresh ? (t.up ? "text-primary" : "text-destructive") : "text-foreground"
                }`}
              >
                {formatPrice(t.price)}
              </span>
              <span className={t.up ? "text-primary" : "text-destructive"}>
                {t.up ? "▲" : "▼"}
              </span>
              <span className={`tabular-nums ${t.up ? "text-primary" : "text-destructive"}`}>
                {Math.abs(t.pct).toFixed(2)}%
              </span>
              <span className="text-border-strong">·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function StatusBar() {
  return (
    <div className="border-b border-border bg-background py-2">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>LIQUIRA · FX ROUTER · V0.3.1</span>
        <span className="hidden md:inline">EDITION N° 0001 · ARC TESTNET</span>
        <span>DOC · 04 / 27 / 26</span>
      </div>
    </div>
  );
}
