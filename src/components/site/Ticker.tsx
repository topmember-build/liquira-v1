const PAIRS = [
  ["USDC/EURC", "0.9232", "▲", "0.21", true],
  ["EURC/USDC", "1.0832", "▲", "0.58", true],
  ["KRW1/USDC", "0.000726", "▲", "0.49", true],
  ["JPYC/USDC", "0.006420", "▼", "0.05", false],
  ["GBPT/USDC", "1.2654", "▼", "0.04", false],
  ["BRZ/USDC", "0.1958", "▼", "0.60", false],
  ["MXNB/USDC", "0.0512", "▲", "0.14", true],
  ["SGDX/USDC", "0.7421", "▲", "0.30", true],
] as const;

export function Ticker() {
  const items = [...PAIRS, ...PAIRS, ...PAIRS];
  return (
    <div className="overflow-hidden border-y border-border bg-surface-1/50 py-2">
      <div className="flex w-max animate-ticker gap-8 font-mono text-[11px] whitespace-nowrap">
        {items.map(([pair, price, arrow, pct, up], i) => (
          <span key={i} className="flex items-center gap-2 text-muted-foreground">
            <span className="text-foreground/80">{pair}</span>
            <span className="text-foreground">{price}</span>
            <span className={up ? "text-primary" : "text-destructive"}>{arrow}</span>
            <span className={up ? "text-primary" : "text-destructive"}>{pct}%</span>
            <span className="text-border-strong">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatusBar() {
  return (
    <div className="border-b border-border bg-background py-2">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>LIQUIRA · FX ROUTER · V0.3.1</span>
        <span className="hidden md:inline">EDITION N° 0001 · ARC TESTNET</span>
        <span>DOC · 04 / 27 / 26</span>
      </div>
    </div>
  );
}
