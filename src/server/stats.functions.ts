/**
 * Stable testnet stats. Deterministic per-token time series seeded by symbol
 * so multiple users see the same numbers, plus per-poll jitter for liveness.
 *
 * Exposed via getTestnetStats() - accepts optional `symbol` filter and
 * returns TVL, 24h volume, avg slippage, uptime, and a 24-point hourly
 * series for each metric.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { STABLES } from "@/lib/stables";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TOKEN_BASE: Record<string, { tvl: number; vol: number; slip: number }> = {
  USDC: { tvl: 92.4, vol: 14.8, slip: 0.42 },
  USDT: { tvl: 41.2, vol: 9.1, slip: 0.51 },
  DAI: { tvl: 12.6, vol: 2.4, slip: 0.78 },
  PYUSD: { tvl: 4.8, vol: 0.91, slip: 1.04 },
  EURC: { tvl: 18.9, vol: 4.2, slip: 0.71 },
  EURS: { tvl: 6.4, vol: 1.1, slip: 1.32 },
  GBPT: { tvl: 5.2, vol: 0.84, slip: 1.28 },
  XSGD: { tvl: 3.1, vol: 0.42, slip: 1.66 },
  GYEN: { tvl: 2.8, vol: 0.33, slip: 1.74 },
  BRZ: { tvl: 2.1, vol: 0.26, slip: 1.92 },
  KRW1: { tvl: 4.1, vol: 0.61, slip: 1.21 },
  JPYC: { tvl: 4.6, vol: 0.78, slip: 1.18 },
  MXNB: { tvl: 2.4, vol: 0.34, slip: 1.83 },
  SGDX: { tvl: 3.0, vol: 0.41, slip: 1.61 },
  NGNX: { tvl: 1.6, vol: 0.21, slip: 2.14 },
};

export type StatPoint = { t: number; v: number };
export type TokenStats = {
  symbol: string;
  name: string;
  tvlUsd: number; // millions
  vol24hUsd: number; // millions
  avgSlippageBps: number;
  uptimePct: number;
  series: {
    tvl: StatPoint[];
    volume: StatPoint[];
    slippage: StatPoint[];
    uptime: StatPoint[];
  };
};

export type StatsResult = {
  tokens: TokenStats[];
  totals: {
    tvlUsd: number;
    vol24hUsd: number;
    avgSlippageBps: number;
    uptimePct: number;
  };
  fetchedAt: string;
};

function buildToken(symbol: string): TokenStats {
  const meta = STABLES.find((s) => s.symbol === symbol);
  const base = TOKEN_BASE[symbol] ?? { tvl: 1.0, vol: 0.15, slip: 2.4 };
  // hourly-bucket seed so the series is stable for ~5 minutes
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  const r = rand(hash(`${symbol}:${bucket}`));

  const points = 24;
  const tvlSeries: StatPoint[] = [];
  const volSeries: StatPoint[] = [];
  const slipSeries: StatPoint[] = [];
  const upSeries: StatPoint[] = [];

  let tvl = base.tvl;
  let vol = base.vol;
  let slip = base.slip;
  for (let i = 0; i < points; i++) {
    const tvlNoise = (r() - 0.5) * base.tvl * 0.04;
    const volNoise = (r() - 0.5) * base.vol * 0.18;
    const slipNoise = (r() - 0.5) * base.slip * 0.12;
    tvl = Math.max(0.05, tvl + tvlNoise);
    vol = Math.max(0.005, vol + volNoise);
    slip = Math.max(0.05, slip + slipNoise);
    const t = Date.now() - (points - 1 - i) * 60 * 60 * 1000;
    tvlSeries.push({ t, v: Number(tvl.toFixed(3)) });
    volSeries.push({ t, v: Number(vol.toFixed(3)) });
    slipSeries.push({ t, v: Number(slip.toFixed(3)) });
    upSeries.push({ t, v: Number((99.6 + r() * 0.4).toFixed(3)) });
  }

  // live values = last point + small per-call jitter
  const tvlLive = tvl * (1 + (Math.random() - 0.5) * 0.004);
  const volLive = vol * (1 + (Math.random() - 0.5) * 0.02);
  const slipLive = slip * (1 + (Math.random() - 0.5) * 0.04);
  const upLive = 99.7 + Math.random() * 0.3;

  return {
    symbol,
    name: meta?.name ?? symbol,
    tvlUsd: Number(tvlLive.toFixed(3)),
    vol24hUsd: Number(volLive.toFixed(3)),
    avgSlippageBps: Number(slipLive.toFixed(2)),
    uptimePct: Number(upLive.toFixed(3)),
    series: { tvl: tvlSeries, volume: volSeries, slippage: slipSeries, uptime: upSeries },
  };
}

const Input = z.object({
  symbol: z.string().min(1).max(12).optional(),
});

export const getTestnetStats = createServerFn({ method: "GET" })
  .inputValidator((d) => Input.parse(d ?? {}))
  .handler(async ({ data }) => {
    const symbols = data.symbol
      ? [data.symbol.toUpperCase()]
      : STABLES.map((s) => s.symbol);
    const tokens = symbols.map(buildToken);

    const tvlUsd = tokens.reduce((a, t) => a + t.tvlUsd, 0);
    const vol24hUsd = tokens.reduce((a, t) => a + t.vol24hUsd, 0);
    const avgSlip =
      tokens.reduce((a, t) => a + t.avgSlippageBps * t.tvlUsd, 0) / Math.max(0.001, tvlUsd);
    const upAvg = tokens.reduce((a, t) => a + t.uptimePct, 0) / tokens.length;

    const result: StatsResult = {
      tokens,
      totals: {
        tvlUsd: Number(tvlUsd.toFixed(2)),
        vol24hUsd: Number(vol24hUsd.toFixed(2)),
        avgSlippageBps: Number(avgSlip.toFixed(2)),
        uptimePct: Number(upAvg.toFixed(3)),
      },
      fetchedAt: new Date().toISOString(),
    };
    return result;
  });
