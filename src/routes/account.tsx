import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { useAuth } from "@/contexts/AuthContext";
import { TransactionHistoryTable } from "@/components/account/TransactionHistoryTable";

export const Route = createFileRoute("/account")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: AccountLayout,
});

const TABS = [
  { to: "/account", label: "Routes", n: "01", exact: true },
  { to: "/account/history", label: "History", n: "02", exact: false },
  { to: "/account/preferences", label: "Preferences", n: "03", exact: false },
  { to: "/account/wallets", label: "Wallets", n: "04", exact: false },
];

function AccountLayout() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="text-mono-label" style={{ fontSize: 10 }}>
              ACCOUNT · {user?.email}
            </div>
            <h1 className="mt-2 font-serif-italic text-4xl">Your control room.</h1>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">
              Manage saved routes, review past swaps, and tune preferences.
            </p>
          </div>
          <Link
            to="/"
            className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← Back to app
          </Link>
        </div>

        <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => {
            const active = t.exact
              ? location.pathname === "/account"
              : location.pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`-mb-px border-b-2 px-4 py-2.5 font-mono text-[12px] uppercase tracking-widest transition-colors ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="mr-2 text-primary/70">{t.n}</span>
                {t.label}
              </Link>
            );
          })}
        </nav>

        {(location.pathname === "/account" || location.pathname === "/account/") && <TransactionHistoryTable />}

        <Outlet />
      </main>
    </div>
  );
}
