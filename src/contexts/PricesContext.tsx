import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getLivePrices } from "@/server/prices.functions";
import type { PriceFeed } from "@/server/prices.functions";

type PricesContextValue = {
  feed: PriceFeed | null;
  loading: boolean;
  error: string | null;
  /** Consecutive poll failures. */
  failCount: number;
  /** Returns the USD price of 1 unit of `symbol` (token). */
  priceUsd: (symbol: string) => number;
  /** Convert an amount in USD to the chosen display currency. */
  convertFromUsd: (usd: number, currency: string) => number;
  /** Cross-rate: how many `to` tokens you get per 1 `from` token. Stable ref. */
  crossRate: (from: string, to: string) => number;
};

const PricesContext = createContext<PricesContextValue | null>(null);

const POLL_MS = 18_000;

export function PricesProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<PriceFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const mounted = useRef(true);
  // Keep a ref to the latest feed so crossRate/priceUsd callbacks are stable
  const feedRef = useRef<PriceFeed | null>(null);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const tick = async () => {
      try {
        const f = await getLivePrices();
        if (!cancelled && mounted.current) {
          feedRef.current = f;
          setFeed(f);
          setError(null);
          setFailCount(0);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "price feed error");
          setFailCount((c) => c + 1);
          // Don't clear feedRef — keep last known good data
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      mounted.current = false;
      clearInterval(id);
    };
  }, []);

  const priceUsd = useCallback((symbol: string) => {
    return feedRef.current?.prices[symbol.toUpperCase()] ?? 0;
  }, []);

  const convertFromUsd = useCallback((usd: number, currency: string) => {
    const c = currency.toUpperCase();
    if (c === "USD" || !feedRef.current) return usd;
    const r = feedRef.current.fxRates[c];
    if (!r || r <= 0) return usd;
    return usd * r;
  }, []);

  const crossRate = useCallback((from: string, to: string) => {
    const f = feedRef.current?.prices[from.toUpperCase()] ?? 0;
    const t = feedRef.current?.prices[to.toUpperCase()] ?? 0;
    if (!f || !t) return 0;
    return f / t;
  }, []);

  return (
    <PricesContext.Provider value={{ feed, loading, error, failCount, priceUsd, convertFromUsd, crossRate }}>
      {children}
    </PricesContext.Provider>
  );
}

export function usePrices() {
  const ctx = useContext(PricesContext);
  if (!ctx) throw new Error("usePrices must be used within PricesProvider");
  return ctx;
}
