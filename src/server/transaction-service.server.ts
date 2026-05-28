/**
 * FX Transaction service with Supabase persistence.
 * Server-only. All transactions persist to Supabase database.
 * Falls back to in-memory storage when Supabase is unreachable.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TxStatus = "pending" | "success" | "failed";

export type Transaction = {
  id: string;
  transactionId: string;
  userId: string;
  walletAddress?: string;
  recipientAddress?: string;
  network?: string;
  explorerUrl?: string;
  executionType?: string;
  gasSponsored?: boolean;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  status: TxStatus;
  arcTxHash?: string;
  circleTransferId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  details: Record<string, unknown>;
};

function normalizeWalletAddress(address?: string): string | undefined {
  if (!address || typeof address !== "string") return undefined;
  if (address.startsWith("0x") && address.length === 42) {
    return address.toLowerCase();
  }
  return undefined;
}

// In-memory fallback storage
const memoryStorage = new Map<string, Transaction>();

// Initialize Supabase client only if config is available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
} else {
  console.warn("[Transaction Service] Supabase config missing - using in-memory storage only");
}

const supabaseConfigured = !!supabase;
let supabaseAvailable = supabaseConfigured;
let supabaseUnavailableReason: string | null = null;

/**
 * Test Supabase connectivity on startup.
 */
async function testSupabaseConnection(): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await getSupabaseClient().from("fx_transactions" as any).select("id").limit(1);
    if (error) {
      if (error.code === "PGRST205") {
        supabaseUnavailableReason =
          "Supabase table 'public.fx_transactions' not found. Apply the migration for fx_transactions.";
        console.error("[Transaction Service] Supabase connection test failed:", supabaseUnavailableReason);
      } else {
        supabaseUnavailableReason =
          `Supabase connection failed: ${error.message || JSON.stringify(error)}`;
        console.error("[Transaction Service] Supabase connection test failed:", error);
      }
      return false;
    }
    console.log("[Transaction Service] Supabase connection OK");
    return true;
  } catch (err) {
    supabaseUnavailableReason =
      `Supabase connection failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error("[Transaction Service] Supabase connection test failed:", err);
    return false;
  }
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("[Transaction Service] Supabase is not configured");
  }
  return supabase;
}

// Test connection on module load only if Supabase is configured
if (supabase) {
  testSupabaseConnection().then((available) => {
    supabaseAvailable = available;
    if (!available) {
      console.warn("[Transaction Service] Using in-memory storage fallback");
    }
  }).catch((err) => {
    supabaseAvailable = false;
    supabaseUnavailableReason =
      `Supabase connection test failed: ${err instanceof Error ? err.message : String(err)}`;
    console.warn("[Transaction Service] Using in-memory storage fallback");
  });
} else {
  console.warn("[Transaction Service] Supabase not configured - using in-memory storage only");
}

function getUnavailableSupabaseReason() {
  return (
    supabaseUnavailableReason ||
    "Supabase is configured but unavailable. Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and the fx_transactions table are present."
  );
}

/**
 * Create a new FX transaction record in Supabase.
 */
export async function create_transaction(input: {
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
  const transactionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tx_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  const now = new Date().toISOString();

  const normalizedUserId = normalizeWalletAddress(input.userId) ?? input.userId;

  const transaction: Transaction = {
    id: transactionId,
    transactionId,
    userId: normalizedUserId,
    walletAddress: input.walletAddress,
    recipientAddress: input.recipientAddress,
    network: input.network ?? "arc-testnet",
    executionType: input.executionType,
    gasSponsored: input.gasSponsored ?? false,
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
    fromAmount: input.fromAmount,
    toAmount: input.toAmount,
    rate: input.rate,
    fee: input.fee,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    details: {
      note: "Pending Arc settlement.",
    },
  };

  if (supabaseAvailable) {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
      .from("fx_transactions" as any)
      .insert({
        transaction_id: transactionId,
        user_id: normalizedUserId,
        from_currency: input.fromCurrency,
        to_currency: input.toCurrency,
        from_amount: input.fromAmount,
        to_amount: input.toAmount,
        rate: input.rate,
        fee: input.fee,
        status: "pending",
        details: {
          note: "Pending Arc settlement.",
          walletAddress: input.walletAddress ?? null,
          recipientAddress: input.recipientAddress ?? null,
          network: input.network ?? null,
          executionType: input.executionType ?? null,
          gasSponsored: input.gasSponsored ?? null,
        },
      })
      .select()
      .single();

    if (error || !data) {
      console.error("[Transaction Service] Failed to create transaction:", error);

      // Provide more specific error messages
      let errorMessage = error?.message || "Unknown database error";
      if (errorMessage.includes("ENOTFOUND")) {
        errorMessage = "Supabase host unreachable - check network/DNS";
      } else if (errorMessage.includes("auth")) {
        errorMessage = "Supabase authentication failed - check service key";
      } else if (errorMessage.includes("relation")) {
        errorMessage = "Database table missing - run migrations";
      }

      throw new Error(`Failed to create transaction: ${errorMessage}`);
    }

    return mapDatabaseToTransaction(data as unknown as Record<string, unknown>);
  }

  if (supabaseConfigured) {
    throw new Error(
      `[Transaction Service] Supabase is configured but unavailable. ${getUnavailableSupabaseReason()}`
    );
  }

  // Use in-memory fallback
  console.log("[Transaction Service] Using in-memory storage for transaction:", transactionId);
  memoryStorage.set(transactionId, transaction);
  return transaction;
}

/**
 * Fetch a transaction by ID from Supabase.
 */
export async function get_transaction(
  transactionId: string
): Promise<Transaction | undefined> {
  if (supabaseAvailable) {
    const supabaseClient = getSupabaseClient();
    const { data, error } = await supabaseClient
      .from("fx_transactions" as any)
      .select("*")
      .eq("transaction_id", transactionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return undefined;
      }
      console.error("[Transaction Service] Failed to fetch transaction:", error);
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }

    return data ? mapDatabaseToTransaction(data as unknown as Record<string, unknown>) : undefined;
  }

  if (supabaseConfigured) {
    throw new Error(
      `[Transaction Service] Supabase is configured but unavailable. ${getUnavailableSupabaseReason()}`
    );
  }

  // Use in-memory fallback
  return memoryStorage.get(transactionId);
}

export async function list_transactions(input: {
  userId?: string;
  walletAddress?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Transaction[]> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);

  if (supabaseAvailable) {
    const supabaseClient = getSupabaseClient();
    let query = supabaseClient.from("fx_transactions" as any).select("*");
    const normalizedWalletAddress = normalizeWalletAddress(input.walletAddress);

    if (input.userId && input.walletAddress && input.walletAddress !== input.userId) {
      const userFilter = `user_id.eq.${input.userId}`;
      const walletFilters = normalizedWalletAddress
        ? `user_id.eq.${input.walletAddress},user_id.eq.${normalizedWalletAddress}`
        : `user_id.eq.${input.walletAddress}`;
      query = query.or(`${userFilter},${walletFilters}`);
    } else if (input.userId) {
      query = query.eq("user_id", input.userId);
    } else if (input.walletAddress) {
      if (normalizedWalletAddress && normalizedWalletAddress !== input.walletAddress) {
        query = query.or(
          `user_id.eq.${input.walletAddress},user_id.eq.${normalizedWalletAddress}`
        );
      } else {
        query = query.eq("user_id", input.walletAddress);
      }
    }

    if (input.status) {
      query = query.eq("status", input.status);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[Transaction Service] Failed to list transactions:", error);
      throw new Error(`Failed to list transactions: ${error.message}`);
    }

    return (data || []).map((row: unknown) =>
      mapDatabaseToTransaction(row as Record<string, unknown>)
    );
  }

  if (supabaseConfigured) {
    throw new Error(
      `[Transaction Service] Supabase is configured but unavailable. ${getUnavailableSupabaseReason()}`
    );
  }

  let allTransactions = [...memoryStorage.values()];
  const normalizedWalletAddress =
    input.walletAddress && input.walletAddress.startsWith("0x") && input.walletAddress.length === 42
      ? input.walletAddress.toLowerCase()
      : input.walletAddress;

  if (input.userId && input.walletAddress && input.walletAddress !== input.userId) {
    allTransactions = allTransactions.filter(
      (transaction) =>
        transaction.userId === input.userId ||
        transaction.userId === input.walletAddress ||
        transaction.userId === normalizedWalletAddress ||
        transaction.walletAddress === input.walletAddress ||
        transaction.walletAddress === normalizedWalletAddress
    );
  } else if (input.userId) {
    allTransactions = allTransactions.filter(
      (transaction) => transaction.userId === input.userId
    );
  } else if (input.walletAddress) {
    allTransactions = allTransactions.filter(
      (transaction) =>
        transaction.userId === input.walletAddress ||
        transaction.userId === normalizedWalletAddress ||
        transaction.walletAddress === input.walletAddress ||
        transaction.walletAddress === normalizedWalletAddress
    );
  }

  if (input.status) {
    allTransactions = allTransactions.filter(
      (transaction) => transaction.status === input.status
    );
  }

  const sortedTransactions = allTransactions.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  return sortedTransactions.slice(offset, offset + limit);
}

/**
 * Update transaction status in Supabase.
 */
export async function update_status(
  transactionId: string,
  status: TxStatus,
  details: Record<string, unknown> = {}
): Promise<Transaction | undefined> {
  if (supabaseAvailable) {
    // First fetch to get the current details
    const existing = await get_transaction(transactionId);
    if (!existing) {
      console.warn(
        `[Transaction Service] Transaction not found: ${transactionId}`
      );
      return undefined;
    }

    const mergedDetails = { ...existing.details, ...details };
    const arcTxHash = details.arcTxHash || existing.arcTxHash;

    const supabaseClient = getSupabaseClient();
    const updatePayload: Record<string, unknown> = {
      status,
      details: mergedDetails,
    };

    // Include arc_tx_hash if provided
    if (arcTxHash) {
      updatePayload.arc_tx_hash = arcTxHash;
    }

    const { data, error } = await supabaseClient
      .from("fx_transactions" as any)
      .update(updatePayload)
      .eq("transaction_id", transactionId)
      .select()
      .single();

    if (error || !data) {
      console.error("[Transaction Service] Failed to update transaction:", error);

      // Provide more specific error messages
      let errorMessage = error?.message || "Unknown database error";
      if (errorMessage.includes("ENOTFOUND")) {
        errorMessage = "Supabase host unreachable - check network/DNS";
      } else if (errorMessage.includes("auth")) {
        errorMessage = "Supabase authentication failed - check service key";
      }

      throw new Error(`Failed to update transaction: ${errorMessage}`);
    }

    return mapDatabaseToTransaction(data as unknown as Record<string, unknown>);
  }

  if (supabaseConfigured) {
    throw new Error(
      `[Transaction Service] Supabase is configured but unavailable. ${getUnavailableSupabaseReason()}`
    );
  }

  // Use in-memory fallback
  const existing = memoryStorage.get(transactionId);
  if (!existing) {
    console.warn(
      `[Transaction Service] Transaction not found in memory: ${transactionId}`
    );
    return undefined;
  }

  const arcTxHash = details.arcTxHash || existing.arcTxHash;
  const explorerUrl = arcTxHash ? `https://testnet.arcscan.app/tx/${arcTxHash}` : existing.explorerUrl;

  const updatedTransaction: Transaction = {
    ...existing,
    status,
    arcTxHash: arcTxHash as string | undefined,
    explorerUrl,
    details: { ...existing.details, ...details },
    updatedAt: new Date().toISOString(),
  };

  memoryStorage.set(transactionId, updatedTransaction);
  console.log("[Transaction Service] Updated transaction in memory:", transactionId, status);
  return updatedTransaction;
}

/**
 * Map database row to Transaction type.
 */
function mapDatabaseToTransaction(row: Record<string, unknown>): Transaction {
  const details = (row.details as Record<string, unknown>) || {};

  return {
    id: row.id as string,
    transactionId: row.transaction_id as string,
    userId: row.user_id as string,
    walletAddress:
      (row.wallet_address as string) ||
      (details.walletAddress as string) ||
      undefined,
    recipientAddress:
      (row.recipient_address as string) ||
      (details.recipientAddress as string) ||
      undefined,
    network:
      (row.network as string) ||
      (details.network as string) ||
      undefined,
    explorerUrl: (row.explorer_url as string) || undefined,
    executionType:
      (row.execution_type as string) ||
      (details.executionType as string) ||
      undefined,
    gasSponsored:
      (row.gas_sponsored as boolean | undefined) ??
      (details.gasSponsored as boolean | undefined),
    fromCurrency: row.from_currency as string,
    toCurrency: row.to_currency as string,
    fromAmount: parseFloat(row.from_amount as string),
    toAmount: parseFloat(row.to_amount as string),
    rate: parseFloat(row.rate as string),
    fee: parseFloat(row.fee as string),
    status: row.status as TxStatus,
    arcTxHash: (row.arc_tx_hash as string) || undefined,
    circleTransferId: (row.circle_transfer_id as string) || undefined,
    errorMessage: (row.error_message as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    details,
  };
}

// Ensure the status updater is loaded on server start (starts its own polling loop).
void import("./services/tx-status-updater")
  .then(() => {
    console.log("[Transaction Service] tx-status-updater loaded");
  })
  .catch((e) => {
    console.warn(
      "[Transaction Service] Failed to load tx-status-updater:",
      e instanceof Error ? e.message : String(e)
    );
  });
