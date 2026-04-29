import { defineConfig } from '@playwright/test';

const env =
	(
		globalThis as typeof globalThis & {
			process?: { env?: Record<string, string | undefined> };
		}
	).process?.env ?? {};

const baseURL = env.CERULIA_E2E_APPVIEW_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
	testDir: '.',
	timeout: 30_000,
	expect: {
		timeout: 5_000
	},
	fullyParallel: false,
	workers: 1,
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
	use: {
		baseURL,
		trace: 'on-first-retry',
		headless: true
	}
});
