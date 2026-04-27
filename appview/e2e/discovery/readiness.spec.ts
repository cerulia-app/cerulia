import { expect, test } from "@playwright/test";
import { ingestProjectionRepo, seedScenarioFixture } from "../fixtures";
import { readRequiredEnv, waitFor } from "../support";

const apiBaseUrl = readRequiredEnv("CERULIA_E2E_API_BASE_URL");
const appviewBaseUrl = readRequiredEnv("CERULIA_E2E_APPVIEW_BASE_URL");
const projectionBaseUrl = readRequiredEnv("CERULIA_E2E_PROJECTION_BASE_URL");
const projectionIngestToken = readRequiredEnv(
	"CERULIA_E2E_PROJECTION_INTERNAL_INGEST_TOKEN",
);

test("AppView scenario-registry readiness route resolves projection data through the server layer", async ({
	request,
}) => {
	const fixture = await seedScenarioFixture({
		apiBaseUrl,
		title: "AppView Discovery Scenario",
	});
	await ingestProjectionRepo({
		projectionBaseUrl,
		token: projectionIngestToken,
		repoDid: fixture.did,
	});

	let payload: { items?: Array<{ title: string; scenarioRef: string }> } = {};
	await waitFor(async () => {
		const response = await request.get(
			`${appviewBaseUrl}/__e2e__/readiness/scenario-registry?rulesetNsid=${encodeURIComponent(fixture.rulesetNsid)}`,
		);
		if (response.status() !== 200) {
			return false;
		}

		payload = await response.json();
		return Boolean(
			payload.items?.some((item) => item.scenarioRef === fixture.scenarioRef),
		);
	});

	expect(payload.items).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				scenarioRef: fixture.scenarioRef,
				title: fixture.title,
			}),
		]),
	);
});
