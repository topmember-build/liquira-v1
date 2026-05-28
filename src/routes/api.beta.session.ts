import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client";

const Body = z.object({
  sessionToken: z.string().min(1),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/beta/session")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const data = Body.parse(await request.json());

          const { data: sessionData, error } = await supabaseAdmin
            .from("beta_sessions")
            .select("*")
            .eq("session_token", data.sessionToken)
            .single();

          if (error || !sessionData) {
            return new Response(
              JSON.stringify({ success: false, error: "Invalid beta session" }),
              {
                status: 401,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          if (sessionData.expires_at && new Date(sessionData.expires_at) < new Date()) {
            return new Response(
              JSON.stringify({ success: false, error: "Beta session has expired" }),
              {
                status: 401,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              email: sessionData.email,
              inviteCode: sessionData.invite_code,
              expiresAt: sessionData.expires_at,
            }),
            {
              status: 200,
              headers: {
                ...CORS,
                "Content-Type": "application/json",
              },
            },
          );
        } catch (error) {
          console.error("Beta session error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Invalid request" }),
            {
              status: 400,
              headers: {
                ...CORS,
                "Content-Type": "application/json",
              },
            },
          );
        }
      },
    },
  },
});
