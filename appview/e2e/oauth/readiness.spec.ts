import { expect, test } from "@playwright/test";
import { readRequiredEnv } from "../support";

const appviewBaseUrl = readRequiredEnv("CERULIA_E2E_APPVIEW_BASE_URL");

test("AppView oauth-session readiness route resolves the OAuth session payload through the server layer", async ({ request }) => {
	const response = await request.get(`${appviewBaseUrl}/__e2e__/readiness/oauth-session`);
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({
		did: null,
		scopes: [],
		mirroredSessionPresent: false,
	});
});