import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy } from "react";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = lazy(() => import("@/components/auth/LoginPage").then(module => ({ default: module.LoginPage })));

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