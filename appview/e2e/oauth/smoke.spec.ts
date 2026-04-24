import { expect, test } from "@playwright/test";
import { createApiContext, expectAppviewRoot, readRequiredEnv } from "../support";

const appviewPublicBaseUrl = readRequiredEnv("CERULIA_E2E_APPVIEW_PUBLIC_BASE_URL");
const appviewBaseUrl = readRequiredEnv("CERULIA_E2E_APPVIEW_BASE_URL");

test("AppView built server returns the root page in OAuth suite", async ({ page }) => {
	await expectAppviewRoot(page);
});

test("OAuth metadata routes are exposed from appview", async ({ request }) => {
	const metadataResponse = await request.get(`${appviewBaseUrl}/client-metadata.json`);
	expect(metadataResponse.status()).toBe(200);
	expect(await metadataResponse.json()).toMatchObject({
		client_id: `${appviewPublicBaseUrl}/client-metadata.json`,
		jwks_uri: `${appviewPublicBaseUrl}/jwks.json`,
	});

	const jwksResponse = await request.get(`${appviewBaseUrl}/jwks.json`);
	expect(jwksResponse.status()).toBe(200);
	const jwks = await jwksResponse.json();
	expect(Array.isArray(jwks.keys)).toBe(true);
	expect(jwks.keys.length).toBeGreaterThan(0);
});

test("OAuth session route returns an anonymous session before login", async ({ request }) => {
	const sessionResponse = await request.get(`${appviewBaseUrl}/oauth/session`);
	expect(sessionResponse.status()).toBe(200);
	expect(await sessionResponse.json()).toEqual({
		did: null,
		scopes: [],
	});

	const loginResponse = await request.get(`${appviewBaseUrl}/oauth/login`);
	expect(loginResponse.status()).toBe(400);
	expect(await loginResponse.json()).toEqual({
		error: "InvalidRequest",
		message: "identifier is required",
	});
});


test("OAuth login, callback, session restore, and logout work through the real routes", async ({ request }) => {
	const appview = await createApiContext(appviewBaseUrl);
	try {
		const loginResponse = await appview.get(
			"/oauth/login?identifier=alice.test&returnTo=/oauth/session",
		);
		expect(loginResponse.status()).toBe(200);
		expect(await loginResponse.json()).toEqual({
			did: "did:plc:e2e-oauth",
			scopes: [
				"app.cerulia.dev.authCoreReader",
				"app.cerulia.dev.authCoreWriter",
			],
		});

		const mirroredAfterLogin = await request.get(
			`${appviewBaseUrl}/__e2e__/readiness/oauth-session?did=did:plc:e2e-oauth`,
		);
		expect(mirroredAfterLogin.status()).toBe(200);
		expect(await mirroredAfterLogin.json()).toEqual({
			did: null,
			scopes: [],
			mirroredSessionPresent: true,
		});

		const logoutResponse = await appview.post("/oauth/logout");
		expect(logoutResponse.status()).toBe(200);
		expect(logoutResponse.headers()["set-cookie"] ?? "").toContain(
			"cerulia_session=",
		);

		const postLogoutSession = await appview.get("/oauth/session");
		expect(postLogoutSession.status()).toBe(200);
		expect(await postLogoutSession.json()).toEqual({
			did: null,
			scopes: [],
		});

		const mirroredAfterLogout = await request.get(
			`${appviewBaseUrl}/__e2e__/readiness/oauth-session?did=did:plc:e2e-oauth`,
		);
		expect(mirroredAfterLogout.status()).toBe(200);
		expect(await mirroredAfterLogout.json()).toEqual({
			did: null,
			scopes: [],
			mirroredSessionPresent: false,
		});
	} finally {
		await appview.dispose();
	}
});