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

function fromRow(row: ScenarioCatalogRow): ScenarioCatalogEntry {
	return {
		scenarioRef: row.scenario_ref,
		title: row.title,
		rulesetNsid: row.ruleset_nsid ?? undefined,
		hasRecommendedSheetSchema: row.has_recommended_sheet_schema === 1,
		summary: row.summary ?? undefined,
	};
}

export class SqlScenarioCatalogStore {
	constructor(private readonly driver: SqlDriver) {}

	async replaceAll(entries: ScenarioCatalogEntry[]): Promise<void> {
		await this.driver.run("DELETE FROM scenario_catalog");

		for (const entry of entries) {
			await this.driver.run(
				`INSERT INTO scenario_catalog (
          scenario_ref,
          title,
          ruleset_nsid,
          has_recommended_sheet_schema,
          summary
        ) VALUES (?, ?, ?, ?, ?)`,
				[
					entry.scenarioRef,
					entry.title,
					entry.rulesetNsid ?? null,
					entry.hasRecommendedSheetSchema ? 1 : 0,
					entry.summary ?? null,
				],
			);
		}
	}

	async list(
		rulesetNsid: string | undefined,
		limit: string | undefined,
		cursor: string | undefined,
	): Promise<Page<ScenarioCatalogEntry>> {
		const rows = await this.driver.all<ScenarioCatalogRow>(
			rulesetNsid
				? `SELECT scenario_ref, title, ruleset_nsid, has_recommended_sheet_schema, summary
           FROM scenario_catalog
           WHERE ruleset_nsid = ?
           ORDER BY title COLLATE NOCASE ASC, scenario_ref ASC`
				: `SELECT scenario_ref, title, ruleset_nsid, has_recommended_sheet_schema, summary
           FROM scenario_catalog
           ORDER BY title COLLATE NOCASE ASC, scenario_ref ASC`,
			rulesetNsid ? [rulesetNsid] : [],
		);

		return paginate(rows.map(fromRow), limit, cursor);
	}
}