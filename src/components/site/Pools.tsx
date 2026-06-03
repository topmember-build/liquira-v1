import { SectionHeader } from "./Capabilities";

const POOLS = [
  ["01", "🇺🇸", "🇪🇺", "USDC / EURC", "$84.21M", "$12.40M", "4 bps", "6.8 %", 42],
  ["02", "🇺🇸", "🇰🇷", "USDC / KRW1", "$21.84M", "$4.12M", "6 bps", "11.2 %", 61],
  ["03", "🇺🇸", "🇯🇵", "USDC / JPYC", "$38.91M", "$6.78M", "5 bps", "8.4 %", 55],
  ["04", "🇺🇸", "🇬🇧", "USDC / GBPT", "$19.22M", "$2.31M", "5 bps", "7.1 %", 38],
  ["05", "🇺🇸", "🇧🇷", "USDC / BRZ", "$9.41M", "$1.87M", "8 bps", "14.6 %", 72],
  ["06", "🇺🇸", "🇲🇽", "USDC / MXNB", "$7.12M", "$1.24M", "7 bps", "12.9 %", 66],
  ["07", "🇺🇸", "🇸🇬", "USDC / SGDX", "$5.84M", "$920.0K", "6 bps", "9.2 %", 49],
  ["08", "🇪🇺", "🇬🇧", "EURC / GBPT", "$3.41M", "$410.0K", "8 bps", "10.4 %", 51],
] as const;

function Spark() {
  return (
    <svg viewBox="0 0 60 20" className="h-5 w-16">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        className="text-primary"
        points="0,15 8,12 16,14 24,8 32,10 40,5 48,7 60,3"
      />
    </svg>
  );
}

export function Pools() {
  return (
    <section id="pools" className="border-t border-border">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-24">
        <SectionHeader eyebrow="/ POOLS" tag="03 · liquidity" />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.02em]">
              Liquidity, <span className="font-serif-italic text-primary">on the book.</span>
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Concentrated AMM pools, curated for stable-to-stable flow. LPs earn
              fees plus Arc emissions; swappers get the deepest book on the network.
            </p>
          </div>
          <button className="bg-primary px-4 py-2 font-mono text-[11px] font-semibold tracking-widest text-primary-foreground hover:opacity-90">
            + NEW POOL
          </button>
        </div>

        <div className="mt-10 overflow-x-auto border border-border">
          <table className="w-full min-w-[760px] font-mono text-[12px]">
            <thead className="bg-surface-1 text-mono-label" style={{ fontSize: 10 }}>
              <tr>
                {["", "PAIR", "7D TREND", "TVL", "24H VOL", "FEE", "APR", "UTIL"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POOLS.map(([n, f1, f2, pair, tvl, vol, fee, apr, util], i) => (
                <tr key={i} className="border-t border-border hover:bg-surface-1/60">
                  <td className="px-4 py-4 text-muted-foreground">{n}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex">
                        <span className="grid h-7 w-7 place-items-center rounded-full border border-border bg-surface-1">{f1}</span>
                        <span className="-ml-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-surface-1">{f2}</span>
                      </div>
                      <div>
                        <div className="text-foreground">{pair}</div>
                        <div className="text-mono-label" style={{ fontSize: 9 }}>STABLE·STABLE V3</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><Spark /></td>
                  <td className="px-4 py-4">{tvl}</td>
                  <td className="px-4 py-4">{vol}</td>
                  <td className="px-4 py-4">{fee}</td>
                  <td className="px-4 py-4 text-primary">{apr}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-16 bg-border">
                        <div className="h-full bg-primary" style={{ width: `${util}%` }} />
                      </div>
                      <span className="text-muted-foreground">{util}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
