import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getTestnetStats, type StatsResult, type TokenStats } from "@/server/stats.functions";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { STABLES } from "@/lib/stables";

const POLL_MS = 5000;

function Sparkline({ points, color = "primary" }: { points: { t: number; v: number }[]; color?: "primary" | "destructive" }) {
  if (points.length < 2) return null;
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = max - min || 1;
  const w = 100;
  const h = 32;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p.v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const stroke = color === "destructive" ? "oklch(0.65 0.22 28)" : "oklch(0.78 0.18 145)";
  const fill = color === "destructive" ? "oklch(0.65 0.22 28 / 0.15)" : "oklch(0.78 0.18 145 / 0.15)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <path d={`${path} L${w},${h} L0,${h} Z`} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="0.8" />
    </svg>
  );
}

function StatTile({
  label,
  value,
  delta,
  series,
  destructive,
}: {
  label: string;
  value: string;
  delta?: string;
  series: { t: number; v: number }[];
  destructive?: boolean;
}) {
  return (
    <div className="border border-border bg-background p-4">
      <div className="text-mono-label">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-xl tabular-nums">{value}</span>
        {delta && <span className="font-mono text-[10px] text-primary">{delta}</span>}
      </div>
      <div className="mt-2 h-8">
        <Sparkline points={series} color={destructive ? "destructive" : "primary"} />
      </div>
    </div>
  );
}

export function StatsPanel({ compact = false, embed = false }: { compact?: boolean; embed?: boolean }) {
  const { formatUsd, currency } = useDisplayCurrency();
  const [data, setData] = useState<StatsResult | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const sym = filter === "ALL" ? undefined : filter;
        const d = await getTestnetStats({ data: { symbol: sym } });
        if (!cancelled) setData(d);
      } catch (e) {
        // soft-fail; keep last data
        console.warn("[stats] poll failed", e);
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [filter]);

  const totals = data?.totals;
  const series = useMemo(() => {
    if (!data) return null;
    // build totals series by averaging across tokens (same x-axis)
    const points = data.tokens[0]?.series.tvl.length ?? 0;
    const tvl: { t: number; v: number }[] = [];
    const vol: { t: number; v: number }[] = [];
    const slip: { t: number; v: number }[] = [];
    const up: { t: number; v: number }[] = [];
    for (let i = 0; i < points; i++) {
      let t = 0,
        sumTvl = 0,
        sumVol = 0,
        sumSlip = 0,
        sumUp = 0;
      for (const tok of data.tokens) {
        t = tok.series.tvl[i].t;
        sumTvl += tok.series.tvl[i].v;
        sumVol += tok.series.volume[i].v;
        sumSlip += tok.series.slippage[i].v;
        sumUp += tok.series.uptime[i].v;
      }
      tvl.push({ t, v: sumTvl });
      vol.push({ t, v: sumVol });
      slip.push({ t, v: sumSlip / data.tokens.length });
      up.push({ t, v: sumUp / data.tokens.length });
    }
    return { tvl, vol, slip, up };
  }, [data]);

  if (!data || !totals || !series) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse-soft border border-border bg-surface-1" />
        ))}
      </div>
    );
  }

  return (
    <div className={embed ? "" : "space-y-6"}>
      {!compact && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-mono-label">/ TESTNET STATS</div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
              Live · updated {new Date(data.fetchedAt).toLocaleTimeString()} · displaying in {currency}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <label className="text-muted-foreground">FILTER ·</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 outline-none focus:border-primary"
            >
              <option value="ALL">All stables</option>
              {STABLES.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} - {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="TVL" value={formatUsd(totals.tvlUsd * 1_000_000, { compact: true })} delta="+2.4% 24h" series={series.tvl} />
        <StatTile label="24H VOLUME" value={formatUsd(totals.vol24hUsd * 1_000_000, { compact: true })} delta="+8.1%" series={series.vol} />
        <StatTile label="AVG SLIPPAGE" value={`${totals.avgSlippageBps.toFixed(2)} bps`} series={series.slip} destructive />
        <StatTile label="UPTIME" value={`${totals.uptimePct.toFixed(2)}%`} series={series.up} />
      </div>

      {compact ? (
        <div className="mt-4 text-right font-mono text-[11px]">
          <Link to="/stats" className="text-primary hover:underline">
            Open full stats dashboard →
          </Link>
        </div>
      ) : (
        <TokenBreakdown tokens={data.tokens} />
      )}
    </div>
  );
}

function TokenBreakdown({ tokens }: { tokens: TokenStats[] }) {
  const { formatUsd } = useDisplayCurrency();
  const sorted = [...tokens].sort((a, b) => b.tvlUsd - a.tvlUsd);
  return (
    <div className="border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 text-mono-label">
        <span>PER-TOKEN BREAKDOWN</span>
        <span>{tokens.length} stables</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[12px]">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-normal">TOKEN</th>
              <th className="px-4 py-2 font-normal">TVL</th>
              <th className="px-4 py-2 font-normal">24H VOL</th>
              <th className="px-4 py-2 font-normal">SLIP</th>
              <th className="px-4 py-2 font-normal">UPTIME</th>
              <th className="px-4 py-2 font-normal">TVL TREND</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.symbol} className="border-b border-border/50 hover:bg-surface-1/40">
                <td className="px-4 py-2">
                  <div className="text-foreground">{t.symbol}</div>
                  <div className="text-[10px] text-muted-foreground">{t.name}</div>
                </td>
                <td className="px-4 py-2 tabular-nums">{formatUsd(t.tvlUsd * 1_000_000, { compact: true })}</td>
                <td className="px-4 py-2 tabular-nums">{formatUsd(t.vol24hUsd * 1_000_000, { compact: true })}</td>
                <td className="px-4 py-2 tabular-nums">{t.avgSlippageBps.toFixed(2)} bps</td>
                <td className="px-4 py-2 tabular-nums text-primary">{t.uptimePct.toFixed(2)}%</td>
                <td className="px-4 py-2">
                  <div className="h-6 w-32">
                    <Sparkline points={t.series.tvl} />
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
