import { describe, expect, test } from "bun:test";
import { parseAtUri, type AppCeruliaCoreScenario } from "@cerulia/protocol";
import { lexicons } from "@cerulia/protocol";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createProjectionApp } from "./app.js";
import { COLLECTIONS, XRPC_PREFIX } from "./constants.js";
import type { CanonicalRecordSource, StoredRecord } from "./source.js";
import { BunSqlDriver } from "./store/bun-sqlite.js";
import { SqlScenarioCatalogStore } from "./store/scenario-catalog.js";

const DID = "did:plc:alice";

function buildAtUri(collection: string, rkey: string, repoDid = DID): string {
	return `at://${repoDid}/${collection}/${rkey}`;
}

function splitStatements(sql: string): string[] {
	return sql
		.split(";")
		.map((statement) => statement.trim())
		.filter((statement) => statement.length > 0);
}

function asBindings(params: unknown[]): SQLQueryBindings[] {
	return params as SQLQueryBindings[];
}

class MemoryCanonicalRecordSource implements CanonicalRecordSource {
	private readonly records = new Map<string, StoredRecord<unknown>>();
	private readonly failingRepoDids = new Set<string>();

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		const record = this.records.get(uri);
		return (record as StoredRecord<T> | undefined) ?? null;
	}

	seedRecord(
		uri: string,
		value: unknown,
		createdAt: string,
		updatedAt: string,
	) {
		const parsed = parseAtUri(uri);
		this.records.set(uri, {
			uri,
			repoDid: parsed.repoDid,
			collection: parsed.collection,
			rkey: parsed.rkey,
			value,
			createdAt,
			updatedAt,
		});
	}

	seedScenario(
		rkey: string,
		value: AppCeruliaCoreScenario.Main,
		repoDid = DID,
	): void {
		const uri = buildAtUri(COLLECTIONS.scenario, rkey, repoDid);
		this.records.set(uri, {
			uri,
			repoDid,
			collection: COLLECTIONS.scenario,
			rkey,
			value,
			createdAt: value.createdAt,
			updatedAt: value.updatedAt,
		});
	}

	setRepoFailure(repoDid: string, shouldFail: boolean) {
		if (shouldFail) {
			this.failingRepoDids.add(repoDid);
			return;
		}

		this.failingRepoDids.delete(repoDid);
	}

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		if (repoDid && this.failingRepoDids.has(repoDid)) {
			throw new Error(`failed to load repo ${repoDid}`);
		}

		return Array.from(this.records.values()).filter((record) => {
			return (
				record.collection === collection &&
				(repoDid === undefined || record.repoDid === repoDid)
			);
		}) as StoredRecord<T>[];
	}
}

async function createSqlScenarioCatalogStore() {
	const db = new Database(":memory:");
	for (const filename of [
		"0001_initial.sql",
		"0002_known_repos.sql",
		"0003_scenario_catalog_snapshots.sql",
	]) {
		const sql = await readFile(
			join(import.meta.dir, "..", "migrations", filename),
			"utf8",
		);
		for (const statement of splitStatements(sql)) {
			db.run(statement);
		}
	}

	return new SqlScenarioCatalogStore({
		async get<T>(sqlText: string, params: unknown[] = []) {
			const row = db.query(sqlText).get(...asBindings(params));
			return (row as T | undefined) ?? null;
		},
		async all<T>(sqlText: string, params: unknown[] = []) {
			return db.query(sqlText).all(...asBindings(params)) as T[];
		},
		async run(sqlText: string, params: unknown[] = []) {
			const result = db.query(sqlText).run(...asBindings(params)) as {
				changes?: number;
			};
			return result.changes;
		},
	});
}

async function getJson(app: ReturnType<typeof createProjectionApp>, path: string) {
	return app.request(path);
}

async function postJson(
	app: ReturnType<typeof createProjectionApp>,
	path: string,
	body: unknown,
	headers?: Record<string, string>,
) {
	return app.request(path, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...headers,
		},
		body: JSON.stringify(body),
	});
}

describe("createProjectionApp", () => {
	test("returns a health response", async () => {
		const app = createProjectionApp({
			source: new MemoryCanonicalRecordSource(),
			catalogStore: await createSqlScenarioCatalogStore(),
		});

		const response = await app.request("/_health");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	test("serves scenario catalog after internal repo ingest", async () => {
		const source = new MemoryCanonicalRecordSource();
		source.seedScenario("zeta", {
			$type: COLLECTIONS.scenario,
			title: "Zeta Mission",
			rulesetNsid: "app.cerulia.rules.coc7",
			recommendedSheetSchemaRef: buildAtUri(
				"app.cerulia.core.characterSheetSchema",
				"schema-zeta",
			),
			sourceCitationUri: "https://example.com/scenario/zeta",
			summary: "Late alphabet scenario.",
			ownerDid: DID,
			createdAt: "2026-04-22T00:00:00.000Z",
			updatedAt: "2026-04-22T00:00:00.000Z",
		});
		source.seedRecord(
			buildAtUri("app.cerulia.core.characterSheetSchema", "schema-zeta"),
			{
				$type: "app.cerulia.core.characterSheetSchema",
				baseRulesetNsid: "app.cerulia.rules.coc7",
				schemaVersion: "1.0.0",
				title: "Zeta Schema",
				ownerDid: DID,
				createdAt: "2026-04-22T00:00:00.000Z",
				fieldDefs: [],
			},
			"2026-04-22T00:00:00.000Z",
			"2026-04-22T00:00:00.000Z",
		);

		const app = createProjectionApp({
			source,
			catalogStore: await createSqlScenarioCatalogStore(),
			internalIngestToken: "projection-test-token",
		});

		const firstIngestResponse = await postJson(
			app,
			"/internal/ingest/repo",
			{ repoDid: DID },
			{ authorization: "Bearer projection-test-token" },
		);
		expect(firstIngestResponse.status).toBe(200);

		const firstResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.dev.scenario.list?rulesetNsid=${encodeURIComponent("app.cerulia.rules.coc7")}`,
		);
		expect(firstResponse.status).toBe(200);
		const firstPayload = await firstResponse.json();
		expect(() =>
			lexicons.assertValidXrpcOutput("app.cerulia.dev.scenario.list", firstPayload),
		).not.toThrow();
		expect(firstPayload.items).toHaveLength(1);
		expect(firstPayload.items[0].title).toBe("Zeta Mission");
		expect(firstPayload.items[0].hasRecommendedSheetSchema).toBe(true);

		source.seedScenario("alpha", {
			$type: COLLECTIONS.scenario,
			title: "Alpha Mission",
			rulesetNsid: "app.cerulia.rules.coc7",
			recommendedSheetSchemaRef: undefined,
			sourceCitationUri: "https://example.com/scenario/alpha",
			summary: "Early alphabet scenario.",
			ownerDid: DID,
			createdAt: "2026-04-22T00:00:01.000Z",
			updatedAt: "2026-04-22T00:00:01.000Z",
		});

		const secondIngestResponse = await postJson(
			app,
			"/internal/ingest/repo",
			{ repoDid: DID },
			{ authorization: "Bearer projection-test-token" },
		);
		expect(secondIngestResponse.status).toBe(200);

		const secondResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.list?rulesetNsid=${encodeURIComponent("app.cerulia.rules.coc7")}`,
		);
		expect(secondResponse.status).toBe(200);
		const secondPayload = await secondResponse.json();
		expect(secondPayload.items).toHaveLength(2);
		expect(secondPayload.items.map((item: { title: string }) => item.title)).toEqual([
			"Alpha Mission",
			"Zeta Mission",
		]);
	});

	test("keeps the last ingested catalog when a repo ingest fails", async () => {
		const source = new MemoryCanonicalRecordSource();
		source.seedScenario("alpha", {
			$type: COLLECTIONS.scenario,
			title: "Alpha Mission",
			rulesetNsid: "app.cerulia.rules.coc7",
			recommendedSheetSchemaRef: undefined,
			sourceCitationUri: "https://example.com/scenario/alpha",
			summary: "Stable scenario snapshot.",
			ownerDid: DID,
			createdAt: "2026-04-22T00:00:00.000Z",
			updatedAt: "2026-04-22T00:00:00.000Z",
		});

		const app = createProjectionApp({
			source,
			catalogStore: await createSqlScenarioCatalogStore(),
			internalIngestToken: "projection-test-token",
		});

		const initialIngest = await postJson(
			app,
			"/internal/ingest/repo",
			{ repoDid: DID },
			{ authorization: "Bearer projection-test-token" },
		);
		expect(initialIngest.status).toBe(200);

		source.setRepoFailure(DID, true);
		const failedIngest = await postJson(
			app,
			"/internal/ingest/repo",
			{ repoDid: DID },
			{ authorization: "Bearer projection-test-token" },
		);
		expect(failedIngest.status).toBe(500);

		const listResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.list?rulesetNsid=${encodeURIComponent("app.cerulia.rules.coc7")}`,
		);
		expect(listResponse.status).toBe(200);
		const payload = await listResponse.json();
		expect(payload.items).toHaveLength(1);
		expect(payload.items[0].title).toBe("Alpha Mission");
	});

	test("rejects internal repo ingest with an invalid token", async () => {
		const app = createProjectionApp({
			source: new MemoryCanonicalRecordSource(),
			catalogStore: await createSqlScenarioCatalogStore(),
			internalIngestToken: "projection-test-token",
		});

		const response = await postJson(
			app,
			"/internal/ingest/repo",
			{ repoDid: DID },
			{ authorization: "Bearer wrong-token" },
		);
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			error: "Unauthorized",
			message: "invalid ingest token",
		});
	});

	test("rejects internal repo ingest without repoDid", async () => {
		const app = createProjectionApp({
			source: new MemoryCanonicalRecordSource(),
			catalogStore: await createSqlScenarioCatalogStore(),
			internalIngestToken: "projection-test-token",
		});

		const response = await postJson(
			app,
			"/internal/ingest/repo",
			{},
			{ authorization: "Bearer projection-test-token" },
		);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "InvalidRequest",
			message: "repoDid is required",
		});
	});
});