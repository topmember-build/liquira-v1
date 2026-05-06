/**
 * POST /fx/execute
 * Body: { fromCurrency, toCurrency, amount, userId }
 * Creates a pending transaction in the in-memory store.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { calculate_output } from "@/server/fx-engine.server";
import { create_transaction } from "@/server/transaction-service.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const Body = z.object({
  fromCurrency: z.string().min(1).max(12),
  toCurrency: z.string().min(1).max(12),
  amount: z.number().positive().max(1_000_000_000),
  userId: z.string().min(1).max(128),
});

export const Route = createFileRoute("/fx/execute")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const data = Body.parse(json);
          const { rate, fee, estimatedAmount } = calculate_output(
            data.amount,
            data.fromCurrency,
            data.toCurrency,
          );
          const tx = create_transaction({
            userId: data.userId,
            fromCurrency: data.fromCurrency,
            toCurrency: data.toCurrency,
            fromAmount: data.amount,
            toAmount: estimatedAmount,
            rate,
            fee,
          });
          return Response.json(
            {
              status: tx.status,
              transactionId: tx.transactionId,
              fromAmount: tx.fromAmount,
              toAmount: tx.toAmount,
              rate: tx.rate,
              fee: tx.fee,
            },
            { headers: CORS },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Execute failed";
          return Response.json({ error: msg }, { status: 400, headers: CORS });
        }
      },
    },
  },
});
