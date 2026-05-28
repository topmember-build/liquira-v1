import { calculate_output } from "@/server/fx-engine.server";
import { arcTestnet } from "@/lib/arc-testnet";

export type RouteStepType = "swap" | "transfer" | "approval";

export interface RouteStep {
  id: string;
  type: RouteStepType;
  provider: string;
  from: {
    currency: string;
    chain: string;
    amount: number;
  };
  to: {
    currency: string;
    chain: string;
  };
  details?: Record<string, unknown>;
}

export interface ARCExecutionStep {
  id: string;
  type: "swap" | "bridge" | "approval" | "transfer";
  chainId: number;
  swapData?: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minAmountOut: string;
    deadline: number;
  };
  bridgeData?: {
    token: string;
    amount: string;
    destinationChain: string;
    recipient: string;
  };
  transferData?: {
    token: string;
    amount: string;
    recipient: string;
  };
}

export interface ARCExecutionPayload {
  version: "1.0";
  routeId: string;
  transactionId: string;
  recipient: string;
  sourceChain: string;
  destinationChain: string;
  deadline: number;
  steps: ARCExecutionStep[];
  metadata: {
    optimizationStrategy: string;
    quoteId: string;
  };
}

export interface RouteEngineResult {
  routeId: string;
  providerId: string;
  route: RouteStep[];
  rate: number;
  estimatedOutput: number;
  estimatedFees: number;
  estimatedTimeSeconds: number;
  slippagePercent: number;
  arcPayload: ARCExecutionPayload;
}

export interface RouteEngineParams {
  transactionId: string;
  sourceWalletAddress?: string;
  recipientWalletAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  strategy?: "lowest-fee" | "fastest" | "lowest-slippage";
}

function generateId(prefix: string) {
  return (
    prefix +
    "_" +
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36))
  );
}

function normalizeCurrency(currency: string) {
  return currency.trim().toUpperCase();
}

export function build_payment_route(params: RouteEngineParams): RouteEngineResult {
  const fromCurrency = normalizeCurrency(params.fromCurrency);
  const toCurrency = normalizeCurrency(params.toCurrency);
  const amount = Number(params.amount);

  if (!fromCurrency || !toCurrency || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid route engine params");
  }

  const routeId = generateId("route");
  const quoteId = generateId("quote");
  const providerId = "arc-router";
  const estimatedTimeSeconds = 25;
  const slippagePercent = params.strategy === "lowest-slippage" ? 0.3 : 0.5;
  const { rate, fee, estimatedAmount } = calculate_output(amount, fromCurrency, toCurrency);

  const route: RouteStep[] = [
    {
      id: generateId("step"),
      type: fromCurrency === toCurrency ? "transfer" : "swap",
      provider: providerId,
      from: {
        currency: fromCurrency,
        chain: arcTestnet.name,
        amount,
      },
      to: {
        currency: toCurrency,
        chain: arcTestnet.name,
      },
      details: {
        recipient: params.recipientWalletAddress,
      },
    },
  ];

  const now = Math.floor(Date.now() / 1000);
  const deadline = now + 1800;

  const arcPayload: ARCExecutionPayload = {
    version: "1.0",
    routeId,
    transactionId: params.transactionId,
    recipient: params.recipientWalletAddress,
    sourceChain: arcTestnet.name,
    destinationChain: arcTestnet.name,
    deadline,
    steps: [
      {
        id: generateId("arc-step"),
        type: fromCurrency === toCurrency ? "transfer" : "swap",
        chainId: arcTestnet.id,
        ...(fromCurrency === toCurrency
          ? {
              transferData: {
                token: fromCurrency,
                amount: amount.toString(),
                recipient: params.recipientWalletAddress,
              },
            }
          : {
              swapData: {
                tokenIn: fromCurrency,
                tokenOut: toCurrency,
                amountIn: amount.toString(),
                minAmountOut: Math.max(0, estimatedAmount * (1 - slippagePercent / 100)).toFixed(6),
                deadline,
              },
            }),
      },
    ],
    metadata: {
      optimizationStrategy: params.strategy ?? "lowest-fee",
      quoteId,
    },
  };

  return {
    routeId,
    providerId,
    route,
    rate,
    estimatedOutput: estimatedAmount,
    estimatedFees: fee,
    estimatedTimeSeconds,
    slippagePercent,
    arcPayload,
  };
}
