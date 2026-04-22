import {
	AppCeruliaCoreScenario,
	AppCeruliaScenarioList,
 	validateById,
} from "@cerulia/protocol";
import { COLLECTIONS } from "../constants.js";
import type { StoredRecord } from "../source.js";
import type { CanonicalRecordSource } from "../source.js";
import {
	ScenarioCatalogReplaceConflictError,
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


async function toCatalogEntry(
	runtime: ScenarioCatalogRuntime,
	record: StoredRecord<AppCeruliaCoreScenario.Main>,
): Promise<ScenarioCatalogEntry> {
	let hasRecommendedSheetSchema = false;
	if (record.value.recommendedSheetSchemaRef) {
		try {
			hasRecommendedSheetSchema = Boolean(
				await runtime.source.getRecord(record.value.recommendedSheetSchemaRef),
			);
		} catch {
			hasRecommendedSheetSchema = false;
		}
	}

	return {
		scenarioRef: record.uri,
		title: record.value.title,
		rulesetNsid: record.value.rulesetNsid,
		hasRecommendedSheetSchema,
		summary: record.value.summary,
	};
}

async function resolveCurrentSchemaAvailability(
	runtime: ScenarioCatalogRuntime,
	scenarioRef: string,
): Promise<boolean> {
	try {
		const scenario = await runtime.source.getRecord<AppCeruliaCoreScenario.Main>(
			scenarioRef,
		);
		if (!scenario?.value.recommendedSheetSchemaRef) {
			return false;
		}

		return Boolean(
			await runtime.source.getRecord(
				scenario.value.recommendedSheetSchemaRef,
			),
		);
	} catch {
		return false;
	}
}

export interface ScenarioCatalogRuntime {
	source: CanonicalRecordSource;
	catalog: SqlScenarioCatalogStore;
}

export function createScenarioCatalogService(runtime: ScenarioCatalogRuntime) {
	async function ingestRepo(repoDid: string): Promise<void> {
		for (let attempt = 0; attempt < 3; attempt += 1) {
			const records =
				await runtime.source.listRecords<AppCeruliaCoreScenario.Main>(
					COLLECTIONS.scenario,
					repoDid,
				);
			const sorted = [...records]
				.map((record) => {
					const validation = validateById(
						record.value,
						COLLECTIONS.scenario,
						"main",
						true,
					);
					if (!validation.success) {
						throw validation.error;
					}

					return record;
				})
				.sort(compareScenarioRecords);
			const entries = await Promise.all(
				sorted.map((record) => toCatalogEntry(runtime, record)),
			);

			try {
				await runtime.catalog.replaceRepo(repoDid, entries);
				return;
			} catch (error) {
				if (
					attempt < 2 &&
					error instanceof ScenarioCatalogReplaceConflictError
				) {
					continue;
				}

				throw error;
			}
		}
	}

	return {
		ingestRepo,

		async rebuildKnownRepos(repoDids: string[]): Promise<string[]> {
			const failedRepoDids: string[] = [];
			for (const repoDid of [...new Set(repoDids)].sort((left, right) =>
				left.localeCompare(right),
			)) {
				try {
					await ingestRepo(repoDid);
				} catch {
					failedRepoDids.push(repoDid);
				}
			}

			return failedRepoDids;
		},

		async list(
			rulesetNsid: string | undefined,
			limit: string | undefined,
			cursor: string | undefined,
		): Promise<AppCeruliaScenarioList.OutputSchema> {
			const page = await runtime.catalog.list(rulesetNsid, limit, cursor);
			const availability = await Promise.all(
				page.items.map((entry) =>
					resolveCurrentSchemaAvailability(runtime, entry.scenarioRef),
				),
			);

			return {
				items: page.items.map((entry, index) => ({
					$type: "app.cerulia.scenario.list#scenarioListItem",
					scenarioRef: entry.scenarioRef,
					title: entry.title,
					rulesetNsid: entry.rulesetNsid,
					hasRecommendedSheetSchema: availability[index] ?? false,
					summary: entry.summary,
				})),
				cursor: page.cursor,
			};
		},
	};
}