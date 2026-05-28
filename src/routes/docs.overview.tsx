import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/overview")({
  component: Overview,
});

function Overview() {
  return (
    <article>
      <div className="text-mono-label">OVERVIEW</div>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em]">What Liquira is and who it helps.</h2>
      <p className="mt-5 text-base leading-8 text-muted-foreground">
        Liquira is the stablecoin FX router built for Arc Network. It lets payments teams, treasury desks, and fintech builders move value across currencies without custodial exchange steps.
      </p>
    </article>
  );
}
