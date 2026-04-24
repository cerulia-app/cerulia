import { expect, test } from "@playwright/test";
import {
	seedCharacterHomeFixture,
	setAppviewViewer,
} from "../fixtures";
import { readRequiredEnv } from "../support";

const apiBaseUrl = readRequiredEnv("CERULIA_E2E_API_BASE_URL");
const appviewBaseUrl = readRequiredEnv("CERULIA_E2E_APPVIEW_BASE_URL");

test("AppView owner-home readiness route rejects anonymous access", async ({ request }) => {
	const response = await request.get(`${appviewBaseUrl}/__e2e__/readiness/owner-home`);
	expect(response.status()).toBe(401);
	await expect(response.json()).resolves.toMatchObject({
		error: "Unauthorized",
	});
});

test("AppView owner-home readiness route resolves owner data through the server layer", async ({ page }) => {
	const fixture = await seedCharacterHomeFixture({
		apiBaseUrl,
		displayName: "AppView Harness Character",
	});
	await setAppviewViewer(page, appviewBaseUrl, fixture.did);

	const response = await page.goto("/__e2e__/readiness/owner-home");
	expect(response).not.toBeNull();
	expect(response?.status()).toBe(200);

	const rawBody = await page.locator("body").textContent();
	const payload = JSON.parse(rawBody ?? "{}");
	expect(payload.ownerDid).toBe(fixture.did);
	expect(payload.branches).toHaveLength(1);
	expect(payload.branches[0].branchRef).toBe(fixture.branchRef);
	await expect(page.locator("body")).toContainText("AppView Harness Character");
});