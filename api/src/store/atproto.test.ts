import { describe, expect, test } from "bun:test";
import type { Agent } from "@atproto/api";
import { COLLECTIONS } from "../constants.js";
import { buildAtUri } from "../refs.js";
import { AtprotoMirrorRecordStore } from "./atproto.js";
import { MemoryRecordStore } from "./memory.js";
import type { RecordStore, StoredRecord } from "./types.js";

const DID = "did:plc:alice";

function createRemoteAgentStore() {
	const records = new Map<string, StoredRecord<unknown>>();

	const agent = {
		com: {
			atproto: {
				repo: {
					async createRecord(input: {
						repo: string;
						collection: string;
						rkey?: string;
						record: { [_: string]: unknown };
					}) {
						const uri = buildAtUri(
							input.repo,
							input.collection,
							input.rkey ?? "generated",
						);
						records.set(uri, {
							uri,
							repoDid: input.repo,
							collection: input.collection,
							rkey: input.rkey ?? "generated",
							value: input.record,
							createdAt: String(input.record.createdAt ?? "2026-04-21T00:00:00.000Z"),
							updatedAt: String(
								input.record.updatedAt ?? input.record.createdAt ?? "2026-04-21T00:00:00.000Z",
							),
						});
						return {
							data: {
								uri,
								cid: "cid-create",
							},
						};
					},
					async putRecord(input: {
						repo: string;
						collection: string;
						rkey: string;
						record: { [_: string]: unknown };
					}) {
						const uri = buildAtUri(input.repo, input.collection, input.rkey);
						records.set(uri, {
							uri,
							repoDid: input.repo,
							collection: input.collection,
							rkey: input.rkey,
							value: input.record,
							createdAt: String(input.record.createdAt ?? "2026-04-21T00:00:00.000Z"),
							updatedAt: String(
								input.record.updatedAt ?? input.record.createdAt ?? "2026-04-21T00:00:00.000Z",
							),
						});
						return {
							data: {
								uri,
								cid: "cid-update",
							},
						};
					},
					async deleteRecord(input: {
						repo: string;
						collection: string;
						rkey: string;
					}) {
						records.delete(
							buildAtUri(input.repo, input.collection, input.rkey),
						);
					},
					async getRecord(input: {
						repo: string;
						collection: string;
						rkey: string;
					}) {
						const uri = buildAtUri(input.repo, input.collection, input.rkey);
						const record = records.get(uri);
						if (!record) {
							const error = new Error("not found");
							error.name = "RecordNotFoundError";
							throw error;
						}

						return {
							data: {
								uri,
								cid: "cid-get",
								value: record.value as { [_: string]: unknown },
							},
						};
					},
					async listRecords(input: {
						repo: string;
						collection: string;
					}) {
						return {
							data: {
								records: Array.from(records.values())
									.filter(
										(record) =>
											record.repoDid === input.repo &&
											record.collection === input.collection,
									)
									.map((record) => ({
										uri: record.uri,
										cid: "cid-list",
										value: record.value as { [_: string]: unknown },
									})),
							},
						};
					},
				},
			},
		},
	};

	return {
		records,
		agent: agent as unknown as Agent,
	};
}

describe("AtprotoMirrorRecordStore", () => {
	test("writes through to the remote repo and local cache", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return remote.agent;
			},
		});

		const created = await store.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "shadows-of-arkham",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Shadows of Arkham",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		});

		expect(remote.records.has(created.uri)).toBe(true);
		expect(await cache.getRecord(created.uri)).not.toBeNull();
	});

	test("returns remote success even when cache write fails", async () => {
		const remote = createRemoteAgentStore();
		const failingCache: RecordStore = {
			async createRecord() {
				throw new Error("cache unavailable");
			},
			async updateRecord() {
				throw new Error("cache unavailable");
			},
			async deleteRecord() {
				throw new Error("cache unavailable");
			},
			async getRecord() {
				return null;
			},
			async listRecords() {
				return [];
			},
			async hasOwnedBlob() {
				return false;
			},
			async registerOwnedBlob() {},
		};
		const store = new AtprotoMirrorRecordStore(failingCache, {
			async getAgent() {
				return remote.agent;
			},
		});

		const created = await store.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "remote-only",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Remote Only",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		});

		expect(created.uri).toBe(
			buildAtUri(DID, COLLECTIONS.scenario, "remote-only"),
		);
		expect(remote.records.has(created.uri)).toBe(true);
	});

	test("syncs owner collection reads from the remote repo into cache", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent(repoDid) {
				return repoDid === DID ? remote.agent : null;
			},
		});

		const remoteUri = buildAtUri(DID, COLLECTIONS.scenario, "remote-item");
		remote.records.set(remoteUri, {
			uri: remoteUri,
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "remote-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Remote Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T01:00:00.000Z",
				updatedAt: "2026-04-21T01:00:00.000Z",
			},
			createdAt: "2026-04-21T01:00:00.000Z",
			updatedAt: "2026-04-21T01:00:00.000Z",
		});

		const staleUri = buildAtUri(DID, COLLECTIONS.scenario, "stale-item");
		await cache.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "stale-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Stale Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T00:30:00.000Z",
				updatedAt: "2026-04-21T00:30:00.000Z",
			},
			createdAt: "2026-04-21T00:30:00.000Z",
			updatedAt: "2026-04-21T00:30:00.000Z",
		});

		const records = await store.listRecords(COLLECTIONS.scenario, DID);
		expect(records).toHaveLength(1);
		expect(records[0]?.uri).toBe(remoteUri);
		expect(await cache.getRecord(remoteUri)).not.toBeNull();
		expect(await cache.getRecord(staleUri)).toBeNull();
	});

	test("drops stale cached direct reads when the remote repo returns not found", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return remote.agent;
			},
		});

		const staleUri = buildAtUri(DID, COLLECTIONS.scenario, "deleted-item");
		await cache.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "deleted-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Deleted Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T02:00:00.000Z",
				updatedAt: "2026-04-21T02:00:00.000Z",
			},
			createdAt: "2026-04-21T02:00:00.000Z",
			updatedAt: "2026-04-21T02:00:00.000Z",
		});

		expect(await store.getRecord(staleUri)).toBeNull();
		expect(await cache.getRecord(staleUri)).toBeNull();
	});

	test("aggregates anonymous discovery lists across known oauth session repos", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const secondDid = "did:plc:bob";
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent(repoDid) {
				return repoDid === DID || repoDid === secondDid ? remote.agent : null;
			},
			async listRepoDids() {
				return [DID, secondDid];
			},
		});

		const firstUri = buildAtUri(DID, COLLECTIONS.scenario, "first-item");
		const secondUri = buildAtUri(secondDid, COLLECTIONS.scenario, "second-item");
		remote.records.set(firstUri, {
			uri: firstUri,
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "first-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "First Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T03:00:00.000Z",
				updatedAt: "2026-04-21T03:00:00.000Z",
			},
			createdAt: "2026-04-21T03:00:00.000Z",
			updatedAt: "2026-04-21T03:00:00.000Z",
		});
		remote.records.set(secondUri, {
			uri: secondUri,
			repoDid: secondDid,
			collection: COLLECTIONS.scenario,
			rkey: "second-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Second Scenario",
				ownerDid: secondDid,
				createdAt: "2026-04-21T04:00:00.000Z",
				updatedAt: "2026-04-21T04:00:00.000Z",
			},
			createdAt: "2026-04-21T04:00:00.000Z",
			updatedAt: "2026-04-21T04:00:00.000Z",
		});

		const records = await store.listRecords(COLLECTIONS.scenario);
		expect(records).toHaveLength(2);
		expect(records.map((record) => record.uri)).toEqual([
			secondUri,
			firstUri,
		]);
	});
});