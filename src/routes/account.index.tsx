import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STABLES, CHAINS } from "@/lib/stables";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";

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
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

      <div className="overflow-x-auto rounded-md border border-border bg-surface-1">
        <table className="w-full font-mono text-[12px]">
          <thead className="text-mono-label" style={{ fontSize: 10 }}>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left">LABEL</th>
              <th className="px-4 py-3 text-left">FROM</th>
              <th className="px-4 py-3 text-left">TO</th>
              <th className="px-4 py-3 text-right">AMOUNT</th>
              <th className="px-4 py-3 text-right">SLIPPAGE</th>
              <th className="px-4 py-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {routes.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No saved routes yet. Create your first to schedule and automate swaps.
                </td>
              </tr>
            )}
            {routes.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3 text-foreground">{r.label}</td>
                <td className="px-4 py-3">
                  <span className="text-foreground">{r.from_token}</span>
                  <span className="ml-2 text-muted-foreground">{r.from_chain}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-foreground">{r.to_token}</span>
                  <span className="ml-2 text-muted-foreground">{r.to_chain}</span>
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {r.amount ? r.amount.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {(r.slippage_bps / 100).toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditingId(r.id);
                        setShowForm(true);
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-surface-1 hover:text-destructive"
                      aria-label="Delete"
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
  const [slippage, setSlippage] = useState<string>(
    existing ? String(existing.slippage_bps / 100) : "0.30",
  );
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
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="EUR payroll · monthly"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="FROM TOKEN">
        <Select value={fromToken} onChange={setFromToken} options={STABLES.map((s) => s.symbol)} />
      </Field>
      <Field label="TO TOKEN">
        <Select value={toToken} onChange={setToToken} options={STABLES.map((s) => s.symbol)} />
      </Field>
      <Field label="AMOUNT">
        <input
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="optional"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
        />
      </Field>
      <Field label="FROM CHAIN">
        <Select value={fromChain} onChange={setFromChain} options={CHAINS.map((c) => c.id)} />
      </Field>
      <Field label="TO CHAIN">
        <Select value={toChain} onChange={setToChain} options={CHAINS.map((c) => c.id)} />
      </Field>
      <Field label="SLIPPAGE %">
        <input
          type="number"
          step="0.01"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
        />
      </Field>
      <div className="flex items-end justify-end gap-2 md:col-span-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <X size={12} /> Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-1 bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Check size={12} /> {existing ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-mono-label" style={{ fontSize: 10 }}>
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Select({
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
      className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none focus:border-primary"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
