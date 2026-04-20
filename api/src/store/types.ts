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

export interface RecordStore {
	createRecord<T>(draft: RecordDraft<T>): Promise<StoredRecord<T>>;
	updateRecord<T>(draft: RecordDraft<T>): Promise<StoredRecord<T>>;
	deleteRecord(uri: string): Promise<void>;
	getRecord<T>(uri: string): Promise<StoredRecord<T> | null>;
	listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]>;
	hasOwnedBlob(repoDid: string, blob: BlobRefLike): Promise<boolean>;
	registerOwnedBlob(repoDid: string, blob: BlobRefLike): Promise<void>;
}

export function toStoredRecord<T>(draft: RecordDraft<T>): StoredRecord<T> {
	return {
		...draft,
		uri: buildAtUri(draft.repoDid, draft.collection, draft.rkey),
	};
}
