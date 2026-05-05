import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Header } from "@/components/site/Header";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/account",
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: search.redirect });
  },
  head: () => ({
    meta: [
      { title: "Sign in - Liquira" },
      { name: "description", content: "Sign in to manage saved routes, swap history, and preferences." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: search.redirect });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/account" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + search.redirect,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setBusy(false);
        return;
      }
      if (result.redirected) return; // browser navigates away
      navigate({ to: search.redirect });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto flex max-w-[420px] flex-col px-6 py-16">
        <div className="mb-6 text-center">
          <div className="text-mono-label" style={{ fontSize: 10 }}>
            ACCOUNT · {mode === "signin" ? "SIGN IN" : "CREATE"}
          </div>
          <h1 className="mt-2 font-serif-italic text-4xl">
            {mode === "signin" ? "Welcome back." : "Create your account."}
          </h1>
          <p className="mt-2 font-mono text-[12px] text-muted-foreground">
            Save routes · Swap history · Preferences · Wallets
          </p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-1 font-mono text-[12px] uppercase tracking-widest text-foreground hover:bg-surface-2 disabled:opacity-50"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            or
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-mono-label" style={{ fontSize: 10 }}>
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-mono-label" style={{ fontSize: 10 }}>
              PASSWORD
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface-1 px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-10 w-full rounded-md bg-primary font-mono text-[12px] font-semibold uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 text-center font-mono text-[12px] text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "Don't have an account? Create one →"
            : "Already have an account? Sign in →"}
        </button>

        <Link
          to="/"
          className="mt-8 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1A6.97 6.97 0 0 1 5.46 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
