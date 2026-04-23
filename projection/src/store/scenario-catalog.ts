import { getCeruliaNsidAliases, toCurrentCeruliaNsid } from "@cerulia/protocol";
import { paginate, type Page } from "../pagination.js";
import type { SqlDriver } from "./sql.js";

export interface ScenarioCatalogEntry {
	scenarioRef: string;
	title: string;
	rulesetNsid?: string;
	hasRecommendedSheetSchema: boolean;
	summary?: string;
}

interface ScenarioCatalogRow {
	scenario_ref: string;
	title: string;
	ruleset_nsid: string | null;
	has_recommended_sheet_schema: number;
	summary: string | null;
}

interface ScenarioCatalogRepoStateRow {
	active_generation: number;
}

export const LEGACY_SCENARIO_CATALOG_REPO_DID = "__legacy_snapshot__";

export class ScenarioCatalogReplaceConflictError extends Error {
	constructor(repoDid: string) {
		super(`failed to replace scenario catalog for ${repoDid}`);
		this.name = "ScenarioCatalogReplaceConflictError";
	}
}

let generationEntropy = 0;

function createGenerationId(): number {
	generationEntropy = (generationEntropy + 1) % 1000;
	return Date.now() * 1000 + generationEntropy;
}

function fromRow(row: ScenarioCatalogRow): ScenarioCatalogEntry {
	return {
		scenarioRef: row.scenario_ref,
		title: row.title,
		rulesetNsid: row.ruleset_nsid
			? toCurrentCeruliaNsid(row.ruleset_nsid)
			: undefined,
		hasRecommendedSheetSchema: row.has_recommended_sheet_schema === 1,
		summary: row.summary ?? undefined,
	};
}

export class SqlScenarioCatalogStore {
	constructor(private readonly driver: SqlDriver) {}

	async replaceRepo(
		repoDid: string,
		entries: ScenarioCatalogEntry[],
	): Promise<void> {
 		const currentState = await this.driver.get<ScenarioCatalogRepoStateRow>(
			`SELECT active_generation FROM scenario_catalog_repo_state WHERE repo_did = ?`,
			[repoDid],
		);
		const previousGeneration = currentState?.active_generation ?? -1;
		const nextGeneration = createGenerationId();

		await this.driver.run(
			`DELETE FROM scenario_catalog_entries WHERE repo_did = ? AND generation = ?`,
			[repoDid, nextGeneration],
		);

		for (const entry of entries) {
			await this.driver.run(
				`INSERT INTO scenario_catalog_entries (
          scenario_ref,
          repo_did,
          generation,
          title,
          ruleset_nsid,
          has_recommended_sheet_schema,
          summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
 				[
					entry.scenarioRef,
					repoDid,
					nextGeneration,
					entry.title,
					entry.rulesetNsid ? toCurrentCeruliaNsid(entry.rulesetNsid) : null,
					entry.hasRecommendedSheetSchema ? 1 : 0,
					entry.summary ?? null,
				],
			);
		}

		const upsertChanges = await this.driver.run(
			`INSERT INTO scenario_catalog_repo_state (repo_did, active_generation)
       VALUES (?, ?)
       ON CONFLICT (repo_did) DO UPDATE SET active_generation = excluded.active_generation
       WHERE scenario_catalog_repo_state.active_generation = ?`,
			[repoDid, nextGeneration, previousGeneration],
		);

		if (upsertChanges === 0) {
			await this.driver.run(
				`DELETE FROM scenario_catalog_entries WHERE repo_did = ? AND generation = ?`,
				[repoDid, nextGeneration],
			);
			throw new ScenarioCatalogReplaceConflictError(repoDid);
		}

		await this.driver.run(
			`DELETE FROM scenario_catalog_entries
			 WHERE repo_did = ?
				 AND generation <> ?
				 AND EXISTS (
					 SELECT 1
					 FROM scenario_catalog_repo_state
					 WHERE repo_did = ?
						 AND active_generation = ?
				 )`,
			[repoDid, nextGeneration, repoDid, nextGeneration],
		);

		await this.driver.run(
			`DELETE FROM scenario_catalog_entries
			 WHERE repo_did = ?
				 AND scenario_ref LIKE ?`,
			[
				LEGACY_SCENARIO_CATALOG_REPO_DID,
				`at://${repoDid}/%`,
			],
		);
	}

	async list(
		rulesetNsid: string | undefined,
		limit: string | undefined,
		cursor: string | undefined,
	): Promise<Page<ScenarioCatalogEntry>> {
		const rulesetAliases = rulesetNsid
			? [...new Set(getCeruliaNsidAliases(rulesetNsid))]
			: [];
		const rulesetFilterClause = rulesetAliases.length
			? `WHERE ruleset_nsid IN (${rulesetAliases.map(() => "?").join(", ")})`
			: "";
		const rows = await this.driver.all<ScenarioCatalogRow>(
			`WITH active_entries AS (
				 SELECT entries.scenario_ref, entries.repo_did, entries.title, entries.ruleset_nsid, entries.has_recommended_sheet_schema, entries.summary
					 FROM scenario_catalog_entries AS entries
					 INNER JOIN scenario_catalog_repo_state AS state
						 ON state.repo_did = entries.repo_did
						AND state.active_generation = entries.generation
			 ),
			 ranked_entries AS (
				 SELECT
					 scenario_ref,
					 title,
					 ruleset_nsid,
					 has_recommended_sheet_schema,
					 summary,
					 ROW_NUMBER() OVER (
						 PARTITION BY scenario_ref
						 ORDER BY CASE WHEN repo_did = ? THEN 1 ELSE 0 END ASC, repo_did ASC
					 ) AS row_priority
				 FROM active_entries
				 ${rulesetFilterClause}
			 )
			 SELECT scenario_ref, title, ruleset_nsid, has_recommended_sheet_schema, summary
				 FROM ranked_entries
				WHERE row_priority = 1
				ORDER BY title COLLATE NOCASE ASC, scenario_ref ASC`,
			rulesetAliases.length
				? [LEGACY_SCENARIO_CATALOG_REPO_DID, ...rulesetAliases]
				: [LEGACY_SCENARIO_CATALOG_REPO_DID],
		);

		return paginate(rows.map(fromRow), limit, cursor);
	}
}