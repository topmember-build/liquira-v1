import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-primary border-primary/40 bg-primary/10",
  pending: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  quoting: "text-muted-foreground border-border bg-surface-1",
  failed: "text-destructive border-destructive/40 bg-destructive/10",
};

function HistoryPage() {
  const { user } = useAuth();
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("swaps")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    q.then(({ data, error }) => {
      if (error) toast.error(error.message);
      else setSwaps((data ?? []) as Swap[]);
      setLoading(false);
    });
  }, [user?.id, filter]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[12px] text-muted-foreground">
          {loading ? "Loading…" : `${swaps.length} swap${swaps.length === 1 ? "" : "s"}`}
        </div>
        <div className="flex gap-1">
          {(["all", "confirmed", "pending", "failed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest ${
                filter === s
                  ? "border border-primary text-primary"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
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
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No swaps yet. Run a quote from the Router to get started.
                </td>
              </tr>
            )}
            {swaps.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(s.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {s.from_token} → {s.to_token}
                  <span className="ml-2 text-muted-foreground">
                    {s.from_chain}{s.from_chain !== s.to_chain ? ` → ${s.to_chain}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {Number(s.amount_in).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {s.amount_out ? Number(s.amount_out).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {s.rate ? Number(s.rate).toFixed(4) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                      STATUS_STYLES[s.status] ?? STATUS_STYLES.quoting
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {s.explorer_url ? (
                    <a
                      href={s.explorer_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {s.tx_hash ? `${s.tx_hash.slice(0, 6)}…${s.tx_hash.slice(-4)}` : "view"}
                    </a>
                  ) : s.tx_hash ? (
                    <span className="text-muted-foreground">
                      {s.tx_hash.slice(0, 6)}…{s.tx_hash.slice(-4)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
