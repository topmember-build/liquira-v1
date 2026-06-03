import { useEffect, useRef, useState } from "react";
import { usePrices } from "@/contexts/PricesContext";

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
  pct: number;
  up: boolean;
  flash: number;
};

function formatPrice(p: number): string {
  if (!Number.isFinite(p) || p === 0) return "-";
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  return p.toFixed(7);
}

export function Ticker() {
  const { crossRate, feed } = usePrices();
  const [ticks, setTicks] = useState<Tick[]>(() =>
    PAIRS.map((pair) => ({ pair, price: 0, pct: 0, up: true, flash: 0 })),
  );
  const lastSeenAt = useRef<string | null>(null);
  // Keep a stable ref to crossRate so the effect doesn't re-run when the fn ref changes
  const crossRateRef = useRef(crossRate);
  crossRateRef.current = crossRate;

  useEffect(() => {
    if (!feed) return;
    if (lastSeenAt.current === feed.fetchedAt) return;
    lastSeenAt.current = feed.fetchedAt;
    setTicks((prev) =>
      prev.map((t) => {
        const [a, b] = t.pair.split("/");
        const next = crossRateRef.current(a, b);
        if (!next) return t;
        const old = t.price || next;
        const pct = ((next - old) / old) * 100;
        return {
          ...t,
          price: next,
          pct: Math.abs(pct) < 0.0005 ? t.pct : pct,
          up: next >= old,
          flash: Date.now(),
        };
      }),
    );
  }, [feed]);

  const items = [...ticks, ...ticks, ...ticks];

  return (
    <div className="overflow-hidden border-y border-border bg-surface-1/50 py-2">
      <div className="flex w-max animate-ticker gap-8 font-mono text-[11px] whitespace-nowrap">
        {items.map((t, i) => {
          const fresh = Date.now() - t.flash < 1100;
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
  const { feed, error, failCount } = usePrices();
  const live = !!feed && !error;
  const stale = !!feed && !!error; // have old data but current poll failing
  const ts = feed ? new Date(feed.fetchedAt).toLocaleTimeString() : "-";

  let statusLabel: string;
  let dotClass: string;
  if (live) {
    statusLabel = `LIVE FEED · COINGECKO + EXCHANGERATE.HOST · ${ts}`;
    dotClass = "animate-pulse-soft bg-primary";
  } else if (stale) {
    statusLabel = `STALE (${failCount} fail${failCount > 1 ? "s" : ""}) · LAST OK ${ts}`;
    dotClass = "animate-pulse-soft bg-warning";
  } else {
    statusLabel = "FEED OFFLINE - FALLBACK";
    dotClass = "bg-destructive";
  }

  return (
    <div className="border-b border-border bg-background py-2">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>LIQUIRA · FX ROUTER · V1.0.1</span>
        <span className="hidden md:flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
          {statusLabel}
        </span>
        <span>EDITION N° 0001 · ARC TESTNET</span>
      </div>
    </div>
  );
}
