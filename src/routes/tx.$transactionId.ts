/**
 * GET /tx/:transactionId
 * Returns current status of a transaction from the in-memory store.
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
        const tx = get_transaction(params.transactionId);
        if (!tx) {
          return Response.json(
            { error: "Transaction not found" },
            { status: 404, headers: CORS },
          );
        }
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
              createdAt: tx.createdAt,
              updatedAt: tx.updatedAt,
              ...tx.details,
            },
          },
          { headers: CORS },
        );
      },
    },
  },
});
