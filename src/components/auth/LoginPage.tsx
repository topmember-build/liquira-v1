import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Header } from "@/components/site/Header";

export function LoginPage() {
  const redirect =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect") ?? "/account"
      : "/account";
  const navigate = useNavigate();
  const {
    user: dynamicUser,
    primaryWallet,
    sdkHasLoaded,
    setShowAuthFlow,
  } = useDynamicContext();
  const hasSupabaseAuth = typeof supabase.auth?.signInWithPassword === "function";
  const hasSupabaseSignup = typeof supabase.auth?.signUp === "function";
  const hasSupabaseOAuth = typeof supabase.auth?.signInWithOAuth === "function";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (dynamicUser && primaryWallet) {
      navigate({ to: redirect });
    }
  }, [dynamicUser, primaryWallet, navigate, redirect]);

  const handleDynamicSignIn = () => {
    if (!sdkHasLoaded || !setShowAuthFlow) return;
    setShowAuthFlow(true);
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      if (!hasSupabaseOAuth) {
        throw new Error("OAuth is not configured");
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!hasSupabaseAuth || !hasSupabaseSignup) {
        const result = await lovable.auth.signInWithOAuth("lovable", {
          redirect_uri: window.location.origin + "/auth/callback",
        });
        if (result.error) throw result.error;
        if (!result.redirected) {
          navigate({ to: search.redirect });
        }
        return;
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: redirect });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/account" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground">
              {mode === "signin" ? "Sign in" : "Sign up"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {mode === "signin"
                ? "Welcome back to Liquira"
                : "Create your account to get started"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDynamicSignIn}
            disabled={busy || !sdkHasLoaded}
            className="w-full rounded-md border border-border bg-surface-1 px-4 py-2 font-medium text-foreground hover:bg-surface-2 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>Create or connect a Dynamic Wallet</span>
          </button>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Embedded Dynamic wallet creation is available directly in Liquira; WalletConnect is not required.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="w-full rounded-md border border-border bg-surface-1 px-4 py-2 font-medium text-foreground hover:bg-surface-2 focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none disabled:opacity-50"
            >
              {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-sm text-primary hover:underline"
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}