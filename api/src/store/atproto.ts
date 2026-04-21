import { Agent } from "@atproto/api";
import { buildAtUri, parseAtUri } from "../refs.js";
import type { RecordDraft, RecordStore, StoredRecord } from "./types.js";

export interface AgentProvider {
	getAgent(repoDid: string): Promise<Agent | null>;
	listRepoDids?(): Promise<string[]>;
	getPublicAgent?(repoDid: string): Promise<Agent | null>;
	rememberRepoDid?(repoDid: string): Promise<void>;
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

		await bestEffortCacheSync(
			this.agents.rememberRepoDid?.(draft.repoDid) ?? Promise.resolve(),
		);
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

		await bestEffortCacheSync(
			this.agents.rememberRepoDid?.(draft.repoDid) ?? Promise.resolve(),
		);
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
		await bestEffortCacheSync(
			this.agents.rememberRepoDid?.(parsed.repoDid) ?? Promise.resolve(),
		);
		await bestEffortCacheSync(this.cache.deleteRecord(uri));
	}

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		const parsed = parseAtUri(uri);
		const readAgent = await this.getReadAgent(parsed.repoDid);
		if (readAgent) {
			try {
				const response = await readAgent.agent.com.atproto.repo.getRecord({
					repo: parsed.repoDid,
					collection: parsed.collection,
					rkey: parsed.rkey,
				});
				const record = toStoredRecord(
					response.data.uri,
					response.data.value as T,
				);
				await bestEffortCacheSync(
					this.agents.rememberRepoDid?.(parsed.repoDid) ?? Promise.resolve(),
				);
				await bestEffortCacheSync(upsertCachedRecord(this.cache, record));
				return record;
			} catch (error) {
				if (isNotFoundError(error)) {
					await bestEffortCacheSync(this.cache.deleteRecord(uri));
					return null;
				}

				if (readAgent.kind === "authenticated") {
					throw error;
				}

				return this.cache.getRecord<T>(uri);
			}
		}

		return this.cache.getRecord<T>(uri);
	}

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		if (!repoDid) {
			const cachedRecords = await this.cache.listRecords<T>(collection);
			const repoDids = new Set(cachedRecords.map((record) => record.repoDid));
			for (const subjectDid of (await this.agents.listRepoDids?.()) ?? []) {
				repoDids.add(subjectDid);
			}

			if (repoDids.size === 0) {
				return cachedRecords;
			}

			const records = this.agents.getPublicAgent
				? new Map<string, StoredRecord<T>>()
				: new Map(
					cachedRecords.map((record) => [record.uri, record] as const),
				);
			for (const subjectDid of repoDids) {
				for (const record of await this.listRecords<T>(collection, subjectDid)) {
					records.set(record.uri, record);
				}
			}

			return [...records.values()].sort(compareStoredRecords);
		}

		const readAgent = await this.getReadAgent(repoDid);
		if (!readAgent) {
			return this.cache.listRecords<T>(collection, repoDid);
		}

		const remoteRecords: StoredRecord<T>[] = [];
		let cursor: string | undefined;

		try {
			do {
				const response = await readAgent.agent.com.atproto.repo.listRecords({
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
		} catch (error) {
			if (readAgent.kind === "authenticated") {
				throw error;
			}

			if (isNotFoundError(error)) {
				await bestEffortCacheSync(
					this.syncCachedCollection(collection, repoDid, []),
				);
				return [];
			}

			return this.cache.listRecords<T>(collection, repoDid);
		}

		await bestEffortCacheSync(
			this.agents.rememberRepoDid?.(repoDid) ?? Promise.resolve(),
		);
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

	private async getReadAgent(
		repoDid: string,
	): Promise<{ agent: Agent; kind: "authenticated" | "public" } | null> {
		const authenticatedAgent = await this.agents.getAgent(repoDid);
		if (authenticatedAgent) {
			return {
				agent: authenticatedAgent,
				kind: "authenticated",
			};
		}

		const publicAgent = await this.agents.getPublicAgent?.(repoDid);
		return publicAgent
			? {
				agent: publicAgent,
				kind: "public",
			}
			: null;
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