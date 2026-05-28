import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-secret",
};

const getAdminSecret = () => process.env.BETA_ADMIN_SECRET || process.env.VITE_BETA_ADMIN_SECRET || "";

const authorize = (request: Request) => {
  const token = request.headers.get("x-admin-secret");
  const expected = getAdminSecret();

  if (!expected) {
    return new Response(JSON.stringify({ success: false, error: "Admin API is not configured." }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (!token || token !== expected) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return null;
};

export const Route = createFileRoute("/api/beta/admin/users")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const authorizationError = authorize(request);
        if (authorizationError) return authorizationError;

        const { data, error } = await supabaseAdmin
          .from("beta_users")
          .select("id,email,wallet_address,invite_code,access_granted,created_at,updated_at")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          console.error("Failed to fetch beta users", error);
          return new Response(
            JSON.stringify({ success: false, error: "Unable to fetch beta users" }),
            {
              status: 500,
              headers: { ...CORS, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({ success: true, users: data || [] }),
          {
            status: 200,
            headers: { ...CORS, "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
