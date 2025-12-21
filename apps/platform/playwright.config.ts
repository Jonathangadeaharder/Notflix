import { type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
    timeout: 60000,
    webServer: {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: true,
    },
    testDir: 'tests',
    testMatch: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.js', '**/*.spec.js'],
    use: {
        baseURL: 'http://localhost:5173'
    }
};

export default config;