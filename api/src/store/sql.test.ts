import { describe, expect, test } from "bun:test";
import { COLLECTIONS } from "../constants.js";
import { SqlRecordStore, type SqlDriver } from "./sql.js";

const DID = "did:plc:alice";

class RecordingSqlDriver implements SqlDriver {
	readonly runCalls: string[] = [];

	async get<T>(): Promise<T | null> {
		return null;
	}

	async all<T>(): Promise<T[]> {
		return [];
	}

	async run(sql: string): Promise<number | undefined> {
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

		expect(driver.runCalls).toHaveLength(1);
		expect(driver.runCalls[0]).toContain("VALUES");
		expect(driver.runCalls[0]).not.toContain("WHERE");
	});
});
