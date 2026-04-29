import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.integration.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['node_modules/**', '.svelte-kit/**', 'tests/e2e/**'],
    globalSetup: ['tests/vitest.integration.setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      enabled: false,
    },
  },
});
