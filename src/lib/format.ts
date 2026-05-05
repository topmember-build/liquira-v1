export function formatNumber(value: number, opts: { decimals?: number; compact?: boolean } = {}) {
  const { decimals = 2, compact = false } = opts;
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function formatToken(value: number | null | undefined, symbol: string, decimals = 4) {
  if (value == null || !Number.isFinite(value)) return `- ${symbol}`;
  return `${formatNumber(value, { decimals })} ${symbol}`;
}

export function formatBps(bps: number | null | undefined) {
  if (bps == null) return "-";
  return `${(bps / 100).toFixed(2)}%`;
}

export function shortAddr(addr: string | null | undefined, n = 4) {
  if (!addr) return "-";
  return `${addr.slice(0, 2 + n)}…${addr.slice(-n)}`;
}

export function formatRelative(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
