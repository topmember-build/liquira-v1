import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeQuote } from "@/lib/quote-engine";

/**
 * =========================
 * QUOTE / SIMULATION
 * =========================
 */
const SimulateInput = z.object({
  fromToken: z.string(),
  toToken: z.string(),
  fromChain: z.string(),
  toChain: z.string(),
  amount: z.number(),
  slippageBps: z.number(),
});

export const simulateSwap = createServerFn({ method: "POST" })
  .inputValidator((d) => SimulateInput.parse(d))
  .handler(async ({ data }) => {
    const quote = computeQuote({
      fromToken: data.fromToken,
      toToken: data.toToken,
      fromChain: data.fromChain,
      toChain: data.toChain,
      amountIn: data.amount,
      slippageBps: data.slippageBps,
    });

    return { quote };
  });

/**
 * =========================
 * EXECUTE SWAP (DEPRECATED - Use /fx/execute instead)
 * =========================
 * 
 * ⚠️  ARCHITECTURE NOTE:
 * This function is LEGACY and should not be used for swap execution.
 * 
 * ALL swap execution must go through /fx/execute route, which:
 * 1. Orchestrates quote generation
 * 2. Routes through Arc settlement (execution layer)
 * 3. Updates transaction status in Supabase
 * 4. Enforces proper separation of concerns
 * 
 * Circle is treasury-only and must NEVER be used for swap execution.
 * Only Arc testnet performs actual swaps.
 * 
 * DEPRECATED: This function only creates a transaction record.
 * Use /fx/execute for the actual swap orchestration.
 */
const ExecuteInput = z.object({
  routeId: z.string(),
  fromToken: z.string(),
  toToken: z.string(),
  fromChain: z.string(),
  toChain: z.string(),
  amount: z.number(),
  slippageBps: z.number(),
  destinationAddress: z.string().describe("Blockchain destination address (NOT Circle wallet ID)"),
  source: z.string().optional(),
});

export const executeSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ExecuteInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!context) {
      throw new Error("Authentication context missing");
    }
    const userId = context.userId;

    console.warn(
      "[executeSwap] DEPRECATED: Use /fx/execute route instead for proper orchestration. " +
      "This endpoint only creates transaction records."
    );

    // Validate blockchain address format
    if (!data.destinationAddress.match(/^0x[0-9a-fA-F]{40}$/)) {
      throw new Error(
        "Invalid destination address format. Must be a valid Ethereum address (0x + 40 hex chars). " +
        "This must be a blockchain address, NOT a Circle wallet ID."
      );
    }

    const { data: swapData, error } = await supabaseAdmin
      .from("swaps")
      .insert({
        route_id: data.routeId,
        amount_in: data.amount,
        from_chain: data.fromChain,
        from_token: data.fromToken,
        to_chain: data.toChain,
        to_token: data.toToken,
        slippage_bps: data.slippageBps,
        status: "queued",
        source: data.source ?? "web",
        user_id: userId,
        wallet_address: data.destinationAddress,
      })
      .select()
      .single();

    if (error || !swapData) {
      throw new Error("Failed to create swap");
    }

    return {
      swapId: swapData.id,
      status: "queued",
      message: "Swap queued. Use /fx/execute for actual settlement through Arc.",
    };
  });
