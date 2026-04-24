import { Agent } from "@atproto/api";
import { buildAtUri, parseAtUri } from "../refs.js";
import type {
	ApplyWritesOptions,
	RecordWrite,
	CreateRecordOptions,
	RecordDraft,
	RecordStore,
	ScopeStateToken,
	StoredRecord,
	UpdateRecordOptions,
} from "./types.js";
import { RecordConflictError, storedRecordMatchesExpected } from "./types.js";

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

function toStoredRecord<T>(uri: string, value: T): StoredRecord<T> {
	const parsed = parseAtUri(uri);
	const timestampSource =
		typeof value === "object" && value !== null
			? (value as { [_ in string]: unknown })
			: {};
	const createdAt =
		extractTimestamp(timestampSource, "createdAt") ??
		extractTimestamp(timestampSource, "updatedAt") ??
		new Date().toISOString();
	const updatedAt = extractTimestamp(timestampSource, "updatedAt") ?? createdAt;

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

	async getScopeStateToken(
		repoDid: string,
		_collections: string[],
	): Promise<ScopeStateToken> {
		const agent = await this.requireAgent(repoDid);
		const latestCommit = await agent.com.atproto.sync.getLatestCommit({
			did: repoDid,
		});

		return {
			repoDid,
			repoCommit: latestCommit.data.cid,
		};
	}

	async createRecord<T>(
		draft: RecordDraft<T>,
		options?: CreateRecordOptions,
	): Promise<StoredRecord<T>> {
		const agent = await this.requireAgent(draft.repoDid);
		let swapCommit: string | undefined;
		if (options?.expectedScopeState) {
			if (options.expectedScopeState.repoDid !== draft.repoDid) {
				throw new RecordConflictError();
			}
			swapCommit = options.expectedScopeState.repoCommit;
		}
		if ((options?.guardUnchanged?.length ?? 0) > 0) {
			if (!swapCommit) {
				const latestCommit = await agent.com.atproto.sync.getLatestCommit({
					did: draft.repoDid,
				});
				swapCommit = latestCommit.data.cid;
			}

			for (const guard of options?.guardUnchanged ?? []) {
				const parsedGuard = parseAtUri(guard.uri);
				try {
					const current = await agent.com.atproto.repo.getRecord({
						repo: parsedGuard.repoDid,
						collection: parsedGuard.collection,
						rkey: parsedGuard.rkey,
					});
					const currentRecord = toStoredRecord(
						current.data.uri,
						current.data.value as unknown,
					);
					if (!storedRecordMatchesExpected(currentRecord, guard)) {
						throw new RecordConflictError();
					}
				} catch (error) {
					if (error instanceof RecordConflictError || isNotFoundError(error)) {
						throw new RecordConflictError();
					}
					throw error;
				}
			}
		}
		try {
			await agent.com.atproto.repo.createRecord({
				repo: draft.repoDid,
				collection: draft.collection,
				rkey: draft.rkey,
				record: draft.value as { [_ in string]: unknown },
				validate: true,
				swapCommit,
			});
		} catch (error) {
			if (error instanceof Error && error.name === "InvalidSwapError") {
				throw new RecordConflictError();
			}
			throw error;
		}

		await bestEffortCacheSync(
			this.agents.rememberRepoDid?.(draft.repoDid) ?? Promise.resolve(),
		);
		await bestEffortCacheSync(
			this.cache.createRecord(draft).then(() => undefined),
		);
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

	async updateRecord<T>(
		draft: RecordDraft<T>,
		options?: UpdateRecordOptions<T>,
	): Promise<StoredRecord<T>> {
		const agent = await this.requireAgent(draft.repoDid);
		let swapRecord: string | null | undefined;
		let swapCommit: string | undefined;
		if (options?.expectedScopeState) {
			if (options.expectedScopeState.repoDid !== draft.repoDid) {
				throw new RecordConflictError();
			}
			swapCommit = options.expectedScopeState.repoCommit;
		}
		if (options?.expectedCurrent !== undefined) {
			try {
				const current = await agent.com.atproto.repo.getRecord({
					repo: draft.repoDid,
					collection: draft.collection,
					rkey: draft.rkey,
				});
				const currentRecord = toStoredRecord(
					current.data.uri,
					current.data.value as T,
				);
				if (
					!storedRecordMatchesExpected(
						currentRecord as StoredRecord<unknown>,
						options.expectedCurrent as StoredRecord<unknown>,
					)
				) {
					throw new RecordConflictError();
				}
				swapRecord = current.data.cid;
			} catch (error) {
				if (error instanceof RecordConflictError || isNotFoundError(error)) {
					throw new RecordConflictError();
				}
				throw error;
			}
		}

		try {
			await agent.com.atproto.repo.putRecord({
				repo: draft.repoDid,
				collection: draft.collection,
				rkey: draft.rkey,
				record: draft.value as { [_ in string]: unknown },
				validate: true,
				swapRecord,
				swapCommit,
			});
		} catch (error) {
			if (error instanceof Error && error.name === "InvalidSwapError") {
				throw new RecordConflictError();
			}
			throw error;
		}

		await bestEffortCacheSync(
			this.agents.rememberRepoDid?.(draft.repoDid) ?? Promise.resolve(),
		);
		await bestEffortCacheSync(
			this.cache.updateRecord(draft).then(() => undefined),
		);
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

	async applyWrites(
		writes: RecordWrite[],
		options: ApplyWritesOptions,
	): Promise<void> {
		if (writes.length === 0) {
			return;
		}

		const [firstWrite] = writes;
		if (!firstWrite) {
			return;
		}

		const repoDid = firstWrite.draft.repoDid;
		if (options.expectedScopeState.repoDid !== repoDid) {
			throw new RecordConflictError();
		}

		for (const write of writes) {
			if (write.draft.repoDid !== repoDid) {
				throw new Error("applyWrites requires a single repoDid");
			}
		}

		const agent = await this.requireAgent(repoDid);
		try {
			await agent.com.atproto.repo.applyWrites({
				repo: repoDid,
				validate: true,
				swapCommit: options.expectedScopeState.repoCommit,
				writes: writes.map((write) => {
					if (write.kind === "create") {
						return {
							$type: "com.atproto.repo.applyWrites#create",
							collection: write.draft.collection,
							rkey: write.draft.rkey,
							value: write.draft.value as { [_ in string]: unknown },
						};
					}

					return {
						$type: "com.atproto.repo.applyWrites#update",
						collection: write.draft.collection,
						rkey: write.draft.rkey,
						value: write.draft.value as { [_ in string]: unknown },
					};
				}),
			});
		} catch (error) {
			if (error instanceof Error && error.name === "InvalidSwapError") {
				throw new RecordConflictError();
			}
			throw error;
		}

		await bestEffortCacheSync(
			this.agents.rememberRepoDid?.(repoDid) ?? Promise.resolve(),
		);
		for (const write of writes) {
			const syncTask =
				write.kind === "create"
					? this.cache.createRecord(write.draft)
					: this.cache.updateRecord(write.draft);
			await bestEffortCacheSync(syncTask.then(() => undefined));
		}
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
				: new Map(cachedRecords.map((record) => [record.uri, record] as const));
			for (const subjectDid of repoDids) {
				for (const record of await this.listRecords<T>(
					collection,
					subjectDid,
				)) {
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

	async hasOwnedBlob(
		repoDid: string,
		blob: Parameters<RecordStore["hasOwnedBlob"]>[1],
	) {
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
