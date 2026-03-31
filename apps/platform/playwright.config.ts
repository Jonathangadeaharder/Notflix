import { type PlaywrightTestConfig } from "@playwright/test";

const CI_RETRIES = 2;

const config: PlaywrightTestConfig = {
  timeout: 120000, // 2 min for video processing
  retries: process.env.CI ? CI_RETRIES : 0,

  webServer: {
    command: "pnpm run test:e2e:server",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      PLAYWRIGHT_TEST: "true",
      TEST_GAME_INTERVAL: "0.1",
    },
  },

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
};

export default config;
