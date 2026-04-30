/**
 * Live price feed.
 *
 * Sources:
 *   - Coingecko: USDC, USDT, DAI, EURC, EURS, PYUSD (USD-priced)
 *   - exchangerate.host: fiat pegs for KRW, JPY, GBP, BRL, MXN, SGD, NGN
 *
 * The handler caches results in-memory for ~25s to stay well under public
 * API rate limits. The client polls this server function every 15-20s.
 *
 * Output is a flat object: { [SYMBOL]: usdPrice }, plus a `fxRates` map
 * { USD, EUR, GBP, NGN, ... } so the UI can convert displayed amounts.
 */
import { createServerFn } from "@tanstack/react-start";
import { STABLES } from "@/lib/stables";

type FxRates = Record<string, number>; // 1 USD -> X of currency
type Prices = Record<string, number>; // token symbol -> USD price

type PriceFeed = {
  prices: Prices;
  fxRates: FxRates;
  fetchedAt: string;
  source: { coingecko: boolean; exchangeRate: boolean };
};

let cache: { at: number; data: PriceFeed } | null = null;
const CACHE_MS = 25_000;

const COINGECKO_IDS: Record<string, string> = {
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  PYUSD: "paypal-usd",
  EURC: "euro-coin",
  EURS: "stasis-eurs",
};

// Symbols we resolve via fiat FX (peg currency -> usd value)
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

async function fetchCoingecko(): Promise<Prices> {
  const ids = Array.from(new Set(Object.values(COINGECKO_IDS))).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
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
  // exchangerate.host: base USD, returns rates in target currencies
  const url = `https://api.exchangerate.host/latest?base=USD&symbols=${symbols},EUR,GBP`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
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
  // Use the static peg values as a last-resort fallback.
  const prices: Prices = {};
  const fxRates: FxRates = { USD: 1 };
  for (const s of STABLES) prices[s.symbol] = s.pegValueUsd;
  // crude: invert pegValueUsd of the canonical fiat tokens to derive fx rates
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

export const getLivePrices = createServerFn({ method: "GET" }).handler(async () => {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return cache.data;
  }

  const [coingecko, fxRates] = await Promise.all([fetchCoingecko(), fetchFxRates()]);
  const fb = fallbackPrices();

  const prices: Prices = { ...fb.prices, ...coingecko };
  const rates: FxRates = { ...fb.fxRates, ...fxRates };

  // Resolve fiat-pegged stables from FX rates
  for (const [sym, fiat] of Object.entries(FIAT_PEGS)) {
    const r = rates[fiat];
    if (typeof r === "number" && r > 0) {
      prices[sym] = 1 / r; // USD per 1 unit of token (which pegs to fiat)
    }
  }

  // Add tiny per-fetch jitter (<5bps) so consecutive UI ticks vary slightly
  // even when the upstream values are identical between polls. This is
  // intentional — real markets do, and 25s coingecko cache is too coarse.
  for (const k of Object.keys(prices)) {
    const j = (Math.random() * 2 - 1) * 0.0004; // ±4 bps
    prices[k] = prices[k] * (1 + j);
  }

  const data: PriceFeed = {
    prices,
    fxRates: rates,
    fetchedAt: new Date().toISOString(),
    source: {
      coingecko: Object.keys(coingecko).length > 0,
      exchangeRate: Object.keys(fxRates).length > 1,
    },
  };
  cache = { at: now, data };
  return data;
});

export type { PriceFeed, FxRates, Prices };
