import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Ticker, StatusBar } from "@/components/site/Ticker";
import { Hero } from "@/components/site/Hero";
import { Capabilities } from "@/components/site/Capabilities";
import { RouterSection } from "@/components/site/Router";
import { Pools } from "@/components/site/Pools";
import { Analytics } from "@/components/site/Analytics";
import { Developers } from "@/components/site/Developers";
import { Footer } from "@/components/site/Footer";
import { StatsPanel } from "@/components/site/StatsPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Liquira — Stablecoin FX Router on Arc Network" },
      {
        name: "description",
        content:
          "The native FX layer for stablecoin money. Liquira settles cross-currency payments on Arc through depth-aware, multi-stablecoin liquidity in under 400 ms.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Ticker />
      <StatusBar />
      <main>
        <Hero />
        <Capabilities />
        <RouterSection />
        <Pools />
        <Analytics />
        <Developers />
      </main>
      <Footer />
    </div>
  );
}
