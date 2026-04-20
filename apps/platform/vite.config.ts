import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/vitest.setup.ts"],
    exclude: [
      "tests/e2e/**",
      "tests/integration/**",
      "node_modules/**",
      ".stryker-tmp/**",
      "**/*.integration.test.ts",
      "**/*.spec.ts",
    ],
  },
  resolve: {
    // Always resolve 'browser' exports so server-only Node.js modules (e.g.
    // node:async_hooks from svelte/internal/server) are never pulled into the
    // client bundle.  Without this, `vite build` picks the node export-condition
    // for @sveltejs/kit and svelte, silently breaking client-side hydration.
    conditions: ['browser'],
  },
});
