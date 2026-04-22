import { buildAtUri } from "../refs.js";

export interface BlobRefLike {
	ref?: unknown;
	mimeType?: string;
	size?: number;
}

export interface RecordDraft<T> {
	repoDid: string;
	collection: string;
	rkey: string;
	value: T;
	createdAt: string;
	updatedAt: string;
}

export interface StoredRecord<T> extends RecordDraft<T> {
	uri: string;
}

export interface ScopeStateToken {
	repoDid: string;
	collectionVersions?: Record<string, number>;
	repoCommit?: string;
}

export interface CreateRecordOptions {
	guardUnchanged?: StoredRecord<unknown>[];
	expectedScopeState?: ScopeStateToken;
}

export interface UpdateRecordOptions<T> {
	expectedCurrent?: StoredRecord<T>;
	expectedScopeState?: ScopeStateToken;
}

export type RecordWrite<T = unknown> =
	| { kind: "create"; draft: RecordDraft<T> }
	| { kind: "update"; draft: RecordDraft<T> };

export interface ApplyWritesOptions {
	expectedScopeState: ScopeStateToken;
}

export class RecordConflictError extends Error {
	constructor(message = "record was modified by another write") {
		super(message);
		this.name = "RecordConflictError";
	}
}

export function isRecordConflictError(
	error: unknown,
): error is RecordConflictError {
	return error instanceof RecordConflictError;
}

export interface RecordStore {
	createRecord<T>(
		draft: RecordDraft<T>,
		options?: CreateRecordOptions,
	): Promise<StoredRecord<T>>;
	updateRecord<T>(
		draft: RecordDraft<T>,
		options?: UpdateRecordOptions<T>,
	): Promise<StoredRecord<T>>;
	deleteRecord(uri: string): Promise<void>;
	getRecord<T>(uri: string): Promise<StoredRecord<T> | null>;
	getScopeStateToken(
		repoDid: string,
		collections: string[],
	): Promise<ScopeStateToken>;
	listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]>;
	hasOwnedBlob(repoDid: string, blob: BlobRefLike): Promise<boolean>;
	registerOwnedBlob(repoDid: string, blob: BlobRefLike): Promise<void>;
	applyWrites?(
		writes: RecordWrite[],
		options: ApplyWritesOptions,
	): Promise<void>;
}

export type AtomicRecordStore = RecordStore & {
	applyWrites: NonNullable<RecordStore["applyWrites"]>;
};

export function toStoredRecord<T>(draft: RecordDraft<T>): StoredRecord<T> {
	return {
		...draft,
		uri: buildAtUri(draft.repoDid, draft.collection, draft.rkey),
	};
}

export function storedRecordValueJson(value: unknown) {
	return JSON.stringify(value);
}

export function storedRecordMatchesExpected(
	current: StoredRecord<unknown> | null,
	expected: StoredRecord<unknown>,
) {
	if (!current) {
		return false;
	}

	return (
		current.uri === expected.uri &&
		current.createdAt === expected.createdAt &&
		current.updatedAt === expected.updatedAt &&
		storedRecordValueJson(current.value) === storedRecordValueJson(expected.value)
	);
}

function normalizeCollectionVersions(
	versions: Record<string, number> | undefined,
): Record<string, number> {
	if (!versions) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(versions).sort(([left], [right]) =>
			left.localeCompare(right),
		),
	);
}

export function scopeStateTokenEquals(
	left: ScopeStateToken,
	right: ScopeStateToken,
) {
	return (
		left.repoDid === right.repoDid &&
		left.repoCommit === right.repoCommit &&
		JSON.stringify(normalizeCollectionVersions(left.collectionVersions)) ===
			JSON.stringify(normalizeCollectionVersions(right.collectionVersions))
	);
}
