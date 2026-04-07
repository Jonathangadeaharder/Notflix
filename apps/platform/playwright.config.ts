import { type PlaywrightTestConfig } from "@playwright/test";

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

  webServer: {
    command: "pnpm run test:e2e:server",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      PORT: "5173",
      ORIGIN: "http://localhost:5173",
    },
  },
};

export default config;
