import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/faq")({
  component: FAQ,
});

function FAQ() {
  return (
    <article>
      <div className="text-mono-label">FAQ</div>
      <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em]">Frequently asked questions</h2>
      <p className="mt-5 text-base leading-8 text-muted-foreground">Common questions about Liquira usage and integration.</p>
    </article>
  );
}
