import { createFileRoute } from "@tanstack/react-router";
import { list_transactions } from "@/server/transaction-service.server";
import { arcTestnet } from "@/lib/arc-testnet";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/tx")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const userId = url.searchParams.get("userId")?.trim();
          const walletAddress = url.searchParams.get("walletAddress")?.trim();
          const status = url.searchParams.get("status")?.trim();
          const limit = Number(url.searchParams.get("limit") ?? "10");
          const offset = Number(url.searchParams.get("offset") ?? "0");

          if (!userId && !walletAddress) {
            return Response.json(
              { error: "userId or walletAddress query parameter is required" },
              { status: 400, headers: CORS }
            );
          }

          if (!Number.isFinite(limit) || limit <= 0) {
            return Response.json(
              { error: "Invalid limit parameter" },
              { status: 400, headers: CORS }
            );
          }

          if (!Number.isFinite(offset) || offset < 0) {
            return Response.json(
              { error: "Invalid offset parameter" },
              { status: 400, headers: CORS }
            );
          }

          const transactions = await list_transactions({
            userId,
            walletAddress,
            status,
            limit,
            offset,
          });

          return Response.json(
            {
              transactions: transactions.map((tx) => {
                const txHash = tx.arcTxHash || tx.circleTransferId;
                const explorerUrl = txHash
                  ? `${arcTestnet.blockExplorers?.default?.url || "https://testnet.arcscan.app"}/tx/${txHash}`
                  : null;

                return {
                  id: tx.transactionId,
                  status: tx.status,
                  sourceChain: "arc-testnet",
                  destinationChain: "arc-testnet",
                  sourceToken: tx.fromCurrency,
                  destinationToken: tx.toCurrency,
                  sourceAmount: String(tx.fromAmount),
                  destinationAmount: String(tx.toAmount),
                  estimatedOutput: String(tx.toAmount),
                  provider: "Liquira FX",
                  txHash,
                  explorerUrl,
                  errorMessage: tx.errorMessage,
                  createdAt: tx.createdAt,
                  updatedAt: tx.updatedAt,
                };
              }),
              total: transactions.length,
            },
            { headers: CORS }
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to fetch transaction history";
          return Response.json({ error: msg }, { status: 500, headers: CORS });
        }
      },
    },
  },
});
