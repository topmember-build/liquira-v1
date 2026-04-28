import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liquira — Stablecoin FX rail" },
      {
        name: "description",
        content:
          "Liquira routes stablecoins across chains with deep liquidity, scheduled execution, and a developer-grade API.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const wallet = useWallet();

  return (
    <main className="gradient-hero min-h-screen">
      <div className="bg-grid bg-grid-fade absolute inset-0 opacity-40" aria-hidden />
      <div className="container relative mx-auto max-w-4xl px-6 py-24">
        <div className="text-mono-label">liquira / fx · v0</div>
        <h1 className="font-mono mt-4 text-5xl font-semibold tracking-tight md:text-6xl">
          The stablecoin FX rail.
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
          Quote, swap, schedule and automate stablecoin moves across chains. Foundation is live —
          backend schema, auth, wallet provider and quote engine are wired up. UI surfaces (swap
          stepper, schedules, developer console, API endpoints) are next.
        </p>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          <Stat label="Backend" value={loading ? "…" : user ? "signed in" : "ready"} />
          <Stat label="Wallet" value={wallet.connected ? wallet.chainId.toUpperCase() : "disconnected"} />
          <Stat label="Quote engine" value="online" />
        </div>

        <div className="border-border-strong text-muted-foreground mt-10 rounded-md border p-6 font-mono text-xs leading-relaxed">
          <div className="text-foreground mb-2 font-semibold">Build status</div>
          <ul className="list-inside list-disc space-y-1">
            <li>✓ Lovable Cloud schema (profiles, routes, schedules, runs, swaps, api_keys, webhooks, deliveries)</li>
            <li>✓ Design system + dark terminal theme</li>
            <li>✓ Quote engine (quote IDs, valid-until, route legs, price impact, gas)</li>
            <li>✓ Wallet provider (injected + WalletConnect-style adapters, chain switching, balances)</li>
            <li>✓ Auth context</li>
            <li>… Swap stepper UI, dashboard shell, schedules UI, developer console, public API endpoints</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border-strong surface-2 rounded-md border p-4">
      <div className="text-mono-label">{label}</div>
      <div className="font-mono mt-1 text-lg">{value}</div>
    </div>
  );
}
