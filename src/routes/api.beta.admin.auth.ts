import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  secret: z.string().min(1),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-secret",
};

const getAdminSecret = () => {
  return process.env.BETA_ADMIN_SECRET || process.env.VITE_BETA_ADMIN_SECRET || "";
};

export const Route = createFileRoute("/api/beta/admin/auth")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const data = Body.parse(await request.json());
          const expectedSecret = getAdminSecret();

          if (!expectedSecret) {
            return new Response(
              JSON.stringify({ success: false, error: "Admin authentication is not configured." }),
              {
                status: 500,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          if (data.secret !== expectedSecret) {
            return new Response(
              JSON.stringify({ success: false, error: "Invalid admin secret" }),
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
            JSON.stringify({ success: true }),
            {
              status: 200,
              headers: {
                ...CORS,
                "Content-Type": "application/json",
              },
            },
          );
        } catch (error) {
          console.error("Admin auth error:", error);
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
