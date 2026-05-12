/**
 * FX Transaction service with Supabase persistence.
 * Server-only. All transactions persist to Supabase database.
 * Falls back to in-memory storage when Supabase is unreachable.
 */

import { createClient } from "@supabase/supabase-js";

export type TxStatus = "pending" | "success" | "failed";

export type Transaction = {
  id: string;
  transactionId: string;
  userId: string;
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

// In-memory fallback storage
const memoryStorage = new Map<string, Transaction>();

// Initialize Supabase client only if config is available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
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
    const { error } = await supabase.from("fx_transactions").select("id").limit(1);
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

  const transaction: Transaction = {
    id: transactionId,
    transactionId,
    userId: input.userId,
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
    const { data, error } = await supabase
      .from("fx_transactions")
      .insert({
        transaction_id: transactionId,
        user_id: input.userId,
        from_currency: input.fromCurrency,
        to_currency: input.toCurrency,
        from_amount: input.fromAmount,
        to_amount: input.toAmount,
        rate: input.rate,
        fee: input.fee,
        status: "pending",
        details: {
          note: "Pending Arc settlement.",
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

    return mapDatabaseToTransaction(data);
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
    const { data, error } = await supabase
      .from("fx_transactions")
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

    return data ? mapDatabaseToTransaction(data) : undefined;
  }

  if (supabaseConfigured) {
    throw new Error(
      `[Transaction Service] Supabase is configured but unavailable. ${getUnavailableSupabaseReason()}`
    );
  }

  // Use in-memory fallback
  return memoryStorage.get(transactionId);
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

    const { data, error } = await supabase
      .from("fx_transactions")
      .update({
        status,
        details: mergedDetails,
      })
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

    return mapDatabaseToTransaction(data);
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

  const updatedTransaction: Transaction = {
    ...existing,
    status,
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
  return {
    id: row.id as string,
    transactionId: row.transaction_id as string,
    userId: row.user_id as string,
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
    details: (row.details as Record<string, unknown>) || {},
  };
}
