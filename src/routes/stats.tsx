import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Ticker, StatusBar } from "@/components/site/Ticker";
import { Footer } from "@/components/site/Footer";
import { StatsPanel } from "@/components/site/StatsPanel";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Live testnet stats - Liquira" },
      { name: "description", content: "Real-time TVL, volume, slippage and uptime across all Liquira stable pairs including USDC, EURC, NGNX." },
      { property: "og:title", content: "Live testnet stats - Liquira" },
      { property: "og:description", content: "Real-time TVL, volume, slippage and uptime across all Liquira stable pairs." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Ticker />
      <StatusBar />
      <main>
        <section className="border-t border-border">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-16">
            <div className="text-mono-label">/ STATS</div>
            <h1 className="mt-3 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
              Live <span className="font-serif-italic text-primary">testnet</span> telemetry.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Real-time TVL, volume, slippage and uptime across every supported
              stable. Filter by token to drill in - including NGNX (Naira Stable).
            </p>
            <div className="mt-10">
              <StatsPanel />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
