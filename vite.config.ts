// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        {
          find: /^@turnkey\/api-key-stamper\/dist\/nodecrypto\.mjs$/,
          replacement: path.resolve(
            __dirname,
            "node_modules/@turnkey/api-key-stamper/dist/purejs.mjs",
          ),
        },
      ],
    },
    build: {
      // Prevent Vite from trying to remove the `dist` output directory.
      // This works around permission/lock issues on Windows when `.wrangler` is held open.
      emptyOutDir: false,
      rollupOptions: {
        output: {
          // Let Vite/Rollup auto-split wallet dependencies to avoid manual chunk cycles.
        },
      },
      chunkSizeWarningLimit: 1200,
    },
  },
});
