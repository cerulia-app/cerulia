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
});
