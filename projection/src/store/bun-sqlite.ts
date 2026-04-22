import { Database, type SQLQueryBindings } from "bun:sqlite";
import type { SqlDriver } from "./sql.js";

function asBindings(params: unknown[]): SQLQueryBindings[] {
	return params as SQLQueryBindings[];
}

export class BunSqlDriver implements SqlDriver {
	private readonly db: Database;

	constructor(path: string) {
		this.db = new Database(path, { create: true });
	}

	async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
		const row = this.db.query(sql).get(...asBindings(params));
		return (row as T | undefined) ?? null;
	}

	async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
		return this.db.query(sql).all(...asBindings(params)) as T[];
	}

	async run(sql: string, params: unknown[] = []): Promise<number | undefined> {
		const result = this.db.query(sql).run(...asBindings(params)) as {
			changes?: number;
		};
		return result.changes;
	}
}

export function createBunSqliteDriver(path: string): BunSqlDriver {
	return new BunSqlDriver(path);
}