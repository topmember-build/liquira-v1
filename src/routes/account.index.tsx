import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { STABLES, CHAINS } from "@/lib/stables";
import { Trash2, Plus, Pencil, Check, X, Zap, Send, Clock, Loader2 } from "lucide-react";
import { simulateSwap, executeSwap } from "@/server/swaps.functions";
import { createSchedule } from "@/server/schedules.functions";
import type { Quote } from "@/lib/quote-engine";

export const Route = createFileRoute("/account/")({
  component: SavedRoutesPage,
});

type SavedRoute = {
  id: string;
  label: string;
  from_token: string;
  to_token: string;
  from_chain: string;
  to_chain: string;
  amount: number | null;
  slippage_bps: number;
  created_at: string;
};

function SavedRoutesPage() {
  const { user } = useAuth();
  const wallet = useWallet();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<Record<string, boolean>>({});
  const [executing, setExecuting] = useState<Record<string, boolean>>({});
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [scheduleFor, setScheduleFor] = useState<SavedRoute | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_routes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRoutes((data ?? []) as SavedRoute[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const remove = async (id: string) => {
    if (!confirm("Delete this saved route?")) return;
    const { error } = await supabase.from("saved_routes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Route deleted");
    setRoutes((r) => r.filter((x) => x.id !== id));
    setQuotes((q) => {
      const c = { ...q };
      delete c[id];
      return c;
    });
  };

  const simulate = async (r: SavedRoute) => {
    if (!r.amount || r.amount <= 0) return toast.error("Add a default amount on the route to simulate.");
    setSimulating((s) => ({ ...s, [r.id]: true }));
    try {
      const { quote } = await simulateSwap({
        data: {
          fromToken: r.from_token,
          toToken: r.to_token,
          fromChain: r.from_chain,
          toChain: r.to_chain,
          amount: r.amount,
          slippageBps: r.slippage_bps,
        },
      });
      setQuotes((q) => ({ ...q, [r.id]: quote }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setSimulating((s) => ({ ...s, [r.id]: false }));
    }
  };

  const execute = async (r: SavedRoute) => {
    if (!r.amount || r.amount <= 0) return toast.error("Add a default amount on the route to swap.");
    setExecuting((s) => ({ ...s, [r.id]: true }));
    try {
      const { swapId } = await executeSwap({
        data: {
          routeId: r.id,
          fromToken: r.from_token,
          toToken: r.to_token,
          fromChain: r.from_chain,
          toChain: r.to_chain,
          amount: r.amount,
          slippageBps: r.slippage_bps,
          source: "web",
          walletAddress: wallet.address ?? undefined,
        },
      });
      toast.success("Swap queued — track live in History", {
        action: { label: "Open", onClick: () => (window.location.href = `/account/history#${swapId}`) },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setExecuting((s) => ({ ...s, [r.id]: false }));
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[12px] text-muted-foreground">
          {loading ? "Loading…" : `${routes.length} saved route${routes.length === 1 ? "" : "s"}`}
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90"
        >
          <Plus size={12} /> New route
        </button>
      </div>

      {showForm && (
        <RouteForm
          userId={user!.id}
          existing={routes.find((r) => r.id === editingId) ?? null}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingId(null);
            void load();
          }}
        />
      )}

      <div className="space-y-3">
        {routes.length === 0 && !loading && (
          <div className="rounded-md border border-border bg-surface-1 px-4 py-12 text-center font-mono text-[12px] text-muted-foreground">
            No saved routes yet. Create your first to schedule and automate swaps.
          </div>
        )}
        {routes.map((r) => (
          <div key={r.id} className="rounded-md border border-border bg-surface-1">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-mono text-[13px] text-foreground">{r.label}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {r.from_token}/{r.from_chain} → {r.to_token}/{r.to_chain}
                  {r.amount ? ` · ${r.amount.toLocaleString()} ${r.from_token}` : " · no default amount"}
                  {` · slippage ${(r.slippage_bps / 100).toFixed(2)}%`}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => simulate(r)}
                  disabled={simulating[r.id]}
                  className="flex items-center gap-1 border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:bg-surface-2 disabled:opacity-50"
                >
                  {simulating[r.id] ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                  Simulate now
                </button>
                <button
                  onClick={() => setScheduleFor(r)}
                  className="flex items-center gap-1 border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:bg-surface-2"
                >
                  <Clock size={11} /> Schedule
                </button>
                <button
                  onClick={() => execute(r)}
                  disabled={executing[r.id]}
                  className="flex items-center gap-1 bg-primary px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {executing[r.id] ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Swap
                </button>
                <button
                  onClick={() => {
                    setEditingId(r.id);
                    setShowForm(true);
                  }}
                  className="rounded p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  aria-label="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            {quotes[r.id] && <QuotePreview quote={quotes[r.id]} onClear={() => setQuotes((q) => { const c = {...q}; delete c[r.id]; return c; })} />}
          </div>
        ))}
      </div>

      {scheduleFor && (
        <ScheduleModal
          route={scheduleFor}
          onClose={() => setScheduleFor(null)}
          onCreated={() => {
            setScheduleFor(null);
            toast.success("Schedule created — see upcoming jobs in History");
          }}
        />
      )}
    </div>
  );
}

function QuotePreview({ quote, onClear }: { quote: Quote; onClear: () => void }) {
  return (
    <div className="border-t border-border bg-surface-2 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-mono-label text-primary" style={{ fontSize: 10 }}>
          SIMULATION · QUOTE {quote.quoteId.slice(0, 14)}…
        </div>
        <button onClick={onClear} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="EXPECTED OUT" value={`${quote.amountOut.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${quote.toToken}`} />
        <Stat label="MIN RECEIVED" value={`${quote.minReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })}`} />
        <Stat label="RATE" value={quote.rate.toFixed(6)} />
        <Stat label="PRICE IMPACT" value={`${(quote.priceImpactBps / 100).toFixed(3)}%`} tone={quote.priceImpactBps > 100 ? "warn" : undefined} />
        <Stat label="EST GAS" value={`$${quote.gasEstimateUsd.toFixed(2)}`} />
      </div>
      <div className="mt-2 font-mono text-[10px] text-muted-foreground">
        Route: {quote.route.map((l) => `${l.protocol}(${l.kind})`).join(" → ")} · fees {(quote.totalFeeBps / 100).toFixed(3)}%
      </div>
      {quote.warnings.length > 0 && (
        <div className="mt-2 font-mono text-[10px] text-yellow-400">⚠ {quote.warnings.join(" · ")}</div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div>
      <div className="text-mono-label" style={{ fontSize: 9 }}>{label}</div>
      <div className={`mt-0.5 font-mono text-[12px] ${tone === "warn" ? "text-yellow-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function ScheduleModal({ route, onClose, onCreated }: { route: SavedRoute; onClose: () => void; onCreated: () => void }) {
  const [cadence, setCadence] = useState<"once" | "hourly" | "daily" | "weekly" | "interval" | "price">("daily");
  const [runAtUtc, setRunAtUtc] = useState("09:00");
  const [weekday, setWeekday] = useState(1);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [thresholdOperator, setThresholdOperator] = useState<"none" | "gte" | "lte">("none");
  const [thresholdValue, setThresholdValue] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createSchedule({
        data: {
          routeId: route.id,
          cadence,
          intervalMinutes: cadence === "interval" ? intervalMinutes : undefined,
          runAtUtc: cadence === "daily" || cadence === "weekly" ? runAtUtc : undefined,
          weekday: cadence === "weekly" ? weekday : undefined,
          thresholdOperator: cadence === "price" ? thresholdOperator : "none",
          thresholdValue: cadence === "price" && thresholdValue ? Number(thresholdValue) : undefined,
          enabled: true,
        },
      });
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create schedule");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-md border border-border bg-surface-1 p-5"
      >
        <div className="mb-1 text-mono-label" style={{ fontSize: 10 }}>SCHEDULE · {route.label}</div>
        <h3 className="mb-4 font-serif-italic text-2xl">When should this run?</h3>

        <label className="mb-3 block">
          <span className="text-mono-label" style={{ fontSize: 10 }}>CADENCE</span>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as typeof cadence)}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
          >
            <option value="once">Once (in 1 minute)</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily at time</option>
            <option value="weekly">Weekly</option>
            <option value="interval">Every N minutes</option>
            <option value="price">Price condition</option>
          </select>
        </label>

        {(cadence === "daily" || cadence === "weekly") && (
          <label className="mb-3 block">
            <span className="text-mono-label" style={{ fontSize: 10 }}>RUN TIME (UTC, HH:MM)</span>
            <input
              type="time"
              value={runAtUtc}
              onChange={(e) => setRunAtUtc(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
            />
          </label>
        )}
        {cadence === "weekly" && (
          <label className="mb-3 block">
            <span className="text-mono-label" style={{ fontSize: 10 }}>WEEKDAY</span>
            <select
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
            >
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </label>
        )}
        {cadence === "interval" && (
          <label className="mb-3 block">
            <span className="text-mono-label" style={{ fontSize: 10 }}>EVERY N MINUTES (min 5)</span>
            <input
              type="number"
              min={5}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
            />
          </label>
        )}
        {cadence === "price" && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-mono-label" style={{ fontSize: 10 }}>WHEN RATE IS</span>
              <select
                value={thresholdOperator}
                onChange={(e) => setThresholdOperator(e.target.value as typeof thresholdOperator)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
              >
                <option value="gte">≥ at least</option>
                <option value="lte">≤ at most</option>
              </select>
            </label>
            <label className="block">
              <span className="text-mono-label" style={{ fontSize: 10 }}>{route.to_token}/{route.from_token}</span>
              <input
                type="number"
                step="any"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
                placeholder="0.92"
                required
              />
            </label>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-surface-2 hover:text-foreground">
            <X size={12} className="inline" /> Cancel
          </button>
          <button type="submit" disabled={busy} className="bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "Creating…" : "Create schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RouteForm({
  userId,
  existing,
  onClose,
  onSaved,
}: {
  userId: string;
  existing: SavedRoute | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(existing?.label ?? "");
  const [fromToken, setFromToken] = useState(existing?.from_token ?? "USDC");
  const [toToken, setToToken] = useState(existing?.to_token ?? "EURC");
  const [fromChain, setFromChain] = useState(existing?.from_chain ?? "base");
  const [toChain, setToChain] = useState(existing?.to_chain ?? "base");
  const [amount, setAmount] = useState<string>(existing?.amount?.toString() ?? "");
  const [slippage, setSlippage] = useState<string>(existing ? String(existing.slippage_bps / 100) : "0.30");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      user_id: userId,
      label,
      from_token: fromToken,
      to_token: toToken,
      from_chain: fromChain,
      to_chain: toChain,
      amount: amount ? Number(amount) : null,
      slippage_bps: Math.round(Number(slippage) * 100),
    };
    const { error } = existing
      ? await supabase.from("saved_routes").update(payload).eq("id", existing.id)
      : await supabase.from("saved_routes").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(existing ? "Route updated" : "Route saved");
    onSaved();
  };

  return (
    <form
      onSubmit={submit}
      className="mb-4 grid grid-cols-1 gap-3 rounded-md border border-border bg-surface-1 p-4 md:grid-cols-3"
    >
      <Field label="LABEL" className="md:col-span-3">
        <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="EUR payroll · monthly"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary" />
      </Field>
      <Field label="FROM TOKEN"><Select value={fromToken} onChange={setFromToken} options={STABLES.map((s) => s.symbol)} /></Field>
      <Field label="TO TOKEN"><Select value={toToken} onChange={setToToken} options={STABLES.map((s) => s.symbol)} /></Field>
      <Field label="AMOUNT">
        <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="optional"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary" />
      </Field>
      <Field label="FROM CHAIN"><Select value={fromChain} onChange={setFromChain} options={CHAINS.map((c) => c.id)} /></Field>
      <Field label="TO CHAIN"><Select value={toChain} onChange={setToChain} options={CHAINS.map((c) => c.id)} /></Field>
      <Field label="SLIPPAGE %">
        <input type="number" step="0.01" value={slippage} onChange={(e) => setSlippage(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary" />
      </Field>
      <div className="flex items-end justify-end gap-2 md:col-span-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1 border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <X size={12} /> Cancel
        </button>
        <button type="submit" disabled={busy} className="flex items-center gap-1 bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <Check size={12} /> {existing ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-mono-label" style={{ fontSize: 10 }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
