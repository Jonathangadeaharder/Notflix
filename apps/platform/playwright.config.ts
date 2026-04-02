import { type PlaywrightTestConfig } from "@playwright/test";

const CI_RETRIES = 2;

const config: PlaywrightTestConfig = {
  timeout: 600000, // 10 min for large video processing
  retries: process.env.CI ? CI_RETRIES : 0,

  testDir: "tests",
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
