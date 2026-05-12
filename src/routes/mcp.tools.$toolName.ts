/**
 * MCP Bridge Route: Disabled (Fireblocks removed)
 * Endpoint: POST /mcp/tools/{toolName}
 * 
 * MCP tools have been disabled as Fireblocks integration is removed.
 * Dynamic Labs embedded wallets now handle wallet management.
 */

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/mcp/tools/$toolName")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),

      POST: async () => {
        return Response.json(
          {
            success: false,
            error: "MCP tools disabled - Fireblocks integration removed. Use Dynamic Labs embedded wallets instead.",
          },
          { status: 501, headers: CORS }
        );
      },

      GET: async () => {
        return Response.json(
          {
            status: "disabled",
            message: "MCP tools disabled - Fireblocks integration removed",
            note: "Dynamic Labs embedded wallets now handle wallet management",
            tools: [],
            schemas: {},
          },
          { headers: CORS }
        );
      },
    },
  },
});
