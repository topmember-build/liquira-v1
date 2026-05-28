import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/concepts")({
  component: Concepts,
});

function Concepts() {
  return (
    <article>
      <div className="text-mono-label">KEY CONCEPTS</div>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em]">Routing model & primitives.</h2>
      <p className="mt-5 text-base leading-8 text-muted-foreground">
        Liquira analyzes available stablecoin pools and composes routes that minimize slippage and fees. Core primitives include quotes, execution, and receipts.
      </p>
    </article>
  );
}
