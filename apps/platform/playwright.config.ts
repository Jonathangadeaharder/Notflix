import { type PlaywrightTestConfig } from "@playwright/test";

const MOCK_AI_PORT = "8001";

const config: PlaywrightTestConfig = {
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  testDir: "tests/e2e",
  testMatch: ["**/*.spec.ts", "**/*.spec.js"],

  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  // Reporter configuration
  reporter: process.env.CI ? "github" : "list",

  webServer: [
    {
      // Mock AI service — lightweight Node server with canned responses
      command: `node tests/e2e/mock-ai-service.js ${MOCK_AI_PORT}`,
      port: Number(MOCK_AI_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 10_000,
    },
    {
      command: "pnpm run test:e2e:server",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        ...process.env,
        PORT: "5173",
        ORIGIN: "http://localhost:5173",
        PLAYWRIGHT_TEST: "true",
        AI_SERVICE_URL: `http://127.0.0.1:${MOCK_AI_PORT}`,
        DATABASE_URL:
          process.env.E2E_DATABASE_URL ||
          "postgres://postgres:password@127.0.0.1:5432/postgres",
      },
    },
  ],
};

export default config;
