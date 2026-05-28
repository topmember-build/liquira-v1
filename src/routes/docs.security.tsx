import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/security")({
  component: Security,
});

function Security() {
  return (
    <article>
      <div className="text-mono-label">SECURITY</div>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em]">Built for safe treasury flows.</h2>
      <ul className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
        <li>
          <strong className="text-foreground">Permit2 + ERC-2612 support:</strong> gasless approvals and delegated execution reduce wallet friction while keeping control with the end user.
        </li>
        <li>
          <strong className="text-foreground">Audited smart contracts:</strong> Liquira is designed for transparent on-chain settlement, with clear proof trails for every swap.
        </li>
      </ul>
    </article>
  );
}
