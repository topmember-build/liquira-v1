import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSignMessage } from "wagmi";
import { useDynamicContext, DynamicWidget } from "@dynamic-labs/sdk-react-core";
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
  const { user, session } = useAuth();
  const wallet = useWallet();
  const { signMessageAsync } = useSignMessage();
  const { primaryWallet: dynamicWallet, sdkHasLoaded: dynamicSDKLoaded } = useDynamicContext();
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<FlowStep>("idle");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<"wagmi" | "dynamic" | null>(null);

  const getServerFnResultMessage = (response: unknown): string | undefined => {
    if (typeof response === "string") return response;
    const typed = response as Record<string, unknown>;
    return (
      (typed?.message as string | undefined) ??
      (typed?.result as Record<string, unknown> | undefined)?.message as string | undefined ??
      (typed?.data as Record<string, unknown> | undefined)?.message as string | undefined ??
      (typed?.data as Record<string, unknown> | undefined)?.result?.message as string | undefined ??
      (typed?.response as Record<string, unknown> | undefined)?.data?.message as string | undefined
    );
  };

  const getServerFnErrorMessage = (response: unknown): string | undefined => {
    if (typeof response === "string") return response;
    const typed = response as Record<string, unknown>;
    return (
      (typed?.error as string | undefined) ??
      (typed?.error as Record<string, unknown> | undefined)?.message as string | undefined ??
      (typed?.data as Record<string, unknown> | undefined)?.error?.message as string | undefined ??
      (typed?.data as Record<string, unknown> | undefined)?.error as string | undefined ??
      (typed?.data as Record<string, unknown> | undefined)?.result?.error?.message as string | undefined
    );
  };

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

  const startLink = async (overrideWalletType?: "wagmi" | "dynamic") => {
    const currentWalletType = overrideWalletType ?? walletType;
    if (!user || !session) {
      toast.error("Please sign in to your account before linking a wallet.");
      return;
    }

    const authHeaders = session.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined;

    if (!authHeaders) {
      toast.error("Unable to authenticate. Please sign in again.");
      return;
    }

    // Handle Dynamic wallet linking
    if (currentWalletType === "dynamic") {
      if (!dynamicWallet?.address) {
        toast.error("No Dynamic wallet connected. Please create or connect a Dynamic wallet first.");
        return;
      }

      setStep("preparing");
      setChallenge(null);
      try {
        console.debug("[Wallets] requestWalletNonce headers:", authHeaders);
        const response = await requestWalletNonce({
          data: { address: dynamicWallet.address, chain: "arc-testnet" },
          headers: authHeaders,
        });
        console.debug("[Wallets] requestWalletNonce response:", response);
        const message = getServerFnResultMessage(response);
        if (!message) {
          const errorMessage = getServerFnErrorMessage(response) ?? "Wallet challenge generation failed. Please try again.";
          console.error("[Wallets] requestWalletNonce unexpected response:", response);
          throw new Error(errorMessage);
        }
        
        setChallenge(message);
        setStep("awaiting_signature");

        let signature: string | undefined;
        let signError: unknown;
        
        try {
          // Prefer connector-level signMessage API provided by Dynamic
          const connector: any = dynamicWallet?.connector;
          if (connector) {
            try {
              if (typeof connector.signMessage === "function") {
                signature = await connector.signMessage(String(message));
              } else if (typeof connector.signMessageWithContext === "function") {
                signature = await connector.signMessageWithContext({ message: String(message) });
              } else if (typeof connector.getWalletClient === "function") {
                // Some connectors expose a low-level wallet client
                const wc = await connector.getWalletClient();
                if (wc && typeof wc.signMessage === "function") {
                  const maybe = await wc.signMessage({ message: String(message), accountAddress: dynamicWallet.address });
                  // wc.signMessage may return object or string
                  signature = typeof maybe === "string" ? maybe : maybe?.signature ?? maybe?.signed ?? undefined;
                }
              }
            } catch (inner) {
              signError = inner;
            }
          }

          // Fallback to window.ethereum.personal_sign
          if (!signature && typeof (window as any)?.ethereum?.request === "function") {
            try {
              signature = await (window as any).ethereum.request({ method: "personal_sign", params: [String(message), dynamicWallet.address] });
            } catch (fallbackErr) {
              signError = signError ?? fallbackErr;
            }
          }
        } catch (err) {
          signError = err;
        }

        if (!signature) {
          throw new Error(signError instanceof Error ? signError.message : "Signature request failed");
        }

        setStep("verifying");
        await verifyAndLinkWallet({
          data: {
            address: dynamicWallet.address,
            chain: "arc-testnet",
            signature,
            label: "Dynamic Wallet",
          },
          headers: authHeaders,
        });
        toast.success("Dynamic wallet verified and linked");
        setStep("idle");
        setChallenge(null);
        setWalletType(null);
        void load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Wallet link failed";
        if (msg.includes("User rejected")) {
          toast.error("Wallet signature request was declined. Please try again.");
        } else {
          toast.error(msg);
        }
        setStep("idle");
      }
      return;
    }

    // Handle wagmi wallet linking (existing logic)
    if (!wallet.address) {
      toast.error("Please connect a wallet and sign in to your account before linking.");
      return;
    }
    if (!wallet.connected) {
      toast.error("Please connect your wallet before signing.");
      return;
    }
    if (wallet.chainId !== "arc-testnet") {
      toast.error("Please switch your wallet to Arc testnet before linking.");
      return;
    }

    setStep("preparing");
    setChallenge(null);
    try {
      console.debug("[Wallets] requestWalletNonce headers:", authHeaders);
      const response = await requestWalletNonce({
        data: { address: wallet.address, chain: wallet.chainId },
        headers: authHeaders,
      });
      console.debug("[Wallets] requestWalletNonce response:", response);
      const message = getServerFnResultMessage(response);
      if (!message) {
        const errorMessage = getServerFnErrorMessage(response) ?? "Wallet challenge generation failed. Please try again.";
        console.error("[Wallets] invalid nonce response", response);
        throw new Error(errorMessage);
      }
      console.log("[Wallets] challenge:", message);
      toast.success("Challenge generated — please sign in your wallet");
      setChallenge(message);
      setStep("awaiting_signature");

      let signature: string | undefined;
      let signError: unknown;
      try {
        if (typeof signMessageAsync === "function") {
          signature = await signMessageAsync({ message: String(message) });
        } else {
          throw new Error("Wagmi signMessage is unavailable");
        }
      } catch (err) {
        signError = err;
        console.warn("[Wallets] signMessageAsync failed, trying fallback personal_sign", err);
        if (typeof (window as any)?.ethereum?.request === "function") {
          try {
            signature = await (window as any).ethereum.request({ method: "personal_sign", params: [String(message), wallet.address] });
          } catch (fallbackErr) {
            signError = fallbackErr;
          }
          if (!signature) {
            try {
              signature = await (window as any).ethereum.request({ method: "personal_sign", params: [wallet.address, String(message)] });
            } catch (fallbackErr) {
              signError = fallbackErr;
            }
          }
        }
      }

      if (!signature) {
        console.error("[Wallets] signature failed:", signError);
        const errMsg = signError instanceof Error ? signError.message : String(signError);
        toast.error(errMsg || "Wallet signature request failed.");
        setStep("idle");
        setChallenge(null);
        return;
      }

      setStep("verifying");
      console.log("[Wallets] signature:", signature);
      await verifyAndLinkWallet({
        data: {
          address: wallet.address,
          chain: wallet.chainId,
          signature,
          label: wallet.kind === "walletconnect" ? "WalletConnect" : "Browser wallet",
        },
        headers: authHeaders,
      });
      toast.success("Wallet verified and linked");
      setStep("idle");
      setChallenge(null);
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wallet link failed";
      if (msg.includes("User rejected")) {
        toast.error("Wallet signature request was declined. Please try again.");
      } else if (msg.includes("No active sign-in challenge")) {
        toast.error("Wallet link challenge expired or invalid. Please restart the flow.");
      } else {
        toast.error(msg);
      }
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
    if (!session?.access_token) {
      toast.error("Unable to authenticate. Please sign in again.");
      return;
    }
    try {
      await setDefaultWallet({
        data: { id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
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
      {dynamicSDKLoaded && (
        <section className="rounded-md border border-border bg-surface-1 p-5">
          <div className="text-mono-label mb-4" style={{ fontSize: 10 }}>
            YOUR DYNAMIC WALLET
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            <DynamicWidget />
          </div>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            Manage your Dynamic embedded wallet. Link it to your account below or use browser/WalletConnect wallets.
          </p>
        </section>
      )}

      <section className="rounded-md border border-border bg-surface-1 p-5">
        <div className="text-mono-label mb-3" style={{ fontSize: 10 }}>
          GUIDED WALLET LINK
        </div>
        {!wallet.connected && !dynamicWallet?.address ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[12px] text-muted-foreground">
              Step 1 - Connect a wallet, then sign a message to verify ownership before linking.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setWalletType("wagmi");
                  try {
                    await wallet.connect("injected");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Unable to connect browser wallet.");
                    setWalletType(null);
                  }
                }}
                className="bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90"
              >
                Browser wallet
              </button>
              <button
                onClick={async () => {
                  setWalletType("wagmi");
                  try {
                    await wallet.connect("walletconnect");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Unable to connect WalletConnect.");
                    setWalletType(null);
                  }
                }}
                disabled={!wallet.hasWalletConnect}
                className="border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                WalletConnect
              </button>
              <button
                onClick={() => {
                  setWalletType("dynamic");
                  void startLink("dynamic");
                }}
                disabled={!dynamicWallet?.address || !dynamicSDKLoaded}
                className="border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                title={!dynamicSDKLoaded ? "Dynamic SDK not loaded" : !dynamicWallet?.address ? "No Dynamic wallet connected" : "Connect Dynamic wallet"}
              >
                Dynamic Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <FlowSteps current={step} alreadyLinked={walletType === "dynamic" ? dynamicWallet?.address ? wallets.some((w) => w.address.toLowerCase() === dynamicWallet.address.toLowerCase()) : false : wallet.address ? wallets.some((w) => w.address.toLowerCase() === wallet.address!.toLowerCase()) : false} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-background p-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-[13px] text-foreground">
                  <WalletIcon size={14} className="text-primary" />
                  {walletType === "dynamic" && dynamicWallet?.address
                    ? `${dynamicWallet.address.slice(0, 6)}…${dynamicWallet.address.slice(-4)}`
                    : wallet.address
                      ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
                      : "No wallet"}
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span>{walletType === "dynamic" ? "Dynamic" : wallet.kind ?? "wallet"}</span>
                  <span>·</span>
                  <span>Arc Testnet</span>
                </div>
              </div>
              {walletType === "dynamic" && dynamicWallet?.address && wallets.some((w) => w.address.toLowerCase() === dynamicWallet.address.toLowerCase()) ? (
                <div className="font-mono text-[11px] text-primary">Already linked ✓</div>
              ) : walletType === "wagmi" && wallet.address && wallets.some((w) => w.address.toLowerCase() === wallet.address!.toLowerCase()) ? (
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
                    <div className="flex items-center gap-2">
                      <span>{CHAINS.find((c) => c.id === w.chain)?.name ?? w.chain}</span>
                    </div>
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

