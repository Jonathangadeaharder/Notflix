import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    exclude: ["tests/**", "node_modules/**"],
    setupFiles: ["tests/vitest.setup.ts"],
  },
});
