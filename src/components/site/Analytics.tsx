import { SectionHeader } from "./Capabilities";
import { StatsPanel } from "./StatsPanel";

export function Analytics() {
  return (
    <section id="analytics" className="border-t border-border bg-surface-1/30">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader eyebrow="/ ANALYTICS" tag="04 · telemetry" />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
              Numbers <span className="font-serif-italic text-primary">don't lie.</span>
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Real-time view into FX flows on Arc. Filter by token - including
              NGNX - to drill into TVL, volume, slippage and uptime.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <StatsPanel />
        </div>
      </div>
    </section>
  );
}
