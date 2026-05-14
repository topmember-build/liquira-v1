/**
 * Mock FX engine. Pure functions, server-only.
 * Future: replace with live rates from a price oracle (Circle, Chainlink, internal).
 * 
 * ⚠️  ARCHITECTURE CONSTRAINTS:
 * - This module provides RATE CALCULATION ONLY
 * - NO Fireblocks integration (completely removed)
 * - All actual transaction execution goes through /fx/execute → Arc settlement
 * - Circle is ONLY for treasury balance checks, NOT for transaction signing
 * - Dynamic provider handles authentication/wallets ONLY (frontend)
 * - Backend receives userId + walletAddress from Dynamic, not wallet signing
 */

import { getCircleStableFxQuote, isCircleStableFXEnabled } from "@/server/providers/circle";

// Hard-coded rates relative to USD. Extend freely.
const USD_RATES: Record<string, number> = {
  USD: 1,
  NGN: 1500,
  EUR: 0.92,
  GBP: 0.79,
  USDC: 1,
  EURC: 0.92,
  GBPT: 0.79,
  NGNX: 1500,
  JPYC: 155,
  KRW1: 1380,
  MXNB: 17.2,
  BRZ: 5.1,
  AEDC: 3.67,
};

export const FEE_RATE = 0.0004; // 4 bps (0.04%)

/**
 * Calculate FX rate between two currencies.
 * Pure function, no side effects.
 */
export function calculate_rate(from: string, to: string): number {
  const f = USD_RATES[from.toUpperCase()];
  const t = USD_RATES[to.toUpperCase()];
  if (!f || !t) throw new Error(`Unsupported currency pair: ${from} -> ${to}`);
  return t / f;
}

/**
 * Calculate transaction fee based on amount.
 * Pure function, no side effects.
 */
export function calculate_fee(amount: number): number {
  return amount * FEE_RATE;
}

/**
 * Calculate output amount for a swap (amount - fee) * rate.
 * Pure function, no side effects.
 */
export function calculate_output(
  amount: number,
  from: string,
  to: string,
): { rate: number; fee: number; estimatedAmount: number } {
  const source = from.trim().toUpperCase();
  const destination = to.trim().toUpperCase();

  if (isCircleStableFXEnabled()) {
    try {
      const circleQuote = getCircleStableFxQuote(source, destination, amount);
      console.info("[FX Engine] Using Circle Stable FX quote", {
        from: source,
        to: destination,
        rate: circleQuote.rate,
      });
      const estimatedAmount = (amount - circleQuote.fee) * circleQuote.rate;
      return {
        rate: circleQuote.rate,
        fee: circleQuote.fee,
        estimatedAmount,
      };
    } catch (error) {
      console.warn("[FX Engine] Circle Stable FX quote unavailable, falling back to internal rates", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const rate = calculate_rate(source, destination);
  const fee = calculate_fee(amount);
  const estimatedAmount = (amount - fee) * rate;
  return { rate, fee, estimatedAmount };
}

/**
 * EXECUTION FLOW (Current Architecture):
 * 1. /fx/quote → calculate rates (this file)
 * 2. /fx/execute → Arc settlement (arc-settlement.server.ts)
 * 3. /tx/:id → Poll Supabase (transaction-service.server.ts)
 * 
 * WALLET MANAGEMENT:
 * - Frontend: Dynamic Labs handles user authentication + embedded wallet creation
 * - Backend: Receives userId + walletAddress from Dynamic, uses for routing only
 * - Arc testnet: Executes transactions with backend-controlled keys
 * 
 * NO Fireblocks integration in this stage.
 * Future: Fireblocks can be added as optional backend custody layer.
 */
