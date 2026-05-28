import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    // Lovable OAuth helper sets the session before redirect lands here, but in
    // case the URL contains a code/hash we wait briefly for state to settle.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      navigate({ to: data.session ? "/account" : "/login" });
    }, 200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="font-mono text-[12px] text-muted-foreground">Signing you in…</div>
    </div>
  );
}
