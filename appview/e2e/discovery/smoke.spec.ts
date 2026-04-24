// Temporary harness bootstrap check. Delete this file after AppView route behavior E2E exists.
import { expect, test } from "@playwright/test";
import { createApiContext, expectAppviewRoot, readRequiredEnv } from "../support";

const projectionBaseUrl = readRequiredEnv("CERULIA_E2E_PROJECTION_BASE_URL");

test("AppView built server returns the root page in Discovery suite", async ({ page }) => {
	await expectAppviewRoot(page);
});

test("projection serves an empty scenario catalog without failing", async () => {
	const projection = await createApiContext(projectionBaseUrl);
	const response = await projection.get(
		"/xrpc/app.cerulia.scenario.list?rulesetNsid=app.cerulia.rules.coc7",
	);
	expect(response.status()).toBe(200);
	const payload = await response.json();
	expect(Array.isArray(payload.items)).toBe(true);
	await projection.dispose();
});

test("projection internal ingest route rejects an invalid token", async () => {
	const projection = await createApiContext(projectionBaseUrl);
	const response = await projection.post("/internal/ingest/repo", {
		data: { repoDid: "did:plc:appview-e2e" },
		headers: {
			"content-type": "application/json",
			authorization: "Bearer wrong-token",
		},
	});
	expect(response.status()).toBe(401);
	expect(await response.json()).toEqual({
		error: "Unauthorized",
		message: "invalid ingest token",
	});
	await projection.dispose();
});