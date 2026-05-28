/**
 * GET /circle/stable-fx?from=USD&to=EUR&amount=100
 * Returns a Circle stable FX quote if the feature is enabled.
 * This is a non-critical helper route for treasury FX.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCircleStableFxQuote, isCircleStableFXEnabled } from "@/server/providers/circle";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const QuerySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  amount: z.preprocess((value) => Number(value), z.number().positive()),
});

export const Route = createFileRoute("/circle/stablefx")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        if (!isCircleStableFXEnabled()) {
          return Response.json(
            { error: "Circle Stable FX is disabled" },
            { status: 404, headers: CORS }
          );
        }

        try {
          const url = new URL(request.url);
          const rawQuery = {
            from: url.searchParams.get("from") ?? "",
            to: url.searchParams.get("to") ?? "",
            amount: url.searchParams.get("amount") ?? "",
          };

          const query = QuerySchema.parse(rawQuery);
          const quote = getCircleStableFxQuote(query.from, query.to, query.amount);

          return Response.json(
            {
              provider: "circle",
              from: query.from.toUpperCase(),
              to: query.to.toUpperCase(),
              amount: query.amount,
              rate: quote.rate,
              fee: quote.fee,
              estimatedAmount: (query.amount - quote.fee) * quote.rate,
            },
            { headers: CORS }
          );
        } catch (error) {
          return Response.json(
            {
              error: error instanceof Error ? error.message : "Invalid request",
            },
            { status: 400, headers: CORS }
          );
        }
      },
    },
  },
});
