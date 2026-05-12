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
 * - Circle is used ONLY for treasury balance checks (read-only)
 * - Arc testnet is the ONLY execution layer
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
import { getCircleWalletBalances } from "@/server/providers/circle";
import { simulate_arc_settlement } from "@/server/arc-settlement.server";
import { route_payment } from "@/server/services/payment-router";
import {
  start_execution,
  finalize_execution,
} from "@/server/services/transaction-journal";

const Body = z.object({
  fromCurrency: z.string(),
  toCurrency: z.string(),
  amount: z.number().positive(),
  sourceWalletAddress: z.string().optional(),
  destinationAddress: z.string().optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/fx/execute")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let txId: string | undefined;

        try {
          console.log("[FX Execute] Received POST request");

          const data = Body.parse(await request.json());
          console.log("[FX Execute] Request body:", {
            fromCurrency: data.fromCurrency,
            toCurrency: data.toCurrency,
            amount: data.amount,
            destinationAddress: data.destinationAddress,
          });

          // 1. Check Circle treasury wallet balances (treasury health - NON-FATAL)
          const treasuryWalletId = process.env.CIRCLE_WALLET_ID;
          if (!treasuryWalletId) {
            throw new Error("Missing CIRCLE_WALLET_ID");
          }

          try {
            const balances = await getCircleWalletBalances(treasuryWalletId);
            console.log("[FX Execute] Circle treasury balances checked:", balances);
          } catch (circleError) {
            console.warn(
              "[FX Execute] Circle balance check failed (non-fatal):",
              circleError instanceof Error ? circleError.message : String(circleError)
            );
          }

          // 2. Build route and create the payment transaction record
          const destinationAddress =
            data.destinationAddress || process.env.ARC_DESTINATION_ADDRESS;
          if (!destinationAddress) {
            throw new Error("Destination address is required for settlement");
          }

          const routeResult = await route_payment({
            userId: data.sourceWalletAddress || "treasury",
            sourceWalletAddress: data.sourceWalletAddress,
            recipientWalletAddress: destinationAddress,
            fromCurrency: data.fromCurrency,
            toCurrency: data.toCurrency,
            amount: data.amount,
          });

          txId = routeResult.transactionId;
          console.log("[FX Execute] Route created for transaction", txId, {
            providerId: routeResult.route.providerId,
            routeId: routeResult.route.routeId,
          });

          // 3. Start execution phase in the transaction journal
          await start_execution(txId, routeResult.route.arcPayload);
          console.log("[FX Execute] Execution started for transaction", txId);

          // 4. Execute Arc settlement (testnet) - THIS IS THE CRITICAL PATH
          const arcResult = await simulate_arc_settlement({
            amount: data.amount,
            destinationAddress,
          });

          console.log("[FX Execute] Arc settlement completed:", arcResult);

          // 5. Finalize transaction status to SUCCESS with Arc tx hash
          const updatedTx = await finalize_execution(txId, "success", {
            arcTxHash: arcResult.txHash,
            note: "Arc settlement execution successful.",
          });

          console.log("[FX Execute] Transaction updated to success:", updatedTx);

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
          console.error("[FX Execute] Error:", errorMsg, { txId });

          if (txId) {
            try {
              await finalize_execution(txId, "failed", {
                errorMessage: errorMsg,
              });
            } catch (updateError) {
              console.error("[FX Execute] Failed to update transaction to failed:", updateError);
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
