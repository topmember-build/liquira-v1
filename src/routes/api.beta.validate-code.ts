/**
 * POST /api/beta/validate-invite-code
 *
 * Validates a beta invite code and grants access
 * - Checks if code exists and is active
 * - Validates expiration date
 * - Checks usage limits
 * - Creates beta session
 * - Returns session token
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const Body = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/beta/validate-code")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const data = Body.parse(await request.json());

          // Query Supabase for the code
          const { data: codeData, error: codeError } = await supabase
            .from("beta_access_codes")
            .select("*")
            .eq("code", data.code)
            .single();

          if (codeError || !codeData) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid invite code",
              }),
              {
                status: 400,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          // Check if code is active
          if (!codeData.active) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "This invite code has been deactivated",
              }),
              {
                status: 400,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          // Check if code is expired
          if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "This invite code has expired",
              }),
              {
                status: 400,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          // Check uses remaining
          if (
            !codeData.unlimited_uses &&
            codeData.uses_remaining !== null &&
            codeData.uses_remaining <= 0
          ) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "This invite code has reached its usage limit",
              }),
              {
                status: 400,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          // Check if user already has access
          const { data: existingUser, error: existingUserError } = await supabase
            .from("beta_users")
            .select("*")
            .eq("email", data.email)
            .single();

          if (existingUserError && existingUserError.code !== "PGRST116") {
            console.error("Error checking existing beta user:", existingUserError);
            return new Response(
              JSON.stringify({
                success: false,
                error: "Failed to verify access",
              }),
              {
                status: 500,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          const isExistingAccess = !!existingUser?.access_granted;
          const isSameInviteCode = existingUser?.invite_code === data.code;

          if (isExistingAccess && !isSameInviteCode) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "This email already has beta access with a different invite code",
              }),
              {
                status: 400,
                headers: {
                  ...CORS,
                  "Content-Type": "application/json",
                },
              },
            );
          }

          // Create or update beta user when access is not already granted
          if (!isExistingAccess) {
            const { error: userError } = await supabase
              .from("beta_users")
              .upsert(
                {
                  email: data.email,
                  invite_code: data.code,
                  access_granted: true,
                },
                { onConflict: "email" },
              );

            if (userError) {
              console.error("Error creating beta user:", userError);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: "Failed to grant access",
                }),
                {
                  status: 500,
                  headers: {
                    ...CORS,
                    "Content-Type": "application/json",
                  },
                },
              );
            }
          }

          // Decrement uses only the first time access is granted
          if (!isExistingAccess) {
            if (!codeData.unlimited_uses && codeData.uses_remaining !== null) {
              const newUsesRemaining = codeData.uses_remaining - 1;
              await supabase
                .from("beta_access_codes")
                .update({
                  uses_remaining: newUsesRemaining,
                  usage_count: (codeData.usage_count || 0) + 1,
                  last_used_at: new Date().toISOString(),
                })
                .eq("id", codeData.id);
            } else if (codeData.unlimited_uses) {
              await supabase
                .from("beta_access_codes")
                .update({
                  usage_count: (codeData.usage_count || 0) + 1,
                  last_used_at: new Date().toISOString(),
                })
                .eq("id", codeData.id);
            }
          }

          // Create session token
          const sessionToken = crypto.getRandomValues(new Uint8Array(32));
          const sessionTokenHex = Array.from(sessionToken)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 365); // 1 year expiration

          const { error: sessionError } = await supabase
            .from("beta_sessions")
            .insert({
              email: data.email,
              session_token: sessionTokenHex,
              invite_code: data.code,
              expires_at: expiresAt.toISOString(),
            });

          if (sessionError) {
            console.error("Error creating session:", sessionError);
            return new Response(
              JSON.stringify({
                success: false,
                error: "Failed to create session",
              }),
              {
                status: 500,
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
              sessionToken: sessionTokenHex,
              email: data.email,
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
          console.error("Validation error:", error);
          return new Response(
            JSON.stringify({
              success: false,
              error:
                error instanceof Error ? error.message : "Validation failed",
            }),
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
