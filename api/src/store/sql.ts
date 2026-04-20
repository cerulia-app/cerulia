import { parseAtUri } from "../refs.js";
import type {
	BlobRefLike,
	RecordDraft,
	RecordStore,
	StoredRecord,
} from "./types.js";
import { toStoredRecord } from "./types.js";

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
	run(sql: string, params?: unknown[]): Promise<void>;
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

	async createRecord<T>(draft: RecordDraft<T>): Promise<StoredRecord<T>> {
		await this.driver.run(
			`INSERT INTO records (repo_did, collection, rkey, value_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
			[
				draft.repoDid,
				draft.collection,
				draft.rkey,
				JSON.stringify(draft.value),
				draft.createdAt,
				draft.updatedAt,
			],
		);

		return toStoredRecord(draft);
	}

	async updateRecord<T>(draft: RecordDraft<T>): Promise<StoredRecord<T>> {
		await this.driver.run(
			`UPDATE records
       SET value_json = ?, created_at = ?, updated_at = ?
       WHERE repo_did = ? AND collection = ? AND rkey = ?`,
			[
				JSON.stringify(draft.value),
				draft.createdAt,
				draft.updatedAt,
				draft.repoDid,
				draft.collection,
				draft.rkey,
			],
		);

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
