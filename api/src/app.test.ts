import { describe, expect, test } from "bun:test";
import {
	lexicons,
	type AppCeruliaCoreCharacterBranch,
	type AppCeruliaCoreScenario,
	type AppCeruliaCoreSession,
} from "@cerulia/protocol";
import { createApiApp, type ApiAppStore } from "./app.js";
import {
	createSessionAuthResolver,
	resolveHeaderAuthContext,
} from "./auth.js";
import {
	AUTH_SCOPES,
	COLLECTIONS,
	SESSION_COOKIE_NAME,
	SELF_RKEY,
	XRPC_PREFIX,
} from "./constants.js";
import { ApiError } from "./errors.js";
import { paginate } from "./pagination.js";
import { buildAtUri, parseAtUri } from "./refs.js";
import { MemoryRecordStore } from "./store/memory.js";
import type {
	ApplyWritesOptions,
	RecordWrite,
	StoredRecord,
} from "./store/types.js";
import { RecordConflictError, scopeStateTokenEquals } from "./store/types.js";

const DID = "did:plc:alice";

function authHeaders(
	did = DID,
	scopes = [AUTH_SCOPES.reader, AUTH_SCOPES.writer],
): Record<string, string> {
	return {
		"content-type": "application/json",
		"x-cerulia-did": did,
		"x-cerulia-scopes": scopes.join(","),
	};
}

class SupportedMemoryRecordStore
	extends MemoryRecordStore
	implements ApiAppStore {
	async applyWrites(writes: RecordWrite[], options: ApplyWritesOptions) {
		const currentScopeState = await super.getScopeStateToken(
			options.expectedScopeState.repoDid,
			Object.keys(options.expectedScopeState.collectionVersions ?? {}),
		);
		if (!scopeStateTokenEquals(currentScopeState, options.expectedScopeState)) {
			throw new RecordConflictError();
		}

		for (const write of writes) {
			if (write.kind === "create") {
				await super.createRecord(write.draft);
				continue;
			}

			await super.updateRecord(write.draft);
		}
	}
}

class InterleavingMemoryRecordStore extends SupportedMemoryRecordStore {
	private readonly listCallCounts = new Map<string, number>();
	private readonly listHooks = new Map<
		string,
		Array<{ callNumber: number; fired: boolean; action: () => void }>
	>();
	private readonly applyWritesCallCounts = new Map<string, number>();
	private readonly applyWritesHooks = new Map<
		string,
		Array<{ callNumber: number; fired: boolean; action: () => void }>
	>();

	onListCall(
		collection: string,
		repoDid: string | undefined,
		callNumber: number,
		action: () => void,
	) {
		const key = `${collection}:${repoDid ?? "*"}`;
		const hooks = this.listHooks.get(key) ?? [];
		hooks.push({ callNumber, fired: false, action });
		this.listHooks.set(key, hooks);
	}

	onApplyWritesCall(
		repoDid: string,
		callNumber: number,
		action: () => void,
	) {
		const hooks = this.applyWritesHooks.get(repoDid) ?? [];
		hooks.push({ callNumber, fired: false, action });
		this.applyWritesHooks.set(repoDid, hooks);
	}

	override async listRecords<T>(
		collection: string,
		repoDid?: string,
	) {
		const key = `${collection}:${repoDid ?? "*"}`;
		const nextCallNumber = (this.listCallCounts.get(key) ?? 0) + 1;
		this.listCallCounts.set(key, nextCallNumber);

		for (const hook of this.listHooks.get(key) ?? []) {
			if (!hook.fired && hook.callNumber === nextCallNumber) {
				hook.fired = true;
				hook.action();
			}
		}

		return super.listRecords<T>(collection, repoDid);
	}

	override async applyWrites(writes: RecordWrite[], options: ApplyWritesOptions) {
		const repoDid = options.expectedScopeState.repoDid;
		const nextCallNumber = (this.applyWritesCallCounts.get(repoDid) ?? 0) + 1;
		this.applyWritesCallCounts.set(repoDid, nextCallNumber);

		for (const hook of this.applyWritesHooks.get(repoDid) ?? []) {
			if (!hook.fired && hook.callNumber === nextCallNumber) {
				hook.fired = true;
				hook.action();
			}
		}

		return super.applyWrites(writes, options);
	}
}

class FailingAtomicMemoryRecordStore extends SupportedMemoryRecordStore {
	private failurePlan: {
		repoDid: string;
		afterAppliedWrite: number;
	} | null = null;

	failNextApplyWrites(repoDid: string, afterAppliedWrite: number) {
		this.failurePlan = {
			repoDid,
			afterAppliedWrite,
		};
	}

	private async restoreRecord(previous: StoredRecord<unknown>) {
		const current = await super.getRecord(previous.uri);
		if (current) {
			await super.updateRecord({
				repoDid: previous.repoDid,
				collection: previous.collection,
				rkey: previous.rkey,
				value: previous.value,
				createdAt: previous.createdAt,
				updatedAt: previous.updatedAt,
			});
			return;
		}

		await super.createRecord({
			repoDid: previous.repoDid,
			collection: previous.collection,
			rkey: previous.rkey,
			value: previous.value,
			createdAt: previous.createdAt,
			updatedAt: previous.updatedAt,
		});
	}

	override async applyWrites(writes: RecordWrite[], options: ApplyWritesOptions) {
		const currentScopeState = await super.getScopeStateToken(
			options.expectedScopeState.repoDid,
			Object.keys(options.expectedScopeState.collectionVersions ?? {}),
		);
		if (!scopeStateTokenEquals(currentScopeState, options.expectedScopeState)) {
			throw new RecordConflictError();
		}

		const previousRecords = new Map<string, StoredRecord<unknown> | null>();
		for (const write of writes) {
			const uri = buildAtUri(
				write.draft.repoDid,
				write.draft.collection,
				write.draft.rkey,
			);
			previousRecords.set(uri, await super.getRecord(uri));
		}

		let appliedWriteCount = 0;

		try {
			for (const write of writes) {
				if (write.kind === "create") {
					await super.createRecord(write.draft);
				} else {
					await super.updateRecord(write.draft);
				}

				appliedWriteCount += 1;
				if (
					this.failurePlan &&
					this.failurePlan.repoDid === options.expectedScopeState.repoDid &&
					this.failurePlan.afterAppliedWrite === appliedWriteCount
				) {
					this.failurePlan = null;
					throw new Error("Injected applyWrites failure");
				}
			}
		} catch (error) {
			for (const [uri, previous] of previousRecords) {
				if (previous) {
					await this.restoreRecord(previous);
					continue;
				}

				const current = await super.getRecord(uri);
				if (current) {
					await super.deleteRecord(uri);
				}
			}

			throw error;
		}
	}
}

function createTestApp<TStore extends ApiAppStore = SupportedMemoryRecordStore>(
	store?: TStore,
) {
	const resolvedStore = (store ?? new SupportedMemoryRecordStore()) as TStore;
	const app = createApiApp({
		store: resolvedStore,
		authResolver: resolveHeaderAuthContext,
	});

	return {
		app,
		store: resolvedStore,
	};
}

function createTestAppWithProjectionFeature(options: {
	store?: ApiAppStore;
	projectionIngestFeature: {
		noteRepoDid(repoDid: string): Promise<void>;
		replayKnownRepoDids?(): Promise<void>;
	};
}) {
	const resolvedStore =
		(options.store ?? new SupportedMemoryRecordStore()) as ApiAppStore;
	const app = createApiApp({
		store: resolvedStore,
		authResolver: resolveHeaderAuthContext,
		projectionIngestFeature: {
			noteRepoDid: options.projectionIngestFeature.noteRepoDid,
			replayKnownRepoDids:
				options.projectionIngestFeature.replayKnownRepoDids ??
				(async () => undefined),
		},
	});

	return {
		app,
		store: resolvedStore,
	};
}

async function postJson(
	app: ReturnType<typeof createApiApp>,
	path: string,
	body: unknown,
	headers = authHeaders(),
) {
	return app.request(path, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
}

async function getJson(
	app: ReturnType<typeof createApiApp>,
	path: string,
	headers?: Record<string, string>,
) {
	return app.request(path, {
		headers,
	});
}

function expectAccepted(data: {
	resultKind: string;
	emittedRecordRefs?: string[];
}) {
	expect(data.resultKind).toBe("accepted");
	expect(data.emittedRecordRefs).toBeArray();
	expect(data.emittedRecordRefs?.length).toBeGreaterThan(0);
}

function expectValidXrpcOutput(lexiconId: string, payload: unknown) {
	expect(() => lexicons.assertValidXrpcOutput(lexiconId, payload)).not.toThrow();
}

describe("createApiApp", () => {
	test("returns a health response", async () => {
		const { app } = createTestApp();
		const response = await app.request("/_health");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	test("rejects stores without applyWrites at app composition time", () => {
		expect(() =>
			createApiApp({
				store: new MemoryRecordStore() as unknown as ApiAppStore,
				authResolver: resolveHeaderAuthContext,
			}),
		).toThrow("applyWrites");
	});

	test("rejects malformed AT URIs", () => {
		expect(() =>
			parseAtUri("at://not-a-did/app.cerulia.core.session/test"),
		).toThrow(ApiError);
		expect(() => parseAtUri("at://did:plc:alice/not a nsid/test")).toThrow(
			ApiError,
		);
		expect(() =>
			parseAtUri("at://did:plc:alice/app.cerulia.core.session/with/slash"),
		).toThrow(ApiError);
	});
	test("rejects malformed pagination input", () => {
		expect(() => paginate([1, 2, 3], "10abc", undefined)).toThrow(ApiError);
		expect(() => paginate([1, 2, 3], undefined, "2x")).toThrow(ApiError);
	});

	test("rejects an invalid sheet schema definition", async () => {
		const { app } = createTestApp();
		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Broken Schema",
				fieldDefs: [
					{
						fieldId: "skills",
						label: "Skills",
						fieldType: "array",
						required: false,
						itemDef: {
							fieldId: "nested",
							label: "Nested",
							fieldType: "array",
							required: false,
							itemDef: {
								fieldId: "value",
								label: "Value",
								fieldType: "integer",
								required: false,
							},
						},
					},
				],
			},
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: "InvalidRequest",
		});
	});

	test("rejects createSheet requests that omit stats", async () => {
		const { app } = createTestApp();
		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Required Stats Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Missing Stats Investigator",
			},
		);
		expect(await createSheetResponse.json()).toMatchObject({
			error: "InvalidRequest",
			message: 'Input must have the property "stats"',
		});
	});

	test("retries createSheet once when the branch scope changes before atomic write", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const concurrentBranchRef = `at://${DID}/${COLLECTIONS.characterBranch}/concurrent-branch`;

		store.onApplyWritesCall(DID, 1, () => {
			store.seedRecord(
				concurrentBranchRef,
				{
					$type: COLLECTIONS.characterBranch,
					ownerDid: DID,
					sheetRef: `at://${DID}/${COLLECTIONS.characterSheet}/concurrent-sheet`,
					branchKind: "local-override",
					branchLabel: "Concurrent Branch",
					visibility: "draft",
					revision: 1,
					createdAt: "2026-04-18T00:00:00.000Z",
					updatedAt: "2026-04-18T00:00:00.000Z",
				},
				"2026-04-18T00:00:00.000Z",
				"2026-04-18T00:00:00.000Z",
			);
		});

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Retry Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Retry Character",
				stats: {
					power: 70,
				},
				initialBranchVisibility: "public",
			},
		);
		const createSheetAck = await createSheetResponse.json();

		expectAccepted(createSheetAck);
		expect(createSheetAck.emittedRecordRefs).toHaveLength(2);
	});

	test("does not persist partial records when createSheet applyWrites fails mid-batch", async () => {
		const store = new FailingAtomicMemoryRecordStore();
		const { app } = createTestApp(store);

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Mid Batch Failure Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		store.failNextApplyWrites(DID, 1);

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Mid Batch Failure Character",
				stats: {
					power: 70,
				},
			},
		);

		expect(createSheetResponse.status).toBe(500);
		expect(await createSheetResponse.json()).toMatchObject({
			error: "InternalError",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterSheet, DID),
		).toHaveLength(0);
		expect(
			await store.listRecords(COLLECTIONS.characterBranch, DID),
		).toHaveLength(0);
	});

	test("maps an atproto-only browser session to reader access", async () => {
		const authResolver = createSessionAuthResolver({
			async getBrowserSession(sessionId) {
				if (sessionId !== "browser-reader") {
					return null;
				}

				return {
					did: DID,
					grantedScope: "atproto",
				};
			},
		});

		const auth = await authResolver(
			new Request("https://cerulia.example.com/oauth/session", {
				headers: {
					cookie: `${SESSION_COOKIE_NAME}=browser-reader`,
				},
			}),
		);

		expect(auth.callerDid).toBe(DID);
		expect(auth.scopes.has(AUTH_SCOPES.reader)).toBe(true);
		expect(auth.scopes.has(AUTH_SCOPES.writer)).toBe(false);
	});

	test("supports oauth routes and cookie-backed session auth", async () => {
		const store = new SupportedMemoryRecordStore();
		const browserSessions = new Map<
			string,
			{
				did: string;
				grantedScope: string;
			}
		>();
		const oauthFeature = {
			clientMetadata: {
				client_id: "https://cerulia.example.com/client-metadata.json",
			},
			jwks: {
				keys: [],
			},
			async beginLogin(identifier: string, returnTo: string) {
				return `https://auth.example.com/authorize?identifier=${encodeURIComponent(identifier)}&returnTo=${encodeURIComponent(returnTo)}`;
			},
			async finishLogin() {
				browserSessions.set("browser-writer", {
					did: DID,
					grantedScope: "atproto transition:generic",
				});
				return {
					sessionId: "browser-writer",
					did: DID,
					grantedScope: "atproto transition:generic",
					returnTo: "/workbench",
				};
			},
			async signOut(sessionId: string) {
				browserSessions.delete(sessionId);
			},
			async getBrowserSession(sessionId: string) {
				return browserSessions.get(sessionId) ?? null;
			},
		};
		const app = createApiApp({
			store,
			authResolver: createSessionAuthResolver(oauthFeature),
			oauthFeature,
		});

		const loginResponse = await app.request(
			"/oauth/login?identifier=alice.test&returnTo=/workbench",
		);
		expect(loginResponse.status).toBe(302);
		expect(loginResponse.headers.get("location")).toContain(
			"https://auth.example.com/authorize",
		);

		const callbackResponse = await app.request("/oauth/callback?code=test");
		expect(callbackResponse.status).toBe(302);
		expect(callbackResponse.headers.get("location")).toBe("/workbench");

		const setCookie = callbackResponse.headers.get("set-cookie");
		expect(setCookie).toBeString();
		const cookie = setCookie?.split(";")[0] ?? "";

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Cookie Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			{
				cookie,
				"content-type": "application/json",
			},
		);
		expect(schemaResponse.status).toBe(200);
		expectAccepted(await schemaResponse.json());

		const sessionResponse = await getJson(app, "/oauth/session", {
			cookie,
		});
		expect(sessionResponse.status).toBe(200);
		expect(await sessionResponse.json()).toEqual({
			did: DID,
			scopes: [AUTH_SCOPES.reader, AUTH_SCOPES.writer],
		});

		const logoutResponse = await app.request("/oauth/logout", {
			method: "POST",
			headers: {
				cookie,
			},
		});
		expect(logoutResponse.status).toBe(200);
		expect(logoutResponse.headers.get("set-cookie")).toContain(
			`${SESSION_COOKIE_NAME}=`,
		);

		const signedOutSessionResponse = await getJson(app, "/oauth/session", {
			cookie,
		});
		expect(await signedOutSessionResponse.json()).toEqual({
			did: null,
			scopes: [],
		});
	});

	test("returns lexicon-valid outputs for representative owner and public routes", async () => {
		const { app } = createTestApp();

		const createSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Output Contract Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
		);
		const createSchemaAck = await createSchemaResponse.json();
		expectValidXrpcOutput(
			"app.cerulia.rule.createSheetSchema",
			createSchemaAck,
		);
		const [schemaRef] = createSchemaAck.emittedRecordRefs;

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Output Contract Character",
				stats: {
					power: 70,
				},
				initialBranchVisibility: "public",
			},
		);
		const createSheetAck = await createSheetResponse.json();
		expectValidXrpcOutput(
			"app.cerulia.character.createSheet",
			createSheetAck,
		);
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		const getHomeResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getHome`,
			authHeaders(DID, [AUTH_SCOPES.reader]),
		);
		const homePayload = await getHomeResponse.json();
		expectValidXrpcOutput("app.cerulia.character.getHome", homePayload);

		const publicBranchResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
		);
		const publicBranchPayload = await publicBranchResponse.json();
		expectValidXrpcOutput(
			"app.cerulia.character.getBranchView",
			publicBranchPayload,
		);

		const createSessionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.create`,
			{
				role: "pl",
				playedAt: "2026-04-18T00:00:00.000Z",
				scenarioLabel: "Output Contract Scenario",
				characterBranchRef: branchRef,
				visibility: "public",
			},
		);
		const createSessionAck = await createSessionResponse.json();
		expectValidXrpcOutput(
			"app.cerulia.session.create",
			createSessionAck,
		);
		const [sessionRef] = createSessionAck.emittedRecordRefs;

		const publicSessionResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.getView?sessionRef=${encodeURIComponent(sessionRef)}`,
		);
		const publicSessionPayload = await publicSessionResponse.json();
		expectValidXrpcOutput(
			"app.cerulia.session.getView",
			publicSessionPayload,
		);
	});

	test("supports the core character, session, and public profile flows", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader]);

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "CoC 7 Test Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
						valueRange: { min: 0, max: 100 },
					},
				],
			},
			writerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		expectAccepted(schemaAck);
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const targetSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Emoclo Test Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
						valueRange: { min: 0, max: 100 },
					},
				],
			},
			writerHeaders,
		);
		const targetSchemaAck = await targetSchemaResponse.json();
		expectAccepted(targetSchemaAck);
		const targetSchemaRef = targetSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Alice Investigator",
				stats: { power: 0 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		expectAccepted(createSheetAck);
		const [sheetRef, branchRef] = createSheetAck.emittedRecordRefs;

		const sessionCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.create`,
			{
				role: "pl",
				playedAt: "2026-04-20T09:00:00.000Z",
				scenarioLabel: "The Haunting",
				characterBranchRef: branchRef,
				visibility: "public",
			},
			writerHeaders,
		);
		const sessionAck = await sessionCreateResponse.json();
		expectAccepted(sessionAck);
		const sessionRef = sessionAck.emittedRecordRefs[0];

		const draftSessionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.create`,
			{
				role: "pl",
				playedAt: "2026-04-20T11:30:00.000Z",
				scenarioLabel: "Draft Session",
				characterBranchRef: branchRef,
				visibility: "draft",
			},
			writerHeaders,
		);
		expectAccepted(await draftSessionResponse.json());

		store.seedRecord(
			`at://${DID}/${COLLECTIONS.characterAdvancement}/z-last`,
			{
				$type: COLLECTIONS.characterAdvancement,
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: { power: 2 },
				effectiveAt: "2026-04-20T10:00:00.000Z",
				createdAt: "2026-04-20T10:00:00.000Z",
			},
			"2026-04-20T10:00:00.000Z",
			"2026-04-20T10:00:00.000Z",
		);
		store.seedRecord(
			`at://${DID}/${COLLECTIONS.characterAdvancement}/a-first`,
			{
				$type: COLLECTIONS.characterAdvancement,
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: { power: 1 },
				effectiveAt: "2026-04-20T10:00:00.000Z",
				createdAt: "2026-04-20T11:00:00.000Z",
			},
			"2026-04-20T11:00:00.000Z",
			"2026-04-20T11:00:00.000Z",
		);

		store.seedRecord(
			`at://${DID}/${COLLECTIONS.blueskyProfile}/${SELF_RKEY}`,
			{
				displayName: "Alice",
				website: "https://example.com/?token=secret",
				pronouns: "they/them",
			},
			"2026-04-20T08:00:00.000Z",
			"2026-04-20T08:00:00.000Z",
		);

		const homeResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getHome`,
			readerHeaders,
		);
		expect(homeResponse.status).toBe(200);
		const homeData = await homeResponse.json();
		expect(homeData.ownerDid).toBe(DID);
		expect(homeData.branches).toHaveLength(1);
		expect(homeData.branches[0].sheetRef).toBe(sheetRef);
		expect(homeData.recentSessions).toHaveLength(2);
		expect(homeData.recentSessions[0]).toMatchObject({
			scenarioLabel: "Draft Session",
			playedAt: "2026-04-20T11:30:00.000Z",
			visibility: "draft",
		});
		expect(homeData.recentSessions[1].sessionRef).toBe(sessionRef);

		const branchViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
		);
		expect(branchViewResponse.status).toBe(200);
		const branchView = await branchViewResponse.json();
		expect(branchView.branchSummary.branchRef).toBe(branchRef);
		expect(branchView.sheetSummary.displayName).toBe("Alice Investigator");
		expect(branchView.sheetSummary.structuredStats[0].value.numberValue).toBe(
			2,
		);
		expect(branchView.recentSessionSummaries).toHaveLength(1);

		const sessionViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.getView?sessionRef=${encodeURIComponent(sessionRef)}`,
		);
		expect(sessionViewResponse.status).toBe(200);
		const sessionView = await sessionViewResponse.json();
		expect(sessionView.sessionSummary.scenarioLabel).toBe("The Haunting");

		const actorViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.actor.getProfileView?did=${encodeURIComponent(DID)}`,
		);
		expect(actorViewResponse.status).toBe(200);
		const actorView = await actorViewResponse.json();
		expect(actorView.profileSummary.displayName).toBe("Alice");
		expect(actorView.profileSummary.website).toBeUndefined();
		expect(actorView.publicBranches).toHaveLength(1);
		expect(actorView.publicBranches[0].characterBranchRef).toBe(branchRef);

		const ownerActorViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.actor.getProfileView?did=${encodeURIComponent(DID)}`,
			readerHeaders,
		);
		expect(ownerActorViewResponse.status).toBe(200);
		const ownerActorView = await ownerActorViewResponse.json();
		expect(ownerActorView.blueskyFallbackProfile.pronouns).toBe("they/them");

		store.seedRecord(
			`at://${DID}/${COLLECTIONS.playerProfile}/${SELF_RKEY}`,
			{
				$type: COLLECTIONS.playerProfile,
				ownerDid: DID,
				blueskyProfileRef: `at://${DID}/${COLLECTIONS.blueskyProfile}/other-record`,
				createdAt: "2026-04-20T08:30:00.000Z",
				updatedAt: "2026-04-20T08:30:00.000Z",
			},
			"2026-04-20T08:30:00.000Z",
			"2026-04-20T08:30:00.000Z",
		);
		store.seedRecord(
			`at://${DID}/${COLLECTIONS.blueskyProfile}/other-record`,
			{
				displayName: "Wrong Fallback",
			},
			"2026-04-20T08:31:00.000Z",
			"2026-04-20T08:31:00.000Z",
		);

		const canonicalFallbackResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.actor.getProfileView?did=${encodeURIComponent(DID)}`,
		);
		expect(canonicalFallbackResponse.status).toBe(200);
		const canonicalFallbackPayload = await canonicalFallbackResponse.json();
		expect(canonicalFallbackPayload.profileSummary.displayName).toBeUndefined();

		const createBranchResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createBranch`,
			{
				sourceBranchRef: branchRef,
				branchKind: "campaign-fork",
				branchLabel: "Forked Alice",
				visibility: "public",
			},
			writerHeaders,
		);
		const createBranchAck = await createBranchResponse.json();
		expectAccepted(createBranchAck);
		const [forkSheetRef, forkBranchRef] = createBranchAck.emittedRecordRefs;

		const forkOwnerViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(forkBranchRef)}`,
			readerHeaders,
		);
		expect(forkOwnerViewResponse.status).toBe(200);
		const forkOwnerView = await forkOwnerViewResponse.json();
		expect(forkOwnerView.branch.forkedFromBranchRef).toBe(branchRef);
		expect(forkOwnerView.branch.sheetRef).toBe(forkSheetRef);
		expect(forkOwnerView.sheet.stats.power).toBe(2);

		const conversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T12:00:00.000Z",
			},
			writerHeaders,
		);
		expect(conversionResponse.status).toBe(200);
		const conversionAck = await conversionResponse.json();
		expectAccepted(conversionAck);
		const [convertedSheetRef, updatedBranchRef, conversionRef] =
			conversionAck.emittedRecordRefs;
		expect(updatedBranchRef).toBe(branchRef);
		expect(convertedSheetRef).toContain(COLLECTIONS.characterSheet);
		expect(conversionRef).toContain(COLLECTIONS.characterConversion);

		const convertedBranchViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
		);
		expect(convertedBranchViewResponse.status).toBe(200);
		const convertedBranchView = await convertedBranchViewResponse.json();
		expect(convertedBranchView.branchSummary.revision).toBe(2);
		expect(convertedBranchView.sheetSummary.sheetRef).toBe(convertedSheetRef);
		expect(convertedBranchView.sheetSummary.rulesetNsid).toBe(
			"app.cerulia.rules.emoclo",
		);
		expect(
			convertedBranchView.sheetSummary.structuredStats[0].value.numberValue,
		).toBe(2);
		expect(convertedBranchView.conversionSummaries).toHaveLength(1);
		expect(convertedBranchView.conversionSummaries[0].conversionRef).toBeUndefined();

		const postConversionAdvancementResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordAdvancement`,
			{
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: { power: 3 },
				sessionRef,
				effectiveAt: "2026-04-20T13:00:00.000Z",
			},
			writerHeaders,
		);
		expectAccepted(await postConversionAdvancementResponse.json());

		const finalBranchViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
		);
		const finalBranchView = await finalBranchViewResponse.json();
		expect(finalBranchView.sheetSummary.structuredStats[0].value.numberValue).toBe(
			3,
		);

		const actorViewAfterConversionResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.actor.getProfileView?did=${encodeURIComponent(DID)}`,
		);
		const actorViewAfterConversion =
			await actorViewAfterConversionResponse.json();
		expect(actorViewAfterConversion.publicBranches).toHaveLength(2);
		expect(actorViewAfterConversion.publicBranches[0].rulesetNsid).toBeDefined();
	});

	test("omits structured stats when the pinned schema is missing", async () => {
		const { app, store } = createTestApp();
		const branchRef = `at://${DID}/${COLLECTIONS.characterBranch}/schema-missing`;
		const sheetRef = `at://${DID}/${COLLECTIONS.characterSheet}/schema-missing`;

		store.seedRecord(
			sheetRef,
			{
				$type: COLLECTIONS.characterSheet,
				displayName: "Schema Missing Investigator",
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef:
					`at://${DID}/${COLLECTIONS.characterSheetSchema}/missing-schema`,
				stats: { power: 3 },
				version: 1,
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			branchRef,
			{
				$type: COLLECTIONS.characterBranch,
				sheetRef,
				branchKind: "main",
				branchLabel: "Schema Missing Branch",
				visibility: "public",
				revision: 1,
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);

		const response = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.sheetSummary.displayName).toBe(
			"Schema Missing Investigator",
		);
		expect(payload.sheetSummary.structuredStats).toBeUndefined();
	});

	test("keeps branch view available for owners when the current head sheet is missing", async () => {
		const { app, store } = createTestApp();
		const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader]);
		const branchRef = `at://${DID}/${COLLECTIONS.characterBranch}/broken-head`;

		store.seedRecord(
			branchRef,
			{
				$type: COLLECTIONS.characterBranch,
				sheetRef: `at://${DID}/${COLLECTIONS.characterSheet}/missing-head`,
				branchKind: "main",
				branchLabel: "Broken Head Branch",
				visibility: "public",
				revision: 3,
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);

		const ownerResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
			readerHeaders,
		);
		expect(ownerResponse.status).toBe(200);
		const ownerPayload = await ownerResponse.json();
		expect(ownerPayload.branch.sheetRef).toBe(
			`at://${DID}/${COLLECTIONS.characterSheet}/missing-head`,
		);
		expect(ownerPayload.sheet).toBeUndefined();

		const publicResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
		);
		expect(publicResponse.status).toBe(200);
		const publicPayload = await publicResponse.json();
		expect(publicPayload.branchSummary.branchRef).toBe(branchRef);
		expect(publicPayload.sheetSummary).toBeUndefined();
	});

	test("omits unresolved public branch rows from actor profile view", async () => {
		const { app, store } = createTestApp();
		const validSheetRef = `at://${DID}/${COLLECTIONS.characterSheet}/valid-sheet`;
		const validBranchRef = `at://${DID}/${COLLECTIONS.characterBranch}/valid-branch`;
		const brokenBranchRef = `at://${DID}/${COLLECTIONS.characterBranch}/broken-branch`;

		store.seedRecord(
			validSheetRef,
			{
				$type: COLLECTIONS.characterSheet,
				displayName: "Visible Investigator",
				rulesetNsid: "app.cerulia.rules.coc7",
				stats: { power: 2 },
				version: 1,
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			validBranchRef,
			{
				$type: COLLECTIONS.characterBranch,
				sheetRef: validSheetRef,
				branchKind: "main",
				branchLabel: "Visible Branch",
				visibility: "public",
				revision: 1,
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			brokenBranchRef,
			{
				$type: COLLECTIONS.characterBranch,
				sheetRef: `at://${DID}/${COLLECTIONS.characterSheet}/missing-sheet`,
				branchKind: "campaign-fork",
				branchLabel: "Broken Branch",
				visibility: "public",
				revision: 1,
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:01.000Z",
				updatedAt: "2026-04-22T00:00:01.000Z",
			},
			"2026-04-22T00:00:01.000Z",
			"2026-04-22T00:00:01.000Z",
		);

		const response = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.actor.getProfileView?did=${encodeURIComponent(DID)}`,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.publicBranches).toHaveLength(1);
		expect(payload.publicBranches[0].characterBranchRef).toBe(validBranchRef);
	});

	test("omits missing overlay rows instead of failing campaign views", async () => {
		const { app, store } = createTestApp();
		const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader]);
		const campaignRef = `at://${DID}/${COLLECTIONS.campaign}/overlay-filter`;
		const validRuleProfileRef = `at://${DID}/${COLLECTIONS.ruleProfile}/overlay-valid`;

		store.seedRecord(
			validRuleProfileRef,
			{
				$type: COLLECTIONS.ruleProfile,
				profileTitle: "Visible Overlay",
				baseRulesetNsid: "app.cerulia.rules.coc7",
				scopeKind: "campaign-shared",
				scopeRef: `at://${DID}/${COLLECTIONS.house}/overlay-house`,
				rulesPatchUri: "https://example.com/rules/visible-overlay",
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			campaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "overlay-filter",
				title: "Overlay Filter Campaign",
				rulesetNsid: "app.cerulia.rules.coc7",
				sharedRuleProfileRefs: [
					validRuleProfileRef,
					`at://${DID}/${COLLECTIONS.ruleProfile}/overlay-missing`,
				],
				visibility: "public",
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);

		const ownerResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
			readerHeaders,
		);
		expect(ownerResponse.status).toBe(200);
		const ownerPayload = await ownerResponse.json();
		expect(ownerPayload.ruleOverlay).toHaveLength(1);
		expect(ownerPayload.ruleOverlay[0].profileTitle).toBe("Visible Overlay");

		const publicResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
		);
		expect(publicResponse.status).toBe(200);
		const publicPayload = await publicResponse.json();
		expect(publicPayload.ruleOverlaySummary.ruleProfiles).toHaveLength(1);
		expect(publicPayload.ruleOverlaySummary.ruleProfiles[0].profileTitle).toBe(
			"Visible Overlay",
		);
	});

	test("treats unresolved recommended schema refs as browse-only in scenario detail", async () => {
		const { app, store } = createTestApp();
		const scenarioRef = `at://${DID}/${COLLECTIONS.scenario}/browse-only`;

		store.seedRecord(
			scenarioRef,
			{
				$type: COLLECTIONS.scenario,
				title: "Browse Only Scenario",
				rulesetNsid: "app.cerulia.rules.coc7",
				recommendedSheetSchemaRef:
					`at://${DID}/${COLLECTIONS.characterSheetSchema}/missing-schema`,
				sourceCitationUri: "https://example.com/scenario/browse-only",
				summary: "Schema resolution failed, but the route should stay readable.",
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);

		const response = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.getView?scenarioRef=${encodeURIComponent(scenarioRef)}`,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.scenarioSummary.title).toBe("Browse Only Scenario");
		expect(payload.scenarioSummary.hasRecommendedSheetSchema).toBe(false);
	});

	test("allows unrelated scenario updates when the recommended schema ref is stale", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const scenarioRef = `at://${DID}/${COLLECTIONS.scenario}/stale-schema-update`;

		store.seedRecord(
			scenarioRef,
			{
				$type: COLLECTIONS.scenario,
				title: "Stale Schema Scenario",
				rulesetNsid: "app.cerulia.rules.coc7",
				recommendedSheetSchemaRef:
					`at://${DID}/${COLLECTIONS.characterSheetSchema}/missing-schema`,
				sourceCitationUri: "https://example.com/scenario/stale-schema",
				summary: "Old summary",
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);

		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.update`,
			{
				scenarioRef,
				summary: "Updated summary while schema stays stale.",
			},
			writerHeaders,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.resultKind).toBe("accepted");

		const updated = await store.getRecord<AppCeruliaCoreScenario.Main>(
			scenarioRef,
		);
		expect(updated?.value.summary).toBe(
			"Updated summary while schema stays stale.",
		);
	});

	test("rejects foreign campaign refs for session create and update", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const foreignDid = "did:plc:foreign-campaign-owner";
		const foreignCampaignRef = `at://${foreignDid}/${COLLECTIONS.campaign}/foreign-campaign`;
		const sessionRef = `at://${DID}/${COLLECTIONS.session}/foreign-campaign-session`;

		store.seedRecord(
			foreignCampaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "foreign-campaign",
				title: "Foreign Campaign",
				rulesetNsid: "app.cerulia.rules.coc7",
				visibility: "draft",
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			sessionRef,
			{
				$type: COLLECTIONS.session,
				scenarioLabel: "Existing Session",
				role: "gm",
				playedAt: "2026-04-22T10:00:00.000Z",
				visibility: "draft",
				createdAt: "2026-04-22T10:00:00.000Z",
				updatedAt: "2026-04-22T10:00:00.000Z",
			},
			"2026-04-22T10:00:00.000Z",
			"2026-04-22T10:00:00.000Z",
		);

		const createResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.create`,
			{
				role: "gm",
				playedAt: "2026-04-22T11:00:00.000Z",
				scenarioLabel: "Foreign Campaign Attempt",
				campaignRef: foreignCampaignRef,
			},
			writerHeaders,
		);
		expect(createResponse.status).toBe(200);
		const createPayload = await createResponse.json();
		expect(createPayload.resultKind).toBe("rejected");
		expect(createPayload.reasonCode).toBe("forbidden-owner-mismatch");

		const updateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.update`,
			{
				sessionRef,
				campaignRef: foreignCampaignRef,
			},
			writerHeaders,
		);
		expect(updateResponse.status).toBe(200);
		const updatePayload = await updateResponse.json();
		expect(updatePayload.resultKind).toBe("rejected");
		expect(updatePayload.reasonCode).toBe("forbidden-owner-mismatch");
	});

	test("ignores foreign backlink rows in campaign and house views", async () => {
		const { app, store } = createTestApp();
		const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader]);
		const foreignDid = "did:plc:foreign-backlink-owner";
		const houseRef = `at://${DID}/${COLLECTIONS.house}/local-house`;
		const campaignRef = `at://${DID}/${COLLECTIONS.campaign}/local-campaign`;
		const localSessionRef = `at://${DID}/${COLLECTIONS.session}/local-session`;
		const foreignCampaignRef = `at://${foreignDid}/${COLLECTIONS.campaign}/foreign-campaign`;
		const foreignSessionRef = `at://${foreignDid}/${COLLECTIONS.session}/foreign-session`;

		store.seedRecord(
			houseRef,
			{
				$type: COLLECTIONS.house,
				houseId: "local-house",
				title: "Local House",
				visibility: "public",
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			campaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "local-campaign",
				title: "Local Campaign",
				houseRef,
				rulesetNsid: "app.cerulia.rules.coc7",
				visibility: "public",
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			localSessionRef,
			{
				$type: COLLECTIONS.session,
				campaignRef,
				scenarioLabel: "Local Session",
				role: "gm",
				playedAt: "2026-04-22T12:00:00.000Z",
				visibility: "public",
				createdAt: "2026-04-22T12:00:00.000Z",
				updatedAt: "2026-04-22T12:00:00.000Z",
			},
			"2026-04-22T12:00:00.000Z",
			"2026-04-22T12:00:00.000Z",
		);
		store.seedRecord(
			foreignCampaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "foreign-campaign",
				title: "Foreign Campaign",
				houseRef,
				rulesetNsid: "app.cerulia.rules.coc7",
				visibility: "public",
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			foreignSessionRef,
			{
				$type: COLLECTIONS.session,
				campaignRef,
				scenarioLabel: "Foreign Session",
				role: "gm",
				playedAt: "2026-04-22T13:00:00.000Z",
				visibility: "public",
				createdAt: "2026-04-22T13:00:00.000Z",
				updatedAt: "2026-04-22T13:00:00.000Z",
			},
			"2026-04-22T13:00:00.000Z",
			"2026-04-22T13:00:00.000Z",
		);

		const campaignResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
			readerHeaders,
		);
		expect(campaignResponse.status).toBe(200);
		const campaignPayload = await campaignResponse.json();
		expect(campaignPayload.sessions).toHaveLength(1);
		expect(campaignPayload.sessions[0].sessionRef).toBe(localSessionRef);

		const houseResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.getView?houseRef=${encodeURIComponent(houseRef)}`,
			readerHeaders,
		);
		expect(houseResponse.status).toBe(200);
		const housePayload = await houseResponse.json();
		expect(housePayload.campaigns).toHaveLength(1);
		expect(housePayload.campaigns[0].campaignRef).toBe(campaignRef);
		expect(housePayload.sessions).toHaveLength(1);
		expect(housePayload.sessions[0].sessionRef).toBe(localSessionRef);
	});

	test("returns mutationAck rejects for missing linked refs on session and scenario writes", async () => {
		const { app } = createTestApp();
		const writerHeaders = authHeaders();

		const sessionCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.create`,
			{
				role: "gm",
				playedAt: "2026-04-22T11:00:00.000Z",
				scenarioRef: `at://${DID}/${COLLECTIONS.scenario}/missing-scenario`,
			},
			writerHeaders,
		);
		expect(sessionCreateResponse.status).toBe(200);
		const sessionCreatePayload = await sessionCreateResponse.json();
		expect(sessionCreatePayload.resultKind).toBe("rejected");
		expect(sessionCreatePayload.reasonCode).toBe("invalid-required-field");

		const scenarioCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.create`,
			{
				title: "Missing Schema Scenario",
				rulesetNsid: "app.cerulia.rules.coc7",
				recommendedSheetSchemaRef:
					`at://${DID}/${COLLECTIONS.characterSheetSchema}/missing-schema`,
				sourceCitationUri: "https://example.com/scenario/missing-schema",
			},
			writerHeaders,
		);
		expect(scenarioCreateResponse.status).toBe(200);
		const scenarioCreatePayload = await scenarioCreateResponse.json();
		expect(scenarioCreatePayload.resultKind).toBe("rejected");
		expect(scenarioCreatePayload.reasonCode).toBe("invalid-schema-link");
	});

	test("returns mutationAck rejects for missing source branches", async () => {
		const { app } = createTestApp();
		const writerHeaders = authHeaders();

		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createBranch`,
			{
				sourceBranchRef:
					`at://${DID}/${COLLECTIONS.characterBranch}/missing-branch`,
				targetSheetSchemaRef:
					`at://${DID}/${COLLECTIONS.characterSheetSchema}/missing-schema`,
				branchLabel: "Missing Source Branch",
				branchKind: "parallel",
			},
			writerHeaders,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.resultKind).toBe("rejected");
		expect(payload.reasonCode).toBe("invalid-required-field");
	});

	test("returns mutationAck rejects instead of 404 for stale rule profile refs", async () => {
		const { app } = createTestApp();
		const writerHeaders = authHeaders();

		const houseCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.create`,
			{
				title: "Broken Default Profiles House",
				defaultRuleProfileRefs: [
					`at://${DID}/${COLLECTIONS.ruleProfile}/missing-default-profile`,
				],
			},
			writerHeaders,
		);
		expect(houseCreateResponse.status).toBe(200);
		const houseCreatePayload = await houseCreateResponse.json();
		expect(houseCreatePayload.resultKind).toBe("rejected");
		expect(houseCreatePayload.reasonCode).toBe("invalid-schema-link");

		const campaignCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.create`,
			{
				title: "Broken Overlay Campaign",
				rulesetNsid: "app.cerulia.rules.coc7",
				sharedRuleProfileRefs: [
					`at://${DID}/${COLLECTIONS.ruleProfile}/missing-overlay-profile`,
				],
			},
			writerHeaders,
		);
		expect(campaignCreateResponse.status).toBe(200);
		const campaignCreatePayload = await campaignCreateResponse.json();
		expect(campaignCreatePayload.resultKind).toBe("rejected");
		expect(campaignCreatePayload.reasonCode).toBe("invalid-schema-link");
	});

	test("rejects detached characterSheet refs for sheet update and rebase", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const branchRef = `at://${DID}/${COLLECTIONS.characterBranch}/current-head-branch`;
		const detachedSheetRef = `at://${DID}/${COLLECTIONS.characterSheet}/detached-sheet`;
		const currentSheetRef = `at://${DID}/${COLLECTIONS.characterSheet}/current-sheet`;
		const schemaRef = `at://${DID}/${COLLECTIONS.characterSheetSchema}/current-schema`;

		store.seedRecord(
			schemaRef,
			{
				$type: COLLECTIONS.characterSheetSchema,
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Current Schema",
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				fieldDefs: [],
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			detachedSheetRef,
			{
				$type: COLLECTIONS.characterSheet,
				ownerDid: DID,
				sheetSchemaRef: schemaRef,
				rulesetNsid: "app.cerulia.rules.coc7",
				displayName: "Detached Sheet",
				stats: { power: 1 },
				version: 1,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);
		store.seedRecord(
			currentSheetRef,
			{
				$type: COLLECTIONS.characterSheet,
				ownerDid: DID,
				sheetSchemaRef: schemaRef,
				rulesetNsid: "app.cerulia.rules.coc7",
				displayName: "Current Sheet",
				stats: { power: 2 },
				version: 1,
				createdAt: "2026-04-22T00:00:01.000Z",
				updatedAt: "2026-04-22T00:00:01.000Z",
			},
			"2026-04-22T00:00:01.000Z",
			"2026-04-22T00:00:01.000Z",
		);
		store.seedRecord(
			branchRef,
			{
				$type: COLLECTIONS.characterBranch,
				ownerDid: DID,
				sheetRef: currentSheetRef,
				branchKind: "main",
				branchLabel: "Current Head Branch",
				visibility: "draft",
				revision: 2,
				createdAt: "2026-04-22T00:00:01.000Z",
				updatedAt: "2026-04-22T00:00:01.000Z",
			},
			"2026-04-22T00:00:01.000Z",
			"2026-04-22T00:00:01.000Z",
		);

		const updateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.updateSheet`,
			{
				characterSheetRef: detachedSheetRef,
				expectedVersion: 1,
				displayName: "Detached Sheet Updated",
			},
			writerHeaders,
		);
		expect(updateResponse.status).toBe(200);
		const updatePayload = await updateResponse.json();
		expect(updatePayload.resultKind).toBe("rebase-needed");

		const rebaseResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.rebaseSheet`,
			{
				characterSheetRef: detachedSheetRef,
				expectedVersion: 1,
				targetSheetSchemaRef: schemaRef,
			},
			writerHeaders,
		);
		expect(rebaseResponse.status).toBe(200);
		const rebasePayload = await rebaseResponse.json();
		expect(rebasePayload.resultKind).toBe("rebase-needed");
	});

	test("returns repair-needed when session.update keeps a stale scenario ref", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const sessionRef = `at://${DID}/${COLLECTIONS.session}/repair-needed-session`;

		store.seedRecord(
			sessionRef,
			{
				$type: COLLECTIONS.session,
				scenarioRef: `at://${DID}/${COLLECTIONS.scenario}/missing-scenario`,
				role: "gm",
				playedAt: "2026-04-22T10:00:00.000Z",
				visibility: "draft",
				createdAt: "2026-04-22T10:00:00.000Z",
				updatedAt: "2026-04-22T10:00:00.000Z",
			},
			"2026-04-22T10:00:00.000Z",
			"2026-04-22T10:00:00.000Z",
		);

		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.update`,
			{
				sessionRef,
				outcomeSummary: "Still stale",
			},
			writerHeaders,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.resultKind).toBe("rejected");
		expect(payload.reasonCode).toBe("repair-needed");

		const echoedResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.update`,
			{
				sessionRef,
				scenarioRef: `at://${DID}/${COLLECTIONS.scenario}/missing-scenario`,
				outcomeSummary: "Still stale, but echoed",
			},
			writerHeaders,
		);
		expect(echoedResponse.status).toBe(200);
		const echoedPayload = await echoedResponse.json();
		expect(echoedPayload.resultKind).toBe("rejected");
		expect(echoedPayload.reasonCode).toBe("repair-needed");
	});

	test("allows session.update to repair stale refs in a single request", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const sessionRef = `at://${DID}/${COLLECTIONS.session}/repair-session`;
		const campaignRef = `at://${DID}/${COLLECTIONS.campaign}/repair-campaign`;

		store.seedRecord(
			campaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "repair-campaign",
				title: "Repair Campaign",
				rulesetNsid: "app.cerulia.rules.coc7",
				visibility: "draft",
				createdAt: "2026-04-22T10:00:00.000Z",
				updatedAt: "2026-04-22T10:00:00.000Z",
			},
			"2026-04-22T10:00:00.000Z",
			"2026-04-22T10:00:00.000Z",
		);
		store.seedRecord(
			sessionRef,
			{
				$type: COLLECTIONS.session,
				scenarioRef: `at://${DID}/${COLLECTIONS.scenario}/missing-scenario`,
				campaignRef: `at://${DID}/${COLLECTIONS.campaign}/missing-campaign`,
				role: "gm",
				playedAt: "2026-04-22T10:00:00.000Z",
				visibility: "draft",
				createdAt: "2026-04-22T10:00:00.000Z",
				updatedAt: "2026-04-22T10:00:00.000Z",
			},
			"2026-04-22T10:00:00.000Z",
			"2026-04-22T10:00:00.000Z",
		);

		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.update`,
			{
				sessionRef,
				scenarioLabel: "Repaired Label",
				campaignRef,
			},
			writerHeaders,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.resultKind).toBe("accepted");

		const updated = await store.getRecord<AppCeruliaCoreSession.Main>(sessionRef);
		expect(updated?.value.scenarioRef).toBeUndefined();
		expect(updated?.value.scenarioLabel).toBe("Repaired Label");
		expect(updated?.value.campaignRef).toBe(campaignRef);
	});

	test("returns repair-needed when recording an advancement on a broken-head branch", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const branchRef = `at://${DID}/${COLLECTIONS.characterBranch}/broken-head-write`;

		store.seedRecord(
			branchRef,
			{
				$type: COLLECTIONS.characterBranch,
				sheetRef: `at://${DID}/${COLLECTIONS.characterSheet}/missing-write-head`,
				branchKind: "main",
				branchLabel: "Broken Write Branch",
				visibility: "draft",
				revision: 1,
				ownerDid: DID,
				createdAt: "2026-04-22T10:00:00.000Z",
				updatedAt: "2026-04-22T10:00:00.000Z",
			},
			"2026-04-22T10:00:00.000Z",
			"2026-04-22T10:00:00.000Z",
		);

		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordAdvancement`,
			{
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: { power: 1 },
				effectiveAt: "2026-04-22T11:00:00.000Z",
			},
			writerHeaders,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.resultKind).toBe("rejected");
		expect(payload.reasonCode).toBe("repair-needed");
	});

	test("returns repair-needed for recordConversion on a broken-head branch even when expectedRevision is stale", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const branchRef = `at://${DID}/${COLLECTIONS.characterBranch}/broken-head-conversion`;

		store.seedRecord(
			branchRef,
			{
				$type: COLLECTIONS.characterBranch,
				sheetRef: `at://${DID}/${COLLECTIONS.characterSheet}/missing-sheet`,
				branchKind: "main",
				branchLabel: "Broken Head Conversion",
				visibility: "draft",
				revision: 3,
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);

		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 2,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef:
					`at://${DID}/${COLLECTIONS.characterSheetSchema}/target-schema`,
				convertedAt: "2026-04-22T12:00:00.000Z",
			},
			writerHeaders,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.resultKind).toBe("rejected");
		expect(payload.reasonCode).toBe("repair-needed");
	});

	test("keeps session.list ordering stable for equal playedAt timestamps", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader]);
		const firstSessionRef = `at://${DID}/${COLLECTIONS.session}/00000000`;
		const secondSessionRef = `at://${DID}/${COLLECTIONS.session}/zzzzzzzz`;
		store.seedRecord(
			firstSessionRef,
			{
				$type: COLLECTIONS.session,
				role: "gm",
				playedAt: "2026-04-20T09:00:00.000Z",
				scenarioLabel: "First Same-Time Session",
				visibility: "public",
				createdAt: "2026-04-20T09:00:00.000Z",
				updatedAt: "2026-04-20T09:00:00.000Z",
			},
			"2026-04-20T09:00:00.000Z",
			"2026-04-20T09:00:00.000Z",
		);
		store.seedRecord(
			secondSessionRef,
			{
				$type: COLLECTIONS.session,
				role: "gm",
				playedAt: "2026-04-20T09:00:00.000Z",
				scenarioLabel: "Second Same-Time Session",
				visibility: "public",
				createdAt: "2026-04-20T09:00:01.000Z",
				updatedAt: "2026-04-20T09:00:01.000Z",
			},
			"2026-04-20T09:00:01.000Z",
			"2026-04-20T09:00:01.000Z",
		);

		const beforeUpdateResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.list`,
			readerHeaders,
		);
		const beforeUpdate = await beforeUpdateResponse.json();
		expect(beforeUpdate.items[0].sessionRef).toBe(secondSessionRef);
		expect(beforeUpdate.items[1].sessionRef).toBe(firstSessionRef);

		const homeBeforeUpdateResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getHome`,
			readerHeaders,
		);
		const homeBeforeUpdate = await homeBeforeUpdateResponse.json();
		expect(homeBeforeUpdate.recentSessions[0].sessionRef).toBe(secondSessionRef);
		expect(homeBeforeUpdate.recentSessions[1].sessionRef).toBe(firstSessionRef);

		const updateSessionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.update`,
			{
				sessionRef: firstSessionRef,
				outcomeSummary: "Edited later",
			},
			writerHeaders,
		);
		expectAccepted(await updateSessionResponse.json());

		const afterUpdateResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.list`,
			readerHeaders,
		);
		const afterUpdate = await afterUpdateResponse.json();
		expect(afterUpdate.items[0].sessionRef).toBe(secondSessionRef);
		expect(afterUpdate.items[1].sessionRef).toBe(firstSessionRef);

		const homeAfterUpdateResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getHome`,
			readerHeaders,
		);
		const homeAfterUpdate = await homeAfterUpdateResponse.json();
		expect(homeAfterUpdate.recentSessions[0].sessionRef).toBe(secondSessionRef);
		expect(homeAfterUpdate.recentSessions[1].sessionRef).toBe(firstSessionRef);
	});

	test("keeps campaign and house session ordering stable for equal playedAt timestamps", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader]);
		const houseRef = `at://${DID}/${COLLECTIONS.house}/ordering-house`;
		const campaignRef = `at://${DID}/${COLLECTIONS.campaign}/ordering-campaign`;
		const firstSessionRef = `at://${DID}/${COLLECTIONS.session}/00000001`;
		const secondSessionRef = `at://${DID}/${COLLECTIONS.session}/zzzzzzzy`;

		store.seedRecord(
			houseRef,
			{
				$type: COLLECTIONS.house,
				houseId: "ordering-house",
				title: "Ordering House",
				visibility: "public",
				createdAt: "2026-04-20T08:00:00.000Z",
				updatedAt: "2026-04-20T08:00:00.000Z",
			},
			"2026-04-20T08:00:00.000Z",
			"2026-04-20T08:00:00.000Z",
		);
		store.seedRecord(
			campaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "ordering-campaign",
				title: "Ordering Campaign",
				houseRef,
				rulesetNsid: "app.cerulia.rules.coc7",
				visibility: "public",
				createdAt: "2026-04-20T08:05:00.000Z",
				updatedAt: "2026-04-20T08:05:00.000Z",
			},
			"2026-04-20T08:05:00.000Z",
			"2026-04-20T08:05:00.000Z",
		);
		store.seedRecord(
			firstSessionRef,
			{
				$type: COLLECTIONS.session,
				role: "gm",
				campaignRef,
				playedAt: "2026-04-20T09:00:00.000Z",
				scenarioLabel: "First Campaign Session",
				visibility: "public",
				createdAt: "2026-04-20T09:00:00.000Z",
				updatedAt: "2026-04-20T09:00:00.000Z",
			},
			"2026-04-20T09:00:00.000Z",
			"2026-04-20T09:00:00.000Z",
		);
		store.seedRecord(
			secondSessionRef,
			{
				$type: COLLECTIONS.session,
				role: "gm",
				campaignRef,
				playedAt: "2026-04-20T09:00:00.000Z",
				scenarioLabel: "Second Campaign Session",
				visibility: "public",
				createdAt: "2026-04-20T09:00:01.000Z",
				updatedAt: "2026-04-20T09:00:01.000Z",
			},
			"2026-04-20T09:00:01.000Z",
			"2026-04-20T09:00:01.000Z",
		);

		const campaignOwnerBefore = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
			readerHeaders,
		);
		const campaignOwnerBeforeData = await campaignOwnerBefore.json();
		expect(campaignOwnerBeforeData.sessions[0].sessionRef).toBe(secondSessionRef);
		expect(campaignOwnerBeforeData.sessions[1].sessionRef).toBe(firstSessionRef);

		const houseOwnerBefore = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.getView?houseRef=${encodeURIComponent(houseRef)}`,
			readerHeaders,
		);
		const houseOwnerBeforeData = await houseOwnerBefore.json();
		expect(houseOwnerBeforeData.sessions[0].sessionRef).toBe(secondSessionRef);
		expect(houseOwnerBeforeData.sessions[1].sessionRef).toBe(firstSessionRef);

		const campaignPublicBefore = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
		);
		const campaignPublicBeforeData = await campaignPublicBefore.json();
		expect(campaignPublicBeforeData.sessionSummaries[0].sessionRef).toBe(secondSessionRef);
		expect(campaignPublicBeforeData.sessionSummaries[1].sessionRef).toBe(firstSessionRef);

		const housePublicBefore = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.getView?houseRef=${encodeURIComponent(houseRef)}`,
		);
		const housePublicBeforeData = await housePublicBefore.json();
		expect(housePublicBeforeData.sessionSummaries[0].sessionRef).toBe(secondSessionRef);
		expect(housePublicBeforeData.sessionSummaries[1].sessionRef).toBe(firstSessionRef);

		const updateSessionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.update`,
			{
				sessionRef: firstSessionRef,
				outcomeSummary: "Edited later",
			},
			writerHeaders,
		);
		expectAccepted(await updateSessionResponse.json());

		const campaignOwnerAfter = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
			readerHeaders,
		);
		const campaignOwnerAfterData = await campaignOwnerAfter.json();
		expect(campaignOwnerAfterData.sessions[0].sessionRef).toBe(secondSessionRef);
		expect(campaignOwnerAfterData.sessions[1].sessionRef).toBe(firstSessionRef);

		const houseOwnerAfter = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.getView?houseRef=${encodeURIComponent(houseRef)}`,
			readerHeaders,
		);
		const houseOwnerAfterData = await houseOwnerAfter.json();
		expect(houseOwnerAfterData.sessions[0].sessionRef).toBe(secondSessionRef);
		expect(houseOwnerAfterData.sessions[1].sessionRef).toBe(firstSessionRef);

		const campaignPublicAfter = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
		);
		const campaignPublicAfterData = await campaignPublicAfter.json();
		expect(campaignPublicAfterData.sessionSummaries[0].sessionRef).toBe(secondSessionRef);
		expect(campaignPublicAfterData.sessionSummaries[1].sessionRef).toBe(firstSessionRef);

		const housePublicAfter = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.getView?houseRef=${encodeURIComponent(houseRef)}`,
		);
		const housePublicAfterData = await housePublicAfter.json();
		expect(housePublicAfterData.sessionSummaries[0].sessionRef).toBe(secondSessionRef);
		expect(housePublicAfterData.sessionSummaries[1].sessionRef).toBe(firstSessionRef);
	});

	test("rejects createBranch when source state changes during materialization", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Race Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Race Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [sheetRef, branchRef] = createSheetAck.emittedRecordRefs;
		const sourceBranch =
			await store.getRecord<AppCeruliaCoreCharacterBranch.Main>(branchRef);
		expect(sourceBranch).not.toBeNull();

		store.onApplyWritesCall(DID, 2, () => {
			store.seedRecord(
				`at://${DID}/${COLLECTIONS.characterAdvancement}/race-branch`,
				{
					$type: COLLECTIONS.characterAdvancement,
					characterBranchRef: branchRef,
					advancementKind: "milestone",
					deltaPayload: { power: 2 },
					effectiveAt: "2026-04-20T09:30:00.000Z",
					createdAt: "2026-04-20T09:30:00.000Z",
				},
				"2026-04-20T09:30:00.000Z",
				"2026-04-20T09:30:00.000Z",
			);
			store.seedRecord(
				branchRef,
				{
					...sourceBranch!.value,
					sheetRef,
					updatedAt: "2026-04-20T09:30:01.000Z",
				},
				sourceBranch!.createdAt,
				"2026-04-20T09:30:01.000Z",
			);
		});

		const createBranchResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createBranch`,
			{
				sourceBranchRef: branchRef,
				branchKind: "campaign-fork",
				branchLabel: "Race Fork",
				visibility: "public",
			},
			writerHeaders,
		);
		expect(await createBranchResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterBranch, DID),
		).toHaveLength(1);
	});

	test("rejects createBranch when source child records change before the first write", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Child Race Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Child Race Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		store.onApplyWritesCall(DID, 2, () => {
			store.seedRecord(
				`at://${DID}/${COLLECTIONS.characterAdvancement}/child-race-branch`,
				{
					$type: COLLECTIONS.characterAdvancement,
					characterBranchRef: branchRef,
					advancementKind: "milestone",
					deltaPayload: { power: 2 },
					effectiveAt: "2026-04-20T09:30:00.000Z",
					createdAt: "2026-04-20T09:30:00.000Z",
				},
				"2026-04-20T09:30:00.000Z",
				"2026-04-20T09:30:00.000Z",
			);
		});

		const createBranchResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createBranch`,
			{
				sourceBranchRef: branchRef,
				branchKind: "campaign-fork",
				branchLabel: "Child Race Fork",
				visibility: "public",
			},
			writerHeaders,
		);
		expect(await createBranchResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterBranch, DID),
		).toHaveLength(1);
	});

	test("returns rebase-needed when createBranch validation snapshot becomes stale before the fence", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Stale Validation Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Stale Validation Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;
		const advancementUri =
			`at://${DID}/${COLLECTIONS.characterAdvancement}/stale-validation-branch`;
		store.seedRecord(
			advancementUri,
			{
				$type: COLLECTIONS.characterAdvancement,
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: { power: "bad" },
				effectiveAt: "2026-04-20T09:30:00.000Z",
				createdAt: "2026-04-20T09:30:00.000Z",
			},
			"2026-04-20T09:30:00.000Z",
			"2026-04-20T09:30:00.000Z",
		);

		store.onListCall(COLLECTIONS.characterAdvancement, DID, 2, () => {
			store.seedRecord(
				advancementUri,
				{
					$type: COLLECTIONS.characterAdvancement,
					characterBranchRef: branchRef,
					advancementKind: "milestone",
					deltaPayload: { power: 2 },
					effectiveAt: "2026-04-20T09:30:00.000Z",
					createdAt: "2026-04-20T09:30:00.000Z",
				},
				"2026-04-20T09:30:00.000Z",
				"2026-04-20T09:30:01.000Z",
			);
		});

		const createBranchResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createBranch`,
			{
				sourceBranchRef: branchRef,
				branchKind: "campaign-fork",
				branchLabel: "Stale Validation Fork",
				visibility: "public",
			},
			writerHeaders,
		);
		expect(await createBranchResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
	});

	test("returns rebase-needed when createBranch source changes after target sheet creation", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Post Sheet Race Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Post Sheet Race Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		store.onApplyWritesCall(DID, 2, () => {
			store.seedRecord(
				`at://${DID}/${COLLECTIONS.characterAdvancement}/post-sheet-branch-race`,
				{
					$type: COLLECTIONS.characterAdvancement,
					characterBranchRef: branchRef,
					advancementKind: "milestone",
					deltaPayload: { power: 2 },
					effectiveAt: "2026-04-20T09:45:00.000Z",
					createdAt: "2026-04-20T09:45:00.000Z",
				},
				"2026-04-20T09:45:00.000Z",
				"2026-04-20T09:45:00.000Z",
			);
		});

		const createBranchResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createBranch`,
			{
				sourceBranchRef: branchRef,
				branchKind: "campaign-fork",
				branchLabel: "Post Sheet Race Fork",
				visibility: "public",
			},
			writerHeaders,
		);
		expect(await createBranchResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterBranch, DID),
		).toHaveLength(1);
		expect(
			await store.listRecords(COLLECTIONS.characterSheet, DID),
		).toHaveLength(1);
	});

	test("rejects recordConversion when source state changes during materialization", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const sourceSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Race Conversion Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const sourceSchemaAck = await sourceSchemaResponse.json();
		const sourceSchemaRef = sourceSchemaAck.emittedRecordRefs[0];

		const targetSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Race Conversion Target Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const targetSchemaAck = await targetSchemaResponse.json();
		const targetSchemaRef = targetSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: sourceSchemaRef,
				displayName: "Race Conversion Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [sheetRef, branchRef] = createSheetAck.emittedRecordRefs;
		const sourceBranch =
			await store.getRecord<AppCeruliaCoreCharacterBranch.Main>(branchRef);
		expect(sourceBranch).not.toBeNull();

		store.onApplyWritesCall(DID, 2, () => {
			store.seedRecord(
				`at://${DID}/${COLLECTIONS.characterAdvancement}/race-conversion`,
				{
					$type: COLLECTIONS.characterAdvancement,
					characterBranchRef: branchRef,
					advancementKind: "milestone",
					deltaPayload: { power: 2 },
					effectiveAt: "2026-04-20T10:00:00.000Z",
					createdAt: "2026-04-20T10:00:00.000Z",
				},
				"2026-04-20T10:00:00.000Z",
				"2026-04-20T10:00:00.000Z",
			);
			store.seedRecord(
				branchRef,
				{
					...sourceBranch!.value,
					sheetRef,
					updatedAt: "2026-04-20T10:00:01.000Z",
				},
				sourceBranch!.createdAt,
				"2026-04-20T10:00:01.000Z",
			);
		});

		const conversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T11:00:00.000Z",
			},
			writerHeaders,
		);
		expect(await conversionResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterConversion, DID),
		).toHaveLength(0);
		expect(
			await store.listRecords(COLLECTIONS.characterSheet, DID),
		).toHaveLength(1);
	});

	test("rejects recordConversion when source child records change before the first write", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const sourceSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Child Race Conversion Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const sourceSchemaAck = await sourceSchemaResponse.json();
		const sourceSchemaRef = sourceSchemaAck.emittedRecordRefs[0];

		const targetSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Child Race Conversion Target Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const targetSchemaAck = await targetSchemaResponse.json();
		const targetSchemaRef = targetSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: sourceSchemaRef,
				displayName: "Child Race Conversion Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		store.onApplyWritesCall(DID, 2, () => {
			store.seedRecord(
				`at://${DID}/${COLLECTIONS.characterAdvancement}/child-race-conversion`,
				{
					$type: COLLECTIONS.characterAdvancement,
					characterBranchRef: branchRef,
					advancementKind: "milestone",
					deltaPayload: { power: 2 },
					effectiveAt: "2026-04-20T10:00:00.000Z",
					createdAt: "2026-04-20T10:00:00.000Z",
				},
				"2026-04-20T10:00:00.000Z",
				"2026-04-20T10:00:00.000Z",
			);
		});

		const conversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T11:00:00.000Z",
			},
			writerHeaders,
		);
		expect(await conversionResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterConversion, DID),
		).toHaveLength(0);
	});

	test("returns rebase-needed when recordConversion validation snapshot becomes stale before the fence", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const sourceSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Stale Validation Conversion Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const sourceSchemaAck = await sourceSchemaResponse.json();
		const sourceSchemaRef = sourceSchemaAck.emittedRecordRefs[0];

		const targetSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Stale Validation Conversion Target Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const targetSchemaAck = await targetSchemaResponse.json();
		const targetSchemaRef = targetSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: sourceSchemaRef,
				displayName: "Stale Validation Conversion Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;
		const advancementUri =
			`at://${DID}/${COLLECTIONS.characterAdvancement}/stale-validation-conversion`;
		store.seedRecord(
			advancementUri,
			{
				$type: COLLECTIONS.characterAdvancement,
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: { power: "bad" },
				effectiveAt: "2026-04-20T10:00:00.000Z",
				createdAt: "2026-04-20T10:00:00.000Z",
			},
			"2026-04-20T10:00:00.000Z",
			"2026-04-20T10:00:00.000Z",
		);

		store.onListCall(COLLECTIONS.characterAdvancement, DID, 2, () => {
			store.seedRecord(
				advancementUri,
				{
					$type: COLLECTIONS.characterAdvancement,
					characterBranchRef: branchRef,
					advancementKind: "milestone",
					deltaPayload: { power: 2 },
					effectiveAt: "2026-04-20T10:00:00.000Z",
					createdAt: "2026-04-20T10:00:00.000Z",
				},
				"2026-04-20T10:00:00.000Z",
				"2026-04-20T10:00:01.000Z",
			);
		});

		const conversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T11:00:00.000Z",
			},
			writerHeaders,
		);
		expect(await conversionResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
	});

	test("returns rebase-needed when recordConversion source changes before the final branch update", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const sourceSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Final Update Race Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const sourceSchemaAck = await sourceSchemaResponse.json();
		const sourceSchemaRef = sourceSchemaAck.emittedRecordRefs[0];

		const targetSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Final Update Race Target Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const targetSchemaAck = await targetSchemaResponse.json();
		const targetSchemaRef = targetSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: sourceSchemaRef,
				displayName: "Final Update Race Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		store.onApplyWritesCall(DID, 2, () => {
			store.seedRecord(
				`at://${DID}/${COLLECTIONS.characterAdvancement}/final-update-race`,
				{
					$type: COLLECTIONS.characterAdvancement,
					characterBranchRef: branchRef,
					advancementKind: "milestone",
					deltaPayload: { power: 2 },
					effectiveAt: "2026-04-20T11:30:00.000Z",
					createdAt: "2026-04-20T11:30:00.000Z",
				},
				"2026-04-20T11:30:00.000Z",
				"2026-04-20T11:30:00.000Z",
			);
		});

		const conversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T11:00:00.000Z",
			},
			writerHeaders,
		);
		expect(await conversionResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterConversion, DID),
		).toHaveLength(0);
		expect(
			await store.listRecords(COLLECTIONS.characterSheet, DID),
		).toHaveLength(1);
	});

	test("rejects backdated recordConversion timestamps", async () => {
		const { app } = createTestApp();
		const writerHeaders = authHeaders();

		const sourceSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Backdated Conversion Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const sourceSchemaAck = await sourceSchemaResponse.json();
		const sourceSchemaRef = sourceSchemaAck.emittedRecordRefs[0];

		const targetSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Backdated Conversion Target Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const targetSchemaAck = await targetSchemaResponse.json();
		const targetSchemaRef = targetSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: sourceSchemaRef,
				displayName: "Backdated Conversion Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		const advancementResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordAdvancement`,
			{
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: { power: 2 },
				effectiveAt: "2026-04-20T10:30:00.000Z",
			},
			writerHeaders,
		);
		expectAccepted(await advancementResponse.json());

		const conversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T10:00:00.000Z",
			},
			writerHeaders,
		);
		expect(await conversionResponse.json()).toMatchObject({
			resultKind: "rejected",
			reasonCode: "invalid-required-field",
			message: "convertedAt must be later than active advancements in the current epoch",
		});
	});

	test("rejects recordConversion when the carried-forward state does not satisfy target-only required fields", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();

		const sourceSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Carry Forward Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const sourceSchemaAck = await sourceSchemaResponse.json();
		const sourceSchemaRef = sourceSchemaAck.emittedRecordRefs[0];

		const targetSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Carry Forward Target Schema",
				fieldDefs: [
					{
						fieldId: "heart",
						label: "Heart",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const targetSchemaAck = await targetSchemaResponse.json();
		const targetSchemaRef = targetSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: sourceSchemaRef,
				displayName: "Carry Forward Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		const conversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T12:00:00.000Z",
			},
			writerHeaders,
		);
		expect(await conversionResponse.json()).toMatchObject({
			resultKind: "rejected",
			reasonCode: "invalid-required-field",
			message: "heart is required",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterConversion, DID),
		).toHaveLength(0);
	});

	test("allows same-timestamp recordConversion when generated tid is later", async () => {
		const { app } = createTestApp();
		const writerHeaders = authHeaders();

		const sourceSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Same Timestamp Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const sourceSchemaAck = await sourceSchemaResponse.json();
		const sourceSchemaRef = sourceSchemaAck.emittedRecordRefs[0];

		const emocloSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Same Timestamp Emoclo Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const emocloSchemaAck = await emocloSchemaResponse.json();
		const emocloSchemaRef = emocloSchemaAck.emittedRecordRefs[0];

		const fooSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.foo",
				schemaVersion: "1.0.0",
				title: "Same Timestamp Foo Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const fooSchemaAck = await fooSchemaResponse.json();
		const fooSchemaRef = fooSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: sourceSchemaRef,
				displayName: "Same Timestamp Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		const advancementResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordAdvancement`,
			{
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: { power: 2 },
				effectiveAt: "2026-04-20T10:30:00.000Z",
			},
			writerHeaders,
		);
		expectAccepted(await advancementResponse.json());

		const firstConversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: emocloSchemaRef,
				convertedAt: "2026-04-20T10:30:00.000Z",
			},
			writerHeaders,
		);
		const firstConversionAck = await firstConversionResponse.json();
		expectAccepted(firstConversionAck);
		expect(firstConversionAck.emittedRecordRefs[1]).toBe(branchRef);

		const secondConversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 2,
				targetRulesetNsid: "app.cerulia.rules.foo",
				targetSheetSchemaRef: fooSchemaRef,
				convertedAt: "2026-04-20T10:30:00.000Z",
			},
			writerHeaders,
		);
		const secondConversionAck = await secondConversionResponse.json();
		expectAccepted(secondConversionAck);
		expect(secondConversionAck.emittedRecordRefs[1]).toBe(branchRef);

		const branchViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`,
		);
		expect(branchViewResponse.status).toBe(200);
		const branchView = await branchViewResponse.json();
		expect(branchView.sheetSummary.rulesetNsid).toBe("app.cerulia.rules.foo");
		expect(branchView.branchSummary.revision).toBe(3);
		expect(branchView.conversionSummaries).toHaveLength(2);
		expect(branchView.conversionSummaries[0].targetRulesetNsid).toBe(
			"app.cerulia.rules.foo",
		);
		expect(branchView.conversionSummaries[1].targetRulesetNsid).toBe(
			"app.cerulia.rules.emoclo",
		);
	});

	test("rejects createBranch when source branch metadata changes during materialization", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Metadata Race Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Metadata Race Character",
				stats: { power: 1 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [sheetRef, branchRef] = createSheetAck.emittedRecordRefs;
		const sourceBranch =
			await store.getRecord<AppCeruliaCoreCharacterBranch.Main>(branchRef);
		expect(sourceBranch).not.toBeNull();

		store.onApplyWritesCall(DID, 2, () => {
			store.seedRecord(
				branchRef,
				{
					...sourceBranch!.value,
					sheetRef,
					branchLabel: "Renamed During Fork",
					updatedAt: "2026-04-20T09:30:01.000Z",
				},
				sourceBranch!.createdAt,
				"2026-04-20T09:30:01.000Z",
			);
		});

		const createBranchResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createBranch`,
			{
				sourceBranchRef: branchRef,
				branchKind: "campaign-fork",
				branchLabel: "Metadata Race Fork",
				visibility: "public",
			},
			writerHeaders,
		);
		expect(await createBranchResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
			message: "source branch state changed during materialization",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterBranch, DID),
		).toHaveLength(1);
	});

	test("returns rebase-needed when recordAdvancement branch state changes before atomic write", async () => {
		const store = new InterleavingMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Advancement Conflict Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Advancement Character",
				stats: {
					power: 55,
				},
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const branchRef = createSheetAck.emittedRecordRefs[1];
		const branch = await store.getRecord<AppCeruliaCoreCharacterBranch.Main>(
			branchRef,
		);
		if (!branch) {
			throw new Error("expected branch record to exist");
		}

		store.onApplyWritesCall(DID, 2, () => {
			store.seedRecord(
				branchRef,
				{
					...branch.value,
					updatedAt: "2026-04-19T00:00:00.000Z",
				},
				branch.createdAt,
				"2026-04-19T00:00:00.000Z",
			);
		});

		const advancementResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordAdvancement`,
			{
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: {
					power: 60,
				},
				effectiveAt: "2026-04-19T00:00:00.000Z",
			},
			writerHeaders,
		);
		const advancementAck = await advancementResponse.json();

		expect(advancementAck.resultKind).toBe("rebase-needed");
		expect(advancementAck.reasonCode).toBe("rebase-required");
	});

	test("does not persist partial records when recordAdvancement applyWrites fails mid-batch", async () => {
		const store = new FailingAtomicMemoryRecordStore();
		const { app } = createTestApp(store);
		const writerHeaders = authHeaders();

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Advancement Mid Batch Failure Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: schemaRef,
				displayName: "Advancement Mid Batch Character",
				stats: {
					power: 55,
				},
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const branchRef = createSheetAck.emittedRecordRefs[1];
		const branchBefore = await store.getRecord<AppCeruliaCoreCharacterBranch.Main>(
			branchRef,
		);
		if (!branchBefore) {
			throw new Error("expected branch record to exist");
		}

		store.failNextApplyWrites(DID, 1);

		const advancementResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordAdvancement`,
			{
				characterBranchRef: branchRef,
				advancementKind: "milestone",
				deltaPayload: {
					power: 60,
				},
				effectiveAt: "2026-04-19T00:00:00.000Z",
			},
			writerHeaders,
		);

		expect(advancementResponse.status).toBe(500);
		expect(await advancementResponse.json()).toMatchObject({
			error: "InternalError",
		});
		expect(
			await store.listRecords(COLLECTIONS.characterAdvancement, DID),
		).toHaveLength(0);
		const branchAfter = await store.getRecord<AppCeruliaCoreCharacterBranch.Main>(
			branchRef,
		);
		expect(branchAfter).toEqual(branchBefore);
	});

	test("enforces createBranch and recordConversion conflict rules", async () => {
		const { app } = createTestApp();
		const writerHeaders = authHeaders();
		const otherWriterHeaders = authHeaders("did:plc:bob", [AUTH_SCOPES.writer]);

		const sourceSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Conflict Source Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const sourceSchemaAck = await sourceSchemaResponse.json();
		const sourceSchemaRef = sourceSchemaAck.emittedRecordRefs[0];

		const targetSchemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.emoclo",
				schemaVersion: "1.0.0",
				title: "Conflict Target Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "Power",
						fieldType: "integer",
						required: true,
					},
				],
			},
			writerHeaders,
		);
		const targetSchemaAck = await targetSchemaResponse.json();
		const targetSchemaRef = targetSchemaAck.emittedRecordRefs[0];

		const createSheetResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
			{
				rulesetNsid: "app.cerulia.rules.coc7",
				sheetSchemaRef: sourceSchemaRef,
				displayName: "Conflict Character",
				stats: { power: 10 },
				initialBranchVisibility: "public",
			},
			writerHeaders,
		);
		const createSheetAck = await createSheetResponse.json();
		const [, branchRef] = createSheetAck.emittedRecordRefs;

		const sameRulesetConversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.coc7",
				targetSheetSchemaRef: sourceSchemaRef,
				convertedAt: "2026-04-20T12:00:00.000Z",
			},
			writerHeaders,
		);
		expect(await sameRulesetConversionResponse.json()).toMatchObject({
			resultKind: "rejected",
			reasonCode: "invalid-schema-link",
		});

		const foreignConversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T12:05:00.000Z",
			},
			otherWriterHeaders,
		);
		expect(await foreignConversionResponse.json()).toMatchObject({
			resultKind: "rejected",
			reasonCode: "forbidden-owner-mismatch",
		});

		const updateBranchResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.updateBranch`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				branchLabel: "Conflict Character v2",
			},
			writerHeaders,
		);
		expectAccepted(await updateBranchResponse.json());

		const staleConversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 1,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T12:10:00.000Z",
			},
			writerHeaders,
		);
		expect(await staleConversionResponse.json()).toMatchObject({
			resultKind: "rebase-needed",
		});

		const retireBranchResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.retireBranch`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 2,
			},
			writerHeaders,
		);
		expectAccepted(await retireBranchResponse.json());

		const retiredConversionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
			{
				characterBranchRef: branchRef,
				expectedRevision: 3,
				targetRulesetNsid: "app.cerulia.rules.emoclo",
				targetSheetSchemaRef: targetSchemaRef,
				convertedAt: "2026-04-20T12:20:00.000Z",
			},
			writerHeaders,
		);
		expect(await retiredConversionResponse.json()).toMatchObject({
			resultKind: "rejected",
			reasonCode: "terminal-state-readonly",
		});
	});

	test("keeps archived campaigns fully read-only, including archivedAt", async () => {
		const { app, store } = createTestApp();
		const writerHeaders = authHeaders();
		const campaignRef = `at://${DID}/${COLLECTIONS.campaign}/archived-campaign`;

		store.seedRecord(
			campaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "archived-campaign",
				title: "Archived Campaign",
				rulesetNsid: "app.cerulia.rules.coc7",
				visibility: "public",
				archivedAt: "2026-04-20T00:00:00.000Z",
				createdAt: "2026-04-20T00:00:00.000Z",
				updatedAt: "2026-04-20T00:00:00.000Z",
			},
			"2026-04-20T00:00:00.000Z",
			"2026-04-20T00:00:00.000Z",
		);

		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.update`,
			{
				campaignRef,
				archivedAt: "2026-04-21T00:00:00.000Z",
			},
			writerHeaders,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.resultKind).toBe("rejected");
		expect(payload.reasonCode).toBe("terminal-state-readonly");
	});

	test("supports scenario, house, campaign, and rule profile flows", async () => {
		const { app } = createTestApp();
		const ownerHeaders = authHeaders();
		const readerHeaders = authHeaders(DID, [AUTH_SCOPES.reader]);

		const schemaResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Scenario Schema",
				fieldDefs: [
					{
						fieldId: "power",
						label: "POW",
						fieldType: "integer",
						required: true,
					},
				],
			},
			ownerHeaders,
		);
		const schemaAck = await schemaResponse.json();
		const schemaRef = schemaAck.emittedRecordRefs[0];

		const houseCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.create`,
			{
				title: "Arkham Club",
				visibility: "public",
			},
			ownerHeaders,
		);
		const houseAck = await houseCreateResponse.json();
		expectAccepted(houseAck);
		const houseRef = houseAck.emittedRecordRefs[0];

		const ruleCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.createProfile`,
			{
				baseRulesetNsid: "app.cerulia.rules.coc7",
				profileTitle: "Club Overlay",
				scopeKind: "house-shared",
				scopeRef: houseRef,
				rulesPatchUri: "https://example.com/rules/club-overlay",
			},
			ownerHeaders,
		);
		const ruleAck = await ruleCreateResponse.json();
		expectAccepted(ruleAck);
		const ruleProfileRef = ruleAck.emittedRecordRefs[0];

		const houseUpdateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.update`,
			{
				houseRef,
				defaultRuleProfileRefs: [ruleProfileRef],
			},
			ownerHeaders,
		);
		expect((await houseUpdateResponse.json()).resultKind).toBe("accepted");

		const ruleUpdateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.updateProfile`,
			{
				ruleProfileRef,
				profileTitle: "Club Overlay v2",
			},
			ownerHeaders,
		);
		expect((await ruleUpdateResponse.json()).resultKind).toBe("accepted");

		const campaignCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.create`,
			{
				title: "Masks Campaign",
				rulesetNsid: "app.cerulia.rules.coc7",
				houseRef,
				visibility: "public",
			},
			ownerHeaders,
		);
		const campaignAck = await campaignCreateResponse.json();
		expectAccepted(campaignAck);
		const campaignRef = campaignAck.emittedRecordRefs[0];

		const publicSessionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.create`,
			{
				role: "gm",
				playedAt: "2026-04-21T09:00:00.000Z",
				scenarioLabel: "Masks Intro",
				campaignRef,
				externalArchiveUris: ["https://example.com/archive/masks-intro"],
				visibility: "public",
			},
			ownerHeaders,
		);
		const publicSessionAck = await publicSessionResponse.json();
		expect(publicSessionAck.resultKind).toBe("accepted");
		const publicSessionRef = publicSessionAck.emittedRecordRefs[0];

		const draftSessionResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.create`,
			{
				role: "gm",
				playedAt: "2026-04-22T09:00:00.000Z",
				scenarioLabel: "Masks Draft",
				campaignRef,
				visibility: "draft",
			},
			ownerHeaders,
		);
		expect((await draftSessionResponse.json()).resultKind).toBe("accepted");

		const scenarioCreateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.create`,
			{
				title: "Shadows of Arkham",
				rulesetNsid: "app.cerulia.rules.coc7",
				recommendedSheetSchemaRef: schemaRef,
				sourceCitationUri: "https://example.com/scenario/shadows-of-arkham",
				summary: "A spoiler-safe introduction.",
			},
			ownerHeaders,
		);
		const scenarioAck = await scenarioCreateResponse.json();
		expectAccepted(scenarioAck);
		const scenarioRef = scenarioAck.emittedRecordRefs[0];

		const scenarioUpdateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.update`,
			{
				scenarioRef,
				summary: "Updated summary.",
			},
			ownerHeaders,
		);
		expect((await scenarioUpdateResponse.json()).resultKind).toBe("accepted");

		const scenarioListResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.list?rulesetNsid=${encodeURIComponent("app.cerulia.rules.coc7")}`,
		);
		expect(scenarioListResponse.status).toBe(404);

		const scenarioViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.getView?scenarioRef=${encodeURIComponent(scenarioRef)}`,
		);
		const scenarioView = await scenarioViewResponse.json();
		expect(scenarioView.scenarioSummary.summary).toBe("Updated summary.");
		expect(scenarioView.scenarioSummary.hasRecommendedSheetSchema).toBe(true);

		const ruleListResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.listProfiles`,
			readerHeaders,
		);
		const ruleList = await ruleListResponse.json();
		expect(ruleList.items).toHaveLength(1);
		expect(ruleList.items[0].profileTitle).toBe("Club Overlay v2");

		const ruleViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.rule.getProfile?ruleProfileRef=${encodeURIComponent(ruleProfileRef)}`,
			readerHeaders,
		);
		const ruleView = await ruleViewResponse.json();
		expect(ruleView.ruleProfile.scopeRef).toBe(houseRef);

		const campaignViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.campaign.getView?campaignRef=${encodeURIComponent(campaignRef)}`,
		);
		const campaignView = await campaignViewResponse.json();
		expect(campaignView.campaignSummary.title).toBe("Masks Campaign");
		expect(campaignView.sessionSummaries).toHaveLength(1);
		expect(
			campaignView.sessionSummaries[0].externalArchiveUris,
		).toBeUndefined();
		expect(campaignView.ruleOverlaySummary.ruleProfiles).toHaveLength(1);
		expect(campaignView.ruleOverlaySummary.ruleProfiles[0].profileTitle).toBe(
			"Club Overlay v2",
		);

		const publicSessionViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.session.getView?sessionRef=${encodeURIComponent(publicSessionRef)}`,
		);
		const publicSessionView = await publicSessionViewResponse.json();
		expect(publicSessionView.sessionSummary.externalArchiveUris).toEqual([
			"https://example.com/archive/masks-intro",
		]);

		const houseViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.getView?houseRef=${encodeURIComponent(houseRef)}`,
		);
		const houseView = await houseViewResponse.json();
		expect(houseView.houseSummary.title).toBe("Arkham Club");
		expect(houseView.campaignSummaries).toHaveLength(1);
		expect(houseView.sessionSummaries).toHaveLength(1);
		expect(houseView.sessionSummaries[0].sessionRef).toBe(publicSessionRef);
		expect(houseView.sessionSummaries[0].externalArchiveUris).toBeUndefined();
	});

	test("does not wait for optional projection ingest on accepted scenario writes", async () => {
		const { app } = createTestAppWithProjectionFeature({
			projectionIngestFeature: {
				async noteRepoDid() {
					await new Promise(() => undefined);
				},
			},
		});

		const response = await Promise.race([
			postJson(
				app,
				`${XRPC_PREFIX}/app.cerulia.scenario.create`,
				{
					title: "Projection Timeout Scenario",
					rulesetNsid: "app.cerulia.rules.coc7",
					sourceCitationUri:
						"https://example.com/scenario/projection-timeout",
					summary: "Projection should not block this write.",
				},
			),
			new Promise<Response>((_, reject) => {
				setTimeout(
					() => reject(new Error("projection ingest blocked response")),
					200,
				);
			}),
		]);

		expect(response.status).toBe(200);
		const ack = await response.json();
		expect(ack.resultKind).toBe("accepted");
	});

	test("notifies optional projection ingest for accepted scenario create and update", async () => {
		const notifiedRepoDids: string[] = [];
		const { app } = createTestAppWithProjectionFeature({
			projectionIngestFeature: {
				async noteRepoDid(repoDid: string) {
					notifiedRepoDids.push(repoDid);
				},
			},
		});

		const createResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.create`,
			{
				title: "Projection Notify Scenario",
				rulesetNsid: "app.cerulia.rules.coc7",
				sourceCitationUri: "https://example.com/scenario/projection-notify",
				summary: "Projection notification should fire.",
			},
		);
		const createAck = await createResponse.json();
		expect(createAck.resultKind).toBe("accepted");

		const scenarioRef = createAck.emittedRecordRefs[0];
		const updateResponse = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.update`,
			{
				scenarioRef,
				summary: "Projection notification should also fire on update.",
			},
		);
		const updateAck = await updateResponse.json();
		expect(updateAck.resultKind).toBe("accepted");
		expect(notifiedRepoDids).toEqual([DID, DID]);
	});

	test("does not notify optional projection ingest for rejected scenario writes", async () => {
		const notifiedRepoDids: string[] = [];
		const { app } = createTestAppWithProjectionFeature({
			projectionIngestFeature: {
				async noteRepoDid(repoDid: string) {
					notifiedRepoDids.push(repoDid);
				},
			},
		});

		const response = await postJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.create`,
			{
				title: "Rejected Projection Scenario",
				recommendedSheetSchemaRef: `at://${DID}/${COLLECTIONS.characterSheetSchema}/schema`,
				sourceCitationUri: "https://example.com/scenario/rejected-projection",
				summary: "This write should be rejected before notification.",
			},
		);
		const payload = await response.json();
		expect(payload.resultKind).toBe("rejected");
		expect(notifiedRepoDids).toEqual([]);
	});

	test("omits public sessions whose parent campaign is draft from public house view", async () => {
		const { app, store } = createTestApp();
		const houseRef = `at://${DID}/${COLLECTIONS.house}/house-public-filter`;
		const publicCampaignRef = `at://${DID}/${COLLECTIONS.campaign}/public-campaign`;
		const draftCampaignRef = `at://${DID}/${COLLECTIONS.campaign}/draft-campaign`;
		const publicSessionRef = `at://${DID}/${COLLECTIONS.session}/public-session`;
		const draftParentSessionRef = `at://${DID}/${COLLECTIONS.session}/draft-parent-session`;

		store.seedRecord(
			houseRef,
			{
				$type: COLLECTIONS.house,
				houseId: "house-public-filter",
				title: "Visibility House",
				visibility: "public",
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			"2026-04-21T00:00:00.000Z",
			"2026-04-21T00:00:00.000Z",
		);
		store.seedRecord(
			publicCampaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "public-campaign",
				title: "Public Campaign",
				houseRef,
				rulesetNsid: "app.cerulia.rules.coc7",
				visibility: "public",
				createdAt: "2026-04-21T01:00:00.000Z",
				updatedAt: "2026-04-21T01:00:00.000Z",
			},
			"2026-04-21T01:00:00.000Z",
			"2026-04-21T01:00:00.000Z",
		);
		store.seedRecord(
			draftCampaignRef,
			{
				$type: COLLECTIONS.campaign,
				campaignId: "draft-campaign",
				title: "Draft Campaign",
				houseRef,
				rulesetNsid: "app.cerulia.rules.coc7",
				visibility: "draft",
				createdAt: "2026-04-21T01:05:00.000Z",
				updatedAt: "2026-04-21T01:05:00.000Z",
			},
			"2026-04-21T01:05:00.000Z",
			"2026-04-21T01:05:00.000Z",
		);
		store.seedRecord(
			publicSessionRef,
			{
				$type: COLLECTIONS.session,
				role: "gm",
				campaignRef: publicCampaignRef,
				playedAt: "2026-04-21T02:00:00.000Z",
				scenarioLabel: "Visible Session",
				visibility: "public",
				createdAt: "2026-04-21T02:00:00.000Z",
				updatedAt: "2026-04-21T02:00:00.000Z",
			},
			"2026-04-21T02:00:00.000Z",
			"2026-04-21T02:00:00.000Z",
		);
		store.seedRecord(
			draftParentSessionRef,
			{
				$type: COLLECTIONS.session,
				role: "gm",
				campaignRef: draftCampaignRef,
				playedAt: "2026-04-21T02:05:00.000Z",
				scenarioLabel: "Hidden Session",
				visibility: "public",
				createdAt: "2026-04-21T02:05:00.000Z",
				updatedAt: "2026-04-21T02:05:00.000Z",
			},
			"2026-04-21T02:05:00.000Z",
			"2026-04-21T02:05:00.000Z",
		);

		const houseViewResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.house.getView?houseRef=${encodeURIComponent(houseRef)}`,
		);
		const houseView = await houseViewResponse.json();

		expect(houseView.campaignSummaries).toHaveLength(1);
		expect(houseView.campaignSummaries[0].campaignRef).toBe(publicCampaignRef);
		expect(houseView.sessionSummaries).toHaveLength(1);
		expect(houseView.sessionSummaries[0].sessionRef).toBe(publicSessionRef);
	});
});
