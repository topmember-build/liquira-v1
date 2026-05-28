/**
 * Local-only tracker for faucet claim attempts.
 * Helps users remember which faucets they've already used today.
 */
const STORAGE_KEY = "liquira:faucet-claims";

export type FaucetClaim = {
  url: string;
  label: string;
  attemptedAt: number; // epoch ms
};

export function readClaims(): FaucetClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordClaim(url: string, label: string) {
  if (typeof window === "undefined") return;
  const claims = readClaims().filter((c) => c.url !== url);
  claims.unshift({ url, label, attemptedAt: Date.now() });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(claims.slice(0, 20)));
}

export function clearClaims() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
