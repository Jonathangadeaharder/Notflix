import type { PlaywrightTestConfig } from '@playwright/test';

process.env.PLAYWRIGHT_TEST = 'true';

const MOCK_AI_PORT = '8001';
const AUTH_PROXY_PORT = '8002';
const E2E_SERVER_TIMEOUT_SEC = 120;
const MS_PER_SEC = 1000;
const CI_RETRIES = 1;

const SUPABASE_ANON_KEY =
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7kyqd6RoFh2jJIpMKpGVhAzCJtJFvFo4uQs';
const SUPABASE_URL = `http://localhost:${AUTH_PROXY_PORT}`;

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
      command: `node tests/e2e/mock-ai-service.js ${MOCK_AI_PORT}`,
      port: Number(MOCK_AI_PORT),
      reuseExistingServer: false,
      timeout: 10_000,
    },
    {
      command: `node tests/e2e/auth-proxy.js ${AUTH_PROXY_PORT}`,
      port: Number(AUTH_PROXY_PORT),
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
        SUPABASE_URL: SUPABASE_URL,
        PUBLIC_SUPABASE_URL: SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
        JWT_SECRET:
          process.env.JWT_SECRET ||
          'your-super-secret-jwt-token-with-at-least-32-characters',
      },
    },
  ],
};

export default config;
