import type { PublicAgentProvider } from "../agents.js";
import { parseAtUri } from "@cerulia/protocol";
import type { CanonicalRecordSource, StoredRecord } from "../source.js";

export class AggregateDiscoveryError extends Error {
	constructor(public readonly repoDids: string[]) {
		super("failed to load one or more repos");
		this.name = "AggregateDiscoveryError";
	}
}

export class RepoReadUnavailableError extends Error {
	constructor(public readonly repoDid: string) {
		super(`failed to load repo ${repoDid}`);
		this.name = "RepoReadUnavailableError";
	}
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
	expectedRepoDid: string,
	expectedCollection: string,
): StoredRecord<T> {
	const { repoDid, collection, rkey } = parseAtUri(uri);
	if (repoDid !== expectedRepoDid) {
		throw new Error(`Unexpected repoDid in AT URI: ${uri}`);
	}

	if (collection !== expectedCollection) {
		throw new Error(`Unexpected collection in AT URI: ${uri}`);
	}

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
		repoDid,
		collection,
		rkey,
		value,
		createdAt,
		updatedAt,
	};
}

export class AtprotoPublicRecordSource implements CanonicalRecordSource {
	constructor(private readonly agents: PublicAgentProvider) {}

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		const { repoDid, collection, rkey } = parseAtUri(uri);
		const agent = await this.agents.getPublicAgent(repoDid);
		if (!agent) {
			throw new RepoReadUnavailableError(repoDid);
		}

		try {
			const response = await agent.com.atproto.repo.getRecord({
				repo: repoDid,
				collection,
				rkey,
			});
			return toStoredRecord(
				response.data.uri,
				response.data.value as T,
				repoDid,
				collection,
			);
		} catch (error) {
			if (isNotFoundError(error)) {
				return null;
			}

			throw error;
		}
	}

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		if (!repoDid) {
			const records = new Map<string, StoredRecord<T>>();
			const failedRepoDids: string[] = [];
			for (const subjectDid of await this.agents.listRepoDids()) {
				try {
					for (const record of await this.listRecords<T>(collection, subjectDid)) {
						records.set(record.uri, record);
					}
				} catch {
					failedRepoDids.push(subjectDid);
				}
			}

			if (failedRepoDids.length > 0) {
				throw new AggregateDiscoveryError(failedRepoDids);
			}

			return [...records.values()].sort(compareStoredRecords);
		}

		const agent = await this.agents.getPublicAgent(repoDid);
		if (!agent) {
			throw new RepoReadUnavailableError(repoDid);
		}

		const remoteRecords: StoredRecord<T>[] = [];
		let cursor: string | undefined;

		try {
			do {
				const response = await agent.com.atproto.repo.listRecords({
					repo: repoDid,
					collection,
					limit: 100,
					cursor,
				});
				remoteRecords.push(
					...response.data.records.map((record) =>
						toStoredRecord(record.uri, record.value as T, repoDid, collection),
					),
				);
				cursor = response.data.cursor;
			} while (cursor);
		} catch (error) {
			if (isNotFoundError(error)) {
				return [];
			}

			throw error;
		}

		await this.agents.rememberRepoDid(repoDid);
		return remoteRecords;
	}
}