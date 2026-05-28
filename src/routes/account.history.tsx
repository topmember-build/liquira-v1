import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionHistory, TransactionStatus } from "@/hooks/useBackendAPI";
import { Clock, Trash2, Power } from "lucide-react";
import TokenIcon from "@/lib/token-icons";
import { toggleSchedule, deleteSchedule } from "@/server/schedules.functions";

export const Route = createFileRoute("/account/history")({
  component: HistoryPage,
});

type Swap = TransactionStatus;

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
  success: "text-primary border-primary/40 bg-primary/10",
  confirmed: "text-primary border-primary/40 bg-primary/10",
  completed: "text-primary border-primary/40 bg-primary/10",
  pending: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  simulating: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  queued: "text-muted-foreground border-border bg-surface-1",
  quoting: "text-muted-foreground border-border bg-surface-1",
  failed: "text-destructive border-destructive/40 bg-destructive/10",
};

function HistoryPage() {
  const { user } = useAuth();
  const { address: walletAddress } = useAccount();
  const { transactions, total, loading: historyLoading, error: historyError, fetchHistory } = useTransactionHistory();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadSchedules = async () => {
    if (!user) return;
    setScheduleLoading(true);

    const { data: schedulesData, error: scError } = await supabase
      .from("route_schedules")
      .select("*, saved_routes(label, from_token, to_token)")
      .eq("user_id", user.id)
      .order("next_run_at", { ascending: true, nullsFirst: false });

    if (scError) toast.error(scError.message);
    else setSchedules((schedulesData ?? []) as unknown as Schedule[]);
    setScheduleLoading(false);
  };

  useEffect(() => {
    void loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user && !walletAddress) return;
    void fetchHistory(user?.id ?? undefined, walletAddress ?? undefined, 100, 0, filter !== "all" ? filter : undefined);
  }, [user?.id, walletAddress, filter, fetchHistory]);

  useEffect(() => {
    if (historyError) {
      toast.error(historyError.message);
    }
  }, [historyError]);

  const upcoming = schedules.filter((s) => s.enabled);

  const onToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleSchedule({ data: { id, enabled } });
      void loadSchedules();
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
                    {s.saved_routes?.label ?? "-"}
                    <span className="ml-2 text-muted-foreground">{s.saved_routes?.from_token} → {s.saved_routes?.to_token}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{describeSchedule(s)}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : <span className="text-muted-foreground">on condition</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "-"}
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[12px] text-muted-foreground">
              {historyLoading ? "Loading…" : `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {user ? `User: ${user.id}` : "User: not signed in"}
              {walletAddress ? ` • Wallet: ${walletAddress}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => void fetchHistory(user?.id, walletAddress ?? undefined, 100, 0, filter !== "all" ? filter : undefined)}
              className="rounded border border-border bg-surface-2 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-foreground"
            >
              Refresh
            </button>
            {(["all", "pending", "success", "failed"] as const).map((s) => (
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
                <th className="px-4 py-3 text-left">PROVIDER</th>
                <th className="px-4 py-3 text-left">STATUS</th>
                <th className="px-4 py-3 text-left">TX HASH</th>
                <th className="px-4 py-3 text-left">UPDATED</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && !historyLoading && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No transactions yet.</td></tr>
              )}
              {transactions.map((s) => (
                <tr key={s.id} id={s.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-2">
                        <TokenIcon symbol={s.sourceToken} size={16} />
                        <span className="font-mono">{s.sourceToken}</span>
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="inline-flex items-center gap-2">
                        <TokenIcon symbol={s.destinationToken} size={16} />
                        <span className="font-mono">{s.destinationToken}</span>
                      </span>
                    </span>
                    <span className="ml-2 text-muted-foreground">{s.sourceChain}{s.sourceChain !== s.destinationChain ? ` → ${s.destinationChain}` : ""}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    <span className="inline-flex items-center justify-end gap-2">
                      <span className="font-mono">{Number(s.sourceAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                      <TokenIcon symbol={s.sourceToken} size={14} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {s.destinationAmount ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className="font-mono">{Number(s.destinationAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        <TokenIcon symbol={s.destinationToken} size={14} />
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{s.estimatedOutput ? Number(s.estimatedOutput).toFixed(6) : "-"}</td>
                  <td className="px-4 py-3 text-foreground">{s.provider ?? "Liquira FX"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_STYLES[s.status] ?? STATUS_STYLES.quoting}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground break-all">
                    {s.txHash ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.updatedAt ? new Date(s.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
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
