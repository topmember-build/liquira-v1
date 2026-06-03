/**
 * Execute Routes
 *
 * Endpoints:
 * - POST /api/execute - Execute a selected route (send to ARC)
 * - GET /api/execute/status/:executionId - Get execution status
 */

import { Router, Request, Response, NextFunction } from "express";
import { validateInput, ExecuteRequestSchema, ExecuteRequestInput } from "../utils/validators";
import { ExecutionError, NotFoundError } from "../utils/errors";
import { logger } from "../utils/logger";
import { quoteStore, executionStore } from "../services/arc-store";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const router = Router();

/**
 * POST /api/execute
 *
 * Execute a selected route by sending it to ARC
 *
 * Request body:
 * {
 *   "transactionId": "uuid-123",
 *   "quoteId": "quote-456",
 *   "userAddress": "0x1234...",
 *   "signature": "0x..." (optional)
 * }
 *
 * Response:
 * {
 *   "executionId": "exec-789",
 *   "status": "executing",
 *   "arcPayload": {...},
 *   "estimatedCompletionTime": 300
 * }
 */
router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info("Execute request received", {
        transactionId: req.body.transactionId,
        quoteId: req.body.quoteId,
      });

      // Validate request
      const request = validateInput(ExecuteRequestSchema, req.body) as ExecuteRequestInput;

      const quoteEntry = quoteStore.getQuoteEntry(request.transactionId);
      if (!quoteEntry) {
        throw new ExecutionError("Quote transaction not found", 404);
      }

      const quote = quoteStore.getQuote(request.transactionId, request.quoteId);
      if (!quote) {
        throw new ExecutionError("Quote not found for transaction", 404);
      }

      const validation = quoteStore.validateQuote(request.transactionId, request.quoteId);
      if (!validation.valid) {
        throw new ExecutionError(validation.message, 400);
      }

      const arcPayload = {
        ...quote.arcPayload,
        transactionId: request.transactionId,
        recipient: request.userAddress,
        metadata: {
          ...(quote.arcPayload?.metadata || {}),
          quoteId: quote.quoteId,
        },
      };

      const execution = executionStore.createExecution(
        request.transactionId,
        request.quoteId,
        arcPayload
      );

      try {
        const normalizedAddress = request.userAddress.toLowerCase();
        const { data: walletRow, error: walletError } = await supabaseAdmin
          .from("user_wallets")
          .select("user_id")
          .eq("address", normalizedAddress)
          .limit(1)
          .maybeSingle();

        if (walletError) {
          logger.warn("Could not lookup wallet owner for swap persistence", {
            error: walletError.message,
            walletAddress: normalizedAddress,
          });
        }

        if (walletRow?.user_id) {
          const fromToken = quoteEntry.request.sourceToken;
          const toToken = quoteEntry.request.destinationToken;
          const fromChain = quoteEntry.request.sourceChain;
          const toChain = quoteEntry.request.destinationChain;
          const { error: swapError } = await supabaseAdmin
            .from("swaps")
            .upsert(
              {
                id: request.transactionId,
                user_id: walletRow.user_id,
                wallet_address: normalizedAddress,
                quote_id: quote.quoteId,
                status: "executing",
                from_token: fromToken,
                to_token: toToken,
                from_chain: fromChain,
                to_chain: toChain,
                amount_in: quoteEntry.request.amount,
                amount_out: quote.estimatedOutput,
                route_legs: quote.route,
                source: "api",
              } as any,
              { onConflict: "id" }
            );

          if (swapError) {
            logger.warn("Failed to persist execution swap record", {
              error: swapError.message,
              transactionId: request.transactionId,
            });
          }
        }
      } catch (error) {
        logger.warn("Execution persistence failed", {
          error: error instanceof Error ? error.message : String(error),
          transactionId: request.transactionId,
        });
      }

      const response = {
        executionId: execution.executionId,
        transactionId: request.transactionId,
        status: execution.status,
        arcPayload: execution.arcPayload,
        estimatedCompletionTime: 300,
      };

      logger.info("Execute response sent", {
        executionId: execution.executionId,
        transactionId: request.transactionId,
      });

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/execute/status/:executionId
 *
 * Get execution status
 *
 * Response:
 * {
 *   "executionId": "exec-789",
 *   "transactionId": "uuid-123",
 *   "status": "executing",
 *   "currentStep": 2,
 *   "totalSteps": 3,
 *   "progress": "...",
 *   "createdAt": "2026-05-09T10:00:00Z",
 *   "updatedAt": "2026-05-09T10:05:00Z"
 * }
 */
router.get(
  "/status/:executionId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const executionId = Array.isArray(req.params.executionId)
        ? req.params.executionId[0]
        : req.params.executionId;

      logger.info("Execution status requested", { executionId });

      const execution = executionStore.getExecution(executionId);
      if (!execution) {
        throw new NotFoundError("Execution not found");
      }

      const response = {
        executionId,
        transactionId: execution.transactionId,
        status: execution.status,
        currentStep: execution.currentStep ?? 0,
        totalSteps: execution.totalSteps ?? 0,
        progress:
          execution.currentStep != null && execution.totalSteps != null
            ? `${execution.currentStep}/${execution.totalSteps}`
            : "pending",
        createdAt: new Date(execution.createdAt).toISOString(),
        updatedAt: new Date(execution.updatedAt).toISOString(),
        txHash: execution.txHash,
        error: execution.error,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
