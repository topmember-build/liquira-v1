import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if Supabase auth is available (will be undefined if not configured)
    if (!supabase?.auth?.onAuthStateChange) {
      console.warn("[AuthContext] Supabase not configured - using Dynamic Labs auth instead");
      setLoading(false);
      return;
    }

    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        setLoading(false);
      });
      supabase.auth.getSession().then(({ data }) => {
        setSession(data?.session || null);
        setLoading(false);
      });
      return () => sub?.subscription?.unsubscribe();
    } catch (error) {
      console.warn("[AuthContext] Supabase auth setup failed:", error);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signOut: async () => {
          if (supabase?.auth?.signOut) {
            await supabase.auth.signOut();
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
