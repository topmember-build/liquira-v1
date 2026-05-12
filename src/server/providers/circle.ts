/**
 * Circle provider for treasury operations ONLY.
 * 
 * ⚠️  ARCHITECTURE CONSTRAINT:
 * Circle is the TREASURY LAYER, NOT the execution layer.
 * - ALLOWED: Read wallet balances, check treasury health
 * - FORBIDDEN: Use for swap execution, user transaction signing
 * 
 * EXECUTION RULES:
 * - Circle is ONLY called for read-only treasury health checks
 * - All user swaps are executed through Arc testnet (see arc-settlement.server.ts)
 * - Circle transfers must NEVER be part of the swap flow
 * - If Circle API fails, it must not block Arc settlement (non-fatal)
 * 
 * This separation is critical for system stability:
 * - Arc = Fast, low-latency swap execution
 * - Circle = Slow treasury reconciliation (optional, background)
 * - Decoupling prevents cascade failures
 */

import { arcTestnet } from "../../lib/arc-testnet";

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const CIRCLE_API_BASE = "https://api.circle.com/v1/w3s";

if (!CIRCLE_API_KEY) {
  throw new Error("Missing Circle API key");
}

type CircleResponse = Record<string, unknown>;

function redactBody(body: Record<string, unknown>) {
  const safeBody = { ...body };
  if (typeof safeBody.entitySecretCiphertext === "string") {
    safeBody.entitySecretCiphertext = "***REDACTED***";
  }
  return safeBody;
}

export function deriveCircleBlockchain(): string {
  const envChain = process.env.CIRCLE_DESTINATION_BLOCKCHAIN;
  if (envChain) return envChain;

  if (arcTestnet.id === 5042002) {
    return "ARC";
  }

  return "ETH";
}

async function circleRequest(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<CircleResponse> {
  const url = `${CIRCLE_API_BASE}/${path}`;
  const requestInit: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${CIRCLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  console.info(
    `[Circle] ${method} ${url}`,
    body ? redactBody(body) : undefined,
  );

  const response = await fetch(url, requestInit);

  let data: CircleResponse = {};

  try {
    data = (await response.json()) as CircleResponse;
  } catch {
    data = {};
  }

  if (!response.ok) {
    console.error(`[Circle] ${method} ${url} failed`, {
      status: response.status,
      data,
    });

    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
        ? data.error
        : "Circle request failed";

    throw new Error(message);
  }

  console.info(`[Circle] ${method} ${url} success`, {
    status: response.status,
    data,
  });

  return data;
}

export async function getCircleWallet(
  walletId: string
): Promise<CircleResponse> {
  return await circleRequest(`wallets/${walletId}`);
}

export async function getCircleWalletBalances(
  walletId: string
): Promise<CircleResponse> {
  return await circleRequest(`wallets/${walletId}/balances`);
}

export async function createCircleTransfer(params: {
  amount: number;
  destinationAddress?: string;
  walletId?: string;
  tokenId?: string;
  destinationBlockchain?: string;
  idempotencyKey?: string;
}): Promise<CircleResponse> {
  /**
   * ⚠️  CRITICAL: DO NOT USE THIS FOR SWAP EXECUTION
   * 
   * This function is ONLY for treasury operations (background reconciliation).
   * 
   * If you are calling this from swap execution logic, you are violating the architecture:
   * - Swaps must use Arc testnet (see arc-settlement.server.ts)
   * - Circle is treasury-only
   * - Confusing Circle with execution layer causes "403 Circle errors" and cascade failures
   * 
   * CORRECT FLOW: /fx/execute → Arc settlement → Supabase update
   * WRONG FLOW: /fx/execute → Circle transfer → (fails with 403)
   */
  console.warn(
    "[createCircleTransfer] ARCHITECTURE CHECK: This function should ONLY be used " +
    "for treasury reconciliation. If called from swap execution, use /fx/execute → Arc instead."
  );

  const walletId = params.walletId || process.env.CIRCLE_WALLET_ID;
  const destinationAddress =
    params.destinationAddress || process.env.CIRCLE_DESTINATION_ADDRESS;
  const entitySecretCiphertext = process.env.CIRCLE_ENTITY_SECRET;
  const tokenId = params.tokenId || "USDC";
  const blockchain =
    params.destinationBlockchain || deriveCircleBlockchain();

  if (!walletId) {
    throw new Error("Missing CIRCLE_WALLET_ID");
  }

  if (!destinationAddress) {
    throw new Error("Missing CIRCLE_DESTINATION_ADDRESS");
  }

  if (!entitySecretCiphertext) {
    throw new Error("Missing CIRCLE_ENTITY_SECRET");
  }

  const body: Record<string, unknown> = {
    idempotencyKey:
      params.idempotencyKey ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `circle-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    amounts: [params.amount.toString()],
    destinationAddress,
    entitySecretCiphertext,
    walletId,
    tokenId,
    feeLevel: "medium",
    blockchain,
  };

  return await circleRequest("transactions/transfer", "POST", body);
}