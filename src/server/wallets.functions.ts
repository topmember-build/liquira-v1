/**
 * Wallet linking with signature verification.
 * Uses EIP-191 personal_sign verification via viem.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyMessage, isAddress } from "viem";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NonceInput = z.object({
  address: z.string().refine(isAddress, "Invalid address"),
  chain: z.string().min(1).max(32),
});

const VerifyInput = z.object({
  address: z.string().refine(isAddress, "Invalid address"),
  chain: z.string().min(1).max(32),
  signature: z.string().min(1).max(512),
  label: z.string().max(64).optional(),
});

export const requestWalletNonce = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => NonceInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const addr = data.address.toLowerCase();

    // Block if address is already linked to a DIFFERENT user
    const { data: existing } = await supabaseAdmin
      .from("user_wallets")
      .select("id, user_id")
      .ilike("address", addr)
      .maybeSingle();
    if (existing && existing.user_id !== userId) {
      throw new Error("This wallet is already linked to a different account.");
    }
    if (existing && existing.user_id === userId) {
      throw new Error("This wallet is already linked to your account.");
    }

    const nonce = crypto.randomUUID();
    const issued = new Date().toISOString();
    const message = [
      `liquira.app wants you to sign in with your wallet:`,
      addr,
      ``,
      `Link this wallet to your Liquira account.`,
      ``,
      `URI: https://liquira.app`,
      `Chain: ${data.chain}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issued}`,
    ].join("\n");

    await supabaseAdmin.from("wallet_link_nonces").insert({
      user_id: userId,
      address: addr,
      nonce,
      message,
    });

    return { message, nonce };
  });

export const verifyAndLinkWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => VerifyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const addr = data.address.toLowerCase();

    // Fetch most recent unconsumed, unexpired nonce for this user+address
    const { data: row, error } = await supabaseAdmin
      .from("wallet_link_nonces")
      .select("*")
      .eq("user_id", userId)
      .eq("address", addr)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !row) throw new Error("No active sign-in challenge. Please restart the wallet link flow.");

    const sig = data.signature.startsWith("0x") ? (data.signature as `0x${string}`) : (`0x${data.signature}` as `0x${string}`);
    const valid = await verifyMessage({
      address: data.address as `0x${string}`,
      message: row.message,
      signature: sig,
    });
    if (!valid) throw new Error("Signature verification failed.");

    // Re-check uniqueness right before insert (race-safe via unique index too)
    const { data: existing } = await supabaseAdmin
      .from("user_wallets")
      .select("id, user_id")
      .ilike("address", addr)
      .maybeSingle();
    if (existing && existing.user_id !== userId) {
      throw new Error("This wallet is already linked to a different account.");
    }

    // First wallet for this user becomes default
    const { count } = await supabaseAdmin
      .from("user_wallets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const isDefault = (count ?? 0) === 0;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("user_wallets")
      .insert({
        user_id: userId,
        address: addr,
        chain: data.chain,
        label: data.label ?? null,
        verified_at: new Date().toISOString(),
        is_default: isDefault,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin.from("wallet_link_nonces").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    await supabaseAdmin.rpc("notify_user", {
      _user_id: userId,
      _type: "wallet.linked",
      _title: "Wallet linked",
      _body: `${addr.slice(0, 6)}…${addr.slice(-4)} verified and linked to your account`,
      _link: "/account/wallets",
      _metadata: { address: addr },
    });

    return { wallet: inserted };
  });

const SetDefaultInput = z.object({ id: z.string().uuid() });
export const setDefaultWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SetDefaultInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Two-step to satisfy partial unique index
    const { error: clearErr } = await supabaseAdmin
      .from("user_wallets")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
    if (clearErr) throw new Error(clearErr.message);
    const { error: setErr } = await supabaseAdmin
      .from("user_wallets")
      .update({ is_default: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (setErr) throw new Error(setErr.message);
    return { ok: true };
  });
