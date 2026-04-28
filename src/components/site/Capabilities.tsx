const CAPS = [
  {
    n: "01",
    title: "Depth-aware solver",
    body: "Routes through direct pairs, USDC bridges, and 3-hop graphs in parallel. Picks the cheapest path before broadcast — never the obvious one.",
    spec: "8 POOLS / QUOTE",
  },
  {
    n: "02",
    title: "Native to Arc",
    body: "Built on Circle's USDC-native L1. No wrapped assets, no cross-chain bridges in the hot path. Settlement in a single block.",
    spec: "0.41 S SETTLE",
  },
  {
    n: "03",
    title: "Treasury-grade",
    body: "Permit2 approvals, on-chain limit & TWAP orders, audited contracts, and webhook receipts your accountant can sign.",
    spec: "2 AUDITS · 0 INCIDENTS",
  },
  {
    n: "04",
    title: "Selectively private",
    body: "Opt-in to Arc's view-key privacy. Hide counter-party detail from the public mempool while keeping auditors fully read-enabled.",
    spec: "VIEW-KEY V1",
  },
];

export function Capabilities() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader eyebrow="/ CAPABILITIES" tag="α · why" />
        <h2 className="mt-4 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
          Engineered for <span className="font-serif-italic text-primary">size.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Four building blocks that make Liquira the venue of choice for
          institutions settling FX on Arc Network.
        </p>

        <div className="mt-14 grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
          {CAPS.map((c) => (
            <div key={c.n} className="bg-background p-7">
              <div className="font-mono text-[11px] tracking-widest text-primary/70">
                {c.n}
              </div>
              <h3 className="mt-3 text-xl">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {c.body}
              </p>
              <div className="mt-8 border-t border-border pt-3 font-mono text-[10px] tracking-widest text-muted-foreground">
                SPEC <span className="ml-2 text-foreground">{c.spec}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHeader({ eyebrow, tag }: { eyebrow: string; tag: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 font-mono text-[11px] tracking-widest text-muted-foreground">
      <span>{eyebrow}</span>
      <span className="text-primary/70">{tag}</span>
    </div>
  );
}
