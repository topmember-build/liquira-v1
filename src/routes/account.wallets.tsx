import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSignMessage } from "wagmi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { CHAINS } from "@/lib/stables";
import { requestWalletNonce, verifyAndLinkWallet, setDefaultWallet } from "@/server/wallets.functions";
import { Trash2, Wallet as WalletIcon, ShieldCheck, Star, Loader2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/account/wallets")({
  component: WalletsPage,
});

type LinkedWallet = {
  id: string;
  address: string;
  chain: string;
  label: string | null;
  verified_at: string | null;
  is_default: boolean;
  created_at: string;
};

type FlowStep = "idle" | "preparing" | "awaiting_signature" | "verifying";

function WalletsPage() {
  const { user } = useAuth();
  const wallet = useWallet();
  const { signMessageAsync } = useSignMessage();
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<FlowStep>("idle");
  const [challenge, setChallenge] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_wallets")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setWallets((data ?? []) as LinkedWallet[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const startLink = async () => {
    if (!user || !wallet.address) return;
    setStep("preparing");
    setChallenge(null);
    try {
      const { message } = await requestWalletNonce({
        data: { address: wallet.address, chain: wallet.chainId },
      });
      setChallenge(message);
      setStep("awaiting_signature");
      const signature = await signMessageAsync({ message });
      setStep("verifying");
      await verifyAndLinkWallet({
        data: {
          address: wallet.address,
          chain: wallet.chainId,
          signature,
          label: wallet.kind === "walletconnect" ? "WalletConnect" : "Browser wallet",
        },
      });
      toast.success("Wallet verified and linked");
      setStep("idle");
      setChallenge(null);
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet link failed";
      toast.error(msg);
      setStep("idle");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Unlink this wallet?")) return;
    const { error } = await supabase.from("user_wallets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Wallet unlinked");
    setWallets((w) => w.filter((x) => x.id !== id));
  };

  const makeDefault = async (id: string) => {
    try {
      await setDefaultWallet({ data: { id } });
      toast.success("Default wallet updated");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set default");
    }
  };

  const alreadyLinked = wallet.address
    ? wallets.some((w) => w.address.toLowerCase() === wallet.address!.toLowerCase())
    : false;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-surface-1 p-5">
        <div className="text-mono-label mb-3" style={{ fontSize: 10 }}>
          GUIDED WALLET LINK
        </div>
        {!wallet.connected || !wallet.address ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[12px] text-muted-foreground">
              Step 1 - Connect a wallet, then sign a message to verify ownership before linking.
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
                className="border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                WalletConnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <FlowSteps current={step} alreadyLinked={alreadyLinked} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-background p-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-[13px] text-foreground">
                  <WalletIcon size={14} className="text-primary" />
                  {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {wallet.kind} · {wallet.chainId}
                </div>
              </div>
              {alreadyLinked ? (
                <div className="font-mono text-[11px] text-primary">Already linked ✓</div>
              ) : (
                <button
                  onClick={startLink}
                  disabled={step !== "idle"}
                  className="flex items-center gap-2 bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {step !== "idle" ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                  {step === "preparing" && "Preparing…"}
                  {step === "awaiting_signature" && "Sign in wallet…"}
                  {step === "verifying" && "Verifying…"}
                  {step === "idle" && "Sign & link"}
                </button>
              )}
            </div>
            {challenge && step === "awaiting_signature" && (
              <pre className="overflow-x-auto rounded border border-border bg-background p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
                {challenge}
              </pre>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 font-mono text-[12px] text-muted-foreground">
          {loading ? "Loading…" : `${wallets.length} linked wallet${wallets.length === 1 ? "" : "s"}`}
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-surface-1">
          <table className="w-full font-mono text-[12px]">
            <thead className="text-mono-label" style={{ fontSize: 10 }}>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">ADDRESS</th>
                <th className="px-4 py-3 text-left">LABEL</th>
                <th className="px-4 py-3 text-left">CHAIN</th>
                <th className="px-4 py-3 text-left">STATUS</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
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
                  <td className="px-4 py-3 text-muted-foreground">{w.label ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {CHAINS.find((c) => c.id === w.chain)?.name ?? w.chain}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {w.verified_at ? (
                        <span className="inline-flex items-center gap-1 border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                          Unverified
                        </span>
                      )}
                      {w.is_default && (
                        <span className="inline-flex items-center gap-1 border border-yellow-400/40 bg-yellow-400/10 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-yellow-400">
                          <Star size={10} /> Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {!w.is_default && (
                        <button
                          onClick={() => makeDefault(w.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-yellow-400"
                          aria-label="Set default"
                          title="Set default"
                        >
                          <Star size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => remove(w.id)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-destructive"
                        aria-label="Unlink"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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

function FlowSteps({ current, alreadyLinked }: { current: FlowStep; alreadyLinked: boolean }) {
  const steps = [
    { id: "connect", label: "Connect", done: true },
    { id: "challenge", label: "Challenge", done: current === "awaiting_signature" || current === "verifying" || alreadyLinked, active: current === "preparing" },
    { id: "sign", label: "Sign", done: current === "verifying" || alreadyLinked, active: current === "awaiting_signature" },
    { id: "verify", label: "Verify & link", done: alreadyLinked, active: current === "verifying" },
  ];
  return (
    <div className="flex items-center gap-1 font-mono text-[11px]">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          <span
            className={`inline-flex items-center gap-1 border px-2 py-0.5 uppercase tracking-widest ${
              s.done
                ? "border-primary text-primary"
                : s.active
                ? "border-yellow-400 text-yellow-400"
                : "border-border text-muted-foreground"
            }`}
          >
            {String(i + 1).padStart(2, "0")} {s.label}
          </span>
          {i < steps.length - 1 && <ArrowRight size={11} className="text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}
