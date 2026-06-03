import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr,1fr,1fr,1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-auto object-contain" />
              <div className="leading-tight">
                <div className="font-mono text-sm font-semibold">
                  liquira<span className="text-primary">/fx</span>
                </div>
                <div className="text-mono-label" style={{ fontSize: 9 }}>
                  STABLE FX · ARC L1
                </div>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm text-muted-foreground">
              The native FX layer for stablecoin money. Built on Arc Network.
              Open-source · audited · routed by humans, settled by machines.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 border border-border bg-surface-1 px-3 py-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
              ALL SYSTEMS · OPERATIONAL
            </div>
          </div>

          {[
            ["PRODUCT", ["Router", "Pools", "Analytics", "Limit orders", "TWAP"]],
            ["DEVELOPERS", ["SDK", "Docs", "GitHub", "API status", "Audits"]],
            ["NETWORK", ["About Arc", "Issuers", "Bridges", "Brand kit", "Discord"]],
          ].map(([h, items]) => (
            <div key={h as string}>
              <div className="text-mono-label">{h as string}</div>
              <ul className="mt-4 space-y-2.5 text-sm">
                {(items as string[]).map((i) => (
                  <li key={i}>
                    {i === "Docs" ? (
                    <a href="/docs" className="text-muted-foreground transition-colors hover:text-foreground">
                      {i}
                    </a>
                  ) : (
                    <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                      {i}
                    </a>
                  )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant brand mark */}
        <div className="mt-16 overflow-hidden">
          <div className="text-center text-[clamp(4rem,18vw,16rem)] leading-none font-medium tracking-[-0.04em] text-foreground/90">
            liquira<span className="font-serif-italic text-primary">/fx</span>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 font-mono text-[10px] tracking-widest text-muted-foreground">
          <span>© 2026 · LIQUIRA LABS · ED. 0001</span>
          <div className="flex gap-5">
            {["TERMS", "PRIVACY", "SECURITY", "BRAND"].map((i) => (
              <a key={i} href="#" className="hover:text-foreground">{i}</a>
            ))}
          </div>
          <span>BUILT ON <span className="text-primary">ARC</span> NETWORK</span>
        </div>
      </div>
    </footer>
  );
}
