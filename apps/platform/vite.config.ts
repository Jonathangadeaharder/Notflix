import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: "0.0.0.0",
    watch: {
      usePolling: true,
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/api/**/*.test.ts"],
    exclude: ["node_modules/**", "src/**/*.integration.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/server/services/**/*.ts",
        "src/lib/server/utils/**/*.ts",
        "src/lib/server/adapters/**/*.ts",
        "src/lib/upload-pipeline.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.integration.test.ts", "**/*.d.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      reporter: ["text", "text-summary"],
    },
  },
});
