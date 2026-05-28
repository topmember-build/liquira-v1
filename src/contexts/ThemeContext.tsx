import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type Theme = "dark" | "light";

const STORAGE_KEY = "liquira:theme";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "light" ? "light" : "dark";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Hydrate from profile when user logs in (Supabase optional)
  useEffect(() => {
    if (!user) return;
    if (!supabase?.from) {
      console.warn("[ThemeContext] Supabase not configured - using localStorage only");
      return;
    }

    let cancelled = false;
    const loadTheme = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("theme")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled || !data) return;
        const v = (data as { theme?: string }).theme;
        if (v === "dark" || v === "light") {
          setThemeState(v);
          window.localStorage.setItem(STORAGE_KEY, v);
        }
      } catch (err) {
        console.warn("[ThemeContext] Failed to fetch theme from Supabase:", err);
      }
    };

    void loadTheme();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, t);
    if (user && supabase?.from) {
      const updateTheme = async () => {
        try {
          await supabase.from("profiles").update({ theme: t }).eq("id", user.id);
        } catch (err) {
          console.warn("[ThemeContext] Failed to update theme in Supabase:", err);
        }
      };
      void updateTheme();
    }
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
