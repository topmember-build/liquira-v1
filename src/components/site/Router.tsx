import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, ArrowDownUp, Settings, ExternalLink, Droplets } from "lucide-react";
import { SectionHeader } from "./Capabilities";
import { STABLES } from "@/lib/stables";
import { usePrices } from "@/contexts/PricesContext";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { simulateSwap, executeSwap } from "@/server/swaps.functions";
import { useOnchainSwap, type SwapPhase } from "@/hooks/use-onchain-swap";
import { FAUCETS, SMOKE_TEST_ONLY } from "@/lib/arc-testnet";
import { CHAIN_ID_REVERSE } from "@/lib/wagmi";
import type { Quote } from "@/lib/quote-engine";
import { useNavigate } from "@tanstack/react-router";
import { useChainId } from "wagmi";

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
            depth-aware impact, animated route trace — quote, simulate, and
            execute in one panel.
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

function SwapPanel() {
  const { user } = useAuth();
  const wallet = useWallet();
  const { crossRate, feed } = usePrices();
  const { formatUsd } = useDisplayCurrency();
  const navigate = useNavigate();
  const evmChainId = useChainId();
  const onchain = useOnchainSwap();

  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("EURC");
  const [amountStr, setAmountStr] = useState("10000");
  const [slippagePct, setSlippagePct] = useState(0.3);
  const [routeMode, setRouteMode] = useState<RouteMode>("best");
  const [simulating, setSimulating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [onchainBal, setOnchainBal] = useState<number | null>(null);

  const amount = Number(amountStr) || 0;
  const liveRate = crossRate(fromToken, toToken) || 0;
  const estOut = amount * liveRate;

  // Detect if wallet is on Arc Testnet
  const isArcTestnet = CHAIN_ID_REVERSE[evmChainId] === "arc-testnet";

  // Fetch on-chain USDC balance when on Arc
  useEffect(() => {
    if (isArcTestnet && wallet.connected) {
      onchain.usdcBalance().then((b) => setOnchainBal(b));
    }
  }, [isArcTestnet, wallet.connected, wallet.address, onchain.usdcBalance]);

  // Auto-simulate (debounced)
  useEffect(() => {
    if (!amount || amount <= 0 || !feed) {
      setQuote(null);
      return;
    }
    const id = setTimeout(async () => {
      setSimulating(true);
      try {
        const { quote: q } = await simulateSwap({
          data: {
            fromToken,
            toToken,
            fromChain: isArcTestnet ? "arc-testnet" : "base",
            toChain: routeMode === "multihop" ? "arbitrum" : (isArcTestnet ? "arc-testnet" : "base"),
            amount,
            slippageBps: Math.round(slippagePct * 100),
          },
        });
        setQuote(q);
        setPulseKey((k) => k + 1);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (!msg.includes("Auth")) console.warn("simulate failed", e);
      } finally {
        setSimulating(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [fromToken, toToken, amount, slippagePct, routeMode, feed, isArcTestnet]);

  const flip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setQuote(null);
  };

  const handleExecute = async () => {
    if (!user) {
      toast.error("Sign in to execute swaps", {
        action: { label: "Sign in", onClick: () => navigate({ to: "/login", search: { redirect: "/" } }) },
      });
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter an amount");
      return;
    }

    // On Arc Testnet with wallet connected → real on-chain ERC20 transfer
    if (isArcTestnet && wallet.connected && SMOKE_TEST_ONLY) {
      setExecuting(true);
      onchain.reset();
      const res = await onchain.execute(amount);
      setExecuting(false);
      if (res?.status === "success") {
        toast.success("On-chain transfer confirmed!", {
          description: `TX: ${res.txHash.slice(0, 10)}…`,
          action: {
            label: "View on ArcScan",
            onClick: () => window.open(res.explorerUrl, "_blank"),
          },
        });
        // Refresh balance
        onchain.usdcBalance().then((b) => setOnchainBal(b));
      } else if (res) {
        toast.error("Transaction reverted on-chain");
      }
      // If null, user rejected or error — onchain.error has details
      if (!res && onchain.error) {
        toast.error(onchain.error);
      }
      return;
    }

    // Fallback: server-side mock pipeline
    setExecuting(true);
    try {
      const { swapId } = await executeSwap({
        data: {
          fromToken,
          toToken,
          fromChain: "base",
          toChain: routeMode === "multihop" ? "arbitrum" : "base",
          amount,
          slippageBps: Math.round(slippagePct * 100),
          source: "web",
          walletAddress: wallet.address ?? undefined,
        },
      });
      toast.success("Swap queued — track live in History", {
        action: { label: "Open", onClick: () => navigate({ to: "/account/history" }) },
      });
      void swapId;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setExecuting(false);
    }
  };

  const slippageBps = Math.round(slippagePct * 100);
  const minReceived = quote?.minReceived ?? estOut * (1 - slippageBps / 10_000);
  const priceImpactBps = quote?.priceImpactBps ?? 0;
  const impactColor = priceImpactBps > 100 ? "text-yellow-400" : priceImpactBps > 30 ? "text-foreground" : "text-primary";

  // Animated impact bar width (0..100%)
  const impactWidth = useMemo(() => {
    if (!quote) return 0;
    return Math.min(100, (quote.priceImpactBps / 200) * 100);
  }, [quote]);

  return (
    <div className="border border-border bg-background p-6">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2 tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
          <span className="text-foreground">SWAP</span>
          <span>· LIVE FEED</span>
        </div>
        <div className="flex items-center gap-1 border border-border">
          {(["best", "direct", "multihop"] as RouteMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setRouteMode(m)}
              className={`px-2 py-1 text-[10px] uppercase tracking-widest ${
                routeMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* You pay */}
      <div className="mt-5 border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between text-mono-label">
          <span>YOU PAY</span>
          <span>≈ {formatUsd(amount * (feed?.prices[fromToken] ?? 1), { decimals: 2 })}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="w-full bg-transparent font-mono text-3xl text-foreground outline-none tabular-nums"
          />
          <TokenSelect value={fromToken} onChange={(v) => setFromToken(v)} />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>1 {fromToken} = {(feed?.prices[fromToken] ?? 0).toFixed(6)} USD</span>
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
            {(quote?.amountOut ?? estOut).toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
          <TokenSelect value={toToken} onChange={(v) => setToToken(v)} />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span>≈ {formatUsd((quote?.amountOut ?? estOut) * (feed?.prices[toToken] ?? 1), { decimals: 2 })}</span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
            {simulating ? "simulating…" : "live oracle"}
          </span>
        </div>
      </div>

      {/* Slippage slider */}
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

      {/* Route impact details panel */}
      <div className="mt-4 border border-border bg-surface-1 p-4 space-y-3">
        <div className="flex items-center justify-between text-mono-label">
          <span>ROUTE IMPACT PREVIEW</span>
          <span className={impactColor}>{(priceImpactBps / 100).toFixed(3)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            key={pulseKey}
            className={`h-full transition-all duration-700 ease-out ${
              priceImpactBps > 100 ? "bg-yellow-400" : "bg-primary"
            }`}
            style={{ width: `${impactWidth}%` }}
          />
        </div>

        {/* Multi-hop path visualization */}
        {quote?.route && quote.route.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-mono-label" style={{ fontSize: 9 }}>ROUTE PATH</div>
            {quote.route.map((leg, i) => {
              const legRate = leg.fromToken === leg.toToken ? 1 : crossRate(leg.fromToken, leg.toToken) || (quote.midRate ?? liveRate);
              return (
                <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${
                    leg.kind === "bridge" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    {leg.kind}
                  </span>
                  <span className="text-foreground">{leg.fromToken}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-foreground">{leg.toToken}</span>
                  {leg.fromChain !== leg.toChain && (
                    <span className="text-muted-foreground text-[9px]">({leg.fromChain}→{leg.toChain})</span>
                  )}
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    {leg.fromToken !== leg.toToken ? legRate.toFixed(6) : "1:1"}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{leg.fee_bps}bps</span>
                  <span className="text-[9px] text-muted-foreground">{leg.protocol}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
          <div>
            <div className="text-mono-label" style={{ fontSize: 9 }}>RATE</div>
            <div className="tabular-nums">{(quote?.rate ?? liveRate).toFixed(6)}</div>
          </div>
          <div>
            <div className="text-mono-label" style={{ fontSize: 9 }}>PROTOCOL FEE</div>
            <div className="tabular-nums">{((quote?.protocolFeeBps ?? 4) / 100).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-mono-label" style={{ fontSize: 9 }}>TOTAL FEE</div>
            <div className="tabular-nums">{((quote?.totalFeeBps ?? 4) / 100).toFixed(3)}%</div>
          </div>
          <div>
            <div className="text-mono-label" style={{ fontSize: 9 }}>EST GAS</div>
            <div className="tabular-nums">{formatUsd(quote?.gasEstimateUsd ?? 0.18)}</div>
          </div>
        </div>
      </div>

      <button
        onClick={handleExecute}
        disabled={executing || !amount}
        className="mt-5 flex w-full items-center justify-center gap-2 bg-primary py-3 font-mono text-sm font-semibold tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {executing ? (
          <>
            <Loader2 size={14} className="animate-spin" /> EXECUTING…
          </>
        ) : user ? (
          <>
            <Send size={14} /> EXECUTE SWAP →
          </>
        ) : (
          <>SIGN IN TO SWAP →</>
        )}
      </button>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>{wallet.connected ? `wallet · ${wallet.address!.slice(0, 6)}…${wallet.address!.slice(-4)}` : "Permit2 enabled · 0 approvals"}</span>
        <span className="text-primary">▌ready</span>
      </div>
      {quote?.warnings.length ? (
        <div className="mt-2 font-mono text-[10px] text-yellow-400">⚠ {quote.warnings.join(" · ")}</div>
      ) : null}
    </div>
  );
}

function TokenSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex items-center gap-2 border border-border bg-surface-2 px-3 py-2 font-mono text-sm outline-none focus:border-primary"
    >
      {STABLES.map((s) => (
        <option key={s.symbol} value={s.symbol}>
          {s.symbol}
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
