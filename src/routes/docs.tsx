import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Liquira Docs - Stablecoin FX Router" },
      {
        name: "description",
        content:
          "Learn how Liquira routes stablecoin FX on Arc Network. Explore SDK integration, supported flows, security, and developer guides.",
      },
      { property: "og:title", content: "Liquira Docs - Stablecoin FX Router" },
      {
        property: "og:description",
        content:
          "Read the official Liquira documentation for developers building stablecoin payments, FX routing, and treasury automation.",
      },
    ],
  }),
  component: DocsLayout,
});

function DocsLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <section className="border-b border-border bg-surface-1">
          <div className="mx-auto max-w-[1400px] px-6 py-20">
            <div className="max-w-4xl">
              <div className="text-mono-label">/ DOCUMENTATION</div>
              <h1 className="mt-3 text-[clamp(2.75rem,5vw,4.5rem)] leading-[1.02] font-medium tracking-[-0.03em]">
                Liquira documentation for developers.
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Explore Liquira's stablecoin FX routing, SDK integration, and developer guides for building trusted cross-currency settlement on Arc Network.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="rounded border border-border bg-background px-4 py-3 font-mono text-[12px] uppercase tracking-widest text-foreground hover:bg-surface-2"
                >
                  Back to home
                </Link>
                <Link
                  to="/docs/quickstart"
                  className="rounded bg-primary px-4 py-3 font-mono text-[12px] uppercase tracking-widest text-primary-foreground hover:opacity-90"
                >
                  Read quickstart
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="grid gap-14 lg:grid-cols-[1fr,280px]">
            <div className="space-y-20">
              <article id="overview" className="space-y-8">
                <div className="text-mono-label">OVERVIEW</div>
                <h2 className="text-4xl font-medium tracking-[-0.02em]">
                  What Liquira is and how it simplifies stablecoin FX.
                </h2>
                <p className="text-lg leading-8 text-muted-foreground">
                  Liquira is the on-chain FX router for stablecoin payments on Arc Network. It connects currency pairs, quotes liquidity from multiple pools, and settles transactions using an API-first SDK experience designed for treasury desks, payment rails, and fintech builders.
                </p>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Router</div>
                    <p className="mt-4 text-sm leading-7 text-foreground">
                      Aggregates stablecoin liquidity and routes cross-currency flows through the best available on-chain paths.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Quotes</div>
                    <p className="mt-4 text-sm leading-7 text-foreground">
                      Provides deterministic pricing, slippage control, and order types for spot, limit, and TWAP executions.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Settlement</div>
                    <p className="mt-4 text-sm leading-7 text-foreground">
                      Executes trust-minimized stablecoin settlement on Arc while preserving auditability and compliance-ready traceability.
                    </p>
                  </div>
                </div>
              </article>

              <article id="architecture" className="space-y-8">
                <div className="text-mono-label">ARCHITECTURE</div>
                <h2 className="text-4xl font-medium tracking-[-0.02em]">
                  Liquira is built as a composable, API-first FX router.
                </h2>
                <p className="text-lg leading-8 text-muted-foreground">
                  The platform is organized around three core layers: pricing, routing, and settlement. Liquira uses Arc Network for final on-chain settlement, while the quote and order engine is designed to support live SDK integration, permit approvals, and wallet connectivity.
                </p>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="font-semibold">Quote Engine</div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Source best rate offers by evaluating stablecoin pools, routing paths, and fees. This power comes from Liquira's quote-engine logic and the Liquira SDK.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="font-semibold">Router</div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Chooses the most efficient FX path, handling native swaps, stablecoin conversions, and order execution across supported assets.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="font-semibold">Settlement & Audit</div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Final settlement occurs on Arc with on-chain receipts, while off-chain telemetry provides dashboard visibility and developer audit records.
                    </p>
                  </div>
                </div>
              </article>

              <article id="developer-experience" className="space-y-8">
                <div className="text-mono-label">DEVELOPER EXPERIENCE</div>
                <h2 className="text-4xl font-medium tracking-[-0.02em]">
                  Integrate Liquira with minimal friction.
                </h2>
                <p className="text-lg leading-8 text-muted-foreground">
                  Liquira is designed for SDK-first and API-first workflows. Developers can fetch quotes, request approval, and execute transactions in a single flow while preserving permissioned access and settlement controls.
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <h3 className="font-semibold">Step 1: Quote</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Request a live quote for the amount, source stablecoin, and destination stablecoin pair.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <h3 className="font-semibold">Step 2: Approval</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Approve the payment with a wallet signature or permit, then submit the execution payload.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <h3 className="font-semibold">Step 3: Execute</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Execute the routed payment, then monitor settlement status and transaction receipts.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <h3 className="font-semibold">Step 4: Audit</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Track on-chain settlement and off-chain audit logs through Liquira's dashboard and event history.
                    </p>
                  </div>
                </div>
              </article>

              <article id="api-examples" className="space-y-8">
                <div className="text-mono-label">API EXAMPLES</div>
                <h2 className="text-4xl font-medium tracking-[-0.02em]">
                  Liquira API examples for quoting and executing FX.
                </h2>
                <div className="space-y-6 text-muted-foreground">
                  <p className="text-lg leading-8">
                    Use the examples below as a reference for how Liquira exposes quote, execution, and wallet approval workflows.
                  </p>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="font-semibold">Fetch a quote</div>
                    <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-sm text-foreground">
{`GET /api/quote?from=USDC&to=USDT&amount=1000

Response:
{
  "from": "USDC",
  "to": "USDT",
  "amount": "1000",
  "price": "0.9998",
  "estimatedReceived": "999.80",
  "fee": "0.20",
  "route": ["USDC","USDT"]
}`}
                    </pre>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="font-semibold">Execute a settled payment</div>
                    <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-sm text-foreground">
{`POST /api/execute
Content-Type: application/json

{
  "quoteId": "1234abcd",
  "from": "USDC",
  "to": "USDT",
  "amount": "1000",
  "recipient": "0x123...abc",
  "approvalSignature": "0xdeadbeef..."
}`}
                    </pre>
                  </div>
                  <p className="text-sm leading-7">
                    Liquira supports wallet connect and permit flows, so builders can approve and submit execution payloads without manual token transfers.
                  </p>
                </div>
              </article>

              <article id="security" className="space-y-8">
                <div className="text-mono-label">SECURITY</div>
                <h2 className="text-4xl font-medium tracking-[-0.02em]">
                  Built for auditability, custody control, and compliance.
                </h2>
                <p className="text-lg leading-8 text-muted-foreground">
                  Liquira combines on-chain settlement with off-chain observability. Every routed payment includes a deterministic quote, a signed approval step, and an auditable settlement record.
                </p>
                <ul className="grid gap-3 text-sm leading-7 text-foreground md:grid-cols-2">
                  <li>Permit-based approvals and wallet consent.</li>
                  <li>Quote validity windows and slippage limits.</li>
                  <li>Arc Network settlement for native chain finality.</li>
                  <li>Audit logs for every executed transaction.</li>
                </ul>
              </article>

              <article id="start" className="space-y-8">
                <div className="text-mono-label">GET STARTED</div>
                <h2 className="text-4xl font-medium tracking-[-0.02em]">
                  Start integrating Liquira in three steps.
                </h2>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="font-semibold">1. Explore the SDK</div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Review the SDK reference and available wallet integrations for Arc and stablecoin flows.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="font-semibold">2. Build quote + approval</div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Use quote APIs and Permit2-enabled approvals to authorize FX transfers with your user wallets.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface-1 p-6">
                    <div className="font-semibold">3. Launch live settlement</div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      Execute live transactions, monitor settlement status, and reconcile with your accounting system.
                    </p>
                  </div>
                </div>
              </article>

              <Outlet />
            </div>

            <aside className="space-y-10 rounded border border-border bg-surface-1 p-8">
              <div>
                <div className="text-mono-label">CONTENTS</div>
                <nav className="mt-4 space-y-3 text-sm">
                  {[
                    ["Overview", "overview"],
                    ["Architecture", "architecture"],
                    ["Developer experience", "developer-experience"],
                    ["API examples", "api-examples"],
                    ["Security", "security"],
                    ["Get started", "start"],
                  ].map(([label, href]) => (
                    <a
                      key={href as string}
                      href={`#${href}`}
                      className="block rounded border border-border bg-background px-4 py-3 transition-colors hover:bg-surface-2"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
              </div>
              <div>
                <div className="text-mono-label">LEARN MORE</div>
                <div className="mt-3 text-2xl font-medium">Ready to integrate?</div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Start with the quickstart guide or explore the rest of the Liquira developer docs for deeper architecture and API details.
                </p>
              </div>
              <div className="grid gap-3">
                <a href="/docs/quickstart" className="rounded border border-border px-4 py-3 text-sm text-foreground hover:bg-surface-2">
                  Quickstart
                </a>
                <a href="/docs/integration" className="rounded border border-border px-4 py-3 text-sm text-foreground hover:bg-surface-2">
                  Integration guide
                </a>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
