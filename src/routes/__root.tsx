import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { BetaAccessProvider } from "@/contexts/BetaAccessContext";
import { PricesProvider } from "@/contexts/PricesContext";
import { DisplayCurrencyProvider } from "@/contexts/DisplayCurrencyContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PaymentProvider } from "@/contexts/PaymentContext";
import { DynamicProvider } from "@/integrations/dynamic/provider";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Liquira - Stablecoin FX rail" },
      {
        name: "description",
        content:
          "Liquira is the on-chain liquidity router for stablecoin FX. Quote, swap, schedule and automate stablecoin moves with deep liquidity and developer-grade APIs.",
      },
      { name: "author", content: "Liquira" },
      { property: "og:title", content: "Liquira - Stablecoin FX rail" },
      {
        property: "og:description",
        content: "Quote, swap and automate stablecoin moves with deep liquidity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  // Default `dark` class - ThemeProvider will toggle it on the client.
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <DynamicProvider>
      <AuthProvider>
        <ThemeProvider>
          <PricesProvider>
            <DisplayCurrencyProvider>
              <NotificationsProvider>
                <BetaAccessProvider>
                  <WalletProvider>
                    <PaymentProvider>
                      <Suspense>
                        <Outlet />
                      </Suspense>
                    </PaymentProvider>
                  </WalletProvider>
                </BetaAccessProvider>
              </NotificationsProvider>
            </DisplayCurrencyProvider>
          </PricesProvider>
        </ThemeProvider>
      </AuthProvider>
    </DynamicProvider>
  );
}
