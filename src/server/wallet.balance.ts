/**
 * GET /wallet/balance?userId=:userId
 * 
 * Treasury health check endpoint.
 * Returns Circle wallet balances for treasury operations ONLY.
 * 
 * ⚠️  ARCHITECTURE NOTE:
 * This endpoint uses Circle's read-only wallet API to check treasury liquidity.
 * It does NOT process user swaps - that's handled by /fx/execute → Arc.
 * Failure to fetch treasury balances is NON-FATAL and should not block swaps.
 */
import { createFileRoute } from "@tanstack/react-router";

import { getUserWalletId } from "@/server/services/wallet-service.server";
import { getCircleWalletBalances } from "@/server/providers/circle";

export const Route = createFileRoute(
  "/wallet/balance"
)({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);

          const userId =
            url.searchParams.get("userId");

          if (!userId) {
            throw new Error("Missing userId");
          }

          const walletId =
            await getUserWalletId(userId);

          const balances =
            await getCircleWalletBalances(
              walletId
            );

          return Response.json(balances);
        } catch (e) {
          return Response.json(
            {
              error:
                e instanceof Error
                  ? e.message
                  : "Failed to fetch balances",
            },
            { status: 400 }
          );
        }
      },
    },
  },
});