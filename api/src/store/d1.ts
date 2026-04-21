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

	async run(sql: string, params: unknown[] = []): Promise<void> {
		await this.db
			.prepare(sql)
			.bind(...params)
			.run();
	}
}

export function createD1Driver(db: D1DatabaseLike): D1SqlDriver {
	return new D1SqlDriver(db);
}

export function createD1Store(db: D1DatabaseLike): SqlRecordStore {
	return new SqlRecordStore(createD1Driver(db));
}
