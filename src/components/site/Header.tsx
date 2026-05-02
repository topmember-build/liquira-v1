import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogOut, User as UserIcon, Wallet as WalletIcon, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { CHAINS } from "@/lib/stables";
import { NotificationBell } from "./NotificationBell";
import { useDisplayCurrency, type DisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { useTheme } from "@/contexts/ThemeContext";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-primary/40 bg-primary/10">
            <span className="font-mono text-sm font-bold text-primary">L</span>
          </div>
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
          <CurrencySwitcher />
          <ThemeToggle />
          <NotificationBell />
          <AuthButton />
          <WalletButton />
        </div>
      </div>
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

function CurrencySwitcher() {
  const { currency, setCurrency } = useDisplayCurrency();
  const options: DisplayCurrency[] = ["USD", "NGN", "EUR", "GBP"];
  return (
    <div className="hidden items-center border border-border md:flex" title="Display currency">
      {options.map((c) => (
        <button
          key={c}
          onClick={() => setCurrency(c)}
          className={`px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {c === "NGN" ? "₦ NGN" : c}
        </button>
      ))}
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
        className="hidden border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-surface-1 sm:block"
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
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!w.connected) {
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
        {w.address!.slice(0, 6)}…{w.address!.slice(-4)}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-surface-1 p-3 shadow-xl">
          <div className="text-mono-label" style={{ fontSize: 9 }}>
            CONNECTED · {w.kind}
          </div>
          <div className="mt-1 break-all font-mono text-[11px] text-foreground">{w.address}</div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px]">
            <span className="text-muted-foreground">Balance</span>
            <span className="text-foreground">{w.nativeBalance ?? "—"}</span>
          </div>

          <div className="mt-3 text-mono-label" style={{ fontSize: 9 }}>
            NETWORK
          </div>
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

          <button
            onClick={() => {
              setOpen(false);
              w.disconnect();
            }}
            className="mt-3 w-full border border-border px-2 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
