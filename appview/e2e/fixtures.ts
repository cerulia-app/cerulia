import {
	expect,
	request,
	type APIRequestContext,
	type Page,
} from "@playwright/test";
import {
	CERULIA_E2E_DID_COOKIE_NAME,
	CERULIA_E2E_READER_SCOPE,
	CERULIA_E2E_SCOPES_COOKIE_NAME,
	CERULIA_E2E_WRITER_SCOPE,
} from "../src/lib/cerulia-e2e";

export const APPVIEW_E2E_OWNER_DID = "did:plc:appview-e2e-owner";
export const APPVIEW_E2E_OWNER_SCOPES = [
	CERULIA_E2E_READER_SCOPE,
	CERULIA_E2E_WRITER_SCOPE,
];

function createFixtureDid(prefix: string) {
	return `did:plc:${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createAuthorizedApiContext(
	apiBaseUrl: string,
	did = APPVIEW_E2E_OWNER_DID,
	scopes = APPVIEW_E2E_OWNER_SCOPES,
): Promise<APIRequestContext> {
	return request.newContext({
		baseURL: apiBaseUrl,
		extraHTTPHeaders: {
			accept: "application/json",
			"content-type": "application/json",
			"x-cerulia-did": did,
			"x-cerulia-scopes": scopes.join(","),
		},
	});
}

export async function setAppviewViewer(
	page: Page,
	appviewBaseUrl: string,
	did = APPVIEW_E2E_OWNER_DID,
	scopes = APPVIEW_E2E_OWNER_SCOPES,
) {
	await page.context().addCookies([
		{
			name: CERULIA_E2E_DID_COOKIE_NAME,
			value: did,
			url: appviewBaseUrl,
		},
		{
			name: CERULIA_E2E_SCOPES_COOKIE_NAME,
			value: scopes.join(","),
			url: appviewBaseUrl,
		},
	]);
}

export async function seedCharacterHomeFixture(options: {
	apiBaseUrl: string;
	did?: string;
	displayName: string;
}) {
	const did = options.did ?? createFixtureDid("appview-e2e-owner");
	const api = await createAuthorizedApiContext(options.apiBaseUrl, did);

	const createSchemaResponse = await api.post(
		"/xrpc/app.cerulia.dev.rule.createSheetSchema",
		{
			data: {
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: `${options.displayName} Schema`,
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
		},
	);
	expect(createSchemaResponse.status()).toBe(200);
	const createSchemaAck = await createSchemaResponse.json();
	const [sheetSchemaRef] = createSchemaAck.emittedRecordRefs as string[];

	const createSheetResponse = await api.post(
		"/xrpc/app.cerulia.dev.character.createSheet",
		{
			data: {
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef,
				displayName: options.displayName,
				stats: {
					power: 70,
				},
				initialBranchVisibility: "public",
			},
		},
	);
	expect(createSheetResponse.status()).toBe(200);
	const createSheetAck = await createSheetResponse.json();
	const [sheetRef, branchRef] = createSheetAck.emittedRecordRefs as string[];

	await api.dispose();

	return {
		did,
		sheetSchemaRef,
		sheetRef,
		branchRef,
	};
}

export async function seedScenarioFixture(options: {
	apiBaseUrl: string;
	did?: string;
	title: string;
	rulesetNsid?: string;
}) {
	const did = options.did ?? createFixtureDid("appview-e2e-scenario-owner");
	const rulesetNsid = options.rulesetNsid ?? "app.cerulia.rules.coc7";
	const api = await createAuthorizedApiContext(options.apiBaseUrl, did);

	const createScenarioResponse = await api.post(
		"/xrpc/app.cerulia.dev.scenario.create",
		{
			data: {
				title: options.title,
				rulesetNsid,
				sourceCitationUri: `https://example.com/scenario/${encodeURIComponent(options.title.toLowerCase().replace(/\s+/g, "-"))}`,
				summary: `${options.title} summary`,
			},
		},
	);
	expect(createScenarioResponse.status()).toBe(200);
	const createScenarioAck = await createScenarioResponse.json();
	const [scenarioRef] = createScenarioAck.emittedRecordRefs as string[];

	await api.dispose();

	return {
		did,
		rulesetNsid,
		scenarioRef,
		title: options.title,
	};
}

export async function ingestProjectionRepo(options: {
	projectionBaseUrl: string;
	token: string;
	repoDid: string;
}) {
	const projection = await request.newContext({
		baseURL: options.projectionBaseUrl,
		extraHTTPHeaders: {
			accept: "application/json",
			"content-type": "application/json",
			authorization: `Bearer ${options.token}`,
		},
	});

	const response = await projection.post("/internal/ingest/repo", {
		data: {
			repoDid: options.repoDid,
		},
	});
	expect(response.status()).toBe(200);
	await projection.dispose();
}
