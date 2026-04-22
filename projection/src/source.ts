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
	listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]>;
}