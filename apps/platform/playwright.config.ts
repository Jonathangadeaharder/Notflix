import type { PlaywrightTestConfig } from '@playwright/test';

process.env.PLAYWRIGHT_TEST = 'true';

const MOCK_AI_PORT = '8001';
const E2E_SERVER_TIMEOUT_SEC = 120;
const MS_PER_SEC = 1000;
const CI_RETRIES = 1;

const config: PlaywrightTestConfig = {
  timeout: 60000,
  retries: process.env.CI ? CI_RETRIES : 0,
  workers: 1,

  testDir: 'tests/e2e',
  testMatch: ['**/*.spec.ts', '**/*.spec.js'],

  globalSetup: './tests/e2e/seed.ts',
  globalTeardown: './tests/e2e/teardown.ts',

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  // Reporter configuration
  reporter: process.env.CI ? 'github' : 'list',

  webServer: [
    {
      // Mock AI service — lightweight Node server with canned responses
      command: `node tests/e2e/mock-ai-service.js ${MOCK_AI_PORT}`,
      port: Number(MOCK_AI_PORT),
      reuseExistingServer: false,
      timeout: 10_000,
    },
    {
      command: 'pnpm run test:e2e:server',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: E2E_SERVER_TIMEOUT_SEC * MS_PER_SEC,
      env: {
        ...process.env,
        PORT: '5173',
        ORIGIN: 'http://localhost:5173',
        PLAYWRIGHT_TEST: 'true',
        PUBLIC_PLAYWRIGHT_TEST: 'true',
        AI_SERVICE_URL: `http://127.0.0.1:${MOCK_AI_PORT}`,
        DATABASE_URL:
          process.env.E2E_DATABASE_URL ||
          'postgres://postgres:password@127.0.0.1:5432/notflix_e2e',
      },
    },
  ],
};

export default config;
