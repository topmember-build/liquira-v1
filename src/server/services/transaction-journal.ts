import {
  create_transaction,
  get_transaction,
  update_status,
  Transaction,
} from "@/server/transaction-service.server";

export interface TransactionEvent {
  timestamp: string;
  event: string;
  details?: Record<string, unknown>;
}

function generateTimestamp() {
  return new Date().toISOString();
}

export async function create_payment_transaction(input: {
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
}): Promise<Transaction> {
  const tx = await create_transaction({
    userId: input.userId,
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
    fromAmount: input.fromAmount,
    toAmount: input.toAmount,
    rate: input.rate,
    fee: input.fee,
  });

  await log_transaction_event(tx.transactionId, "transaction.created", {
    userId: input.userId,
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
    fromAmount: input.fromAmount,
    toAmount: input.toAmount,
  });

  return tx;
}

export async function log_transaction_event(
  transactionId: string,
  event: string,
  details: Record<string, unknown> = {}
): Promise<Transaction | undefined> {
  const existing = await get_transaction(transactionId);
  if (!existing) {
    throw new Error(`Transaction not found: ${transactionId}`);
  }

  const events = Array.isArray(existing.details.events)
    ? (existing.details.events as TransactionEvent[])
    : [];

  const updatedDetails = {
    ...existing.details,
    events: [
      ...events,
      {
        timestamp: generateTimestamp(),
        event,
        details,
      },
    ],
  };

  return update_status(transactionId, existing.status, updatedDetails);
}

export async function record_route_selection(
  transactionId: string,
  routeData: Record<string, unknown>
): Promise<Transaction | undefined> {
  return update_status(transactionId, "pending", {
    route: routeData,
    routeSelectedAt: generateTimestamp(),
  });
}

export async function start_execution(
  transactionId: string,
  arcPayload: Record<string, unknown>
): Promise<Transaction | undefined> {
  return update_status(transactionId, "pending", {
    executionStartedAt: generateTimestamp(),
    arcPayload,
  });
}

export async function finalize_execution(
  transactionId: string,
  status: "success" | "failed",
  details: Record<string, unknown> = {}
): Promise<Transaction | undefined> {
  return update_status(transactionId, status, {
    executionCompletedAt: generateTimestamp(),
    ...details,
  });
}
