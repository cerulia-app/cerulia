import { parseAtUri } from "../refs.js";
import type {
	BlobRefLike,
	CreateRecordOptions,
	RecordDraft,
	RecordStore,
	StoredRecord,
	UpdateRecordOptions,
} from "./types.js";
import {
	RecordConflictError,
	scopeStateTokenEquals,
	storedRecordMatchesExpected,
	toStoredRecord,
} from "./types.js";

function blobCid(blob: BlobRefLike): string | null {
	const ref = blob.ref;
	const cid =
		typeof ref === "object" && ref !== null && "$link" in ref
			? (ref as { $link?: unknown }).$link
			: undefined;
	if (typeof cid === "string" && cid.length > 0) {
		return cid;
	}

	if (
		typeof ref === "object" &&
		ref !== null &&
		typeof (ref as { toString?: () => string }).toString === "function"
	) {
		const value = (ref as { toString: () => string }).toString();
		return value.length > 0 ? value : null;
	}

	return null;
}

export class MemoryRecordStore implements RecordStore {
	private readonly records = new Map<string, StoredRecord<unknown>>();
	private readonly ownedBlobs = new Set<string>();
	private readonly collectionVersions = new Map<string, number>();

	private bumpCollectionVersion(repoDid: string, collection: string) {
		const key = `${repoDid}:${collection}`;
		this.collectionVersions.set(key, (this.collectionVersions.get(key) ?? 0) + 1);
	}

	async createRecord<T>(
		draft: RecordDraft<T>,
		options?: CreateRecordOptions,
	): Promise<StoredRecord<T>> {
		if (options?.expectedScopeState) {
			const currentScopeState = await this.getScopeStateToken(
				options.expectedScopeState.repoDid,
				Object.keys(options.expectedScopeState.collectionVersions ?? {}),
			);
			if (!scopeStateTokenEquals(currentScopeState, options.expectedScopeState)) {
				throw new RecordConflictError();
			}
		}

		for (const guard of options?.guardUnchanged ?? []) {
			const current = this.records.get(guard.uri) ?? null;
			if (!storedRecordMatchesExpected(current, guard)) {
				throw new RecordConflictError();
			}
		}

		const record = toStoredRecord(draft);
		this.records.set(record.uri, record);
		this.bumpCollectionVersion(record.repoDid, record.collection);
		return record;
	}

	async updateRecord<T>(
		draft: RecordDraft<T>,
		options?: UpdateRecordOptions<T>,
	): Promise<StoredRecord<T>> {
		if (options?.expectedScopeState) {
			const currentScopeState = await this.getScopeStateToken(
				options.expectedScopeState.repoDid,
				Object.keys(options.expectedScopeState.collectionVersions ?? {}),
			);
			if (!scopeStateTokenEquals(currentScopeState, options.expectedScopeState)) {
				throw new RecordConflictError();
			}
		}

		const record = toStoredRecord(draft);
		const existing = this.records.get(record.uri);
		if (
			options?.expectedCurrent !== undefined &&
			!storedRecordMatchesExpected(
				existing ?? null,
				options.expectedCurrent as StoredRecord<unknown>,
			)
		) {
			throw new RecordConflictError();
		}
		this.records.set(record.uri, record);
		this.bumpCollectionVersion(record.repoDid, record.collection);
		return record;
	}

	async getScopeStateToken(repoDid: string, collections: string[]) {
		const uniqueCollections = [...new Set(collections)].sort((left, right) =>
			left.localeCompare(right),
		);

		return {
			repoDid,
			collectionVersions: Object.fromEntries(
				uniqueCollections.map((collection) => {
					return [
						collection,
						this.collectionVersions.get(`${repoDid}:${collection}`) ?? 0,
					];
				}),
			),
		};
	}

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		const record = this.records.get(uri);
		return (record as StoredRecord<T> | undefined) ?? null;
	}

	async deleteRecord(uri: string): Promise<void> {
		const existing = this.records.get(uri);
		this.records.delete(uri);
		if (existing) {
			this.bumpCollectionVersion(existing.repoDid, existing.collection);
		}
	}

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		return Array.from(this.records.values())
			.filter((record) => {
				return (
					record.collection === collection &&
					(repoDid === undefined || record.repoDid === repoDid)
				);
			})
			.sort((left, right) => {
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
			}) as StoredRecord<T>[];
	}

	async hasOwnedBlob(repoDid: string, blob: BlobRefLike): Promise<boolean> {
		const cid = blobCid(blob);
		return cid !== null && this.ownedBlobs.has(`${repoDid}:${cid}`);
	}

	async registerOwnedBlob(repoDid: string, blob: BlobRefLike): Promise<void> {
		const cid = blobCid(blob);
		if (!cid) {
			return;
		}

		this.ownedBlobs.add(`${repoDid}:${cid}`);
	}

	seedRecord<T>(
		uri: string,
		value: T,
		createdAt: string,
		updatedAt: string,
	): void {
		const parsed = parseAtUri(uri);
		this.records.set(uri, {
			uri,
			repoDid: parsed.repoDid,
			collection: parsed.collection,
			rkey: parsed.rkey,
			value,
			createdAt,
			updatedAt,
		});
		this.bumpCollectionVersion(parsed.repoDid, parsed.collection);
	}
}
