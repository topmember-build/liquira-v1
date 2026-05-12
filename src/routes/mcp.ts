/**
 * MCP Metadata Route: Discover available tools and capabilities
 * Endpoint: GET /mcp
 * 
 * Returns MCP server capabilities, available tools, and integration status
 */

import { createFileRoute } from "@tanstack/react-router";
import { initMCPServer } from "@/server/mcp-server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),

      GET: async () => {
        try {
          console.log("[MCP] Serving MCP metadata");

          const metadata = await initMCPServer();

          return Response.json(
            {
              status: "ok",
              version: "1.0.0",
              name: "Dynamic Labs MCP",
              description:
                "MCP metadata endpoint (Fireblocks disabled - using Dynamic Labs embedded wallets)",
              capabilities: {
                tools: false,
                resources: false,
                dynamic_wallets: true,
              },
              note: "Fireblocks integration removed. Dynamic Labs embedded wallets now handle wallet management and signing.",
              endpoint: "/mcp/tools/{toolName}",
              tools: Object.keys(metadata.tools),
              resources: Object.keys(metadata.resources),
            },
            { headers: CORS }
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);

          console.error("[MCP] Metadata error:", errorMsg);

          return Response.json(
            {
              status: "error",
              error: errorMsg,
            },
            { status: 500, headers: CORS }
          );
        }
      },
    },
  },
});
