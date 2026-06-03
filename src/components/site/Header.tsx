import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogOut, User as UserIcon, Wallet as WalletIcon, Sun, Moon, Menu, X } from "lucide-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useDynamicReady } from "@/integrations/dynamic/provider";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { CHAINS } from "@/lib/stables";
import { NotificationBell } from "./NotificationBell";
import { useDisplayCurrency, type DisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Logo } from "./Logo";
import TokenIcon from "@/lib/token-icons";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (mobileOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [mobileOpen]);

  return (
    <header className="relative sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="w-10 h-auto object-contain" />
          <div className="leading-tight">
            <div className="font-mono text-sm font-semibold">
              liquira<span className="text-primary">/fx</span>
            </div>
            <div className="text-mono-label" style={{ fontSize: 9 }}>
              STABLE FX · ARC L1
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <a href="#router" className="font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            <span className="mr-1.5 text-primary/70">01</span>Router
          </a>
          <a href="#pools" className="font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            <span className="mr-1.5 text-primary/70">02</span>Pools
          </a>
          <Link to="/stats" className="font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            <span className="mr-1.5 text-primary/70">03</span>Stats
          </Link>
          <a href="#developers" className="font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground">
            <span className="mr-1.5 text-primary/70">04</span>Developers
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid h-9 w-9 place-items-center rounded border border-border text-muted-foreground transition-colors hover:bg-surface-1 md:hidden"
            aria-label={mobileOpen ? "Close mobile menu" : "Open mobile menu"}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <CurrencySwitcher className="hidden md:block" />
          <ThemeToggle />
          <NotificationBell />
          <AuthButton />
          <WalletButton />
        </div>
      </div>

      {mobileOpen && (
        <div
          ref={mobileMenuRef}
          className="fixed inset-x-0 top-14 bottom-0 z-50 border-t border-border bg-background/95 p-4 shadow-xl backdrop-blur-sm overflow-auto md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <nav className="grid gap-3">
            <a
              href="#router"
              onClick={() => setMobileOpen(false)}
              className="font-mono text-sm text-foreground transition-colors hover:text-primary"
            >
              <span className="mr-2 text-primary/70">01</span>Router
            </a>
            <a
              href="#pools"
              onClick={() => setMobileOpen(false)}
              className="font-mono text-sm text-foreground transition-colors hover:text-primary"
            >
              <span className="mr-2 text-primary/70">02</span>Pools
            </a>
            <Link
              to="/stats"
              onClick={() => setMobileOpen(false)}
              className="font-mono text-sm text-foreground transition-colors hover:text-primary"
            >
              <span className="mr-2 text-primary/70">03</span>Stats
            </Link>
            <a
              href="#developers"
              onClick={() => setMobileOpen(false)}
              className="font-mono text-sm text-foreground transition-colors hover:text-primary"
            >
              <span className="mr-2 text-primary/70">04</span>Developers
            </a>
          </nav>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <CurrencySwitcher className="block w-full" />
            </div>
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label="Toggle theme"
      className="grid h-7 w-7 place-items-center border border-border text-muted-foreground hover:bg-surface-1 hover:text-foreground"
    >
      {isDark ? <Sun size={13} /> : <Moon size={13} />}
    </button>
  );
}

function CurrencySwitcher({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useDisplayCurrency();
  const options: DisplayCurrency[] = ["USD", "NGN", "EUR", "GBP"];
  const currencySymbols: Record<DisplayCurrency, string> = {
    USD: "$",
    NGN: "₦",
    EUR: "€",
    GBP: "£",
  };

  return (
    <div className={cn("hidden md:block", className)} title="Display currency">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as DisplayCurrency)}
        className="w-full min-w-[7rem] border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground focus:border-primary focus:outline-none"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {currencySymbols[c]} {c}
          </option>
        ))}
      </select>
    </div>
  );
}

function AuthButton() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) {
    return (
      <div className="hidden h-7 w-20 animate-pulse-soft rounded bg-surface-1 sm:block" />
    );
  }

  if (!user) {
    return (
      <Link
        to="/login"
        search={{ redirect: "/account" }}
        className="border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-1"
      >
        Sign in
      </Link>
    );
  }

  const initial = (user.email ?? "?")[0].toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-1"
      >
        <span className="grid h-5 w-5 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
          {initial}
        </span>
        <span className="hidden sm:inline">Account</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-surface-1 p-1 shadow-xl">
          <div className="border-b border-border px-3 py-2">
            <div className="truncate font-mono text-[11px] text-foreground">{user.email}</div>
            <div className="text-mono-label mt-0.5" style={{ fontSize: 9 }}>
              SIGNED IN
            </div>
          </div>
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded px-3 py-2 font-mono text-[11px] text-foreground hover:bg-surface-2"
          >
            <UserIcon size={12} /> Account dashboard
          </Link>
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate({ to: "/" });
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-2 font-mono text-[11px] text-destructive hover:bg-surface-2"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function WalletButton() {
  // Top-level hooks must remain stable between server and client.
  const w = useWallet();
  const [isClient, setIsClient] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { sdkReady } = useDynamicReady();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Render a minimal, non-Dynamic-dependent UI during SSR/hydration or while the Dynamic SDK is initializing.
  if (!isClient || !sdkReady) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={w.isConnecting}
          className="bg-primary px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {w.isConnecting ? "Connecting…" : w.connected ? `${w.address?.slice(0, 6)}…${w.address?.slice(-4)}` : "Connect"}
        </button>
      </div>
    );
  }

  // Client-only component that can safely use Dynamic hooks.
  return <ClientWalletMenu />;
}

function ClientWalletMenu() {
  const w = useWallet();
  const dynamicContext = useDynamicContext();
  const dynamicWallet = dynamicContext?.primaryWallet;
  const setShowAuthFlow = dynamicContext?.setShowAuthFlow;
  const sdkHasLoaded = dynamicContext?.sdkHasLoaded;
  const dynamicDisconnect = dynamicContext?.handleLogOut;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleDynamicDisconnect = async () => {
    setOpen(false);
    try {
      if (typeof dynamicDisconnect === "function") {
        await dynamicDisconnect?.();
      }
    } catch (error) {
      console.error("Error disconnecting Dynamic wallet:", error);
    }
  };

  if (!w.connected && !dynamicWallet?.address) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={w.isConnecting}
          className="bg-primary px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {w.isConnecting ? "Connecting…" : "Connect"}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-surface-1 p-1 shadow-xl">
            <button
              onClick={() => {
                setOpen(false);
                void w.connect("injected");
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 font-mono text-[11px] text-foreground hover:bg-surface-2"
            >
              <WalletIcon size={12} /> Browser wallet
            </button>
            <button
              onClick={() => {
                setOpen(false);
                void w.connect("walletconnect");
              }}
              disabled={!w.hasWalletConnect}
              title={!w.hasWalletConnect ? "Set VITE_WALLETCONNECT_PROJECT_ID to enable" : ""}
              className="flex w-full items-center gap-2 rounded px-3 py-2 font-mono text-[11px] text-foreground hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WalletIcon size={12} /> WalletConnect v2
            </button>
            <button
              onClick={() => {
                setOpen(false);
                if (sdkHasLoaded && setShowAuthFlow) {
                  setShowAuthFlow(true);
                }
              }}
              disabled={!sdkHasLoaded || !setShowAuthFlow}
              title={!sdkHasLoaded ? "Dynamic SDK loading..." : "Create or connect Dynamic wallet"}
              className="flex w-full items-center gap-2 rounded px-3 py-2 font-mono text-[11px] text-foreground hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <WalletIcon size={12} /> Dynamic Wallet
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-primary hover:bg-primary/20"
      >
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-primary" />
        {w.connected && w.address
          ? `${w.address.slice(0, 6)}…${w.address.slice(-4)}`
          : dynamicWallet?.address
          ? `${dynamicWallet.address.slice(0, 6)}…${dynamicWallet.address.slice(-4)}`
          : "Wallet"}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-surface-1 p-3 shadow-xl">
          {w.connected && w.address ? (
            <>
              <div className="text-mono-label" style={{ fontSize: 9 }}>
                CONNECTED · {w.kind}
              </div>
              <div className="mt-1 break-all font-mono text-[11px] text-foreground">{w.address}</div>
              <div className="mt-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted-foreground">Native</span>
                  <span className="text-foreground font-mono">{w.nativeBalance ?? "-"}</span>
                </div>
                <div className="mt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <TokenIcon symbol="USDC" size={16} />
                      <span className="text-muted-foreground">USDC</span>
                    </span>
                    <span className="text-foreground font-mono">{(w.balances.USDC ?? 0).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <TokenIcon symbol="EURC" size={16} />
                      <span className="text-muted-foreground">EURC</span>
                    </span>
                    <span className="text-foreground font-mono">{(w.balances.EURC ?? 0).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <TokenIcon symbol="cirBTC" size={16} />
                      <span className="text-muted-foreground">cirBTC</span>
                    </span>
                    <span className="text-foreground font-mono">{(w.balances.cirBTC ?? 0).toFixed(8)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-mono-label" style={{ fontSize: 9 }}>
                NETWORK
              </div>
              <div className="mt-1 relative">
                <select
                  value={w.chainId}
                  onChange={(e) => void w.switchChain(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] outline-none focus:border-primary"
                >
                  {CHAINS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  if (typeof w.disconnect === "function") {
                    w.disconnect();
                  } else {
                    console.warn("[WalletButton] disconnect is not available", w);
                  }
                }}
                className="mt-3 w-full border border-border px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                Disconnect
              </button>
            </>
          ) : dynamicWallet?.address ? (
            <>
              <div className="text-mono-label" style={{ fontSize: 9 }}>
                CONNECTED · DYNAMIC
              </div>
              <div className="mt-1 break-all font-mono text-[11px] text-foreground">{dynamicWallet.address}</div>
              
              <div className="mt-3 text-mono-label" style={{ fontSize: 9 }}>
                NETWORK
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                Arc Testnet
              </div>

              <div className="mt-3">
                <Link
                  to="/account/wallets"
                  onClick={() => setOpen(false)}
                  className="block w-full border border-border px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-2 text-center"
                >
                  Manage Wallets
                </Link>
              </div>

              <div className="mt-2 space-y-1.5">
                <button
                  onClick={() => {
                    setOpen(false);
                    void w.connect("injected");
                  }}
                  className="w-full border border-border px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-2"
                >
                  Use Browser Wallet
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    void w.connect("walletconnect");
                  }}
                  disabled={!w.hasWalletConnect}
                  className="w-full border border-border px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use WalletConnect
                </button>
              </div>

              <button
                onClick={handleDynamicDisconnect}
                className="mt-3 w-full border border-border px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                Disconnect Dynamic Wallet
              </button>
            </>
          ) : (
            <div className="text-mono-label text-muted-foreground" style={{ fontSize: 9 }}>
              No wallet connected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
