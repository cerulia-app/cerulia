import {
	AppCeruliaCoreScenario,
	AppCeruliaScenarioList,
	buildAtUri,
	getCeruliaNsidAliases,
	toCurrentCeruliaNsid,
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

type ScenarioRecordValue = AppCeruliaCoreScenario.Main & {
	recommendedSheetSchemaRef?: string;
};

function getRecommendedSheetSchemaUri(
	record: ScenarioRecordValue,
): string | undefined {
	return record.recommendedSheetSchemaPin?.uri ?? record.recommendedSheetSchemaRef;
}

async function toCatalogEntry(
	runtime: ScenarioCatalogRuntime,
	record: StoredRecord<AppCeruliaCoreScenario.Main>,
): Promise<ScenarioCatalogEntry> {
	const hasRecommendedSheetSchema = await hasResolvedRecommendedSheetSchema(
		runtime,
		getRecommendedSheetSchemaUri(record.value),
	);

	return {
		scenarioRef: record.uri,
		title: record.value.title,
		rulesetNsid: record.value.rulesetNsid
			? toCurrentCeruliaNsid(record.value.rulesetNsid)
			: undefined,
		hasRecommendedSheetSchema,
		summary: record.value.summary,
	};
}

async function getSourceRecordByUriAlias<T>(
	runtime: ScenarioCatalogRuntime,
	uri: string,
): Promise<StoredRecord<T> | null> {
	const [prefix, rest] = uri.split("://");
	if (prefix !== "at" || !rest) {
		return runtime.source.getRecord<T>(uri);
	}

	const [repoDid, collection, rkey, ...extra] = rest.split("/");
	if (!repoDid || !collection || !rkey || extra.length > 0) {
		return runtime.source.getRecord<T>(uri);
	}

	for (const alias of getCeruliaNsidAliases(collection)) {
		const record = await runtime.source.getRecord<T>(
			buildAtUri(repoDid, alias, rkey),
		);
		if (record) {
			return record;
		}
	}

	return null;
}

async function listScenarioRecordsByCollectionAlias(
	runtime: ScenarioCatalogRuntime,
	repoDid: string,
): Promise<StoredRecord<AppCeruliaCoreScenario.Main>[]> {
	const merged = new Map<string, StoredRecord<AppCeruliaCoreScenario.Main>>();
	for (const alias of getCeruliaNsidAliases(COLLECTIONS.scenario)) {
		for (const record of await runtime.source.listRecords<AppCeruliaCoreScenario.Main>(
			alias,
			repoDid,
		)) {
			if (!merged.has(record.uri)) {
				merged.set(record.uri, record);
			}
		}
	}

	return [...merged.values()];
}

async function hasResolvedRecommendedSheetSchema(
	runtime: ScenarioCatalogRuntime,
	recommendedSheetSchemaUri: string | undefined,
): Promise<boolean> {
	if (!recommendedSheetSchemaUri) {
		return false;
	}

	try {
		return Boolean(
			await getSourceRecordByUriAlias(runtime, recommendedSheetSchemaUri),
		);
	} catch {
		return false;
	}
}

async function resolveCurrentSchemaAvailability(
	runtime: ScenarioCatalogRuntime,
	scenarioRef: string,
): Promise<boolean> {
	try {
		const scenario =
			await getSourceRecordByUriAlias<AppCeruliaCoreScenario.Main>(
				runtime,
				scenarioRef,
			);
		if (!scenario) {
			return false;
		}

		return hasResolvedRecommendedSheetSchema(
			runtime,
			getRecommendedSheetSchemaUri(scenario.value),
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
			const records = await listScenarioRecordsByCollectionAlias(
				runtime,
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
			ownerDid?: string,
		): Promise<AppCeruliaScenarioList.OutputSchema> {
			const page = await runtime.catalog.list(
				rulesetNsid ? toCurrentCeruliaNsid(rulesetNsid) : undefined,
				limit,
				cursor,
				ownerDid,
			);
			const availability = await Promise.all(
				page.items.map((entry) =>
					resolveCurrentSchemaAvailability(runtime, entry.scenarioRef),
				),
			);

			return {
				items: page.items.map((entry, index) => ({
					$type: "app.cerulia.dev.scenario.list#scenarioListItem",
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
