/**
 * Transaction Routes
 *
 * Endpoints:
 * - GET /api/transaction/:id - Get transaction details and status
 * - GET /api/transaction - List user's transactions
 */

import { Router, Request, Response, NextFunction } from "express";
import { NotFoundError } from "../utils/errors";
import { logger } from "../utils/logger";
import { TransactionResponse } from "../types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const router = Router();

/**
 * GET /api/transaction/:id
 *
 * Get transaction details and current status
 *
 * Response:
 * {
 *   "id": "uuid-123",
 *   "status": "executing",
 *   "sourceChain": "ethereum",
 *   "destinationChain": "polygon",
 *   "sourceAmount": "1000000000",
 *   "estimatedOutput": "999000000",
 *   "progress": {
 *     "currentStep": 2,
 *     "totalSteps": 3,
 *     "stepStatus": "bridging"
 *   },
 *   "createdAt": "2026-05-09T10:00:00Z",
 *   "updatedAt": "2026-05-09T10:05:00Z",
 *   "completedAt": null,
 *   "error": null
 * }
 */
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      if (!id) {
        throw new NotFoundError("Transaction id is required");
      }

      logger.info("Transaction details requested", { transactionId: id });

      // Fetch swap/transaction by id from swaps table
      const { data: rows, error } = await supabaseAdmin.from("swaps").select("*").eq("id", id).maybeSingle();
      if (error || !rows) {
        throw new NotFoundError("Transaction not found");
      }

      const tx: TransactionResponse = {
        id: rows.id,
        status: (rows.status as any) ?? "pending",
        sourceChain: rows.from_chain,
        destinationChain: rows.to_chain,
        sourceAmount: String(rows.amount_in ?? "0"),
        estimatedOutput: String(rows.amount_out ?? "0"),
        progress: {
          currentStep: 0,
          totalSteps: 1,
          stepStatus: (rows.status as any) ?? "pending",
        },
        completedAt: rows.confirmed_at ? new Date(rows.confirmed_at) : undefined,
        error: rows.error_message ?? undefined,
      };

      res.status(200).json(tx);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/transaction?userId=:userId&limit=10
 *
 * List user's transactions with pagination
 *
 * Query parameters:
 * - userId (required) - User ID
 * - limit (optional, default 20) - Number of transactions to return
 * - offset (optional, default 0) - Pagination offset
 *
 * Response:
 * {
 *   "transactions": [...],
 *   "total": 42,
 *   "limit": 20,
 *   "offset": 0
 * }
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, walletAddress, status, limit = "20", offset = "0" } = req.query;
      const normalizedUserId = userId ? (Array.isArray(userId) ? String(userId[0]) : String(userId)) : undefined;
      const normalizedWalletAddress = walletAddress
        ? (Array.isArray(walletAddress) ? String(walletAddress[0]).toLowerCase() : String(walletAddress).toLowerCase())
        : undefined;

      if (!normalizedUserId && !normalizedWalletAddress) {
        throw new NotFoundError("userId or walletAddress query parameter is required");
      }

      logger.info("User transactions requested", {
        userId: normalizedUserId,
        walletAddress: normalizedWalletAddress,
        status,
        limit,
        offset,
      });

      // Validate pagination params
      const lim = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const off = Math.max(0, parseInt(offset as string, 10) || 0);

      // Fetch linked wallet addresses for this user
      const addresses = normalizedUserId
        ? ((await supabaseAdmin.from("user_wallets").select("address").eq("user_id", normalizedUserId)).data ?? [])
            .map((w: any) => w.address)
            .filter(Boolean)
        : [];

      const filters: string[] = [];
      if (normalizedUserId) filters.push(`user_id.eq.${normalizedUserId}`);
      if (normalizedWalletAddress) filters.push(`wallet_address.eq.${normalizedWalletAddress}`);
      for (const a of addresses) {
        if (normalizedWalletAddress?.toLowerCase() !== a.toLowerCase()) {
          filters.push(`wallet_address.eq.${a}`);
        }
      }

      const filterStr = filters.join(",");

      const query = supabaseAdmin
        .from("swaps")
        .select("*", { count: "exact" })
        .or(filterStr)
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        query.eq("status", String(status));
      }

      const { data: rows, error: rowsErr, count: totalCount } = await query.range(off, off + lim - 1);

      if (rowsErr) throw rowsErr;

      const transactions = (rows ?? []).map((r: any) => ({
        id: r.id,
        status: r.status,
        sourceChain: r.from_chain,
        destinationChain: r.to_chain,
        sourceToken: r.from_token,
        destinationToken: r.to_token,
        sourceAmount: String(r.amount_in),
        destinationAmount: r.amount_out ? String(r.amount_out) : undefined,
        estimatedOutput: String(r.amount_out ?? 0),
        provider: r.source ?? "",
        txHash: r.tx_hash ?? r.arc_tx_hash ?? null,
        errorMessage: r.error_message ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at ?? r.created_at,
      }));

      const response = {
        transactions,
        total: totalCount ?? transactions.length,
        limit: lim,
        offset: off,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
