import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL =
	process.env.INTEGRATION_DATABASE_URL || 'postgres://admin:password@127.0.0.1:5432/main_db';
process.env.RUNNING_IN_DOCKER = process.env.RUNNING_IN_DOCKER || 'false';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.integration.test.ts', 'tests/integration/**/*.test.ts'],
		exclude: ['node_modules/**', '.svelte-kit/**', 'tests/e2e/**'],
		setupFiles: ['tests/vitest.integration.setup.ts'],
		coverage: {
			enabled: false
		}
	}
});
