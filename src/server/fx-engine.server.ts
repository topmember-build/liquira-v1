/**
 * Mock FX engine. Pure functions, server-only.
 * Future: replace with live rates from a price oracle (Circle, Chainlink, internal).
 */

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
};

export const FEE_RATE = 0.01; // 1%

export function calculate_rate(from: string, to: string): number {
  const f = USD_RATES[from.toUpperCase()];
  const t = USD_RATES[to.toUpperCase()];
  if (!f || !t) throw new Error(`Unsupported currency pair: ${from} -> ${to}`);
  return t / f;
}

export function calculate_fee(amount: number): number {
  return amount * FEE_RATE;
}

export function calculate_output(
  amount: number,
  from: string,
  to: string,
): { rate: number; fee: number; estimatedAmount: number } {
  const rate = calculate_rate(from, to);
  const fee = calculate_fee(amount);
  const estimatedAmount = (amount - fee) * rate;
  return { rate, fee, estimatedAmount };
}

// ── Future integration placeholders ─────────────────────────────
// Wire these to Fireblocks (custody/signing) and Circle (USDC settlement).
export async function create_wallet(_userId: string): Promise<{ address: string }> {
  throw new Error("create_wallet: not implemented (Fireblocks integration pending)");
}

export async function send_transaction(_args: {
  fromUserId: string;
  toCurrency: string;
  amount: number;
}): Promise<{ txId: string }> {
  throw new Error("send_transaction: not implemented (Fireblocks/Circle integration pending)");
}

export async function get_wallet_balance(
  _userId: string,
  _currency: string,
): Promise<number> {
  throw new Error("get_wallet_balance: not implemented");
}
