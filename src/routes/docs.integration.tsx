import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/integration")({
  component: Integration,
});

function Integration() {
  return (
    <article>
      <div className="text-mono-label">INTEGRATION</div>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em]">SDK & API integration</h2>
      <p className="mt-5 text-base leading-8 text-muted-foreground">
        Liquira provides a TypeScript SDK and HTTP API for quoting and executing swaps. The SDK handles signing, permit approvals, and transaction composition.
      </p>
    </article>
  );
}
