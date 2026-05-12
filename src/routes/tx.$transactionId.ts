/**
 * GET /tx/:transactionId
 * Returns current status of a transaction from Supabase.
 * Used by frontend to poll transaction status until completion.
 */
import { createFileRoute } from "@tanstack/react-router";
import { get_transaction } from "@/server/transaction-service.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/tx/$transactionId")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        try {
          console.log("[TX Poll] Fetching transaction:", params.transactionId);

          const tx = await get_transaction(params.transactionId);

          if (!tx) {
            console.warn("[TX Poll] Transaction not found:", params.transactionId);
            return Response.json(
              { error: "Transaction not found" },
              { status: 404, headers: CORS }
            );
          }

          console.log("[TX Poll] Transaction found:", {
            transactionId: tx.transactionId,
            status: tx.status,
          });

          return Response.json(
            {
              status: tx.status,
              details: {
                transactionId: tx.transactionId,
                userId: tx.userId,
                fromCurrency: tx.fromCurrency,
                toCurrency: tx.toCurrency,
                fromAmount: tx.fromAmount,
                toAmount: tx.toAmount,
                rate: tx.rate,
                fee: tx.fee,
                arcTxHash: tx.arcTxHash,
                circleTransferId: tx.circleTransferId,
                errorMessage: tx.errorMessage,
                createdAt: tx.createdAt,
                updatedAt: tx.updatedAt,
                ...tx.details,
              },
            },
            { headers: CORS }
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Poll failed";
          console.error("[TX Poll] Error:", msg);
          return Response.json(
            { error: msg },
            { status: 500, headers: CORS }
          );
        }
      },
    },
  },
});
