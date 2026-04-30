import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getLivePrices } from "@/server/prices.functions";
import type { PriceFeed } from "@/server/prices.functions";

type PricesContextValue = {
  feed: PriceFeed | null;
  loading: boolean;
  error: string | null;
  /** Returns the USD price of 1 unit of `symbol` (token). */
  priceUsd: (symbol: string) => number;
  /** Convert an amount in USD to the chosen display currency. */
  convertFromUsd: (usd: number, currency: string) => number;
  /** Cross-rate: how many `to` tokens you get per 1 `from` token. */
  crossRate: (from: string, to: string) => number;
};

const PricesContext = createContext<PricesContextValue | null>(null);

const POLL_MS = 18_000;

export function PricesProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<PriceFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const tick = async () => {
      try {
        const f = await getLivePrices();
        if (!cancelled && mounted.current) {
          setFeed(f);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "price feed error");
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

  const priceUsd = (symbol: string) => {
    return feed?.prices[symbol.toUpperCase()] ?? 0;
  };

  const convertFromUsd = (usd: number, currency: string) => {
    const c = currency.toUpperCase();
    if (c === "USD" || !feed) return usd;
    const r = feed.fxRates[c];
    if (!r || r <= 0) return usd;
    return usd * r;
  };

  const crossRate = (from: string, to: string) => {
    const f = priceUsd(from);
    const t = priceUsd(to);
    if (!f || !t) return 0;
    return f / t;
  };

  return (
    <PricesContext.Provider value={{ feed, loading, error, priceUsd, convertFromUsd, crossRate }}>
      {children}
    </PricesContext.Provider>
  );
}

export function usePrices() {
  const ctx = useContext(PricesContext);
  if (!ctx) throw new Error("usePrices must be used within PricesProvider");
  return ctx;
}
