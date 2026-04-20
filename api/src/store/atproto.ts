import { Agent } from "@atproto/api";
import { buildAtUri, parseAtUri } from "../refs.js";
import type { RecordDraft, RecordStore, StoredRecord } from "./types.js";

export interface AgentProvider {
	getAgent(repoDid: string): Promise<Agent | null>;
	listRepoDids?(): Promise<string[]>;
}

function compareStoredRecords<T>(
	left: StoredRecord<T>,
	right: StoredRecord<T>,
): number {
	if (left.updatedAt !== right.updatedAt) {
		return right.updatedAt.localeCompare(left.updatedAt);
	}

	if (left.createdAt !== right.createdAt) {
		return right.createdAt.localeCompare(left.createdAt);
	}

	if (left.repoDid !== right.repoDid) {
		return left.repoDid.localeCompare(right.repoDid);
	}

	return left.rkey.localeCompare(right.rkey);
}

function isNotFoundError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}

	return (
		(error as { status?: number }).status === 404 ||
		error.name === "RecordNotFoundError"
	);
}

function extractTimestamp(
	value: { [_: string]: unknown },
	key: string,
): string | null {
	const candidate = value[key];
	return typeof candidate === "string" && candidate.length > 0
		? candidate
		: null;
}

function toStoredRecord<T>(
	uri: string,
	value: T,
): StoredRecord<T> {
	const parsed = parseAtUri(uri);
	const timestampSource =
		typeof value === "object" && value !== null
			? (value as { [_ in string]: unknown })
			: {};
	const createdAt =
		extractTimestamp(timestampSource, "createdAt") ??
		extractTimestamp(timestampSource, "updatedAt") ??
		new Date().toISOString();
	const updatedAt =
		extractTimestamp(timestampSource, "updatedAt") ?? createdAt;

	return {
		uri,
		repoDid: parsed.repoDid,
		collection: parsed.collection,
		rkey: parsed.rkey,
		value,
		createdAt,
		updatedAt,
	};
}

async function upsertCachedRecord<T>(
	cache: RecordStore,
	record: StoredRecord<T>,
): Promise<void> {
	const draft = {
		repoDid: record.repoDid,
		collection: record.collection,
		rkey: record.rkey,
		value: record.value,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
	const existing = await cache.getRecord<T>(record.uri);
	if (existing) {
		await cache.updateRecord(draft);
		return;
	}

	await cache.createRecord(draft);
}

async function bestEffortCacheSync(task: Promise<void>): Promise<void> {
	try {
		await task;
	} catch {
		// The AT Protocol repo is canonical. Cache write failures must not mask it.
	}
}

export class AtprotoMirrorRecordStore implements RecordStore {
	constructor(
		private readonly cache: RecordStore,
		private readonly agents: AgentProvider,
	) {}

	async createRecord<T>(draft: RecordDraft<T>): Promise<StoredRecord<T>> {
		const agent = await this.requireAgent(draft.repoDid);
		await agent.com.atproto.repo.createRecord({
			repo: draft.repoDid,
			collection: draft.collection,
			rkey: draft.rkey,
			record: draft.value as { [_ in string]: unknown },
			validate: true,
		});

		await bestEffortCacheSync(this.cache.createRecord(draft).then(() => undefined));
		return {
			uri: buildAtUri(draft.repoDid, draft.collection, draft.rkey),
			repoDid: draft.repoDid,
			collection: draft.collection,
			rkey: draft.rkey,
			value: draft.value,
			createdAt: draft.createdAt,
			updatedAt: draft.updatedAt,
		};
	}

	async updateRecord<T>(draft: RecordDraft<T>): Promise<StoredRecord<T>> {
		const agent = await this.requireAgent(draft.repoDid);
		await agent.com.atproto.repo.putRecord({
			repo: draft.repoDid,
			collection: draft.collection,
			rkey: draft.rkey,
			record: draft.value as { [_ in string]: unknown },
			validate: true,
		});

		await bestEffortCacheSync(this.cache.updateRecord(draft).then(() => undefined));
		return {
			uri: buildAtUri(draft.repoDid, draft.collection, draft.rkey),
			repoDid: draft.repoDid,
			collection: draft.collection,
			rkey: draft.rkey,
			value: draft.value,
			createdAt: draft.createdAt,
			updatedAt: draft.updatedAt,
		};
	}

	async deleteRecord(uri: string): Promise<void> {
		const parsed = parseAtUri(uri);
		const agent = await this.requireAgent(parsed.repoDid);
		await agent.com.atproto.repo.deleteRecord({
			repo: parsed.repoDid,
			collection: parsed.collection,
			rkey: parsed.rkey,
		});
		await bestEffortCacheSync(this.cache.deleteRecord(uri));
	}

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		const parsed = parseAtUri(uri);
		const agent = await this.agents.getAgent(parsed.repoDid);
		if (agent) {
			try {
				const response = await agent.com.atproto.repo.getRecord({
					repo: parsed.repoDid,
					collection: parsed.collection,
					rkey: parsed.rkey,
				});
				const record = toStoredRecord(
					response.data.uri,
					response.data.value as T,
				);
				await bestEffortCacheSync(upsertCachedRecord(this.cache, record));
				return record;
			} catch (error) {
				if (isNotFoundError(error)) {
					await bestEffortCacheSync(this.cache.deleteRecord(uri));
					return null;
				}

				if (!isNotFoundError(error)) {
					throw error;
				}
			}
		}

		return this.cache.getRecord<T>(uri);
	}

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		if (!repoDid) {
			const repoDids = await this.agents.listRepoDids?.();
			if (!repoDids || repoDids.length === 0) {
				return this.cache.listRecords<T>(collection);
			}

			const records = new Map<string, StoredRecord<T>>();
			for (const subjectDid of repoDids) {
				for (const record of await this.listRecords<T>(collection, subjectDid)) {
					records.set(record.uri, record);
				}
			}

			return [...records.values()].sort(compareStoredRecords);
		}

		const agent = await this.agents.getAgent(repoDid);
		if (!agent) {
			return this.cache.listRecords<T>(collection, repoDid);
		}

		const remoteRecords: StoredRecord<T>[] = [];
		let cursor: string | undefined;

		do {
			const response = await agent.com.atproto.repo.listRecords({
				repo: repoDid,
				collection,
				limit: 100,
				cursor,
			});
			remoteRecords.push(
				...response.data.records.map((record) =>
					toStoredRecord(record.uri, record.value as T),
				),
			);
			cursor = response.data.cursor;
		} while (cursor);

		await bestEffortCacheSync(
			this.syncCachedCollection(collection, repoDid, remoteRecords),
		);
		return remoteRecords;
	}

	async hasOwnedBlob(repoDid: string, blob: Parameters<RecordStore["hasOwnedBlob"]>[1]) {
		return this.cache.hasOwnedBlob(repoDid, blob);
	}

	async registerOwnedBlob(
		repoDid: string,
		blob: Parameters<RecordStore["registerOwnedBlob"]>[1],
	): Promise<void> {
		await this.cache.registerOwnedBlob(repoDid, blob);
	}

	private async requireAgent(repoDid: string): Promise<Agent> {
		const agent = await this.agents.getAgent(repoDid);
		if (!agent) {
			throw new Error(`No OAuth session available for ${repoDid}`);
		}

		return agent;
	}

	private async syncCachedCollection<T>(
		collection: string,
		repoDid: string,
		remoteRecords: StoredRecord<T>[],
	): Promise<void> {
		const cachedRecords = await this.cache.listRecords<T>(collection, repoDid);
		const remoteUris = new Set(remoteRecords.map((record) => record.uri));

		for (const cached of cachedRecords) {
			if (!remoteUris.has(cached.uri)) {
				await this.cache.deleteRecord(cached.uri);
			}
		}

		for (const record of remoteRecords) {
			await upsertCachedRecord(this.cache, record);
		}
	}
}