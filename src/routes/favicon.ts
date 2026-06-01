import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/favicon")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204 }),
      GET: async () => new Response(null, { status: 204 }),
    },
  },
});
