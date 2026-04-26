import {
	expect,
	request,
	type APIRequestContext,
	type Page,
} from "@playwright/test";

const env =
	(
		globalThis as typeof globalThis & {
			process?: { env?: Record<string, string | undefined> };
		}
	).process?.env ?? {};

export function readRequiredEnv(name: string): string {
	const value = env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export async function expectAppviewRoot(page: Page) {
	const response = await page.goto("/");
	expect(response).not.toBeNull();
	expect(response?.ok()).toBeTruthy();
	await expect(page.locator("main")).toHaveCount(1);
}

export async function createApiContext(
	baseURL: string,
): Promise<APIRequestContext> {
	return request.newContext({
		baseURL,
		extraHTTPHeaders: {
			accept: "application/json",
		},
	});
}

export async function waitFor(
	asyncCheck: () => Promise<boolean>,
	timeoutMs = 5_000,
) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await asyncCheck()) {
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	throw new Error(`Timed out after ${timeoutMs}ms`);
}
