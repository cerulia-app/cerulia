export interface StoredRecord<T> {
	uri: string;
	repoDid: string;
	collection: string;
	rkey: string;
	value: T;
	createdAt: string;
	updatedAt: string;
}

export interface CanonicalRecordSource {
	getRecord<T>(uri: string): Promise<StoredRecord<T> | null>;
	listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]>;
}