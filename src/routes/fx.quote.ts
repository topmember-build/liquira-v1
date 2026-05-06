/**
 * GET /fx/quote?from=USD&to=NGN&amount=100
 * Returns mock FX rate, fee, and estimated output.
 */
import { createFileRoute } from "@tanstack/react-router";
import { calculate_output } from "@/server/fx-engine.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/fx/quote")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const from = (url.searchParams.get("from") ?? "").trim();
          const to = (url.searchParams.get("to") ?? "").trim();
          const amount = Number(url.searchParams.get("amount") ?? "0");

          if (!from || !to || !Number.isFinite(amount) || amount <= 0) {
            return Response.json(
              { error: "Invalid params: from, to, amount required" },
              { status: 400, headers: CORS },
            );
          }

          const { rate, fee, estimatedAmount } = calculate_output(amount, from, to);
          return Response.json(
            { rate, fee, estimatedAmount },
            { headers: CORS },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Quote failed";
          return Response.json({ error: msg }, { status: 400, headers: CORS });
        }
      },
    },
  },
});
