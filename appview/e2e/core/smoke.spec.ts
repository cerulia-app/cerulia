// Temporary harness bootstrap check. Delete this file after AppView route behavior E2E exists.
import { expect, test } from "@playwright/test";
import { createApiContext, expectAppviewRoot, readRequiredEnv } from "../support";

const apiBaseUrl = readRequiredEnv("CERULIA_E2E_API_BASE_URL");

test("AppView built server returns the root page", async ({ page }) => {
	await expectAppviewRoot(page);
});

test("API health endpoint is available in Core suite", async () => {
	const api = await createApiContext(apiBaseUrl);
	const response = await api.get("/_health");
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ status: "ok" });
	await api.dispose();
});

test("header auth shim changes writer route from unauthorized to invalid request", async () => {
	const api = await createApiContext(apiBaseUrl);
	const path = "/xrpc/app.cerulia.dev.rule.createSheetSchema";

	const unauthorized = await api.post(path, {
		data: {},
		headers: {
			"content-type": "application/json",
		},
	});
	expect(unauthorized.status()).toBe(401);

	const invalidRequest = await api.post(path, {
		data: {},
		headers: {
			"content-type": "application/json",
			"x-cerulia-did": "did:plc:appview-e2e",
			"x-cerulia-scopes": "app.cerulia.dev.authCoreWriter",
		},
	});
	expect(invalidRequest.status()).toBe(400);
	const payload = await invalidRequest.json();
	expect(payload).toMatchObject({
		error: "InvalidRequest",
	});

	await api.dispose();
});