/**
 * In-memory transaction store + status simulator.
 * Server-only. Persists for the lifetime of the worker instance.
 * Future: replace with Supabase / Fireblocks state.
 */

export type TxStatus = "pending" | "success" | "failed";

export type Transaction = {
  transactionId: string;
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  status: TxStatus;
  createdAt: string;
  updatedAt: string;
  details: Record<string, unknown>;
};

const store = new Map<string, Transaction>();

export function create_transaction(input: {
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
}): Transaction {
  const transactionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tx_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const now = new Date().toISOString();
  const tx: Transaction = {
    transactionId,
    ...input,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    details: {
      note: "Mock execution. Future: Fireblocks signing + Circle USDC settlement.",
    },
  };
  store.set(transactionId, tx);

  // Simulate progression. ~3s pending -> success (95%) | failed (5%).
  const delay = 2500 + Math.random() * 1500;
  setTimeout(() => {
    const current = store.get(transactionId);
    if (!current || current.status !== "pending") return;
    const success = Math.random() > 0.05;
    update_status(
      transactionId,
      success ? "success" : "failed",
      success
        ? { settledAt: new Date().toISOString() }
        : { failedAt: new Date().toISOString(), reason: "Simulated routing failure" },
    );
  }, delay);

  return tx;
}

export function get_transaction(id: string): Transaction | undefined {
  return store.get(id);
}

export function update_status(
  id: string,
  status: TxStatus,
  details: Record<string, unknown> = {},
): Transaction | undefined {
  const tx = store.get(id);
  if (!tx) return undefined;
  tx.status = status;
  tx.updatedAt = new Date().toISOString();
  tx.details = { ...tx.details, ...details };
  store.set(id, tx);
  return tx;
}
