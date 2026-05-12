/**
 * Frontend service layer. The UI must only call these functions —
 * never call wallets, blockchains, or the database directly.
 */

export type FxQuote = {
  rate: number;
  fee: number;
  estimatedAmount: number;
  protocolFee: number;
  gasFee: number;
};

export type ExecuteTradeInput = {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  destinationAddress?: string;
};

export type ExecuteTradeResult = {
  status: TxStatus;
  transactionId: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
};

export type TxStatus = "pending" | "success" | "failed";

export type TxStatusResult = {
  status: TxStatus;
  details: Record<string, unknown>;
};

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const fxService = {
  async getQuote(from: string, to: string, amount: number): Promise<FxQuote> {
    const params = new URLSearchParams({
      from,
      to,
      amount: String(amount),
    });
    const res = await fetch(`/fx/quote?${params.toString()}`);
    return unwrap<FxQuote>(res);
  },

  async executeTrade(input: ExecuteTradeInput): Promise<ExecuteTradeResult> {
    const res = await fetch(`/fx/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return unwrap<ExecuteTradeResult>(res);
  },

  async getTransactionStatus(transactionId: string): Promise<TxStatusResult> {
    const res = await fetch(`/tx/${encodeURIComponent(transactionId)}`);
    return unwrap<TxStatusResult>(res);
  },
};
