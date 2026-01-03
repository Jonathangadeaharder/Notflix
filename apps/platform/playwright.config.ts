import { type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
    timeout: 120000, // 2 min for video processing
    retries: process.env.CI ? 2 : 0,

    webServer: {
        command: 'npm run test:e2e:server',
        port: 5173,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
            PLAYWRIGHT_TEST: 'true',
            TEST_GAME_INTERVAL: '0.1'
        }
    },

    testDir: 'tests',
    testMatch: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.js', '**/*.spec.js'],

    use: {
        baseURL: 'http://localhost:5173',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure'
    },

    // Reporter configuration
    reporter: process.env.CI ? 'github' : 'list'
};

export default config;