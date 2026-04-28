import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { CHAINS } from "@/lib/stables";
import { Trash2, Plus, Wallet as WalletIcon } from "lucide-react";

export const Route = createFileRoute("/account/wallets")({
  component: WalletsPage,
});

type LinkedWallet = {
  id: string;
  address: string;
  chain: string;
  label: string | null;
  created_at: string;
};

function WalletsPage() {
  const { user } = useAuth();
  const wallet = useWallet();
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setWallets((data ?? []) as LinkedWallet[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const linkCurrent = async () => {
    if (!user || !wallet.address) return;
    const { error } = await supabase.from("user_wallets").upsert(
      {
        user_id: user.id,
        address: wallet.address.toLowerCase(),
        chain: wallet.chainId,
        label: wallet.kind === "walletconnect" ? "WalletConnect" : "Browser wallet",
      },
      { onConflict: "user_id,address" },
    );
    if (error) return toast.error(error.message);
    toast.success("Wallet linked to your account");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("user_wallets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Wallet unlinked");
    setWallets((w) => w.filter((x) => x.id !== id));
  };

  const alreadyLinked = wallet.address
    ? wallets.some((w) => w.address.toLowerCase() === wallet.address!.toLowerCase())
    : false;

  return (
    <div className="space-y-6">
      {/* Currently connected */}
      <section className="rounded-md border border-border bg-surface-1 p-5">
        <div className="text-mono-label mb-3" style={{ fontSize: 10 }}>
          CONNECTED WALLET
        </div>
        {wallet.connected && wallet.address ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[14px] text-foreground">
                <WalletIcon size={14} className="text-primary" />
                {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                {wallet.kind} · {wallet.chainId} ·{" "}
                {wallet.nativeBalance ?? "balance unavailable"}
              </div>
            </div>
            <div className="flex gap-2">
              {!alreadyLinked && (
                <button
                  onClick={linkCurrent}
                  className="flex items-center gap-1 bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90"
                >
                  <Plus size={12} /> Link to account
                </button>
              )}
              <button
                onClick={wallet.disconnect}
                className="border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[12px] text-muted-foreground">
              No wallet connected. Connect one to link it to your account.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => wallet.connect("injected")}
                className="bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90"
              >
                Browser wallet
              </button>
              <button
                onClick={() => wallet.connect("walletconnect")}
                disabled={!wallet.hasWalletConnect}
                title={!wallet.hasWalletConnect ? "Set VITE_WALLETCONNECT_PROJECT_ID" : ""}
                className="border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                WalletConnect
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Linked wallets */}
      <section>
        <div className="mb-3 font-mono text-[12px] text-muted-foreground">
          {loading
            ? "Loading…"
            : `${wallets.length} linked wallet${wallets.length === 1 ? "" : "s"}`}
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-surface-1">
          <table className="w-full font-mono text-[12px]">
            <thead className="text-mono-label" style={{ fontSize: 10 }}>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">ADDRESS</th>
                <th className="px-4 py-3 text-left">LABEL</th>
                <th className="px-4 py-3 text-left">CHAIN</th>
                <th className="px-4 py-3 text-left">LINKED</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {wallets.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No wallets linked yet.
                  </td>
                </tr>
              )}
              {wallets.map((w) => (
                <tr key={w.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3 text-foreground">
                    {w.address.slice(0, 6)}…{w.address.slice(-4)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{w.label ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {CHAINS.find((c) => c.id === w.chain)?.name ?? w.chain}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(w.id)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-destructive"
                      aria-label="Unlink"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
