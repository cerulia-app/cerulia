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
	type ScopeStateToken,
	storedRecordValueJson,
	toStoredRecord,
} from "./types.js";

interface RecordRow {
	repo_did: string;
	collection: string;
	rkey: string;
	value_json: string;
	created_at: string;
	updated_at: string;
}

export interface SqlDriver {
	get<T>(sql: string, params?: unknown[]): Promise<T | null>;
	all<T>(sql: string, params?: unknown[]): Promise<T[]>;
	run(sql: string, params?: unknown[]): Promise<number | undefined>;
}

function fromRow<T>(row: RecordRow): StoredRecord<T> {
	return toStoredRecord({
		repoDid: row.repo_did,
		collection: row.collection,
		rkey: row.rkey,
		value: JSON.parse(row.value_json) as T,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

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

export class SqlRecordStore implements RecordStore {
	constructor(private readonly driver: SqlDriver) {}

	async getScopeStateToken(
		repoDid: string,
		collections: string[],
	): Promise<ScopeStateToken> {
		const uniqueCollections = [...new Set(collections)].sort((left, right) =>
			left.localeCompare(right),
		);
		if (uniqueCollections.length === 0) {
			return { repoDid, collectionVersions: {} };
		}

		const placeholders = uniqueCollections.map(() => "?").join(", ");
		const rows = await this.driver.all<{
			collection: string;
			version: number;
		}>(
			`SELECT collection, version
		   FROM repo_collection_versions
		   WHERE repo_did = ? AND collection IN (${placeholders})`,
			[repoDid, ...uniqueCollections],
		);
		const versions = new Map(
			rows.map((row) => [row.collection, row.version] as const),
		);

		return {
			repoDid,
			collectionVersions: Object.fromEntries(
				uniqueCollections.map((collection) => [
					collection,
					versions.get(collection) ?? 0,
				]),
			),
		};
	}

	async createRecord<T>(
		draft: RecordDraft<T>,
		options?: CreateRecordOptions,
	): Promise<StoredRecord<T>> {
		const draftValueJson = storedRecordValueJson(draft.value);
		const expectedScopeEntries = Object.entries(
			options?.expectedScopeState?.collectionVersions ?? {},
		).sort(([left], [right]) => left.localeCompare(right));
		if (
			(options?.guardUnchanged?.length ?? 0) > 0 ||
			expectedScopeEntries.length > 0
		) {
			if (
				options?.expectedScopeState &&
				options.expectedScopeState.repoDid !== draft.repoDid
			) {
				throw new RecordConflictError();
			}

			const guardClauses: string[] = [];
			const guardParams: unknown[] = [];
			for (const [collection, version] of expectedScopeEntries) {
				guardClauses.push(
					"COALESCE((SELECT version FROM repo_collection_versions WHERE repo_did = ? AND collection = ?), 0) = ?",
				);
				guardParams.push(draft.repoDid, collection, version);
			}
			for (const guard of options?.guardUnchanged ?? []) {
				const parsedGuard = parseAtUri(guard.uri);
				guardClauses.push(
					"EXISTS (SELECT 1 FROM records WHERE repo_did = ? AND collection = ? AND rkey = ? AND value_json = ? AND created_at = ? AND updated_at = ?)",
				);
				guardParams.push(
					parsedGuard.repoDid,
					parsedGuard.collection,
					parsedGuard.rkey,
					storedRecordValueJson(guard.value),
					guard.createdAt,
					guard.updatedAt,
				);
			}

			const changes = await this.driver.run(
				`INSERT INTO records (repo_did, collection, rkey, value_json, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE ${guardClauses.join(" AND ")}`,
				[
					draft.repoDid,
					draft.collection,
					draft.rkey,
					draftValueJson,
					draft.createdAt,
					draft.updatedAt,
					...guardParams,
				],
			);
			if (changes !== 1) {
				throw new RecordConflictError();
			}
		} else {
			await this.driver.run(
				`INSERT INTO records (repo_did, collection, rkey, value_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
				[
					draft.repoDid,
					draft.collection,
					draft.rkey,
					draftValueJson,
					draft.createdAt,
					draft.updatedAt,
				],
			);
		}

		return toStoredRecord(draft);
	}

	async updateRecord<T>(
		draft: RecordDraft<T>,
		options?: UpdateRecordOptions<T>,
	): Promise<StoredRecord<T>> {
		if (
			options?.expectedScopeState &&
			options.expectedScopeState.repoDid !== draft.repoDid
		) {
			throw new RecordConflictError();
		}

		const baseParams = [
			storedRecordValueJson(draft.value),
			draft.createdAt,
			draft.updatedAt,
			draft.repoDid,
			draft.collection,
			draft.rkey,
		];
		const expectedScopeEntries = Object.entries(
			options?.expectedScopeState?.collectionVersions ?? {},
		).sort(([left], [right]) => left.localeCompare(right));
		const guardClauses: string[] = [];
		const guardParams: unknown[] = [];
		for (const [collection, version] of expectedScopeEntries) {
			guardClauses.push(
				"COALESCE((SELECT version FROM repo_collection_versions WHERE repo_did = ? AND collection = ?), 0) = ?",
			);
			guardParams.push(draft.repoDid, collection, version);
		}
		if (options?.expectedCurrent !== undefined) {
			guardClauses.push(
				"value_json = ? AND created_at = ? AND updated_at = ?",
			);
			guardParams.push(
				storedRecordValueJson(options.expectedCurrent.value),
				options.expectedCurrent.createdAt,
				options.expectedCurrent.updatedAt,
			);
		}
		const changes = await this.driver.run(
			guardClauses.length > 0
				? `UPDATE records
       SET value_json = ?, created_at = ?, updated_at = ?
	       WHERE repo_did = ? AND collection = ? AND rkey = ?
	         AND ${guardClauses.join(" AND ")}`
				: `UPDATE records
       SET value_json = ?, created_at = ?, updated_at = ?
       WHERE repo_did = ? AND collection = ? AND rkey = ?`,
			guardClauses.length > 0 ? [...baseParams, ...guardParams] : baseParams,
		);

		if (guardClauses.length > 0 && changes !== 1) {
			throw new RecordConflictError();
		}

		return toStoredRecord(draft);
	}

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		const parsed = parseAtUri(uri);
		const row = await this.driver.get<RecordRow>(
			`SELECT repo_did, collection, rkey, value_json, created_at, updated_at
       FROM records
       WHERE repo_did = ? AND collection = ? AND rkey = ?`,
			[parsed.repoDid, parsed.collection, parsed.rkey],
		);

		return row ? fromRow<T>(row) : null;
	}

	async deleteRecord(uri: string): Promise<void> {
		const parsed = parseAtUri(uri);
		await this.driver.run(
			`DELETE FROM records WHERE repo_did = ? AND collection = ? AND rkey = ?`,
			[parsed.repoDid, parsed.collection, parsed.rkey],
		);
	}

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		const rows = repoDid
			? await this.driver.all<RecordRow>(
					`SELECT repo_did, collection, rkey, value_json, created_at, updated_at
           FROM records
           WHERE collection = ? AND repo_did = ?
           ORDER BY updated_at DESC, created_at DESC, rkey ASC`,
					[collection, repoDid],
				)
			: await this.driver.all<RecordRow>(
					`SELECT repo_did, collection, rkey, value_json, created_at, updated_at
           FROM records
           WHERE collection = ?
           ORDER BY updated_at DESC, created_at DESC, repo_did ASC, rkey ASC`,
					[collection],
				);

		return rows.map((row) => fromRow<T>(row));
	}

	async hasOwnedBlob(repoDid: string, blob: BlobRefLike): Promise<boolean> {
		const cid = blobCid(blob);
		if (!cid) {
			return false;
		}

		const row = await this.driver.get<{ blob_cid: string }>(
			`SELECT blob_cid FROM owned_blobs WHERE repo_did = ? AND blob_cid = ?`,
			[repoDid, cid],
		);

		return row !== null;
	}

	async registerOwnedBlob(repoDid: string, blob: BlobRefLike): Promise<void> {
		const cid = blobCid(blob);
		if (!cid) {
			return;
		}

		await this.driver.run(
			`INSERT OR REPLACE INTO owned_blobs (repo_did, blob_cid, blob_json)
       VALUES (?, ?, ?)`,
			[repoDid, cid, JSON.stringify(blob)],
		);
	}
}
