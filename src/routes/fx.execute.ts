/**
 * POST /fx/execute
 * 
 * CORE SWAP EXECUTION ENDPOINT
 * 
 * This is the SINGLE ORCHESTRATION POINT for all swaps.
 * It enforces the architecture:
 * 1. Calculate quote (rate + fee)
 * 2. Check Circle treasury health (non-fatal, informational)
 * 3. Create transaction record in Supabase (PENDING)
 * 4. Execute settlement via Arc testnet
 * 5. Update Supabase with result
 * 6. Return transaction ID for polling
 * 
 * ⚠️  ARCHITECTURE RULES:
 * - Backend is the single source of truth
 * - Circle is used ONLY for treasury balance checks or future stable FX quoting (read-only)
 * - Arc testnet is the ONLY execution layer and the current gas-sponsoring treasury
 * - Supabase tracks all transaction state
 * - Circle failures are NON-FATAL and do not block Arc execution
 * - Frontend must NEVER call Arc or Circle directly
 * 
 * RESPONSE CODES:
 * - 200: Transaction created and Arc settlement initiated (check /tx/:id to poll)
 * - 500: Fatal error - transaction may be marked as failed in Supabase
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CONFIGURATION } from "@/backend/config/environment";
import { getCircleWalletBalances } from "@/server/providers/circle";
import { simulate_arc_settlement } from "@/server/arc-settlement.server";
import { route_payment } from "@/server/services/payment-router";
import {
  start_execution,
  finalize_execution,
  notifyTransactionStatus,
} from "@/server/services/transaction-journal";
import { enforceRateLimit, getCorsHeaders } from "@/server/utils/security";
import { logger } from "@/backend/utils/logger";

const Body = z.object({
  userId: z.string().optional(),
  fromCurrency: z.string(),
  toCurrency: z.string(),
  amount: z.number().positive(),
  sourceWalletAddress: z.string().optional(),
  destinationAddress: z.string().optional(),
  recipientWalletAddress: z.string().optional(),
  permit: z.record(z.any()).optional(),
});

const CORS = getCorsHeaders();

export const Route = createFileRoute("/fx/execute")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const rateLimit = enforceRateLimit(
          request,
          CONFIGURATION.RATE_LIMIT.EXECUTE_PER_MINUTE,
          60_000,
        );

        if (rateLimit.limited) {
          return Response.json(
            {
              status: "failed",
              error: "Rate limit exceeded. Try again later.",
              retryAfterSeconds: rateLimit.retryAfter,
            },
            { status: 429, headers: CORS },
          );
        }

        let txId: string | undefined;

        try {
          logger.info("[FX Execute] Received POST request");

          const data = Body.parse(await request.json());
          logger.debug("[FX Execute] Request body", {
            fromCurrency: data.fromCurrency,
            toCurrency: data.toCurrency,
            amount: data.amount,
            destinationAddress: data.destinationAddress,
          });

          // 1. Check Circle treasury wallet balances (treasury health - NON-FATAL)
          const treasuryWalletId = process.env.CIRCLE_WALLET_ID;

          if (process.env.CIRCLE_API_KEY && treasuryWalletId) {
            try {
              const balances = await getCircleWalletBalances(treasuryWalletId);
              console.log("[FX Execute] Circle treasury balances checked:", balances);
            } catch (circleError) {
              logger.warn("[FX Execute] Circle balance check failed (non-fatal):", {
                error: circleError instanceof Error ? circleError.message : String(circleError),
              });
            }
          } else {
            console.info(
              "[FX Execute] Skipping Circle treasury health check because Circle is not fully configured."
            );
          }

          // 2. Build route and create the payment transaction record
          const destinationAddress =
            data.destinationAddress ||
            data.recipientWalletAddress ||
            process.env.ARC_DESTINATION_ADDRESS;

          if (!destinationAddress) {
            throw new Error("Destination address is required for settlement");
          }

          if (data.permit) {
            if (!data.sourceWalletAddress) {
              throw new Error("Permit payload requires a connected source wallet address.");
            }

            console.log("[FX Execute] Permit payload received", {
              hasPermit: true,
              permitKeys: Object.keys(data.permit),
              sourceWalletAddress: data.sourceWalletAddress,
            });
          }

          const routeResult = await route_payment({
            userId: data.userId || data.sourceWalletAddress || "treasury",
            sourceWalletAddress: data.sourceWalletAddress,
            recipientWalletAddress: destinationAddress,
            fromCurrency: data.fromCurrency,
            toCurrency: data.toCurrency,
            amount: data.amount,
            permit: data.permit,
          });

          txId = routeResult.transactionId;
          logger.info("[FX Execute] Route created for transaction", {
            txId,
            providerId: routeResult.route.providerId,
            routeId: routeResult.route.routeId,
          });

          // 3. Start execution phase in the transaction journal
          await start_execution(txId, routeResult.route.arcPayload as unknown as Record<string, unknown>);
          logger.info("[FX Execute] Execution started for transaction", { txId });

          // 4. Execute Arc settlement (testnet) - THIS IS THE CRITICAL PATH
          const arcResult = await simulate_arc_settlement({
            amount: data.amount,
            sourceToken: data.fromCurrency,
            sourceWalletAddress: data.sourceWalletAddress,
            destinationAddress,
            permit: data.permit as any,
          });

          logger.info("[FX Execute] Arc settlement completed", { arcResult });

          // 5. Finalize transaction status to SUCCESS with Arc tx hash
          const updatedTx = await finalize_execution(txId, "success", {
            arcTxHash: arcResult.txHash,
            note: "Arc settlement execution successful.",
          });

          if (updatedTx) {
            await notifyTransactionStatus(updatedTx, "success");
          }

          logger.info("[FX Execute] Transaction updated to success", { txId, updatedTx });

          return Response.json(
            {
              status: "success",
              transactionId: txId,
              fromAmount: routeResult.transaction.fromAmount,
              toAmount: routeResult.transaction.toAmount,
              rate: routeResult.transaction.rate,
              fee: routeResult.transaction.fee,
              arcTxHash: arcResult.txHash,
            },
            { headers: CORS }
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          logger.error("[FX Execute] Error", { error: errorMsg, txId });

          if (txId) {
            try {
              const failedTx = await finalize_execution(txId, "failed", {
                errorMessage: errorMsg,
              });
              if (failedTx) {
                await notifyTransactionStatus(failedTx, "failed");
              }
            } catch (updateError) {
              logger.error("[FX Execute] Failed to update transaction to failed", { error: updateError });
            }
          }

          return Response.json(
            {
              status: "failed",
              transactionId: txId,
              error: errorMsg,
            },
            { status: 500, headers: CORS }
          );
        }
      },
    },
  },
});
