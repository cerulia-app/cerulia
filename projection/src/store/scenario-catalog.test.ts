import { describe, expect, test } from "bun:test";
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	LEGACY_SCENARIO_CATALOG_REPO_DID,
	SqlScenarioCatalogStore,
} from "./scenario-catalog.js";
import type { SqlDriver } from "./sql.js";

class InterleavingDriver implements SqlDriver {
	private readonly repoState = new Map<string, number>();
	private readonly entries = new Map<
		string,
		Array<{
			scenarioRef: string;
			generation: number;
			title: string;
			rulesetNsid: string | null;
			hasRecommendedSheetSchema: number;
			summary: string | null;
		}>
	>();
	private failNextUpsertForRepoDid: string | null = null;
	private interleavedCleanup: {
		repoDid: string;
		generation: number;
		entryTitle: string;
	} | null = null;

	setConflict(repoDid: string) {
		this.failNextUpsertForRepoDid = repoDid;
	}

	setInterleavedCleanup(
		repoDid: string,
		generation: number,
		entryTitle: string,
	) {
		this.interleavedCleanup = {
			repoDid,
			generation,
			entryTitle,
		};
	}

	async get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
		if (sql.includes("FROM scenario_catalog_repo_state")) {
			const repoDid = params[0] as string;
			const activeGeneration = this.repoState.get(repoDid);
			return activeGeneration === undefined
				? null
				: ({ active_generation: activeGeneration } as T);
		}

		return null;
	}

	async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
		if (sql.includes("FROM scenario_catalog_entries AS entries")) {
			const rulesetNsid = sql.includes("WHERE ruleset_nsid = ?")
				? ((params[params.length - 1] as string | undefined) ?? undefined)
				: undefined;
			const rows: T[] = [];
			const deduped = new Map<string, T>();
			for (const [repoDid, activeGeneration] of this.repoState.entries()) {
				for (const entry of this.entries.get(repoDid) ?? []) {
					if (entry.generation !== activeGeneration) {
						continue;
					}
					if (rulesetNsid && entry.rulesetNsid !== rulesetNsid) {
						continue;
					}
					const row = {
						scenario_ref: entry.scenarioRef,
						title: entry.title,
						ruleset_nsid: entry.rulesetNsid,
						has_recommended_sheet_schema: entry.hasRecommendedSheetSchema,
						summary: entry.summary,
					} as T;
					const existing = deduped.get(entry.scenarioRef);
					if (!existing || repoDid !== LEGACY_SCENARIO_CATALOG_REPO_DID) {
						deduped.set(entry.scenarioRef, row);
					}
				}
			}

			rows.push(...deduped.values());
			return rows.sort((left, right) =>
				String((left as { title: string }).title).localeCompare(
					String((right as { title: string }).title),
				),
			);
		}

		return [];
	}

	async run(sql: string, params: unknown[] = []): Promise<number | undefined> {
		if (
			sql.includes(
				"DELETE FROM scenario_catalog_entries WHERE repo_did = ? AND generation = ?",
			)
		) {
			const [repoDid, generation] = params as [string, number];
			this.entries.set(
				repoDid,
				(this.entries.get(repoDid) ?? []).filter(
					(entry) => entry.generation !== generation,
				),
			);
			return 1;
		}

		if (sql.includes("INSERT INTO scenario_catalog_entries")) {
			const [
				scenarioRef,
				repoDid,
				generation,
				title,
				rulesetNsid,
				hasRecommendedSheetSchema,
				summary,
			] = params as [
				string,
				string,
				number,
				string,
				string | null,
				number,
				string | null,
			];
			const current = this.entries.get(repoDid) ?? [];
			current.push({
				scenarioRef,
				generation,
				title,
				rulesetNsid,
				hasRecommendedSheetSchema,
				summary,
			});
			this.entries.set(repoDid, current);
			return 1;
		}

		if (sql.includes("INSERT INTO scenario_catalog_repo_state")) {
			const [repoDid, nextGeneration, previousGeneration] = params as [
				string,
				number,
				number,
			];
			if (this.failNextUpsertForRepoDid === repoDid) {
				this.failNextUpsertForRepoDid = null;
				return 0;
			}

			const current = this.repoState.get(repoDid);
			if (current !== undefined && current !== previousGeneration) {
				return 0;
			}

			this.repoState.set(repoDid, nextGeneration);
			return 1;
		}

		if (
			sql.includes(
				"DELETE FROM scenario_catalog_entries WHERE repo_did = ? AND generation <> ?",
			)
		) {
			const [repoDid, generation] = params as [string, number];
			this.entries.set(
				repoDid,
				(this.entries.get(repoDid) ?? []).filter(
					(entry) => entry.generation === generation,
				),
			);
			return 1;
		}

		if (
			sql.includes(
				"DELETE FROM scenario_catalog_entries\n\t\t\t WHERE repo_did = ?\n\t\t\t\t AND scenario_ref LIKE ?",
			) ||
			sql.includes(
				"DELETE FROM scenario_catalog_entries\n\t\t\t WHERE repo_did = ?\n\t\t\t\t AND scenario_ref LIKE ?",
			)
		) {
			const [repoDid, scenarioRefPattern] = params as [string, string];
			const prefix = scenarioRefPattern.slice(0, -1);
			this.entries.set(
				repoDid,
				(this.entries.get(repoDid) ?? []).filter(
					(entry) => !entry.scenarioRef.startsWith(prefix),
				),
			);
			return 1;
		}

		if (sql.includes("DELETE FROM scenario_catalog_entries")) {
			const [repoDid, generation, stateRepoDid, activeGeneration] = params as [
				string,
				number,
				string,
				number,
			];
			if (
				this.interleavedCleanup &&
				this.interleavedCleanup.repoDid === repoDid
			) {
				const current = this.entries.get(repoDid) ?? [];
				current.push({
					scenarioRef: "at://did:plc:alice/app.cerulia.core.scenario/newer",
					generation: this.interleavedCleanup.generation,
					title: this.interleavedCleanup.entryTitle,
					rulesetNsid: "app.cerulia.rules.coc7",
					hasRecommendedSheetSchema: 0,
					summary: "Newer entry",
				});
				this.entries.set(repoDid, current);
				this.repoState.set(repoDid, this.interleavedCleanup.generation);
				this.interleavedCleanup = null;
			}

			if (this.repoState.get(stateRepoDid) !== activeGeneration) {
				return 0;
			}

			this.entries.set(
				repoDid,
				(this.entries.get(repoDid) ?? []).filter(
					(entry) => entry.generation === generation,
				),
			);
			return 1;
		}

		return 1;
	}
}

function createSqliteDriver(db: Database): SqlDriver {
	return {
		async get<T>(sqlText: string, params: unknown[] = []) {
			const row = db.query(sqlText).get(...asBindings(params));
			return (row as T | undefined) ?? null;
		},
		async all<T>(sqlText: string, params: unknown[] = []) {
			return db.query(sqlText).all(...asBindings(params)) as T[];
		},
		async run(sqlText: string, params: unknown[] = []) {
			const result = db.query(sqlText).run(...asBindings(params)) as {
				changes?: number;
			};
			return result.changes;
		},
	};
}

function splitStatements(sql: string): string[] {
	return sql
		.split(";")
		.map((statement) => statement.trim())
		.filter((statement) => statement.length > 0);
}

function asBindings(params: unknown[]): SQLQueryBindings[] {
	return params as SQLQueryBindings[];
}

async function createSqliteStore(options?: {
	legacyEntries?: Array<{
		scenarioRef: string;
		title: string;
		rulesetNsid?: string;
		hasRecommendedSheetSchema: boolean;
		summary?: string;
	}>;
}) {
	const db = new Database(":memory:");
	const initialSql = await readFile(
		join(import.meta.dir, "..", "..", "migrations", "0001_initial.sql"),
		"utf8",
	);
	for (const statement of splitStatements(initialSql)) {
		db.run(statement);
	}

	for (const entry of options?.legacyEntries ?? []) {
		db.query(
			`INSERT INTO scenario_catalog (
        scenario_ref,
        title,
        ruleset_nsid,
        has_recommended_sheet_schema,
        summary
      ) VALUES (?, ?, ?, ?, ?)`,
		).run(
			...asBindings([
				entry.scenarioRef,
				entry.title,
				entry.rulesetNsid ?? null,
				entry.hasRecommendedSheetSchema ? 1 : 0,
				entry.summary ?? null,
			]),
		);
	}

	for (const filename of [
		"0002_known_repos.sql",
		"0003_scenario_catalog_snapshots.sql",
	]) {
		const sql = await readFile(
			join(import.meta.dir, "..", "..", "migrations", filename),
			"utf8",
		);
		for (const statement of splitStatements(sql)) {
			db.run(statement);
		}
	}

	return new SqlScenarioCatalogStore(createSqliteDriver(db));
}

describe("SqlScenarioCatalogStore", () => {
	test("surfaces a conflict when the repo state compare-and-swap loses a race", async () => {
		const driver = new InterleavingDriver();
		driver.setConflict("did:plc:alice");
		const store = new SqlScenarioCatalogStore(driver);

		await expect(
			store.replaceRepo("did:plc:alice", [
				{
					scenarioRef: "at://did:plc:alice/app.cerulia.core.scenario/alpha",
					title: "Alpha Mission",
					rulesetNsid: "app.cerulia.rules.coc7",
					hasRecommendedSheetSchema: false,
					summary: "Retry-safe snapshot.",
				},
			]),
		).rejects.toThrow("failed to replace scenario catalog for did:plc:alice");

		const page = await store.list(
			"app.cerulia.rules.coc7",
			undefined,
			undefined,
		);
		expect(page.items).toHaveLength(0);
	});

	test("does not delete a newer generation when cleanup runs after state advances", async () => {
		const driver = new InterleavingDriver();
		driver.setInterleavedCleanup("did:plc:alice", 999001, "Newer Mission");
		const store = new SqlScenarioCatalogStore(driver);

		await store.replaceRepo("did:plc:alice", [
			{
				scenarioRef: "at://did:plc:alice/app.cerulia.core.scenario/alpha",
				title: "Alpha Mission",
				rulesetNsid: "app.cerulia.rules.coc7",
				hasRecommendedSheetSchema: false,
				summary: "Original snapshot.",
			},
		]);

		const page = await store.list(
			"app.cerulia.rules.coc7",
			undefined,
			undefined,
		);
		expect(page.items).toHaveLength(1);
		expect(page.items[0]?.title).toBe("Newer Mission");
	});

	test("lists legacy snapshot rows after the snapshot migration backfills them", async () => {
		const store = await createSqliteStore({
			legacyEntries: [
				{
					scenarioRef: "at://did:plc:alice/app.cerulia.core.scenario/alpha",
					title: "Legacy Alpha Mission",
					rulesetNsid: "app.cerulia.rules.coc7",
					hasRecommendedSheetSchema: true,
					summary: "Backfilled from the legacy table.",
				},
			],
		});

		const page = await store.list(
			"app.cerulia.rules.coc7",
			undefined,
			undefined,
		);
		expect(page.items).toHaveLength(1);
		expect(page.items[0]).toEqual({
			scenarioRef: "at://did:plc:alice/app.cerulia.core.scenario/alpha",
			title: "Legacy Alpha Mission",
			rulesetNsid: "app.cerulia.dev.rules.coc7",
			hasRecommendedSheetSchema: true,
			summary: "Backfilled from the legacy table.",
		});
	});

	test("matches alternate ruleset spelling when filtering catalog rows", async () => {
		const store = await createSqliteStore({
			legacyEntries: [
				{
					scenarioRef: "at://did:plc:alice/app.cerulia.core.scenario/alpha",
					title: "Legacy Alpha Mission",
					rulesetNsid: "app.cerulia.ruleset.coc7",
					hasRecommendedSheetSchema: true,
					summary: "Backfilled from the legacy table.",
				},
			],
		});

		const page = await store.list(
			"app.cerulia.ruleset.coc7",
			undefined,
			undefined,
		);
		expect(page.items).toHaveLength(1);
		expect(page.items[0]?.title).toBe("Legacy Alpha Mission");
		expect(page.items[0]?.rulesetNsid).toBe("app.cerulia.dev.rules.coc7");
	});

	test("removes matching legacy snapshot rows when a repo is ingested", async () => {
		const store = await createSqliteStore({
			legacyEntries: [
				{
					scenarioRef: "at://did:plc:alice/app.cerulia.core.scenario/alpha",
					title: "Legacy Alpha Mission",
					rulesetNsid: "app.cerulia.rules.coc7",
					hasRecommendedSheetSchema: false,
					summary: "Will be removed after ingest.",
				},
			],
		});

		await store.replaceRepo("did:plc:alice", []);

		const page = await store.list(
			"app.cerulia.rules.coc7",
			undefined,
			undefined,
		);
		expect(page.items).toHaveLength(0);
	});
});
