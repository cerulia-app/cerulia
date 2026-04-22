import { describe, expect, test } from "bun:test";
import type { AppCeruliaCoreScenario } from "@cerulia/protocol";
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

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
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
	const sql = await readFile(
		join(import.meta.dir, "..", "migrations", "0001_initial.sql"),
		"utf8",
	);
	for (const statement of splitStatements(sql)) {
		db.run(statement);
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

	test("serves scenario catalog from the derived store and rebuilds on each request", async () => {
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

		const app = createProjectionApp({
			source,
			catalogStore: await createSqlScenarioCatalogStore(),
		});

		const firstResponse = await getJson(
			app,
			`${XRPC_PREFIX}/app.cerulia.scenario.list?rulesetNsid=${encodeURIComponent("app.cerulia.rules.coc7")}`,
		);
		expect(firstResponse.status).toBe(200);
		const firstPayload = await firstResponse.json();
		expect(() =>
			lexicons.assertValidXrpcOutput("app.cerulia.scenario.list", firstPayload),
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
});