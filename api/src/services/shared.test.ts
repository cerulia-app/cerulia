import { describe, expect, test } from "bun:test";
import { COLLECTIONS } from "../constants.js";
import type { AtomicRecordStore, StoredRecord } from "../store/types.js";
import { getOptionalExactPinnedRecord } from "./shared.js";
import type { ServiceRuntime } from "./runtime.js";

const DID = "did:plc:alice";

function createScenarioRecord(): StoredRecord<{ $type: string; title: string; ownerDid: string; createdAt: string; updatedAt: string }> {
	return {
		uri: `at://${DID}/${COLLECTIONS.scenario}/current-scenario`,
		repoDid: DID,
		collection: COLLECTIONS.scenario,
		rkey: "current-scenario",
		cid: "bafytestcid",
		value: {
			$type: COLLECTIONS.scenario,
			title: "Current Scenario",
			ownerDid: DID,
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		},
		createdAt: "2026-04-21T00:00:00.000Z",
		updatedAt: "2026-04-21T00:00:00.000Z",
	};
}

function createRuntime(store: AtomicRecordStore): ServiceRuntime {
	return {
		store,
		now: () => "2026-04-21T00:00:00.000Z",
		nextTid: () => "3m5testtid",
		nextOpaque: () => "opaque-id",
	};
}

describe("getOptionalExactPinnedRecord", () => {
	test("returns current record even when auxiliary pin-cache persistence fails", async () => {
		const current = createScenarioRecord();
		const store: AtomicRecordStore = {
			async createRecord() {
				throw new Error("unused");
			},
			async updateRecord() {
				throw new Error("unused");
			},
			async deleteRecord() {},
			async getRecord<T>(uri: string) {
				return uri === current.uri ? (current as StoredRecord<T>) : null;
			},
			async getPinnedRecord<T>() {
				return null;
			},
			async getScopeStateToken() {
				return { repoDid: DID, collectionVersions: {} };
			},
			async listRecords<T>() {
				return [];
			},
			async hasOwnedBlob() {
				return false;
			},
			async registerOwnedBlob() {},
			async rememberPinnedRecord() {
				throw new Error("Injected pin cache failure");
			},
			async applyWrites() {},
		};

		const record = await getOptionalExactPinnedRecord(
			createRuntime(store),
			{ uri: current.uri, cid: current.cid },
			COLLECTIONS.scenario,
			"scenarioPin",
		);

		expect(record).toEqual(current);
	});
});