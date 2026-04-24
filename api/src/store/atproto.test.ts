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
	const cids = new Map<string, string>();
	const repoCommits = new Map<string, string>();
	let cidCounter = 0;
	let commitCounter = 0;
	let onGetRecord: ((uri: string) => void) | undefined;

	function nextCid() {
		cidCounter += 1;
		return `cid-${cidCounter}`;
	}

	function ensureRepoCommit(repoDid: string) {
		let current = repoCommits.get(repoDid);
		if (!current) {
			current = `commit-${commitCounter}`;
			repoCommits.set(repoDid, current);
		}
		return current;
	}

	function bumpRepoCommit(repoDid: string) {
		commitCounter += 1;
		const next = `commit-${commitCounter}`;
		repoCommits.set(repoDid, next);
		return next;
	}

	const agent = {
		com: {
			atproto: {
				repo: {
					async applyWrites(input: {
						repo: string;
						writes: Array<
							| {
									$type?: "com.atproto.repo.applyWrites#create";
									collection: string;
									rkey?: string;
									value: { [_: string]: unknown };
							  }
							| {
									$type?: "com.atproto.repo.applyWrites#update";
									collection: string;
									rkey: string;
									value: { [_: string]: unknown };
							  }
						>;
						swapCommit?: string;
					}) {
						const currentCommit = ensureRepoCommit(input.repo);
						if (
							input.swapCommit !== undefined &&
							input.swapCommit !== currentCommit
						) {
							const error = new Error("swap mismatch");
							error.name = "InvalidSwapError";
							throw error;
						}

						for (const write of input.writes) {
							const rkey = write.rkey ?? "generated";
							const uri = buildAtUri(input.repo, write.collection, rkey);
							const cid = nextCid();
							records.set(uri, {
								uri,
								repoDid: input.repo,
								collection: write.collection,
								rkey,
								value: write.value,
								createdAt: String(
									write.value.createdAt ?? "2026-04-21T00:00:00.000Z",
								),
								updatedAt: String(
									write.value.updatedAt ??
										write.value.createdAt ??
										"2026-04-21T00:00:00.000Z",
								),
							});
							cids.set(uri, cid);
						}

						const commitCid = bumpRepoCommit(input.repo);
						return {
							data: {
								commit: {
									cid: commitCid,
									rev: commitCid,
								},
							},
						};
					},
					async createRecord(input: {
						repo: string;
						collection: string;
						rkey?: string;
						record: { [_: string]: unknown };
						swapCommit?: string;
					}) {
						const currentCommit = ensureRepoCommit(input.repo);
						if (
							input.swapCommit !== undefined &&
							input.swapCommit !== currentCommit
						) {
							const error = new Error("swap mismatch");
							error.name = "InvalidSwapError";
							throw error;
						}
						const uri = buildAtUri(
							input.repo,
							input.collection,
							input.rkey ?? "generated",
						);
						const cid = nextCid();
						records.set(uri, {
							uri,
							repoDid: input.repo,
							collection: input.collection,
							rkey: input.rkey ?? "generated",
							value: input.record,
							createdAt: String(
								input.record.createdAt ?? "2026-04-21T00:00:00.000Z",
							),
							updatedAt: String(
								input.record.updatedAt ??
									input.record.createdAt ??
									"2026-04-21T00:00:00.000Z",
							),
						});
						cids.set(uri, cid);
						const commitCid = bumpRepoCommit(input.repo);
						return {
							data: {
								uri,
								cid,
								commit: {
									cid: commitCid,
									rev: commitCid,
								},
							},
						};
					},
					async putRecord(input: {
						repo: string;
						collection: string;
						rkey: string;
						record: { [_: string]: unknown };
						swapRecord?: string | null;
						swapCommit?: string;
					}) {
						const currentCommit = ensureRepoCommit(input.repo);
						if (
							input.swapCommit !== undefined &&
							input.swapCommit !== currentCommit
						) {
							const error = new Error("swap mismatch");
							error.name = "InvalidSwapError";
							throw error;
						}
						const uri = buildAtUri(input.repo, input.collection, input.rkey);
						const currentCid = cids.get(uri) ?? null;
						if (
							input.swapRecord !== undefined &&
							input.swapRecord !== currentCid
						) {
							const error = new Error("swap mismatch");
							error.name = "InvalidSwapError";
							throw error;
						}

						const cid = nextCid();
						records.set(uri, {
							uri,
							repoDid: input.repo,
							collection: input.collection,
							rkey: input.rkey,
							value: input.record,
							createdAt: String(
								input.record.createdAt ?? "2026-04-21T00:00:00.000Z",
							),
							updatedAt: String(
								input.record.updatedAt ??
									input.record.createdAt ??
									"2026-04-21T00:00:00.000Z",
							),
						});
						cids.set(uri, cid);
						bumpRepoCommit(input.repo);
						return {
							data: {
								uri,
								cid,
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
						bumpRepoCommit(input.repo);
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
						onGetRecord?.(uri);

						return {
							data: {
								uri,
								cid: cids.get(uri) ?? nextCid(),
								value: record.value as { [_: string]: unknown },
							},
						};
					},
					async listRecords(input: { repo: string; collection: string }) {
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
				sync: {
					async getLatestCommit(input: { did: string }) {
						const cid = ensureRepoCommit(input.did);
						return {
							data: {
								cid,
								rev: cid,
							},
						};
					},
				},
			},
		},
	};

	return {
		records,
		cids,
		repoCommits,
		setOnGetRecord(handler: ((uri: string) => void) | undefined) {
			onGetRecord = handler;
		},
		bumpRepoCommit,
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
			async getScopeStateToken(repoDid) {
				return { repoDid, collectionVersions: {} };
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

	test("rejects stale mirrored updates with swapRecord compare-and-swap", async () => {
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
			rkey: "stale-update",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Original",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		});

		await store.updateRecord(
			{
				repoDid: DID,
				collection: COLLECTIONS.scenario,
				rkey: "stale-update",
				value: {
					$type: COLLECTIONS.scenario,
					title: "Fresh",
					ownerDid: DID,
					createdAt: "2026-04-21T00:00:00.000Z",
					updatedAt: "2026-04-21T01:00:00.000Z",
				},
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T01:00:00.000Z",
			},
			{ expectedCurrent: created },
		);

		await expect(
			store.updateRecord(
				{
					repoDid: DID,
					collection: COLLECTIONS.scenario,
					rkey: "stale-update",
					value: {
						$type: COLLECTIONS.scenario,
						title: "Stale",
						ownerDid: DID,
						createdAt: "2026-04-21T00:00:00.000Z",
						updatedAt: "2026-04-21T02:00:00.000Z",
					},
					createdAt: "2026-04-21T00:00:00.000Z",
					updatedAt: "2026-04-21T02:00:00.000Z",
				},
				{ expectedCurrent: created },
			),
		).rejects.toHaveProperty("name", "RecordConflictError");
	});

	test("rejects guarded creates when the repo mutates after guard validation", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return remote.agent;
			},
		});

		const guardUri = buildAtUri(DID, COLLECTIONS.scenario, "guard-record");
		const guardRecord: StoredRecord<{
			$type: string;
			title: string;
			ownerDid: string;
			createdAt: string;
			updatedAt: string;
		}> = {
			uri: guardUri,
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "guard-record",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Guard",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		};
		remote.records.set(guardUri, guardRecord);
		remote.cids.set(guardUri, "cid-guard-record");
		remote.bumpRepoCommit(DID);

		remote.setOnGetRecord((uri) => {
			if (uri !== guardUri) {
				return;
			}
			remote.setOnGetRecord(undefined);
			remote.records.set(guardUri, {
				...guardRecord,
				value: {
					...guardRecord.value,
					updatedAt: "2026-04-21T01:00:00.000Z",
				},
				updatedAt: "2026-04-21T01:00:00.000Z",
			});
			remote.cids.set(guardUri, "cid-guard-record-updated");
			remote.bumpRepoCommit(DID);
		});

		await expect(
			store.createRecord(
				{
					repoDid: DID,
					collection: COLLECTIONS.scenario,
					rkey: "guarded-create",
					value: {
						$type: COLLECTIONS.scenario,
						title: "Guarded Create",
						ownerDid: DID,
						createdAt: "2026-04-21T02:00:00.000Z",
						updatedAt: "2026-04-21T02:00:00.000Z",
					},
					createdAt: "2026-04-21T02:00:00.000Z",
					updatedAt: "2026-04-21T02:00:00.000Z",
				},
				{ guardUnchanged: [guardRecord] },
			),
		).rejects.toHaveProperty("name", "RecordConflictError");
	});

	test("rejects scoped creates after an unrelated repo mutation bumps the commit", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return remote.agent;
			},
		});

		const scopeState = await store.getScopeStateToken(DID, [
			COLLECTIONS.characterBranch,
			COLLECTIONS.characterSheet,
			COLLECTIONS.characterAdvancement,
			COLLECTIONS.characterConversion,
		]);

		const unrelatedUri = buildAtUri(
			DID,
			COLLECTIONS.scenario,
			"unrelated-write",
		);
		remote.records.set(unrelatedUri, {
			uri: unrelatedUri,
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "unrelated-write",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Unrelated",
				ownerDid: DID,
				createdAt: "2026-04-21T03:00:00.000Z",
				updatedAt: "2026-04-21T03:00:00.000Z",
			},
			createdAt: "2026-04-21T03:00:00.000Z",
			updatedAt: "2026-04-21T03:00:00.000Z",
		});
		remote.cids.set(unrelatedUri, "cid-unrelated-write");
		remote.bumpRepoCommit(DID);

		await expect(
			store.createRecord(
				{
					repoDid: DID,
					collection: COLLECTIONS.scenario,
					rkey: "scoped-create",
					value: {
						$type: COLLECTIONS.scenario,
						title: "Scoped Create",
						ownerDid: DID,
						createdAt: "2026-04-21T04:00:00.000Z",
						updatedAt: "2026-04-21T04:00:00.000Z",
					},
					createdAt: "2026-04-21T04:00:00.000Z",
					updatedAt: "2026-04-21T04:00:00.000Z",
				},
				{ expectedScopeState: scopeState },
			),
		).rejects.toHaveProperty("name", "RecordConflictError");
	});

	test("rejects scoped updates after an unrelated repo mutation bumps the commit", async () => {
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
			rkey: "scoped-update",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Scoped Update",
				ownerDid: DID,
				createdAt: "2026-04-21T00:00:00.000Z",
				updatedAt: "2026-04-21T00:00:00.000Z",
			},
			createdAt: "2026-04-21T00:00:00.000Z",
			updatedAt: "2026-04-21T00:00:00.000Z",
		});

		const scopeState = await store.getScopeStateToken(DID, [
			COLLECTIONS.scenario,
		]);

		const unrelatedUri = buildAtUri(DID, COLLECTIONS.house, "unrelated-update");
		remote.records.set(unrelatedUri, {
			uri: unrelatedUri,
			repoDid: DID,
			collection: COLLECTIONS.house,
			rkey: "unrelated-update",
			value: {
				$type: COLLECTIONS.house,
				title: "Unrelated House",
				createdAt: "2026-04-21T01:00:00.000Z",
				updatedAt: "2026-04-21T01:00:00.000Z",
			},
			createdAt: "2026-04-21T01:00:00.000Z",
			updatedAt: "2026-04-21T01:00:00.000Z",
		});
		remote.cids.set(unrelatedUri, "cid-unrelated-update");
		remote.bumpRepoCommit(DID);

		await expect(
			store.updateRecord(
				{
					repoDid: DID,
					collection: COLLECTIONS.scenario,
					rkey: "scoped-update",
					value: {
						$type: COLLECTIONS.scenario,
						title: "Scoped Update Changed",
						ownerDid: DID,
						createdAt: "2026-04-21T00:00:00.000Z",
						updatedAt: "2026-04-21T02:00:00.000Z",
					},
					createdAt: "2026-04-21T00:00:00.000Z",
					updatedAt: "2026-04-21T02:00:00.000Z",
				},
				{ expectedCurrent: created, expectedScopeState: scopeState },
			),
		).rejects.toHaveProperty("name", "RecordConflictError");
	});

	test("rejects scoped applyWrites after an unrelated repo mutation bumps the commit", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return remote.agent;
			},
		});

		const scopeState = await store.getScopeStateToken(DID, [
			COLLECTIONS.scenario,
		]);

		remote.bumpRepoCommit(DID);

		await expect(
			store.applyWrites!(
				[
					{
						kind: "create",
						draft: {
							repoDid: DID,
							collection: COLLECTIONS.scenario,
							rkey: "batched-scenario",
							value: {
								$type: COLLECTIONS.scenario,
								title: "Batched Scenario",
								ownerDid: DID,
								createdAt: "2026-04-21T05:00:00.000Z",
								updatedAt: "2026-04-21T05:00:00.000Z",
							},
							createdAt: "2026-04-21T05:00:00.000Z",
							updatedAt: "2026-04-21T05:00:00.000Z",
						},
					},
				],
				{ expectedScopeState: scopeState },
			),
		).rejects.toHaveProperty("name", "RecordConflictError");
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

	test("uses unauthenticated public agents for direct reads without an oauth session", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const publicUri = buildAtUri(DID, COLLECTIONS.scenario, "public-item");
		remote.records.set(publicUri, {
			uri: publicUri,
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "public-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Public Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T01:30:00.000Z",
				updatedAt: "2026-04-21T01:30:00.000Z",
			},
			createdAt: "2026-04-21T01:30:00.000Z",
			updatedAt: "2026-04-21T01:30:00.000Z",
		});

		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return null;
			},
			async getPublicAgent(repoDid) {
				return repoDid === DID ? remote.agent : null;
			},
		});

		const record = await store.getRecord(publicUri);
		expect(record?.uri).toBe(publicUri);
		expect(await cache.getRecord(publicUri)).not.toBeNull();
	});

	test("recovers from temporary public agent lookup failure by serving cached public data", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const uri = buildAtUri(DID, COLLECTIONS.scenario, "recovering-item");
		await cache.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "recovering-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Cached Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T01:45:00.000Z",
				updatedAt: "2026-04-21T01:45:00.000Z",
			},
			createdAt: "2026-04-21T01:45:00.000Z",
			updatedAt: "2026-04-21T01:45:00.000Z",
		});
		remote.records.set(uri, {
			uri,
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "recovering-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Remote Scenario",
				ownerDid: DID,
				createdAt: "2026-04-21T01:45:00.000Z",
				updatedAt: "2026-04-21T02:15:00.000Z",
			},
			createdAt: "2026-04-21T01:45:00.000Z",
			updatedAt: "2026-04-21T02:15:00.000Z",
		});

		let allowPublicAgent = false;
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return null;
			},
			async getPublicAgent(repoDid) {
				return allowPublicAgent && repoDid === DID ? remote.agent : null;
			},
		});

		const cachedRecord = await store.getRecord(uri);
		expect(cachedRecord?.value).toMatchObject({
			title: "Cached Scenario",
		});

		allowPublicAgent = true;
		const refreshedRecord = await store.getRecord(uri);
		expect(refreshedRecord?.value).toMatchObject({
			title: "Remote Scenario",
		});
		expect((await cache.getRecord<{ title: string }>(uri))?.value.title).toBe(
			"Remote Scenario",
		);
	});

	test("falls back to cached public reads when the public agent request fails", async () => {
		const cache = new MemoryRecordStore();
		const uri = buildAtUri(DID, COLLECTIONS.scenario, "cached-fallback");
		await cache.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "cached-fallback",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Cached Fallback",
				ownerDid: DID,
				createdAt: "2026-04-21T02:30:00.000Z",
				updatedAt: "2026-04-21T02:30:00.000Z",
			},
			createdAt: "2026-04-21T02:30:00.000Z",
			updatedAt: "2026-04-21T02:30:00.000Z",
		});

		const failingAgent = {
			com: {
				atproto: {
					repo: {
						async getRecord() {
							const error = new Error("upstream unavailable");
							(error as Error & { status?: number }).status = 503;
							throw error;
						},
						async listRecords() {
							const error = new Error("upstream unavailable");
							(error as Error & { status?: number }).status = 503;
							throw error;
						},
					},
				},
			},
		} as unknown as Agent;

		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return null;
			},
			async getPublicAgent(repoDid) {
				return repoDid === DID ? failingAgent : null;
			},
		});

		expect((await store.getRecord<{ title: string }>(uri))?.value.title).toBe(
			"Cached Fallback",
		);
		expect(await store.listRecords(COLLECTIONS.scenario, DID)).toHaveLength(1);
	});

	test("drops cached public lists when the remote repo confirms not found", async () => {
		const cache = new MemoryRecordStore();
		await cache.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "missing-list-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Missing List Item",
				ownerDid: DID,
				createdAt: "2026-04-21T02:45:00.000Z",
				updatedAt: "2026-04-21T02:45:00.000Z",
			},
			createdAt: "2026-04-21T02:45:00.000Z",
			updatedAt: "2026-04-21T02:45:00.000Z",
		});

		const missingAgent = {
			com: {
				atproto: {
					repo: {
						async listRecords() {
							const error = new Error("not found");
							error.name = "RecordNotFoundError";
							throw error;
						},
					},
				},
			},
		} as unknown as Agent;

		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return null;
			},
			async getPublicAgent(repoDid) {
				return repoDid === DID ? missingAgent : null;
			},
		});

		expect(await store.listRecords(COLLECTIONS.scenario, DID)).toHaveLength(0);
		expect(await cache.listRecords(COLLECTIONS.scenario, DID)).toHaveLength(0);
	});

	test("drops aggregate anonymous list entries when a public repo now returns not found", async () => {
		const cache = new MemoryRecordStore();
		await cache.createRecord({
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "missing-aggregate-item",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Missing Aggregate Item",
				ownerDid: DID,
				createdAt: "2026-04-21T02:50:00.000Z",
				updatedAt: "2026-04-21T02:50:00.000Z",
			},
			createdAt: "2026-04-21T02:50:00.000Z",
			updatedAt: "2026-04-21T02:50:00.000Z",
		});

		const missingAgent = {
			com: {
				atproto: {
					repo: {
						async listRecords() {
							const error = new Error("not found");
							error.name = "RecordNotFoundError";
							throw error;
						},
					},
				},
			},
		} as unknown as Agent;

		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return null;
			},
			async getPublicAgent(repoDid) {
				return repoDid === DID ? missingAgent : null;
			},
			async listRepoDids() {
				return [DID];
			},
		});

		expect(await store.listRecords(COLLECTIONS.scenario)).toHaveLength(0);
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

	test("uses cached records for anonymous discovery lists", async () => {
		const cache = new MemoryRecordStore();
		const secondDid = "did:plc:bob";
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return null;
			},
		});

		const firstUri = buildAtUri(DID, COLLECTIONS.scenario, "first-item");
		const secondUri = buildAtUri(
			secondDid,
			COLLECTIONS.scenario,
			"second-item",
		);
		await cache.createRecord({
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
		await cache.createRecord({
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
		expect(records.map((record) => record.uri)).toEqual([secondUri, firstUri]);
	});

	test("refreshes anonymous discovery lists across known repos", async () => {
		const cache = new MemoryRecordStore();
		const remote = createRemoteAgentStore();
		const secondDid = "did:plc:bob";
		const store = new AtprotoMirrorRecordStore(cache, {
			async getAgent() {
				return null;
			},
			async getPublicAgent(repoDid) {
				return repoDid === DID || repoDid === secondDid ? remote.agent : null;
			},
			async listRepoDids() {
				return [DID, secondDid];
			},
		});

		const firstUri = buildAtUri(DID, COLLECTIONS.scenario, "fresh-first");
		const secondUri = buildAtUri(
			secondDid,
			COLLECTIONS.scenario,
			"fresh-second",
		);
		remote.records.set(firstUri, {
			uri: firstUri,
			repoDid: DID,
			collection: COLLECTIONS.scenario,
			rkey: "fresh-first",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Fresh First",
				ownerDid: DID,
				createdAt: "2026-04-21T05:00:00.000Z",
				updatedAt: "2026-04-21T05:00:00.000Z",
			},
			createdAt: "2026-04-21T05:00:00.000Z",
			updatedAt: "2026-04-21T05:00:00.000Z",
		});
		remote.records.set(secondUri, {
			uri: secondUri,
			repoDid: secondDid,
			collection: COLLECTIONS.scenario,
			rkey: "fresh-second",
			value: {
				$type: COLLECTIONS.scenario,
				title: "Fresh Second",
				ownerDid: secondDid,
				createdAt: "2026-04-21T06:00:00.000Z",
				updatedAt: "2026-04-21T06:00:00.000Z",
			},
			createdAt: "2026-04-21T06:00:00.000Z",
			updatedAt: "2026-04-21T06:00:00.000Z",
		});

		const records = await store.listRecords(COLLECTIONS.scenario);
		expect(records).toHaveLength(2);
		expect(records.map((record) => record.uri)).toEqual([secondUri, firstUri]);
		expect(await cache.getRecord(firstUri)).not.toBeNull();
		expect(await cache.getRecord(secondUri)).not.toBeNull();
	});
});
