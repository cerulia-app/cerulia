// Temporary harness bootstrap check. Delete this file after AppView route behavior E2E exists.
import { expect, test } from "@playwright/test";
import { createApiContext, expectAppviewRoot, readRequiredEnv } from "../support";

const apiBaseUrl = readRequiredEnv("CERULIA_E2E_API_BASE_URL");
const apiPublicBaseUrl = readRequiredEnv("CERULIA_E2E_API_PUBLIC_BASE_URL");

test("AppView built server returns the root page in OAuth suite", async ({ page }) => {
	await expectAppviewRoot(page);
});

test("OAuth metadata routes are exposed", async () => {
	const api = await createApiContext(apiBaseUrl);

	const metadataResponse = await api.get("/client-metadata.json");
	expect(metadataResponse.status()).toBe(200);
	expect(await metadataResponse.json()).toMatchObject({
		client_id: `${apiPublicBaseUrl}/client-metadata.json`,
		jwks_uri: `${apiPublicBaseUrl}/jwks.json`,
	});

	const jwksResponse = await api.get("/jwks.json");
	expect(jwksResponse.status()).toBe(200);
	const jwks = await jwksResponse.json();
	expect(Array.isArray(jwks.keys)).toBe(true);
	expect(jwks.keys.length).toBeGreaterThan(0);

	await api.dispose();
});

test("OAuth session route returns an anonymous session before login", async () => {
	const api = await createApiContext(apiBaseUrl);

	const sessionResponse = await api.get("/oauth/session");
	expect(sessionResponse.status()).toBe(200);
	expect(await sessionResponse.json()).toEqual({
		did: null,
		scopes: [],
	});

	const loginResponse = await api.get("/oauth/login");
	expect(loginResponse.status()).toBe(400);
	expect(await loginResponse.json()).toEqual({
		error: "InvalidRequest",
		message: "identifier is required",
	});

	await api.dispose();
});