/**
 * Server-side swap pipeline. Mock execution: queued -> simulating -> pending -> confirmed/failed
 * Status updates are written to public.swaps (realtime-enabled) so the UI tracks live.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeQuote } from "@/lib/quote-engine";

const SimulateInput = z.object({
  fromToken: z.string().min(1).max(12),
  toToken: z.string().min(1).max(12),
  fromChain: z.string().min(1).max(32),
  toChain: z.string().min(1).max(32),
  amount: z.number().positive().max(1_000_000_000),
  slippageBps: z.number().int().min(0).max(5000).default(30),
});

export const simulateSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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

const ExecuteInput = z.object({
  routeId: z.string().uuid().optional(),
  fromToken: z.string().min(1).max(12),
  toToken: z.string().min(1).max(12),
  fromChain: z.string().min(1).max(32),
  toChain: z.string().min(1).max(32),
  amount: z.number().positive().max(1_000_000_000),
  slippageBps: z.number().int().min(0).max(5000).default(30),
  source: z.enum(["web", "scheduled"]).default("web"),
  scheduleId: z.string().uuid().optional(),
  walletAddress: z.string().max(64).optional(),
});

function fakeTxHash() {
  const hex = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 64; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
}

const EXPLORERS: Record<string, string> = {
  base: "https://basescan.org/tx/",
  ethereum: "https://etherscan.io/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
};

/**
 * Starts a swap and progresses through the lifecycle in the background.
 * Returns the swap id immediately so the client can subscribe to realtime updates.
 */
export const executeSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ExecuteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const quote = computeQuote({
      fromToken: data.fromToken,
      toToken: data.toToken,
      fromChain: data.fromChain,
      toChain: data.toChain,
      amountIn: data.amount,
      slippageBps: data.slippageBps,
    });

    const insertPayload = {
      user_id: userId,
      route_id: data.routeId ?? null,
      from_token: quote.fromToken,
      to_token: quote.toToken,
      from_chain: quote.fromChain,
      to_chain: quote.toChain,
      amount_in: quote.amountIn,
      amount_out: quote.amountOut,
      rate: quote.rate,
      min_received: quote.minReceived,
      price_impact_bps: quote.priceImpactBps,
      slippage_bps: quote.slippageBps,
      gas_estimate_usd: quote.gasEstimateUsd,
      route_legs: JSON.parse(JSON.stringify(quote.route)),
      quote_id: quote.quoteId,
      status: "queued",
      wallet_address: data.walletAddress ?? null,
      source: data.source,
    };

    const { data: inserted, error } = await supabaseAdmin
      .from("swaps")
      .insert([insertPayload])
      .select("id")
      .single();

    if (error || !inserted) throw new Error(error?.message ?? "Could not enqueue swap");

    const swapId = inserted.id;

    // Background driver — uses small timeouts to walk through statuses.
    // We don't await it so the client gets the id fast and tracks via realtime.
    runSwapPipeline(swapId, quote.toChain, data.scheduleId).catch((e) =>
      console.error("[swap-pipeline]", swapId, e),
    );

    return { swapId, quote };
  });

async function runSwapPipeline(swapId: string, toChain: string, scheduleId?: string) {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // queued -> simulating
  await sleep(600);
  await supabaseAdmin.from("swaps").update({ status: "simulating" }).eq("id", swapId);

  // simulating -> pending
  await sleep(900);
  const tx = fakeTxHash();
  const explorer = (EXPLORERS[toChain] ?? "https://etherscan.io/tx/") + tx;
  await supabaseAdmin
    .from("swaps")
    .update({ status: "pending", tx_hash: tx, explorer_url: explorer })
    .eq("id", swapId);

  // pending -> confirmed (90% success)
  await sleep(1500 + Math.random() * 1500);
  const success = Math.random() > 0.1;
  if (success) {
    await supabaseAdmin
      .from("swaps")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", swapId);
  } else {
    await supabaseAdmin
      .from("swaps")
      .update({ status: "failed", error_message: "Transaction reverted: insufficient liquidity at execution time" })
      .eq("id", swapId);
  }

  // Log schedule run if applicable
  if (scheduleId) {
    const { data: swap } = await supabaseAdmin.from("swaps").select("user_id, route_id, rate").eq("id", swapId).single();
    if (swap) {
      await supabaseAdmin.from("schedule_runs").insert({
        schedule_id: scheduleId,
        user_id: swap.user_id,
        route_id: swap.route_id,
        swap_id: swapId,
        outcome: success ? "executed" : "failed",
        rate: swap.rate,
        trigger: "scheduled",
      });
      await supabaseAdmin.rpc("notify_user", {
        _user_id: swap.user_id,
        _type: "schedule.run",
        _title: success ? "Scheduled swap executed" : "Scheduled swap failed",
        _body: `Schedule ${scheduleId.slice(0, 8)} → ${success ? "confirmed" : "failed"}`,
        _link: "/account/history",
        _metadata: { swap_id: swapId, schedule_id: scheduleId },
      });
    }
  }
}
