import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/quickstart")({
  component: Quickstart,
});

function Quickstart() {
  return (
    <article id="quickstart">
      <div className="text-mono-label">QUICKSTART</div>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em]">Get running in minutes.</h2>
      <p className="mt-5 text-base leading-8 text-muted-foreground">Install the SDK, connect a wallet, and start routing stablecoin flows with a few lines of code.</p>
      <div className="mt-8 overflow-hidden rounded border border-border bg-background">
        <pre className="p-6 font-mono text-sm leading-7 text-foreground">
          <code>{`npm install @liquira/sdk

import { Liquira } from "@liquira/sdk";

const liquira = new Liquira({
  chain: "arc-testnet",
  apiKey: process.env.LIQUIRA_API_KEY,
});

const result = await liquira.swap({
  from: "USDC",
  to: "EURC",
  amount: 1_000_000n,
  recipient: "0x...",
  slippageBps: 20,
});

console.log(result.txHash);
`}</code>
        </pre>
      </div>
    </article>
  );
}
