import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  CartesianGrid,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type DashboardMetrics = {
  total_transactions: number;
  unique_users: number;
  successful_transactions: number;
  total_fees_generated: number;
};

type FxTransactionRow = {
  id: string;
  transaction_id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  fee: number;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  success: "Success",
  failed: "Failed",
  pending: "Pending",
};

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics - Liquira" },
      { name: "description", content: "Live Liquira analytics for transactions, users, fees, and FX activity." },
      { property: "og:title", content: "Liquira Analytics" },
      { property: "og:description", content: "Explore Liquira FX transaction volume, active users, currency pairs and recent activity." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recent, setRecent] = useState<FxTransactionRow[]>([]);
  const [chartRows, setChartRows] = useState<FxTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: dashboardData, error: dashboardError } = await supabase
          .from("liquira_dashboard")
          .select("*")
          .limit(1)
          .single();

        if (dashboardError) {
          throw dashboardError;
        }

        const { data: transactions, error: transactionsError } = await supabase
          .from("fx_transactions")
          .select(
            "id, transaction_id, user_id, from_currency, to_currency, from_amount, to_amount, fee, status, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(2000);

        if (transactionsError) {
          throw transactionsError;
        }

        const parsedMetrics = parseDashboardMetrics(dashboardData);
        setMetrics(parsedMetrics);

        const recentRows = Array.isArray(transactions) ? transactions.slice(0, 20) : [];
        setRecent(recentRows);
        setChartRows(Array.isArray(transactions) ? [...transactions].reverse() : []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unable to load analytics.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, []);

  const transactionsByDay = useMemo(() => {
    const counts = new Map<string, number>();

    for (const tx of chartRows) {
      const day = tx.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [chartRows]);

  const activeUsersByDay = useMemo(() => {
    const usersByDay = new Map<string, Set<string>>();

    for (const tx of chartRows) {
      const day = tx.created_at.slice(0, 10);
      const users = usersByDay.get(day) ?? new Set<string>();
      users.add(tx.user_id);
      usersByDay.set(day, users);
    }

    return [...usersByDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, set]) => ({ date, users: set.size }));
  }, [chartRows]);

  const topPairs = useMemo(() => {
    const pairCounts = new Map<string, { from_currency: string; to_currency: string; count: number }>();

    for (const tx of chartRows) {
      const key = `${tx.from_currency}|${tx.to_currency}`;
      const current = pairCounts.get(key);
      if (current) {
        current.count += 1;
      } else {
        pairCounts.set(key, {
          from_currency: tx.from_currency,
          to_currency: tx.to_currency,
          count: 1,
        });
      }
    }

    return [...pairCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [chartRows]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-14 sm:py-20">
            <div className="max-w-4xl">
              <div className="text-mono-label">/ ANALYTICS</div>
              <h1 className="mt-3 text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] font-medium tracking-[-0.02em]">
                Liquira live analytics for FX volume, fees, and user activity.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Public analytics built from live Supabase data. Explore transaction counts, active users,
                currency pairs, and the latest FX activity without logging in.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {renderStatCard("Total transactions", metrics?.total_transactions, loading)}
              {renderStatCard("Unique users", metrics?.unique_users, loading)}
              {renderStatCard("Successful transactions", metrics?.successful_transactions, loading)}
              {renderStatCard("Total fees generated", formatCurrency(metrics?.total_fees_generated), loading)}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10">
            {error ? (
              <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
                {error}
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-3xl border border-border bg-surface-2 p-5">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Transactions per day</p>
                        <p className="mt-3 text-2xl font-semibold text-foreground">Live count</p>
                      </div>
                    </div>
                    <div className="mt-6 h-[280px] min-h-[220px] w-full">
                      <ChartContainer config={{ count: { label: "Transactions", color: "var(--chart-1)" } }}>
                        <LineChart data={transactionsByDay} margin={{ top: 8, right: 18, left: -14, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="count" stroke="var(--chart-1)" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface-2 p-5">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Active users per day</p>
                        <p className="mt-3 text-2xl font-semibold text-foreground">Unique user count</p>
                      </div>
                    </div>
                    <div className="mt-6 h-[280px] min-h-[220px] w-full">
                      <ChartContainer config={{ users: { label: "Active users", color: "var(--chart-2)" } }}>
                        <AreaChart data={activeUsersByDay} margin={{ top: 8, right: 18, left: -14, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Area type="monotone" dataKey="users" stroke="var(--chart-2)" fill="rgba(72, 209, 178, 0.2)" fillOpacity={0.65} />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-surface-2 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Top currency pairs</p>
                      <p className="mt-3 text-2xl font-semibold text-foreground">By transaction count</p>
                    </div>
                  </div>
                  <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-background/50">
                    <div className="divide-y divide-border">
                      {topPairs.length === 0 ? (
                        <div className="p-6 text-sm text-muted-foreground">No currency pair data available yet.</div>
                      ) : (
                        topPairs.map((pair) => (
                          <div key={`${pair.from_currency}-${pair.to_currency}`} className="grid grid-cols-[1.15fr,0.85fr] gap-4 px-5 py-4 sm:grid-cols-[1fr,0.6fr]">
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {pair.from_currency} → {pair.to_currency}
                              </div>
                              <div className="mt-1 text-sm text-muted-foreground">Live FX pair activity</div>
                            </div>
                            <div className="flex items-center justify-end text-right text-sm font-semibold text-foreground">
                              {pair.count} tx
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10">
            <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-3xl border border-border bg-surface-2 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Recent activity</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">Latest 20 FX transactions</p>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-background">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                    <thead className="bg-surface-1 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Pair</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Fee</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No transactions available yet.
                          </td>
                        </tr>
                      ) : (
                        recent.map((tx) => (
                          <tr key={tx.transaction_id} className="border-t border-border last:border-b-0 even:bg-surface-1">
                            <td className="px-4 py-4 text-sm text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </td>
                            <td className="px-4 py-4 font-medium text-foreground">
                              {tx.from_currency} → {tx.to_currency}
                            </td>
                            <td className="px-4 py-4 text-sm text-muted-foreground">
                              {formatAmount(tx.from_amount)} → {formatAmount(tx.to_amount)}
                            </td>
                            <td className="px-4 py-4 text-sm text-muted-foreground">{formatCurrency(tx.fee)}</td>
                            <td className="px-4 py-4">
                              <span className={statusBadgeClass(tx.status)}>{STATUS_LABELS[tx.status] ?? tx.status}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface-2 p-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">About this page</p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    This analytics page reads directly from the public Supabase view <code className="rounded bg-surface-1 px-1.5 py-0.5 text-xs text-muted-foreground">liquira_dashboard</code> and the <code className="rounded bg-surface-1 px-1.5 py-0.5 text-xs text-muted-foreground">fx_transactions</code> table.
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Data is live, publicly accessible, and updated on every page load. No login is required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function parseDashboardMetrics(raw: any): DashboardMetrics {
  return {
    total_transactions: Number(raw?.total_transactions ?? raw?.total_tx ?? raw?.transactions ?? 0),
    unique_users: Number(raw?.unique_users ?? raw?.unique_user_count ?? raw?.users ?? 0),
    successful_transactions: Number(raw?.successful_transactions ?? raw?.successful_tx ?? raw?.successful ?? 0),
    total_fees_generated: Number(raw?.total_fees_generated ?? raw?.total_fees ?? raw?.fees_generated ?? 0),
  };
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatAmount(value: number | string | undefined) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function formatCurrency(value: number | string | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function statusBadgeClass(status: string) {
  const base = "inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase ";
  if (status === "success") {
    return base + "bg-emerald-500/10 text-emerald-300";
  }
  if (status === "failed") {
    return base + "bg-destructive/10 text-destructive";
  }
  return base + "bg-amber-500/10 text-amber-200";
}

function renderStatCard(label: string, value: number | string | undefined, loading: boolean) {
  return (
    <div className="rounded-3xl border border-border bg-surface-2 p-5">
      <div className="text-sm uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-4 min-h-[3rem] text-3xl font-semibold text-foreground">
        {loading ? "Loading..." : value ?? "—"}
      </div>
    </div>
  );
}
