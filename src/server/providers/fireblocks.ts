/**
 * Fireblocks custody integration for dynamic wallet creation and transaction signing.
 * Server-only. Uses Fireblocks API for secure key management and signing.
 */

import crypto from "crypto";

const FIREBLOCKS_API_KEY = process.env.FIREBLOCKS_API_KEY;
const FIREBLOCKS_API_SECRET = process.env.FIREBLOCKS_API_SECRET;
const FIREBLOCKS_BASE_URL = process.env.FIREBLOCKS_BASE_URL || "https://api.fireblocks.io/v1";

if (!FIREBLOCKS_API_KEY || !FIREBLOCKS_API_SECRET) {
  console.warn(
    "[Fireblocks] Missing credentials. FIREBLOCKS_API_KEY and FIREBLOCKS_API_SECRET required for production."
  );
}

/**
 * Generate JWT token for Fireblocks API authentication.
 */
function generateFireblocksJWT(): string {
  if (!FIREBLOCKS_API_SECRET) {
    throw new Error("FIREBLOCKS_API_SECRET is required");
  }

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload = {
    iss: FIREBLOCKS_API_KEY,
    sub: FIREBLOCKS_API_KEY,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30,
  };

  const headerEncoded = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const message = `${headerEncoded}.${payloadEncoded}`;

  const signature = crypto
    .createHmac("sha256", FIREBLOCKS_API_SECRET)
    .update(message)
    .digest("base64url");

  return `${message}.${signature}`;
}

/**
 * Make authenticated request to Fireblocks API.
 */
async function fireblocksRequest(
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `${FIREBLOCKS_BASE_URL}${path}`;
  const token = generateFireblocksJWT();

  const requestInit: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-API-Key": FIREBLOCKS_API_KEY || "",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  console.log(`[Fireblocks] ${method} ${path}`);

  try {
    const response = await fetch(url, requestInit);
    let data: Record<string, unknown> = {};

    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      data = {};
    }

    if (!response.ok) {
      console.error(`[Fireblocks] ${method} ${path} failed`, {
        status: response.status,
        data,
      });
      throw new Error(
        `Fireblocks API error: ${data.message || response.statusText}`
      );
    }

    console.info(`[Fireblocks] ${method} ${path} success`, { status: response.status });
    return data;
  } catch (err) {
    console.error(`[Fireblocks] Request failed:`, err);
    throw err;
  }
}

export type FireblocksWallet = {
  vaultAccountId: string;
  name: string;
  address?: string;
};

/**
 * Create a dynamic wallet (vault account) for a user on Arc testnet.
 */
export async function createDynamicWallet(userId: string): Promise<FireblocksWallet> {
  try {
    const response = (await fireblocksRequest("/vault/accounts", "POST", {
      name: `User-${userId}-Wallet`,
      hiddenOnUI: false,
      customerRefId: userId,
    })) as { id?: string; name?: string };

    const vaultAccountId = response.id as string;
    console.log(`[Fireblocks] Created vault account: ${vaultAccountId} for user ${userId}`);

    // Create Arc testnet USDC asset account
    const assetResponse = (await fireblocksRequest(
      `/vault/accounts/${vaultAccountId}/create_transaction`,
      "POST",
      {
        assetId: "ARC_USDC", // Arc testnet USDC
        address: "", // Fireblocks will generate
      }
    )) as { address?: string };

    const address = assetResponse.address as string;
    console.log(`[Fireblocks] Created Arc asset account with address: ${address}`);

    return {
      vaultAccountId,
      name: `User-${userId}-Wallet`,
      address,
    };
  } catch (err) {
    console.error("[Fireblocks] Failed to create wallet:", err);
    throw new Error(`Failed to create Fireblocks wallet: ${err}`);
  }
}

/**
 * Get wallet balance from Fireblocks.
 */
export async function getWalletBalance(
  vaultAccountId: string,
  assetId: string = "ARC_USDC"
): Promise<number> {
  try {
    const response = (await fireblocksRequest(
      `/vault/accounts/${vaultAccountId}?assetId=${assetId}`
    )) as {
      assets?: Array<{ id: string; total: string }>;
    };

    const assets = response.assets as Array<{ id: string; total: string }> || [];
    const assetBalance = assets.find((a) => a.id === assetId);
    const balance = assetBalance ? parseFloat(assetBalance.total) : 0;

    console.log(`[Fireblocks] Wallet ${vaultAccountId} balance: ${balance} ${assetId}`);
    return balance;
  } catch (err) {
    console.error("[Fireblocks] Failed to get wallet balance:", err);
    throw new Error(`Failed to get wallet balance: ${err}`);
  }
}

/**
 * Create and sign a transaction using Fireblocks custody.
 */
export async function signAndSendTransaction(params: {
  vaultAccountId: string;
  destinationAddress: string;
  amount: number;
  assetId?: string;
}): Promise<{ txId: string; status: string }> {
  const assetId = params.assetId || "ARC_USDC";

  try {
    const response = (await fireblocksRequest("/transactions", "POST", {
      operation: "TRANSFER",
      assetId,
      source: {
        type: "VAULT_ACCOUNT",
        id: params.vaultAccountId,
      },
      destination: {
        type: "EXTERNAL_ADDRESS",
        address: params.destinationAddress,
      },
      amount: params.amount.toString(),
      note: `Arc settlement for ${params.destinationAddress}`,
      customerRefId: `tx_${Date.now()}`,
    })) as { id?: string; status?: string };

    const txId = response.id as string;
    const status = response.status as string;

    console.log(
      `[Fireblocks] Created transaction ${txId} with status ${status}`
    );

    return {
      txId,
      status,
    };
  } catch (err) {
    console.error("[Fireblocks] Failed to create transaction:", err);
    throw new Error(`Failed to sign transaction: ${err}`);
  }
}

/**
 * Get transaction status.
 */
export async function getTransactionStatus(txId: string): Promise<string> {
  try {
    const response = (await fireblocksRequest(`/transactions/${txId}`)) as {
      status?: string;
    };
    return response.status as string;
  } catch (err) {
    console.error("[Fireblocks] Failed to get transaction status:", err);
    throw new Error(`Failed to get transaction status: ${err}`);
  }
}

/**
 * Check if Fireblocks is configured and available.
 */
export function isFireblocksConfigured(): boolean {
  return !!(FIREBLOCKS_API_KEY && FIREBLOCKS_API_SECRET);
}
