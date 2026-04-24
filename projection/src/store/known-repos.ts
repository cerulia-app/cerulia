import type { SqlDriver } from "./sql.js";

export interface KnownRepoCatalog {
	rememberRepoDid(repoDid: string): Promise<void>;
	listRepoDids(): Promise<string[]>;
	clear?(): Promise<void>;
}

export class SqlKnownRepoCatalog implements KnownRepoCatalog {
	constructor(private readonly driver: SqlDriver) {}

	async rememberRepoDid(repoDid: string): Promise<void> {
		const timestamp = new Date().toISOString();
		await this.driver.run(
			`INSERT OR REPLACE INTO known_repos (repo_did, updated_at)
       VALUES (?, ?)`,
			[repoDid, timestamp],
		);
	}

	async listRepoDids(): Promise<string[]> {
		const rows = await this.driver.all<{ repo_did: string }>(
			`SELECT repo_did FROM known_repos ORDER BY updated_at DESC, repo_did ASC`,
		);
		return rows.map((row) => row.repo_did);
	}

	async clear(): Promise<void> {
		await this.driver.run(`DELETE FROM known_repos`);
	}
}

export function createMemoryKnownRepoCatalog(
	seed: string[] = [],
): KnownRepoCatalog {
	const repoDids = new Set(seed);

	return {
		async rememberRepoDid(repoDid: string) {
			repoDids.add(repoDid);
		},
		async listRepoDids() {
			return [...repoDids].sort((left, right) => left.localeCompare(right));
		},
		async clear() {
			repoDids.clear();
		},
	};
}

export function parseSeedRepoDids(raw: string | undefined): string[] {
	if (!raw) {
		return [];
	}

	return [
		...new Set(raw.split(/[\s,]+/).filter((value) => value.length > 0)),
	].sort((left, right) => left.localeCompare(right));
}

export async function seedKnownRepoCatalog(
	catalog: KnownRepoCatalog,
	repoDids: string[],
): Promise<void> {
	for (const repoDid of repoDids) {
		await catalog.rememberRepoDid(repoDid);
	}
}
