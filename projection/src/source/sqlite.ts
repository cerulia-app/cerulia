import { parseAtUri } from "@cerulia/protocol";
import type { CanonicalRecordSource, StoredRecord } from "../source.js";
import type { SqlDriver } from "../store/bun-sqlite.js";

interface RecordRow {
	repo_did: string;
	collection: string;
	rkey: string;
	value_json: string;
	created_at: string;
	updated_at: string;
}

function fromRow<T>(row: RecordRow): StoredRecord<T> {
	return {
		uri: `at://${row.repo_did}/${row.collection}/${row.rkey}`,
		repoDid: row.repo_did,
		collection: row.collection,
		rkey: row.rkey,
		value: JSON.parse(row.value_json) as T,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

export class SqliteCanonicalRecordSource implements CanonicalRecordSource {
	constructor(private readonly driver: SqlDriver) {}

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

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		const rows = repoDid
			? await this.driver.all<RecordRow>(
				`SELECT repo_did, collection, rkey, value_json, created_at, updated_at
				 FROM records
				 WHERE collection = ? AND repo_did = ?
				 ORDER BY updated_at DESC, created_at DESC, repo_did ASC, rkey ASC`,
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
}