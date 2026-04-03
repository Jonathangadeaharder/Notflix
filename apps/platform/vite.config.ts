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
      "**/*.integration.test.ts",
      "**/*.spec.ts",
    ],
  },
  resolve: {
    conditions: process.env.VITEST ? ['browser'] : [],
  },
});
