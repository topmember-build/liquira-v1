import { getChain, getStable } from "./stables";

export type RouteLeg = {
  kind: "swap" | "bridge";
  protocol: string; // e.g., "Liquira/v1", "CCTP", "LayerZero"
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  fee_bps: number;
};

export type Quote = {
  quoteId: string;
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  amountIn: number;
  amountOut: number;
  rate: number; // amountOut / amountIn
  midRate: number; // ideal cross rate before fees / impact
  priceImpactBps: number;
  protocolFeeBps: number;
  totalFeeBps: number;
  minReceived: number;
  slippageBps: number;
  gasEstimateUsd: number;
  validUntil: string; // ISO
  route: RouteLeg[];
  warnings: string[];
};

export type QuoteRequest = {
  fromToken: string;
  toToken: string;
  fromChain?: string;
  toChain?: string;
  amountIn: number;
  slippageBps?: number;
};

const QUOTE_TTL_SECONDS = 20;

// Bounded pseudo-random walk seeded by minute, so quotes feel "live"
// without being chaotic and stay reproducible within a single quote window.
function tickNoise(symbol: string, basisBps = 8): number {
  const minute = Math.floor(Date.now() / 60_000);
  let h = 0;
  const s = `${symbol}:${minute}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  // map h to [-1, 1]
  const normalized = ((h % 1000) - 500) / 500;
  return (normalized * basisBps) / 10_000;
}

export function midCrossRate(fromSymbol: string, toSymbol: string): number {
  const f = getStable(fromSymbol);
  const t = getStable(toSymbol);
  if (!f || !t) return 0;
  const baseRate = f.pegValueUsd / t.pegValueUsd;
  // tiny per-side wobble around the peg
  const fNoise = tickNoise(`${fromSymbol}:peg`, 6);
  const tNoise = tickNoise(`${toSymbol}:peg`, 6);
  return baseRate * (1 + fNoise) * (1 / (1 + tNoise));
}

export function priceImpactBps(amountIn: number, fromSymbol: string): number {
  // Pool depth varies by token. USDC/USDT very deep, EURC mid, exotic shallow.
  const depthMap: Record<string, number> = {
    USDC: 50_000_000,
    USDT: 40_000_000,
    DAI: 25_000_000,
    PYUSD: 8_000_000,
    EURC: 12_000_000,
    EURS: 4_000_000,
    GBPT: 3_000_000,
    XSGD: 2_500_000,
    GYEN: 2_000_000,
    BRZ: 1_500_000,
  };
  const depth = depthMap[fromSymbol.toUpperCase()] ?? 1_000_000;
  // simple x/(x+depth) curve, scaled to bps
  const ratio = amountIn / depth;
  const bps = Math.min(800, Math.round(ratio * 10_000 * 0.6));
  return Math.max(0, bps);
}

function buildRoute(req: Required<Pick<QuoteRequest, "fromToken" | "toToken" | "fromChain" | "toChain">>): RouteLeg[] {
  const legs: RouteLeg[] = [];
  if (req.fromChain !== req.toChain) {
    // bridge first, then swap on destination
    legs.push({
      kind: "bridge",
      protocol: req.fromToken === "USDC" && req.toChain !== "polygon" ? "CCTP" : "LayerZero",
      fromToken: req.fromToken,
      toToken: req.fromToken,
      fromChain: req.fromChain,
      toChain: req.toChain,
      fee_bps: 5,
    });
    if (req.fromToken !== req.toToken) {
      legs.push({
        kind: "swap",
        protocol: "Liquira/v1",
        fromToken: req.fromToken,
        toToken: req.toToken,
        fromChain: req.toChain,
        toChain: req.toChain,
        fee_bps: 4,
      });
    }
  } else {
    legs.push({
      kind: "swap",
      protocol: "Liquira/v1",
      fromToken: req.fromToken,
      toToken: req.toToken,
      fromChain: req.fromChain,
      toChain: req.toChain,
      fee_bps: 4,
    });
  }
  return legs;
}

function newQuoteId(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `q_${ts}_${rnd}`;
}

export function computeQuote(req: QuoteRequest): Quote {
  const fromToken = req.fromToken.toUpperCase();
  const toToken = req.toToken.toUpperCase();
  const fromChain = req.fromChain ?? "base";
  const toChain = req.toChain ?? fromChain;
  const slippageBps = req.slippageBps ?? 30;
  const amountIn = Number(req.amountIn);

  const warnings: string[] = [];

  if (!getStable(fromToken)) warnings.push(`Unknown source token: ${fromToken}`);
  if (!getStable(toToken)) warnings.push(`Unknown destination token: ${toToken}`);
  if (!getChain(fromChain)) warnings.push(`Unknown source chain: ${fromChain}`);
  if (!getChain(toChain)) warnings.push(`Unknown destination chain: ${toChain}`);

  const route = buildRoute({ fromToken, toToken, fromChain, toChain });
  const protocolFeeBps = route.reduce((s, leg) => s + leg.fee_bps, 0);
  const impactBps = priceImpactBps(amountIn, fromToken);
  if (impactBps > 100) warnings.push(`High price impact (${(impactBps / 100).toFixed(2)}%)`);

  const mid = midCrossRate(fromToken, toToken);
  const totalFeeBps = protocolFeeBps + impactBps;
  const effectiveRate = mid * (1 - totalFeeBps / 10_000);
  const amountOut = amountIn * effectiveRate;
  const minReceived = amountOut * (1 - slippageBps / 10_000);

  // Gas: bridge legs cost more.
  const gas = route.reduce((g, leg) => g + (leg.kind === "bridge" ? 1.2 : 0.18), 0);

  const validUntil = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000).toISOString();

  return {
    quoteId: newQuoteId(),
    fromToken,
    toToken,
    fromChain,
    toChain,
    amountIn,
    amountOut,
    rate: amountOut / amountIn,
    midRate: mid,
    priceImpactBps: impactBps,
    protocolFeeBps,
    totalFeeBps,
    minReceived,
    slippageBps,
    gasEstimateUsd: Number(gas.toFixed(2)),
    validUntil,
    route,
    warnings,
  };
}

export const QUOTE_TTL_MS = QUOTE_TTL_SECONDS * 1000;
