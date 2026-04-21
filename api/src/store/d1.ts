import { SqlRecordStore, type SqlDriver } from "./sql.js";

export interface D1ResultSet<T> {
	results: T[];
}

export interface D1StatementLike {
	bind(...values: unknown[]): D1StatementLike;
	first<T>(): Promise<T | null>;
	all<T>(): Promise<D1ResultSet<T>>;
	run(): Promise<unknown>;
}

export interface D1DatabaseLike {
	prepare(sql: string): D1StatementLike;
}

class D1SqlDriver implements SqlDriver {
	constructor(private readonly db: D1DatabaseLike) {}

	private extractChanges(result: unknown): number | undefined {
		if (typeof result !== "object" || result === null) {
			return undefined;
		}

		if (
			"changes" in result &&
			typeof (result as { changes?: unknown }).changes === "number"
		) {
			return (result as { changes: number }).changes;
		}

		const meta = (result as { meta?: unknown }).meta;
		if (
			typeof meta === "object" &&
			meta !== null &&
			"changes" in meta &&
			typeof (meta as { changes?: unknown }).changes === "number"
		) {
			return (meta as { changes: number }).changes;
		}

		return undefined;
	}

	async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
		return this.db
			.prepare(sql)
			.bind(...params)
			.first<T>();
	}

	async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
		const result = await this.db
			.prepare(sql)
			.bind(...params)
			.all<T>();
		return result.results;
	}

	async run(sql: string, params: unknown[] = []): Promise<number | undefined> {
		const result = await this.db
			.prepare(sql)
			.bind(...params)
			.run();
		return this.extractChanges(result);
	}
}

export function createD1Driver(db: D1DatabaseLike): D1SqlDriver {
	return new D1SqlDriver(db);
}

export function createD1Store(db: D1DatabaseLike): SqlRecordStore {
	return new SqlRecordStore(createD1Driver(db));
}
