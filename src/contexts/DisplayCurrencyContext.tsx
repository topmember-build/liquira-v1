import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { usePrices } from "./PricesContext";

export type DisplayCurrency = "USD" | "NGN" | "EUR" | "GBP";

const SYMBOLS: Record<DisplayCurrency, string> = {
  USD: "$",
  NGN: "₦",
  EUR: "€",
  GBP: "£",
};

const STORAGE_KEY = "liquira:display-currency";

type Ctx = {
  currency: DisplayCurrency;
  symbol: string;
  setCurrency: (c: DisplayCurrency) => void;
  /** Format a USD amount in the chosen display currency, with currency symbol. */
  formatUsd: (usd: number, opts?: { decimals?: number; compact?: boolean }) => string;
};

const DisplayCurrencyContext = createContext<Ctx | null>(null);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { convertFromUsd } = usePrices();
  const [currency, setCurrencyState] = useState<DisplayCurrency>(() => {
    if (typeof window === "undefined") return "USD";
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "NGN" || v === "EUR" || v === "GBP" || v === "USD" ? v : "USD";
  });

  // Pull from profile when user logs in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("display_currency")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const v = (data as { display_currency?: string }).display_currency;
        if (v === "USD" || v === "NGN" || v === "EUR" || v === "GBP") {
          setCurrencyState(v);
          window.localStorage.setItem(STORAGE_KEY, v);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setCurrency = (c: DisplayCurrency) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, c);
    if (user) {
      void supabase.from("profiles").update({ display_currency: c }).eq("id", user.id);
    }
  };

  const formatUsd = (usd: number, opts: { decimals?: number; compact?: boolean } = {}) => {
    const { decimals = 2, compact = false } = opts;
    const value = convertFromUsd(usd, currency);
    if (!Number.isFinite(value)) return `${SYMBOLS[currency]}—`;
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: decimals,
      notation: compact ? "compact" : "standard",
    }).format(value);
    return `${SYMBOLS[currency]}${formatted}`;
  };

  return (
    <DisplayCurrencyContext.Provider value={{ currency, symbol: SYMBOLS[currency], setCurrency, formatUsd }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) throw new Error("useDisplayCurrency must be used within DisplayCurrencyProvider");
  return ctx;
}
