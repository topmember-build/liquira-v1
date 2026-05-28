import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client";

const PostBody = z.object({
  quantity: z.number().min(1).max(50).optional().default(1),
  code: z.string().min(1).optional(),
  usesRemaining: z.number().min(0).optional(),
  unlimitedUses: z.boolean().optional().default(false),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
});

const PatchBody = z.object({
  id: z.string().uuid(),
  active: z.boolean().optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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

const generateInviteCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 9 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};

export const Route = createFileRoute("/api/beta/admin/codes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const authorizationError = authorize(request);
        if (authorizationError) return authorizationError;

        const { data, error } = await supabaseAdmin
          .from("beta_access_codes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          console.error("Failed to fetch beta codes", error);
          return new Response(
            JSON.stringify({ success: false, error: "Unable to fetch invite codes" }),
            {
              status: 500,
              headers: { ...CORS, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({ success: true, codes: data || [] }),
          {
            status: 200,
            headers: { ...CORS, "Content-Type": "application/json" },
          },
        );
      },
      POST: async ({ request }) => {
        const authorizationError = authorize(request);
        if (authorizationError) return authorizationError;

        try {
          const body = PostBody.parse(await request.json());
          const quantity = body.quantity || 1;
          const codes = Array.from({ length: quantity }, (_, index) => {
            if (body.code && quantity === 1) {
              return body.code;
            }
            return generateInviteCode();
          });

          const rows = codes.map((code) => ({
            code,
            active: true,
            unlimited_uses: body.unlimitedUses,
            uses_remaining: body.unlimitedUses ? null : body.usesRemaining ?? 1,
            usage_count: 0,
            expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
            created_by: "admin",
            notes: body.notes ?? null,
          }));

          const { data, error } = await supabaseAdmin.from("beta_access_codes").insert(rows);
          if (error) {
            console.error("Failed to create beta codes", error);
            return new Response(
              JSON.stringify({ success: false, error: "Unable to create invite codes" }),
              {
                status: 500,
                headers: { ...CORS, "Content-Type": "application/json" },
              },
            );
          }

          return new Response(
            JSON.stringify({ success: true, codes: data || [] }),
            {
              status: 200,
              headers: { ...CORS, "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          console.error("Admin code creation error", error);
          return new Response(
            JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Invalid request" }),
            {
              status: 400,
              headers: { ...CORS, "Content-Type": "application/json" },
            },
          );
        }
      },
      PATCH: async ({ request }) => {
        const authorizationError = authorize(request);
        if (authorizationError) return authorizationError;

        try {
          const body = PatchBody.parse(await request.json());
          const updates: Record<string, unknown> = {};

          if (typeof body.active === "boolean") {
            updates.active = body.active;
          }

          const { data, error } = await supabaseAdmin
            .from("beta_access_codes")
            .update(updates)
            .eq("id", body.id)
            .select("*");

          if (error) {
            console.error("Failed to update beta code", error);
            return new Response(
              JSON.stringify({ success: false, error: "Unable to update invite code" }),
              {
                status: 500,
                headers: { ...CORS, "Content-Type": "application/json" },
              },
            );
          }

          return new Response(
            JSON.stringify({ success: true, codes: data || [] }),
            {
              status: 200,
              headers: { ...CORS, "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          console.error("Admin code patch error", error);
          return new Response(
            JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Invalid request" }),
            {
              status: 400,
              headers: { ...CORS, "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
