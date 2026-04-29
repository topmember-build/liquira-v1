import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, Trash2, Power } from "lucide-react";
import { toggleSchedule, deleteSchedule } from "@/server/schedules.functions";

export const Route = createFileRoute("/account/history")({
  component: HistoryPage,
});

type Swap = {
  id: string;
  from_token: string;
  to_token: string;
  from_chain: string;
  to_chain: string;
  amount_in: number;
  amount_out: number | null;
  rate: number | null;
  status: string;
  tx_hash: string | null;
  explorer_url: string | null;
  created_at: string;
};

type Schedule = {
  id: string;
  route_id: string;
  cadence: string;
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  threshold_operator: string;
  threshold_value: number | null;
  saved_routes: { label: string; from_token: string; to_token: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-primary border-primary/40 bg-primary/10",
  pending: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  simulating: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  queued: "text-muted-foreground border-border bg-surface-1",
  quoting: "text-muted-foreground border-border bg-surface-1",
  failed: "text-destructive border-destructive/40 bg-destructive/10",
};

function HistoryPage() {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("swaps").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const [sw, sc] = await Promise.all([
      q,
      supabase
        .from("route_schedules")
        .select("*, saved_routes(label, from_token, to_token)")
        .eq("user_id", user.id)
        .order("next_run_at", { ascending: true, nullsFirst: false }),
    ]);
    if (sw.error) toast.error(sw.error.message);
    else setSwaps((sw.data ?? []) as Swap[]);
    if (sc.error) toast.error(sc.error.message);
    else setSchedules((sc.data ?? []) as unknown as Schedule[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, filter]);

  // Realtime swap status updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`swaps:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "swaps", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as Swap;
          if (payload.eventType === "INSERT") {
            setSwaps((prev) => [row, ...prev].slice(0, 100));
          } else if (payload.eventType === "UPDATE") {
            setSwaps((prev) => prev.map((s) => (s.id === row.id ? { ...s, ...row } : s)));
          } else if (payload.eventType === "DELETE") {
            setSwaps((prev) => prev.filter((s) => s.id !== row.id));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const upcoming = schedules.filter((s) => s.enabled);

  const onToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleSchedule({ data: { id, enabled } });
      void loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toggle failed");
    }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this schedule?")) return;
    try {
      await deleteSchedule({ data: { id } });
      setSchedules((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const describeSchedule = (s: Schedule) => {
    if (s.cadence === "price" && s.threshold_operator !== "none")
      return `Run when rate ${s.threshold_operator === "gte" ? "≥" : "≤"} ${s.threshold_value}`;
    return `${s.cadence}`;
  };

  return (
    <div className="space-y-6">
      {/* Upcoming jobs */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Clock size={13} className="text-primary" />
          <div className="text-mono-label" style={{ fontSize: 10 }}>UPCOMING JOBS</div>
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-surface-1">
          <table className="w-full font-mono text-[12px]">
            <thead className="text-mono-label" style={{ fontSize: 10 }}>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left">ROUTE</th>
                <th className="px-4 py-2.5 text-left">TRIGGER</th>
                <th className="px-4 py-2.5 text-left">NEXT RUN</th>
                <th className="px-4 py-2.5 text-left">LAST RUN</th>
                <th className="px-4 py-2.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No active schedules. Add one from a saved route.</td></tr>
              )}
              {upcoming.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-foreground">
                    {s.saved_routes?.label ?? "—"}
                    <span className="ml-2 text-muted-foreground">{s.saved_routes?.from_token} → {s.saved_routes?.to_token}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{describeSchedule(s)}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : <span className="text-muted-foreground">on condition</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => onToggle(s.id, !s.enabled)} className="rounded p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground" title={s.enabled ? "Pause" : "Resume"}>
                      <Power size={12} />
                    </button>
                    <button onClick={() => onDelete(s.id)} className="rounded p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-destructive" title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Swaps */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[12px] text-muted-foreground">
            {loading ? "Loading…" : `${swaps.length} swap${swaps.length === 1 ? "" : "s"}`}
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", "queued", "simulating", "pending", "confirmed", "failed"] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${filter === s ? "border border-primary text-primary" : "border border-border text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-surface-1">
          <table className="w-full font-mono text-[12px]">
            <thead className="text-mono-label" style={{ fontSize: 10 }}>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">DATE</th>
                <th className="px-4 py-3 text-left">PAIR</th>
                <th className="px-4 py-3 text-right">IN</th>
                <th className="px-4 py-3 text-right">OUT</th>
                <th className="px-4 py-3 text-right">RATE</th>
                <th className="px-4 py-3 text-left">STATUS</th>
                <th className="px-4 py-3 text-left">TX</th>
              </tr>
            </thead>
            <tbody>
              {swaps.length === 0 && !loading && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No swaps yet.</td></tr>
              )}
              {swaps.map((s) => (
                <tr key={s.id} id={s.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {s.from_token} → {s.to_token}
                    <span className="ml-2 text-muted-foreground">{s.from_chain}{s.from_chain !== s.to_chain ? ` → ${s.to_chain}` : ""}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{Number(s.amount_in).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-foreground">{s.amount_out ? Number(s.amount_out).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{s.rate ? Number(s.rate).toFixed(4) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_STYLES[s.status] ?? STATUS_STYLES.quoting}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.explorer_url ? (
                      <a href={s.explorer_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {s.tx_hash ? `${s.tx_hash.slice(0, 6)}…${s.tx_hash.slice(-4)}` : "view"}
                      </a>
                    ) : s.tx_hash ? (
                      <span className="text-muted-foreground">{s.tx_hash.slice(0, 6)}…{s.tx_hash.slice(-4)}</span>
                    ) : (<span className="text-muted-foreground">—</span>)}
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
