export interface SqlDriver {
	get<T>(sql: string, params?: unknown[]): Promise<T | null>;
	all<T>(sql: string, params?: unknown[]): Promise<T[]>;
	run(sql: string, params?: unknown[]): Promise<number | undefined>;
}