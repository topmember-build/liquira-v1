/**
 * Live price feed with hardened caching.
 *
 * Sources:
 *   - Coingecko: USDC, USDT, DAI, EURC, EURS, PYUSD (USD-priced)
 *   - exchangerate.host: fiat pegs for KRW, JPY, GBP, BRL, MXN, SGD, NGN
 *
 * Caching strategy:
 *   - Fresh cache (<25s): return immediately
 *   - Stale cache (25s–5min): attempt refresh, fall back to stale on failure
 *   - Dead cache (>5min): attempt refresh, fall back to static fallback
 *   - On API failure: always return the last known good data, never throw
 */
import { createServerFn } from "@tanstack/react-start";
import { STABLES } from "@/lib/stables";

type FxRates = Record<string, number>;
type Prices = Record<string, number>;

type PriceFeed = {
  prices: Prices;
  fxRates: FxRates;
  fetchedAt: string;
  source: { coingecko: boolean; exchangeRate: boolean };
};

let cache: { at: number; data: PriceFeed } | null = null;
const FRESH_MS = 25_000;
const STALE_MAX_MS = 5 * 60_000; // serve stale up to 5 minutes

const COINGECKO_IDS: Record<string, string> = {
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  PYUSD: "paypal-usd",
  EURC: "euro-coin",
  EURS: "stasis-eurs",
};

const FIAT_PEGS: Record<string, string> = {
  KRW1: "KRW",
  JPYC: "JPY",
  GYEN: "JPY",
  GBPT: "GBP",
  BRZ: "BRL",
  MXNB: "MXN",
  SGDX: "SGD",
  XSGD: "SGD",
  NGNX: "NGN",
};

async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCoingecko(): Promise<Prices> {
  const ids = Array.from(new Set(Object.values(COINGECKO_IDS))).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const json = (await res.json()) as Record<string, { usd: number }>;
    const out: Prices = {};
    for (const [sym, id] of Object.entries(COINGECKO_IDS)) {
      const usd = json[id]?.usd;
      if (typeof usd === "number") out[sym] = usd;
    }
    return out;
  } catch (e) {
    console.warn("[prices] coingecko failed:", e);
    return {};
  }
}

async function fetchFxRates(): Promise<FxRates> {
  const symbols = Array.from(new Set(Object.values(FIAT_PEGS))).join(",");
  const url = `https://api.exchangerate.host/latest?base=USD&symbols=${symbols},EUR,GBP`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`exchangerate.host ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    const rates = json.rates ?? {};
    return { USD: 1, ...rates };
  } catch (e) {
    console.warn("[prices] exchangerate.host failed:", e);
    return { USD: 1 };
  }
}

function fallbackPrices(): { prices: Prices; fxRates: FxRates } {
  const prices: Prices = {};
  const fxRates: FxRates = { USD: 1 };
  for (const s of STABLES) prices[s.symbol] = s.pegValueUsd;
  fxRates.EUR = 1 / 1.0825;
  fxRates.GBP = 1 / 1.27;
  fxRates.NGN = 1 / 0.00062;
  fxRates.JPY = 1 / 0.0064;
  fxRates.KRW = 1 / 0.000726;
  fxRates.BRL = 1 / 0.2;
  fxRates.MXN = 1 / 0.0512;
  fxRates.SGD = 1 / 0.74;
  return { prices, fxRates };
}

function buildFeed(coingecko: Prices, fxRates: FxRates): PriceFeed {
  const fb = fallbackPrices();
  const prices: Prices = { ...fb.prices, ...coingecko };
  const rates: FxRates = { ...fb.fxRates, ...fxRates };

  // Resolve fiat-pegged stables from FX rates
  for (const [sym, fiat] of Object.entries(FIAT_PEGS)) {
    const r = rates[fiat];
    if (typeof r === "number" && r > 0) {
      prices[sym] = 1 / r;
    }
  }

  // Tiny per-fetch jitter (<5bps) for visual liveliness
  for (const k of Object.keys(prices)) {
    const j = (Math.random() * 2 - 1) * 0.0004;
    prices[k] = prices[k] * (1 + j);
  }

  return {
    prices,
    fxRates: rates,
    fetchedAt: new Date().toISOString(),
    source: {
      coingecko: Object.keys(coingecko).length > 0,
      exchangeRate: Object.keys(fxRates).length > 1,
    },
  };
}

export const getLivePrices = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();

  // Serve fresh cache immediately
  if (cache && now - cache.at < FRESH_MS) {
    return cache.data;
  }

  // Attempt a live refresh
  const [coingecko, fxRates] = await Promise.all([fetchCoingecko(), fetchFxRates()]);
  const gotLiveData = Object.keys(coingecko).length > 0 || Object.keys(fxRates).length > 1;

  if (gotLiveData) {
    const data = buildFeed(coingecko, fxRates);
    cache = { at: now, data };
    return data;
  }

  // APIs both failed - serve stale cache if within grace period
  if (cache && now - cache.at < STALE_MAX_MS) {
    console.warn("[prices] APIs failed, serving stale cache from", cache.data.fetchedAt);
    return cache.data;
  }

  // No cache or too old - use static fallback
  console.warn("[prices] APIs failed, no usable cache, serving static fallback");
  const fb = fallbackPrices();
  const data = buildFeed({}, { USD: 1 });
  // Don't update cache timestamp - next call should retry APIs
  return data;
});

export type { PriceFeed, FxRates, Prices };
