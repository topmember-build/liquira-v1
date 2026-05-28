import { SectionHeader } from "./Capabilities";
import { Link } from "@tanstack/react-router";

const FEATURES = [
  ["01", "Quote API", "p50 12 ms · indexed across all Arc pools"],
  ["02", "Permit2 + ERC-2612", "gasless approval flows"],
  ["03", "Limit & TWAP orders", "for treasury desks moving size"],
  ["04", "Webhook receipts", "with auditor view-key support"],
];

const CODE_LINES = [
  ['// Customer in Seoul pays a US merchant in KRW1.', "comment"],
  ['import { Liquira } from "@liquira/sdk";', "code"],
  ["", "blank"],
  ['const route = new Liquira({ chain: "arc-testnet" });', "code"],
  ["", "blank"],
  ["const tx = await route.swap({", "code"],
  ['  from: "KRW1",', "code"],
  ['  to: "USDC",', "code"],
  ["  amount: 1_350_000n, // 1.35M KRW1", "code"],
  ["  slippageBps: 10,", "code"],
  ["  recipient: merchant.address,", "code"],
  ["});", "code"],
  ["", "blank"],
  ["// → settled in 0.4s · 0.71 bps slippage", "comment"],
  ["//   route: KRW1 → USDC (direct pool)", "comment"],
  ["console.log(tx.hash);", "code"],
] as const;

export function Developers() {
  return (
    <section id="developers" className="border-t border-border">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader eyebrow="/ DEVELOPERS" tag="05 · sdk" />
        <div className="mt-4 grid gap-10 lg:grid-cols-[1fr,1.2fr]">
          <div>
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
              One call. <span className="font-serif-italic text-primary">Any stable.</span>
            </h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              Drop the Liquira SDK into any Arc app to settle invoices, payroll,
              or merchant flow in the customer's local stable - without ever
              touching a CEX.
            </p>

            <div className="mt-10 space-y-px bg-border">
              {FEATURES.map(([n, t, d]) => (
                <div key={n} className="flex items-start gap-4 bg-background p-4">
                  <span className="font-mono text-[11px] tracking-widest text-primary/70">{n}</span>
                  <div>
                    <div className="font-medium">{t}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button className="bg-primary px-4 py-3 font-mono text-[12px] font-semibold tracking-widest text-primary-foreground hover:opacity-90">
                NPM INSTALL @LIQUIRA/SDK →
              </button>
              <Link
                to="/docs"
                className="border border-border px-4 py-3 font-mono text-[12px] tracking-widest hover:bg-surface-1"
              >
                READ THE DOCS
              </Link>
            </div>
          </div>

          <div>
            <div className="border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                  </div>
                  <span>checkout.ts · arc-testnet</span>
                </div>
                <span>ts · 16 lines</span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-[1.7]">
                {CODE_LINES.map(([line, kind], i) => (
                  <div key={i} className="flex">
                    <span className="mr-4 inline-block w-6 text-right text-muted-foreground/50 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={
                        kind === "comment"
                          ? "text-muted-foreground"
                          : "text-foreground/90"
                      }
                    >
                      {line || "\u00A0"}
                    </span>
                  </div>
                ))}
              </pre>
              <div className="grid grid-cols-3 border-t border-border">
                {[["P50 QUOTE", "12 ms"], ["SETTLE", "0.41 s"], ["SLIPPAGE", "0.71 bps"]].map(([l, v], i) => (
                  <div key={l} className={"p-4 " + (i < 2 ? "border-r border-border" : "")}>
                    <div className="text-mono-label" style={{ fontSize: 10 }}>{l}</div>
                    <div className="mt-1 font-mono text-lg">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
