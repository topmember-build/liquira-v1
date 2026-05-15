import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, ArrowDownUp, Settings, Check, AlertTriangle, Info } from "lucide-react";
import { SectionHeader } from "./Capabilities";
import { STABLES } from "@/lib/stables";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { fxService, type FxQuote, type TxStatus } from "@/lib/fx-service";
import { useNavigate } from "@tanstack/react-router";
import { useWallet } from "@/contexts/WalletContext";
import { usePayment } from "@/contexts/PaymentContext";
import { useQuote, useExecute } from "@/hooks/useBackendAPI";
import { validateWalletAddress } from "@/lib/validation";

export function RouterSection() {
  return (
    <section id="router" className="border-t border-border bg-surface-1/30">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader eyebrow="/ ROUTER" tag="02 · router" />
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr,auto] lg:items-end">
          <h2 className="max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
            Quote, route, <span className="font-serif-italic text-primary">settle.</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Every swap is solved across all live Arc pools. Live FX feed,
            depth-aware impact, animated route trace: quote, simulate, and
            execute in one panel.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground mt-4">
            Arc testnet only for v1. Send or demo USDC ↔ EURC payments while stable FX API keys are pending.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1.1fr)]">
          <SwapPanel />
          <div className="space-y-6">
            <DepthChart />
            <RouteTrace />
          </div>
        </div>
      </div>
    </section>
  );
}

type RouteMode = "best" | "direct" | "multihop";

const STATUS_LABEL: Record<TxStatus | "idle", string> = {
  idle: "Ready",
  pending: "Routing payment…",
  success: "Settled ✓",
  failed: "Failed",
};

function SwapPanel() {
  const { user } = useAuth();
  const { formatUsd } = useDisplayCurrency();
  const { isConnected, address } = useWallet();
  const { formData, updateFormData, resetPayment } = usePayment();
  const navigate = useNavigate();

  const [fromCurrency, setFromCurrency] = useState("USDC");
  const [toCurrency, setToCurrency] = useState("EURC");
  const [amountStr, setAmountStr] = useState("10000");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [slippagePct, setSlippagePct] = useState(0.3);
  const [routeMode, setRouteMode] = useState<RouteMode>("best");
  const [isPaymentMode, setIsPaymentMode] = useState(false);

  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus | "idle">("idle");
  const [txDetails, setTxDetails] = useState<Record<string, unknown> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const amount = Number(amountStr) || 0;

  // Payment quote hook for payment mode
  const paymentQuote = useQuote(
    isPaymentMode ? {
      sourceToken: fromCurrency,
      destinationToken: toCurrency,
      amount: amount,
      recipientAddress: recipientAddress,
      sourceChain: "arc-testnet",
      destinationChain: "arc-testnet",
    } : null
  );

  // Execute hook for payment mode
  const executePayment = useExecute();

  // Backend quote for demo mode
  useEffect(() => {
    if (isPaymentMode || !amount || amount <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      setQuoting(true);
      setQuoteError(null);
      try {
        const q = await fxService.getQuote(fromCurrency, toCurrency, amount);
        if (cancelled) return;
        setQuote(q);
        setPulseKey((k) => k + 1);
      } catch (e) {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(e instanceof Error ? e.message : "Quote failed");
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [fromCurrency, toCurrency, amount, isPaymentMode]);

  // Poll transaction status until terminal.
  useEffect(() => {
    if (!transactionId || txStatus !== "pending") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fxService.getTransactionStatus(transactionId);
        setTxStatus(res.status);
        setTxDetails(res.details);
        if (res.status !== "pending" && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          if (res.status === "success") {
            toast.success("Payment settled", {
              description: `Tx ${transactionId.slice(0, 8)}…`,
            });
          } else {
            toast.error("Payment failed");
          }
        }
      } catch {
        /* keep polling on transient errors */
      }
    }, 1200);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [transactionId, txStatus]);

  const flip = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setQuote(null);
  };

  const handleExecute = async () => {
    if (isPaymentMode) {
      // Payment mode - use full payment interface
      if (!isConnected) {
        toast.error("Please connect your wallet first");
        return;
      }
      if (!recipientAddress || !validateWalletAddress(recipientAddress)) {
        toast.error("Please enter a valid recipient address");
        return;
      }
      if (!amount || amount <= 0) {
        toast.error("Enter an amount");
        return;
      }

      // Update payment context
      updateFormData({
        sourceToken: fromCurrency,
        destinationToken: toCurrency,
        amount: amount,
        recipientAddress: recipientAddress,
        sourceChain: "arc-testnet",
        destinationChain: "arc-testnet",
      });

      // Navigate to payment interface
      navigate({ to: "/payment" });
      return;
    }

    // Demo mode - backend routing
    if (!amount || amount <= 0) {
      toast.error("Enter an amount");
      return;
    }

    setExecuting(true);
    setTxStatus("idle");
    setTxDetails(null);
    setTransactionId(null);

    try {
      const res = await fxService.executeTrade({
        fromCurrency,
        toCurrency,
        amount,
      });

      setTransactionId(res.transactionId);
      setTxStatus(res.status);

      toast.success("Trade submitted", {
        description: `Tx ${res.transactionId.slice(0, 8)}…`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Execute failed");
    } finally {
      setExecuting(false);
    }
  };

const slippageBps = Math.round(slippagePct * 100);

const rate = quote?.rate ?? 0;

const fee = quote?.fee ?? 0;

const estOut = quote?.estimatedAmount ?? 0;

const minReceived = estOut * (1 - slippageBps / 10_000);
  return (
    <div className="border border-border bg-background p-6">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2 tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
          <span className="text-foreground">{isPaymentMode ? "PAYMENT" : "SWAP"}</span>
          <span>· {isPaymentMode ? "WALLET-CONNECTED" : "INTENT-BASED"}</span>
        </div>
        <div className="flex items-center gap-1 border border-border">
          <button
            onClick={() => setIsPaymentMode(false)}
            className={`px-2 py-1 text-[10px] uppercase tracking-widest ${
              !isPaymentMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Demo
          </button>
          <button
            onClick={() => setIsPaymentMode(true)}
            className={`px-2 py-1 text-[10px] uppercase tracking-widest ${
              isPaymentMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Payment
          </button>
        </div>
      </div>

      {/* You pay */}
      <div className="mt-5 border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between text-mono-label">
          <span>YOU PAY</span>
          <span>{fromCurrency}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="w-full bg-transparent font-mono text-3xl text-foreground outline-none tabular-nums"
          />
          <CurrencySelect
            value={fromCurrency}
            onChange={setFromCurrency}
            options={isPaymentMode ? ["USDC", "EURC"] : STABLES.map((s) => s.symbol)}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>1 {fromCurrency} = {rate ? rate.toFixed(6) : "—"} {toCurrency}</span>
          <div className="flex gap-2">
            {[
              ["25%", 0.25],
              ["50%", 0.5],
              ["MAX", 1],
            ].map(([p, mul]) => (
              <button
                key={p as string}
                onClick={() => setAmountStr(String(Math.round(100_000 * (mul as number))))}
                className="border border-border px-2 py-0.5 hover:bg-surface-2"
              >
                {p as string}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipient Address - Payment Mode Only */}
      {isPaymentMode && (
        <div className="mt-4 border border-border bg-surface-1 p-4">
          <div className="flex items-center justify-between text-mono-label">
            <span>RECIPIENT ADDRESS</span>
            <span className="text-primary">Required</span>
          </div>
          <div className="mt-2">
            <input
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>Enter the wallet address to send payment to</span>
            {recipientAddress && !validateWalletAddress(recipientAddress) && (
              <span className="text-destructive">Invalid address</span>
            )}
          </div>
        </div>
      )}

      {/* Flip */}
      <div className="my-2 flex justify-center">
        <button onClick={flip} className="grid h-8 w-8 place-items-center border border-border bg-surface-1 text-primary hover:bg-surface-2">
          <ArrowDownUp size={14} />
        </button>
      </div>

      {/* You receive */}
      <div className="border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between text-mono-label">
          <span>YOU RECEIVE</span>
          <span>MIN · {minReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div key={pulseKey} className="font-mono text-3xl text-foreground tabular-nums animate-quote-in">
            {estOut.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
          <CurrencySelect
            value={toCurrency}
            onChange={setToCurrency}
            options={isPaymentMode ? ["USDC", "EURC"] : STABLES.map((s) => s.symbol)}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>≈ {formatUsd(estOut, { decimals: 2 })}</span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
            {quoting ? "quoting…" : quoteError ? "quote unavailable" : "live quote"}
          </span>
        </div>
      </div>

      {/* Slippage */}
      <div className="mt-4 border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between text-mono-label">
          <span className="flex items-center gap-1">
            <Settings size={10} /> SLIPPAGE TOLERANCE
          </span>
          <span className="text-foreground">{slippagePct.toFixed(2)}% · {slippageBps} bps</span>
        </div>
        <input
          type="range"
          min="0.05"
          max="3"
          step="0.05"
          value={slippagePct}
          onChange={(e) => setSlippagePct(Number(e.target.value))}
          className="mt-3 w-full accent-primary"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>0.05%</span><span>1.00%</span><span>2.00%</span><span>3.00%</span>
        </div>
      </div>

      {/* Quote preview */}
      <div className="mt-4 border border-border bg-surface-1 p-4 space-y-3">
        <div className="flex items-center justify-between text-mono-label">
          <span>QUOTE PREVIEW</span>
          <span className="text-primary">
            {isPaymentMode
              ? (paymentQuote.isLoading ? "loading…" : paymentQuote.error ? "error" : "from /api/quote")
              : (quoting ? "refreshing…" : "from /fx/quote")
            }
          </span>
        </div>
        {isPaymentMode ? (
          // Payment mode quotes
          <div className="space-y-3">
            {paymentQuote.data?.quotes?.map((quote, index) => (
              <div key={index} className="border border-border bg-background p-3 rounded">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono">{quote.provider}</span>
                  <span className="font-mono text-primary">{quote.estimatedOutput?.toFixed(4)} {toCurrency}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Fee: ${quote.fees?.total?.toFixed(2)} • Route: {quote.route?.length} steps
                </div>
              </div>
            ))}
            {paymentQuote.error && (
              <div className="flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{paymentQuote.error.message}</span>
              </div>
            )}
          </div>
        ) : (
          // Demo mode quotes
          <div className="grid grid-cols-3 gap-3 font-mono text-[11px]">
            <div>
              <div className="text-mono-label" style={{ fontSize: 9 }}>RATE</div>
              <div className="tabular-nums">{rate ? rate.toFixed(6) : "—"}</div>
            </div>
            <div>
              <div className="text-mono-label" style={{ fontSize: 9 }}>FEE (1%)</div>
              <div className="tabular-nums">{fee ? fee.toFixed(4) : "—"} {fromCurrency}</div>
            </div>
            <div>
              <div className="text-mono-label" style={{ fontSize: 9 }}>EST OUT</div>
              <div className="tabular-nums">{estOut ? estOut.toFixed(4) : "—"} {toCurrency}</div>
            </div>
          </div>
        )}
        {!isPaymentMode && quoteError && (
          <div className="flex items-start gap-2 border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>{quoteError}</span>
          </div>
        )}
      </div>

      {/* Transaction status panel */}
      {transactionId && (
        <div className="mt-4 border border-border bg-surface-1 p-3 font-mono text-[11px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusDot status={txStatus} />
              <span className="uppercase tracking-widest text-foreground">{STATUS_LABEL[txStatus]}</span>
            </div>
            <span className="text-muted-foreground">tx {transactionId.slice(0, 10)}…</span>
          </div>
          {txStatus === "success" && (
            <div className="flex items-center gap-2 border-t border-border pt-2 text-primary">
              <Check size={12} /> Backend confirmed the route. No on-chain interaction was required from this client.
            </div>
          )}
          {txStatus === "failed" && (
            <div className="flex items-start gap-2 border-t border-border pt-2 text-destructive">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{(txDetails?.reason as string) ?? "Routing failed. Try again."}</span>
            </div>
          )}
          {txStatus === "pending" && (
            <div className="flex items-center gap-2 border-t border-border pt-2 text-muted-foreground">
              <Info size={12} /> Backend is routing the trade. Polling /tx/{transactionId.slice(0, 6)}…
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleExecute}
        disabled={
          isPaymentMode
            ? !isConnected || !recipientAddress || !validateWalletAddress(recipientAddress) || !amount || paymentQuote.isLoading
            : executing || !amount || quoting || !!quoteError
        }
        className="mt-5 flex w-full items-center justify-center gap-2 bg-primary py-3 font-mono text-sm font-semibold tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPaymentMode ? (
          <>
            <Send size={14} /> ROUTE PAYMENT →
          </>
        ) : executing ? (
          <>
            <Loader2 size={14} className="animate-spin" /> SUBMITTING…
          </>
        ) : user ? (
          <>
            <Send size={14} /> EXECUTE TRADE →
          </>
        ) : (
          <>SIGN IN TO TRADE →</>
        )}
      </button>

      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>
          {isPaymentMode
            ? "wallet-connected · real payments"
            : "backend-routed · no wallet signing required"
          }
        </span>
        <span className="text-primary">▌ready</span>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: TxStatus | "idle" }) {
  const color =
    status === "success" ? "bg-primary" : status === "failed" ? "bg-destructive" : "bg-primary";
  const isActive = status === "pending";
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${color} ${isActive ? "animate-pulse-soft" : ""}`} />
  );
}

function CurrencySelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex items-center gap-2 border border-border bg-surface-2 px-3 py-2 font-mono text-sm outline-none focus:border-primary"
    >
      {options.map((symbol) => (
        <option key={symbol} value={symbol}>
          {symbol}
        </option>
      ))}
    </select>
  );
}


function DepthChart() {
  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2 tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>DEPTH / USDC / EURC</span>
        </div>
        <div className="flex gap-3 text-[11px]">
          <span className="text-primary">▲ bids $84.21M</span>
          <span className="text-destructive">▼ asks $83.92M</span>
        </div>
      </div>

      <div className="relative mt-4 h-32">
        <svg viewBox="0 0 200 80" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bidGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(0.78 0.18 145)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="askGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.22 28)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(0.65 0.22 28)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,75 L20,60 L40,45 L60,32 L80,20 L100,12 L100,80 L0,80 Z" fill="url(#bidGrad)" stroke="oklch(0.78 0.18 145)" strokeWidth="0.6" />
          <path d="M100,12 L120,18 L140,30 L160,42 L180,58 L200,72 L200,80 L100,80 Z" fill="url(#askGrad)" stroke="oklch(0.65 0.22 28)" strokeWidth="0.6" />
          <line x1="100" y1="0" x2="100" y2="80" stroke="currentColor" className="text-border-strong" strokeWidth="0.3" strokeDasharray="1 1" />
        </svg>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>-2.0%</span><span>-1.0%</span><span>mid</span><span>+1.0%</span><span>+2.0%</span>
      </div>

      <div className="mt-4 grid grid-cols-4 border-t border-border pt-3">
        {[["SPREAD", "0.4 bps"], ["DEPTH ±1%", "$48.1M"], ["24H VOL", "$12.4M"], ["POOL FEE", "4 bps"]].map(([l, v]) => (
          <div key={l}>
            <div className="text-mono-label" style={{ fontSize: 10 }}>{l}</div>
            <div className="mt-1 font-mono text-sm">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Hop = { token: string; flag: string };

const ROUTES: { hops: Hop[]; notional: string; settle: string; saved: string }[] = [
  { hops: [{ token: "USDC", flag: "🇺🇸" }, { token: "EURC", flag: "🇪🇺" }], notional: "$10,000", settle: "~ 0.4s", saved: "1.42" },
  { hops: [{ token: "EURC", flag: "🇪🇺" }, { token: "USDC", flag: "🇺🇸" }, { token: "JPYC", flag: "🇯🇵" }], notional: "$25,000", settle: "~ 0.6s", saved: "2.81" },
  { hops: [{ token: "GBPT", flag: "🇬🇧" }, { token: "USDC", flag: "🇺🇸" }, { token: "NGNX", flag: "🇳🇬" }], notional: "$50,000", settle: "~ 0.7s", saved: "3.96" },
  { hops: [{ token: "MXNB", flag: "🇲🇽" }, { token: "USDC", flag: "🇺🇸" }, { token: "EURC", flag: "🇪🇺" }, { token: "KRW1", flag: "🇰🇷" }], notional: "$100,000", settle: "~ 0.9s", saved: "5.21" },
  { hops: [{ token: "NGNX", flag: "🇳🇬" }, { token: "USDC", flag: "🇺🇸" }, { token: "BRZ", flag: "🇧🇷" }], notional: "$8,500", settle: "~ 0.6s", saved: "2.04" },
  { hops: [{ token: "AEDC", flag: "🇦🇪" }, { token: "USDC", flag: "🇺🇸" }, { token: "EURC", flag: "🇪🇺" }], notional: "$30,000", settle: "~ 0.6s", saved: "3.12" },
];

function shortHash(seed: number): string {
  const a = ((seed * 9301 + 49297) % 233280).toString(16).padStart(3, "0");
  const b = (((seed + 1) * 1664525 + 1013904223) % 0xffff).toString(16).padStart(4, "0");
  return `0x${a}…${b}`;
}

function RouteTrace() {
  const [routeIdx, setRouteIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const [candidates, setCandidates] = useState(8);

  const route = ROUTES[routeIdx];
  const hops = route.hops;

  useEffect(() => {
    const id = setInterval(() => {
      setRouteIdx((i) => (i + 1) % ROUTES.length);
      setPhase(0);
      setCandidates(6 + Math.floor(Math.random() * 7));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % hops.length), 700);
    return () => clearInterval(id);
  }, [hops.length]);

  const numHops = hops.length - 1;
  const txHash = shortHash(routeIdx + 17);

  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2 tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
          <span>ROUTE TRACE</span>
        </div>
        <span className="text-primary tabular-nums">solving · {candidates} candidates</span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        {hops.map((h, i) => {
          const isActive = i === phase;
          const isVisited = i <= phase;
          return (
            <div key={`${h.token}-${i}`} className="flex flex-1 items-center gap-2 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`grid h-9 w-9 place-items-center rounded-full border text-base transition-all duration-300 ${
                    isActive
                      ? "border-primary bg-primary/15 scale-110 shadow-[0_0_16px_-2px_oklch(0.78_0.18_145/0.6)]"
                      : isVisited
                        ? "border-primary/50 bg-surface-1"
                        : "border-border bg-surface-1 opacity-60"
                  }`}
                >
                  {h.flag}
                </div>
                <div className={`mt-1 font-mono text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {h.token}
                </div>
              </div>

              {i < hops.length - 1 && (
                <div className="relative h-px flex-1 bg-border">
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary transition-all duration-500 ${
                      i === phase ? "left-[85%] opacity-100" : i < phase ? "left-full opacity-0" : "left-0 opacity-40"
                    }`}
                    style={{ boxShadow: "0 0 8px oklch(0.78 0.18 145)" }}
                  />
                  <div
                    className={`absolute inset-y-0 left-0 bg-primary/60 transition-all duration-700 ease-out ${
                      i < phase ? "w-full" : i === phase ? "w-3/4" : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-center font-mono text-[10px] text-primary tabular-nums">
        {numHops} {numHops === 1 ? "hop" : "hops"} · {route.settle}
      </div>

      <div className="mt-5 grid grid-cols-4 border-t border-border pt-3 font-mono text-[12px]">
        {[
          ["HOPS", String(numHops)],
          ["NOTIONAL", route.notional],
          ["POOLS", String(numHops)],
          ["SETTLEMENT", route.settle],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-mono-label" style={{ fontSize: 10 }}>{l}</div>
            <div className="mt-1 tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-3 font-mono text-[11px] leading-relaxed">
        <div className="text-muted-foreground">// solver_log</div>
        <div className="mt-1 text-foreground/80">
          fetched <span className="tabular-nums">{candidates}</span> pools · sized {numHops} candidate{" "}
          {numHops === 1 ? "path" : "paths"} · saved{" "}
          <span className="text-primary tabular-nums">{route.saved} bps</span> vs naive quote
        </div>
        <div className="mt-1 text-muted-foreground">
          tx_hash <span className="text-foreground/80">{txHash}</span> · arc-testnet ·{" "}
          <span className="text-primary">ready to broadcast ▌</span>
        </div>
      </div>
    </div>
  );
}
