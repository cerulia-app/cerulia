import { describe, expect, test } from "bun:test";
import { COLLECTIONS } from "../constants.js";
import { SqlRecordStore, type SqlDriver } from "./sql.js";

const DID = "did:plc:alice";

class RecordingSqlDriver implements SqlDriver {
	readonly runCalls: string[] = [];
	getResult: unknown = null;
	failPinnedWrites = false;
	failCidBackfill = false;

	async get<T>(): Promise<T | null> {
		return this.getResult as T | null;
	}

	async all<T>(): Promise<T[]> {
		return [];
	}

	async run(sql: string): Promise<number | undefined> {
		if (this.failPinnedWrites && sql.includes("pinned_records")) {
			throw new Error("Injected pinned_records failure");
		}
		if (this.failCidBackfill && sql.includes("SET cid = ?")) {
			throw new Error("Injected cid backfill failure");
		}
		this.runCalls.push(sql);
		return 1;
	}
}

class StatefulSqlDriver implements SqlDriver {
	private readonly records = new Map<
		string,
		{
			repo_did: string;
			collection: string;
			rkey: string;
			value_json: string;
			cid: string;
			created_at: string;
			updated_at: string;
		}
	>();
	private readonly pinnedRecords = new Map<
		string,
		{
			uri: string;
			cid: string;
			value_json: string;
			created_at: string;
			updated_at: string;
		}
	>();

	async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
		if (sql.includes("FROM records")) {
			const [repoDid, collection, rkey] = params as [string, string, string];
			return (
				(this.records.get(`${repoDid}:${collection}:${rkey}`) as
					| T
					| undefined) ?? null
			);
		}

		if (sql.includes("FROM pinned_records")) {
			const [uri, cid] = params as [string, string];
			return (this.pinnedRecords.get(`${uri}:${cid}`) as T | undefined) ?? null;
		}

		return null;
	}

	async all<T>(): Promise<T[]> {
		return [];
	}

	async run(sql: string, params: unknown[] = []): Promise<number | undefined> {
		if (sql.includes("INSERT INTO records")) {
			const [repoDid, collection, rkey, valueJson, cid, createdAt, updatedAt] =
				params as [string, string, string, string, string, string, string];
			this.records.set(`${repoDid}:${collection}:${rkey}`, {
				repo_did: repoDid,
				collection,
				rkey,
				value_json: valueJson,
				cid,
				created_at: createdAt,
				updated_at: updatedAt,
			});
			return 1;
		}

		if (
			sql.includes("UPDATE records") &&
			sql.includes("WHERE repo_did = ? AND collection = ? AND rkey = ?")
		) {
			const [valueJson, cid, createdAt, updatedAt, repoDid, collection, rkey] =
				params as [string, string, string, string, string, string, string];
			this.records.set(`${repoDid}:${collection}:${rkey}`, {
				repo_did: repoDid,
				collection,
				rkey,
				value_json: valueJson,
				cid,
				created_at: createdAt,
				updated_at: updatedAt,
			});
			return 1;
		}

		if (sql.includes("INSERT OR REPLACE INTO pinned_records")) {
			const [uri, cid, valueJson, createdAt, updatedAt] = params as [
				string,
				string,
				string,
				string,
				string,
			];
			this.pinnedRecords.set(`${uri}:${cid}`, {
				uri,
				cid,
				value_json: valueJson,
				created_at: createdAt,
				updated_at: updatedAt,
			});
			return 1;
		}

		if (sql.includes("DELETE FROM records")) {
			const [repoDid, collection, rkey] = params as [string, string, string];
			this.records.delete(`${repoDid}:${collection}:${rkey}`);
			return 1;
		}

		return 1;
	}
}

describe("SqlRecordStore", () => {
	test("skips guarded insert SQL for empty scope tokens", async () => {
		const driver = new RecordingSqlDriver();
		const store = new SqlRecordStore(driver);
		const emptyScopeState = await store.getScopeStateToken(DID, []);

		await store.createRecord(
			{
				repoDid: DID,
				collection: COLLECTIONS.scenario,
				rkey: "empty-scope-token",
				value: {
					$type: COLLECTIONS.scenario,
					title: "Empty Scope Token",
					ownerDid: DID,
					createdAt: "2026-04-21T00:00:00.000Z",
					updatedAt: "2026-04-21T00:00:00.000Z",
				},
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			{ expectedScopeState: emptyScopeState },
		);

		expect(driver.runCalls).toHaveLength(2);
		expect(driver.runCalls[0]).toContain("VALUES");
		expect(driver.runCalls[0]).toContain("cid");
		expect(driver.runCalls[0]).not.toContain("WHERE");
		expect(driver.runCalls[1]).toContain("pinned_records");
	});

	test("does not fail createRecord when pinned cache persistence fails", async () => {
		const driver = new RecordingSqlDriver();
		driver.failPinnedWrites = true;
		const store = new SqlRecordStore(driver);

		const record = await store.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "best-effort-pinned-write",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Best Effort Pin",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		});

		expect(record.uri).toBe(
			`at://${DID}/${COLLECTIONS.scenario}/best-effort-pinned-write`,
		);
		expect(driver.runCalls).toHaveLength(1);
		expect(driver.runCalls[0]).toContain("INSERT INTO records");
	});

	test("backfills missing current-record cids on read", async () => {
		const driver = new RecordingSqlDriver();
		driver.getResult = {
			repo_did: DID,
			collection: COLLECTIONS.scenario,
			rkey: "legacy-row",
			value_json: JSON.stringify({
				$type: COLLECTIONS.scenario,
				title: "Legacy Row",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			}),
			cid: "",
			created_at: "2026-04-21T00:00:00.000Z",
			updated_at: "2026-04-21T00:00:00.000Z",
		};
		const store = new SqlRecordStore(driver);

		const record = await store.getRecord(
			`at://${DID}/${COLLECTIONS.scenario}/legacy-row`,
		);

		expect(record).not.toBeNull();
		expect(record?.cid.length).toBeGreaterThan(0);
		expect(driver.runCalls).toHaveLength(2);
		expect(driver.runCalls[0]).toContain("UPDATE records");
		expect(driver.runCalls[0]).toContain("SET cid = ?");
		expect(driver.runCalls[1]).toContain("pinned_records");
	});

	test("does not fail reads when cid backfill or pinned cache persistence fails", async () => {
		const driver = new RecordingSqlDriver();
		driver.failCidBackfill = true;
		driver.failPinnedWrites = true;
		driver.getResult = {
			repo_did: DID,
			collection: COLLECTIONS.scenario,
			rkey: "legacy-row-best-effort",
			value_json: JSON.stringify({
				$type: COLLECTIONS.scenario,
				title: "Legacy Row",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			}),
			cid: "",
			created_at: "2026-04-21T00:00:00.000Z",
			updated_at: "2026-04-21T00:00:00.000Z",
		};
		const store = new SqlRecordStore(driver);

		const record = await store.getRecord(
			`at://${DID}/${COLLECTIONS.scenario}/legacy-row-best-effort`,
		);

		expect(record).not.toBeNull();
		expect(record?.cid.length).toBeGreaterThan(0);
		expect(driver.runCalls).toHaveLength(0);
	});

	test("keeps stale exact pins retrievable after the current SQL row advances", async () => {
		const store = new SqlRecordStore(new StatefulSqlDriver());

		const initial = await store.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "stale-pinned-sql",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Initial SQL Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		});

		const updated = await store.updateRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "stale-pinned-sql",
			value: {
				...initial.value,
				title: "Updated SQL Scenario",
				updatedAt: "2026-04-21T01:00:00.000Z",
			},
			createdAt: initial.createdAt,
			updatedAt: "2026-04-21T01:00:00.000Z",
		});

		const stale = await store.getPinnedRecord<{ title: string }>(
			initial.uri,
			initial.cid,
		);
		const current = await store.getPinnedRecord<{ title: string }>(
			updated.uri,
			updated.cid,
		);

		expect(stale?.value.title).toBe("Initial SQL Scenario");
		expect(current?.value.title).toBe("Updated SQL Scenario");
	});
});
