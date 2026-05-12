import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getUserWalletId(
  userId: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .select("circle_wallet_id")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Wallet not found");
  }

  return data.circle_wallet_id;
}