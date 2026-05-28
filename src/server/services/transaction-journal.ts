import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/;

async function resolveUserIdForWallet(address: string): Promise<string | undefined> {
  if (!address) return undefined;
  const normalized = address.toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("user_wallets")
    .select("user_id")
    .ilike("address", normalized)
    .maybeSingle();

  if (error) {
    console.warn("[Transaction Journal] Failed to resolve wallet owner:", error);
    return undefined;
  }

  if (!data?.user_id) {
    console.debug("[Transaction Journal] Wallet address not linked to a user:", normalized);
  }

  return data?.user_id ?? undefined;
}

async function sendUserNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  link?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!UUID_REGEX.test(userId)) {
    return;
  }

  const { error } = await supabaseAdmin.rpc("notify_user", {
    _user_id: userId,
    _type: type,
    _title: title,
    _body: body ?? null,
    _link: link ?? null,
    _metadata: metadata ?? null,
  });

  if (error) {
    console.warn("[Transaction Journal] Failed to send notification:", error);
  }
}

export async function notifyTransactionStatus(
  transaction: Transaction,
  status: "pending" | "success" | "failed"
): Promise<void> {
  const senderUserId = UUID_REGEX.test(transaction.userId)
    ? transaction.userId
    : transaction.walletAddress
    ? await resolveUserIdForWallet(transaction.walletAddress)
    : undefined;
  const recipientUserId = transaction.recipientAddress
    ? await resolveUserIdForWallet(transaction.recipientAddress)
    : undefined;

  if (transaction.recipientAddress && !recipientUserId) {
    console.debug(
      "[Transaction Journal] Received payment recipient wallet is not linked to a user account:",
      transaction.recipientAddress
    );
  }

  const metadata = {
    transactionId: transaction.transactionId,
    fromCurrency: transaction.fromCurrency,
    toCurrency: transaction.toCurrency,
    fromAmount: transaction.fromAmount,
    toAmount: transaction.toAmount,
    recipientAddress: transaction.recipientAddress,
    senderAddress: transaction.walletAddress,
    arcTxHash: transaction.arcTxHash,
    status,
  } as Record<string, unknown>;

  if (status === "pending") {
    if (senderUserId) {
      await sendUserNotification(
        senderUserId,
        "payment.pending",
        "Payment processing",
        `Your payment of ${transaction.fromAmount} ${transaction.fromCurrency} is being prepared.`,
        "/account/history",
        metadata
      );
    }
    return;
  }

  if (status === "success") {
    if (senderUserId) {
      await sendUserNotification(
        senderUserId,
        "payment.success",
        `Payment sent: ${transaction.fromAmount} ${transaction.fromCurrency}`,
        `Sent ${transaction.toAmount} ${transaction.toCurrency} to ${transaction.recipientAddress ?? "your recipient"}`,
        "/account/history",
        metadata
      );
    }

    if (recipientUserId && recipientUserId !== senderUserId) {
      await sendUserNotification(
        recipientUserId,
        "payment.received",
        `Payment received: ${transaction.toAmount} ${transaction.toCurrency}`,
        `Received ${transaction.toAmount} ${transaction.toCurrency} from ${transaction.walletAddress ?? "another wallet"}`,
        "/account/history",
        metadata
      );
    }
    return;
  }

  if (senderUserId) {
    await sendUserNotification(
      senderUserId,
      "payment.failed",
      "Payment failed",
      `Payment to ${transaction.recipientAddress ?? "recipient"} failed${transaction.errorMessage ? `: ${transaction.errorMessage}` : "."}`,
      "/account/history",
      metadata
    );
  }
}

export async function create_payment_transaction(input: {
  userId: string;
  walletAddress?: string;
  recipientAddress?: string;
  network?: string;
  executionType?: string;
  gasSponsored?: boolean;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
}): Promise<Transaction> {
  const tx = await create_transaction({
    userId: input.userId,
    walletAddress: input.walletAddress,
    recipientAddress: input.recipientAddress,
    network: input.network,
    executionType: input.executionType,
    gasSponsored: input.gasSponsored,
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
