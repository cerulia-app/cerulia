import { Database, type Statement } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import type { AppCeruliaCoreScenario } from "@cerulia/protocol";
import { createWorkerApp } from "./worker.js";
import { COLLECTIONS, XRPC_PREFIX } from "../constants.js";
import type { D1DatabaseLike, D1StatementLike } from "../store/d1.js";
import type { CanonicalRecordSource, StoredRecord } from "../source.js";

class SqliteD1Statement implements D1StatementLike {
	constructor(
		private readonly statement: Statement,
		private readonly params: unknown[] = [],
	) {}

	bind(...values: unknown[]): D1StatementLike {
		return new SqliteD1Statement(this.statement, values);
	}

	async first<T>(): Promise<T | null> {
		return (this.statement.get(...this.params) as T | null) ?? null;
	}

	async all<T>() {
		return {
			results: this.statement.all(...this.params) as T[],
		};
	}

	async run(): Promise<unknown> {
		const result = this.statement.run(...this.params) as { changes?: number };
		return {
			meta: {
				changes: result.changes ?? 0,
			},
		};
	}
}

class SqliteD1Database implements D1DatabaseLike {
	constructor(private readonly db: Database) {}

	prepare(sql: string): D1StatementLike {
		return new SqliteD1Statement(this.db.query(sql));
	}
}

class MemoryCanonicalRecordSource implements CanonicalRecordSource {
	private readonly records = new Map<string, StoredRecord<unknown>>();
	private readonly failingRepoDids = new Set<string>();

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		const record = this.records.get(uri);
		return (record as StoredRecord<T> | undefined) ?? null;
	}

	seedScenario(rkey: string, value: AppCeruliaCoreScenario.Main) {
		const uri = `at://did:plc:alice/${COLLECTIONS.scenario}/${rkey}`;
		this.records.set(uri, {
			uri,
			repoDid: "did:plc:alice",
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

async function applyTestMigrations(db: Database) {
	for (const filename of [
		"0001_initial.sql",
		"0002_known_repos.sql",
		"0003_scenario_catalog_snapshots.sql",
	]) {
		const migration = await Bun.file(
			new URL(`../../migrations/${filename}`, import.meta.url),
		).text();
		db.exec(migration);
	}
}

describe("createWorkerApp", () => {
	test("serves scenario catalog through the D1-backed worker adapter", async () => {
		const db = new Database(":memory:");
		await applyTestMigrations(db);
		const source = new MemoryCanonicalRecordSource();
		source.seedScenario("alpha", {
			$type: COLLECTIONS.scenario,
			title: "Alpha Mission",
			rulesetNsid: "app.cerulia.rules.coc7",
			recommendedSheetSchemaRef: undefined,
			sourceCitationUri: "https://example.com/scenario/alpha",
			summary: "Scenario catalog through worker.",
			ownerDid: "did:plc:alice",
			createdAt: "2026-04-22T00:00:00.000Z",
			updatedAt: "2026-04-22T00:00:00.000Z",
		});

		const app = await createWorkerApp(
			{
				DB: new SqliteD1Database(db),
				CERULIA_PROJECTION_REPOS: "did:plc:alice",
			},
			{ source },
		);

		const response = await app.request(
			`${XRPC_PREFIX}/app.cerulia.scenario.list?rulesetNsid=${encodeURIComponent("app.cerulia.rules.coc7")}`,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.items).toHaveLength(1);
		expect(payload.items[0].title).toBe("Alpha Mission");
	});

	test("does not fail worker bootstrap when seeded repo rebuild fails", async () => {
		const db = new Database(":memory:");
		await applyTestMigrations(db);
		const source = new MemoryCanonicalRecordSource();
		source.setRepoFailure("did:plc:alice", true);

		const app = await createWorkerApp(
			{
				DB: new SqliteD1Database(db),
				CERULIA_PROJECTION_REPOS: "did:plc:alice",
			},
			{ source },
		);

		const response = await app.request("/_health");
		expect(response.status).toBe(200);
	});

	test("serves cached catalog without injected source and keeps ingest disabled", async () => {
		const db = new Database(":memory:");
		await applyTestMigrations(db);
		const source = new MemoryCanonicalRecordSource();
		source.seedScenario("cached", {
			$type: COLLECTIONS.scenario,
			title: "Cached Scenario",
			rulesetNsid: "app.cerulia.rules.coc7",
			recommendedSheetSchemaRef: undefined,
			sourceCitationUri: "https://example.com/scenario/cached",
			summary: "Served from cached catalog.",
			ownerDid: "did:plc:alice",
			createdAt: "2026-04-23T00:00:00.000Z",
			updatedAt: "2026-04-23T00:00:00.000Z",
		});
		const d1Database = new SqliteD1Database(db);

		await createWorkerApp(
			{
				DB: d1Database,
				CERULIA_PROJECTION_REPOS: "did:plc:alice",
				CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN: "projection-test-token",
			},
			{ source },
		);

		const app = await createWorkerApp({
			DB: d1Database,
			CERULIA_PROJECTION_REPOS: "did:plc:alice",
			CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN: "projection-test-token",
		});

		const response = await app.request(
			`${XRPC_PREFIX}/app.cerulia.scenario.list?rulesetNsid=${encodeURIComponent("app.cerulia.rules.coc7")}`,
		);
		expect(response.status).toBe(200);
		const payload = await response.json();
		expect(payload.items).toHaveLength(1);
		expect(payload.items[0].title).toBe("Cached Scenario");

		const ingestResponse = await app.request("/internal/ingest/repo", {
			method: "POST",
			headers: {
				authorization: "Bearer projection-test-token",
				"content-type": "application/json",
			},
			body: JSON.stringify({ repoDid: "did:plc:alice" }),
		});
		expect(ingestResponse.status).toBe(404);
	});
});
