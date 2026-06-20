import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

const STORAGE_KEY = "liquira_beta_access_session";

type BetaAccessSession = {
  email: string;
  inviteCode: string;
  sessionToken: string;
  expiresAt: string;
};

type BetaAccessContextType = {
  hasAccess: boolean;
  checkingSession: boolean;
  email?: string;
  inviteCode?: string;
  error?: string | null;
  validateInviteCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  revokeAccess: () => void;
};

const BetaAccessContext = createContext<BetaAccessContextType>({
  hasAccess: false,
  checkingSession: true,
  validateInviteCode: async () => ({ success: false, error: "Beta access unavailable" }),
  revokeAccess: () => {},
});

const isPublicBetaPath = (pathname: string) => {
  return [
    "/",
    "/docs",
    "/login",
    "/beta-access",
    "/auth/callback",
    "/admin/invites",
    "/analytics",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
};

export function BetaAccessProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<BetaAccessSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const hasAccess = useMemo(() => !!session, [session]);

  const validateSession = async (sessionToken: string) => {
    try {
      const response = await fetch("/api/beta/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
      const payload = await response.json();

      if (response.ok && payload.success) {
        const refreshedSession: BetaAccessSession = {
          email: payload.email,
          inviteCode: payload.inviteCode,
          sessionToken,
          expiresAt: payload.expiresAt,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshedSession));
        setSession(refreshedSession);
        return;
      }
    } catch (cause) {
      console.error("Beta access session validation failed", cause);
    }

    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setCheckingSession(false);
      return;
    }

    try {
      const stored = JSON.parse(raw) as BetaAccessSession;
      if (!stored?.sessionToken) {
        throw new Error("Invalid beta access session");
      }

      validateSession(stored.sessionToken).finally(() => setCheckingSession(false));
    } catch (cause) {
      console.error("Failed to load beta access session", cause);
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (checkingSession) return;

    const pathname = location.pathname;
    const isPublicPath = isPublicBetaPath(pathname);

    if (pathname === "/beta-access" && hasAccess) {
      navigate({ to: "/" });
      return;
    }

    if (!isPublicPath && !hasAccess) {
      navigate({ to: "/beta-access" });
    }
  }, [checkingSession, hasAccess, navigate, location.pathname]);

  const validateInviteCode = async (email: string, code: string) => {
    setCheckingSession(true);
    setError(null);

    try {
      const response = await fetch("/api/beta/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const payload = await response.json();

      if (response.ok && payload.success) {
        const newSession: BetaAccessSession = {
          email: payload.email,
          inviteCode: payload.code || code,
          sessionToken: payload.sessionToken,
          expiresAt: payload.expiresAt || new Date(Date.now() + 31536000000).toISOString(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
        return { success: true };
      }

      return { success: false, error: payload.error || "Invalid beta code" };
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : "Network error" };
    } finally {
      setCheckingSession(false);
    }
  };

  const revokeAccess = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return (
    <BetaAccessContext.Provider
      value={{
        hasAccess,
        checkingSession,
        email: session?.email,
        inviteCode: session?.inviteCode,
        error,
        validateInviteCode,
        revokeAccess,
      }}
    >
      {children}
    </BetaAccessContext.Provider>
  );
}

export function useBetaAccess() {
  return useContext(BetaAccessContext);
}
