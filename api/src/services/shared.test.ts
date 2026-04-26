import { describe, expect, test } from "bun:test";
import { COLLECTIONS } from "../constants.js";
import { ApiError } from "../errors.js";
import { MemoryRecordStore } from "../store/memory.js";
import type { AtomicRecordStore, StoredRecord } from "../store/types.js";
import { getOptionalExactPinnedRecord } from "./shared.js";
import type { ServiceRuntime } from "./runtime.js";

const DID = "did:plc:alice";

function createScenarioRecord(): StoredRecord<{
	$type: string;
	title: string;
	ownerDid: string;
	createdAt: string;
	updatedAt: string;
}> {
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

function createRuntime(
	store: AtomicRecordStore | MemoryRecordStore,
): ServiceRuntime {
	return {
		store: store as AtomicRecordStore,
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

	test("returns a stale exact pin from cache after the current record advances", async () => {
		const store = new MemoryRecordStore();
		const created = await store.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "stale-pin",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Initial Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		});
		const stalePin = { uri: created.uri, cid: created.cid };

		await store.updateRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "stale-pin",
			value: {
				...created.value,
				title: "Updated Scenario",
				updatedAt: "2026-04-21T01:00:00.000Z",
			},
			createdAt: created.createdAt,
			updatedAt: "2026-04-21T01:00:00.000Z",
		});

		const record = await getOptionalExactPinnedRecord<{
			$type: string;
			title: string;
			ownerDid: string;
			createdAt: string;
			updatedAt: string;
		}>(createRuntime(store), stalePin, COLLECTIONS.scenario, "scenarioPin");

		expect(record?.cid).toBe(stalePin.cid);
		expect(record?.value.title).toBe("Initial Scenario");
	});

	test("falls back to the verified pin cache after a temporary authority-read failure", async () => {
		const backingStore = new MemoryRecordStore();
		const cached = await backingStore.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "cached-on-outage",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Cached During Outage",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		});

		const store: AtomicRecordStore = {
			async createRecord() {
				throw new Error("unused");
			},
			async updateRecord() {
				throw new Error("unused");
			},
			async deleteRecord() {},
			async getRecord() {
				throw new ApiError(
					"InternalError",
					"Remote record resolution is temporarily unavailable",
					503,
				);
			},
			async getPinnedRecord<T>(uri: string, cid: string) {
				return backingStore.getPinnedRecord<T>(uri, cid);
			},
			async getScopeStateToken() {
				return { repoDid: DID, collectionVersions: {} };
			},
			async listRecords() {
				return [];
			},
			async hasOwnedBlob() {
				return false;
			},
			async registerOwnedBlob() {},
			async rememberPinnedRecord() {},
			async applyWrites() {},
		};

		const record = await getOptionalExactPinnedRecord<{
			$type: string;
			title: string;
			ownerDid: string;
			createdAt: string;
			updatedAt: string;
		}>(
			createRuntime(store),
			{ uri: cached.uri, cid: cached.cid },
			COLLECTIONS.scenario,
			"scenarioPin",
		);

		expect(record).toEqual(cached);
	});

	test("propagates temporary authority-read failures instead of treating them as not found", async () => {
		const store: AtomicRecordStore = {
			async createRecord() {
				throw new Error("unused");
			},
			async updateRecord() {
				throw new Error("unused");
			},
			async deleteRecord() {},
			async getRecord() {
				throw new ApiError(
					"InternalError",
					"Remote record resolution is temporarily unavailable",
					503,
				);
			},
			async getPinnedRecord() {
				return null;
			},
			async getScopeStateToken() {
				return { repoDid: DID, collectionVersions: {} };
			},
			async listRecords() {
				return [];
			},
			async hasOwnedBlob() {
				return false;
			},
			async registerOwnedBlob() {},
			async rememberPinnedRecord() {},
			async applyWrites() {},
		};

		await expect(
			getOptionalExactPinnedRecord(
				createRuntime(store),
				{
					uri: `at://${DID}/${COLLECTIONS.scenario}/unavailable-scenario`,
					cid: "bafytestcid",
				},
				COLLECTIONS.scenario,
				"scenarioPin",
			),
		).rejects.toMatchObject({
			code: "InternalError",
			status: 503,
		});
	});
});
