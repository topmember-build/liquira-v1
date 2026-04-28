export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-primary/40 bg-primary/10">
            <span className="font-mono text-sm font-bold text-primary">L</span>
          </div>
          <div className="leading-tight">
            <div className="font-mono text-sm font-semibold">
              liquira<span className="text-primary">/fx</span>
            </div>
            <div className="text-mono-label" style={{ fontSize: 9 }}>
              STABLE FX · ARC L1
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          {[
            ["01", "Router"],
            ["02", "Pools"],
            ["03", "Analytics"],
            ["04", "Developers"],
          ].map(([n, label]) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className="font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="mr-1.5 text-primary/70">{n}</span>
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-md border border-border bg-surface-1 px-3 py-1.5 font-mono text-[11px] text-muted-foreground lg:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
              arc-testnet
            </span>
            <span className="text-border-strong">·</span>
            <span>#2,191,051</span>
            <span className="text-border-strong">·</span>
            <span>13:47:20 UTC</span>
          </div>
          <button className="hidden border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-1 sm:block">
            Sign In
          </button>
          <button className="bg-primary px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90">
            Connect
          </button>
        </div>
      </div>
    </header>
  );
}
