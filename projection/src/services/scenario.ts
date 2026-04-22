import type {
	AppCeruliaCoreScenario,
	AppCeruliaScenarioList,
} from "@cerulia/protocol";
import { COLLECTIONS } from "../constants.js";
import type { CanonicalRecordSource, StoredRecord } from "../source.js";
import {
	SqlScenarioCatalogStore,
	type ScenarioCatalogEntry,
} from "../store/scenario-catalog.js";

function compareScenarioRecords(
	left: StoredRecord<AppCeruliaCoreScenario.Main>,
	right: StoredRecord<AppCeruliaCoreScenario.Main>,
): number {
	const titleCompare = left.value.title.localeCompare(right.value.title);
	if (titleCompare !== 0) {
		return titleCompare;
	}

	return left.uri.localeCompare(right.uri);
}

function toCatalogEntry(
	record: StoredRecord<AppCeruliaCoreScenario.Main>,
): ScenarioCatalogEntry {
	return {
		scenarioRef: record.uri,
		title: record.value.title,
		rulesetNsid: record.value.rulesetNsid,
		hasRecommendedSheetSchema: Boolean(
			record.value.recommendedSheetSchemaRef,
		),
		summary: record.value.summary,
	};
}

export interface ScenarioCatalogRuntime {
	source: CanonicalRecordSource;
	catalog: SqlScenarioCatalogStore;
}

export function createScenarioCatalogService(runtime: ScenarioCatalogRuntime) {
	async function rebuild(): Promise<void> {
		const records = await runtime.source.listRecords<AppCeruliaCoreScenario.Main>(
			COLLECTIONS.scenario,
		);
		const sorted = [...records].sort(compareScenarioRecords).map(toCatalogEntry);
		await runtime.catalog.replaceAll(sorted);
	}

	return {
		rebuild,

		async list(
			rulesetNsid: string | undefined,
			limit: string | undefined,
			cursor: string | undefined,
		): Promise<AppCeruliaScenarioList.OutputSchema> {
			await rebuild();
			const page = await runtime.catalog.list(rulesetNsid, limit, cursor);

			return {
				items: page.items.map((entry) => ({
					$type: "app.cerulia.scenario.list#scenarioListItem",
					scenarioRef: entry.scenarioRef,
					title: entry.title,
					rulesetNsid: entry.rulesetNsid,
					hasRecommendedSheetSchema: entry.hasRecommendedSheetSchema,
					summary: entry.summary,
				})),
				cursor: page.cursor,
			};
		},
	};
}