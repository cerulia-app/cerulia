import { describe, expect, test } from "bun:test";
import type { AppCeruliaCoreScenario } from "@cerulia/protocol";
import { COLLECTIONS } from "../constants.js";
import type { CanonicalRecordSource, StoredRecord } from "../source.js";
import {
	createScenarioCatalogService,
} from "./scenario.js";
import {
	ScenarioCatalogReplaceConflictError,
	type SqlScenarioCatalogStore,
	type ScenarioCatalogEntry,
} from "../store/scenario-catalog.js";

const DID = "did:plc:alice";

class RefreshingScenarioSource implements CanonicalRecordSource {
	callCount = 0;

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		return null;
	}

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		this.callCount += 1;
		const title = this.callCount === 1 ? "Alpha Mission" : "Beta Mission";

		return [
			{
				uri: `at://${repoDid}/${collection}/scenario-${this.callCount}`,
				repoDid: repoDid ?? DID,
				collection,
				rkey: `scenario-${this.callCount}`,
				value: {
					$type: COLLECTIONS.scenario,
					title,
					rulesetNsid: "app.cerulia.rules.coc7",
					recommendedSheetSchemaRef: undefined,
					sourceCitationUri: "https://example.com/scenario/test",
					summary: `${title} summary`,
					ownerDid: repoDid ?? DID,
					createdAt: "2026-04-22T00:00:00.000Z",
					updatedAt: "2026-04-22T00:00:00.000Z",
				} as AppCeruliaCoreScenario.Main as T,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
		];
	}
}

class SchemaResolutionScenarioSource implements CanonicalRecordSource {
	constructor(private readonly schemaRecord: StoredRecord<unknown> | null) {}

	async getRecord<T>(uri: string): Promise<StoredRecord<T> | null> {
		return (this.schemaRecord as StoredRecord<T> | null) ?? null;
	}

	async listRecords<T>(
		collection: string,
		repoDid?: string,
	): Promise<StoredRecord<T>[]> {
		return [
			{
				uri: `at://${repoDid}/${collection}/scenario-1`,
				repoDid: repoDid ?? DID,
				collection,
				rkey: "scenario-1",
				value: {
					$type: COLLECTIONS.scenario,
					title: "Schema Resolution Mission",
					rulesetNsid: "app.cerulia.rules.coc7",
					recommendedSheetSchemaRef:
						`at://${repoDid ?? DID}/app.cerulia.core.characterSheetSchema/schema-1`,
					sourceCitationUri: "https://example.com/scenario/test",
					summary: "Scenario with optional schema resolution.",
					ownerDid: repoDid ?? DID,
					createdAt: "2026-04-22T00:00:00.000Z",
					updatedAt: "2026-04-22T00:00:00.000Z",
				} as AppCeruliaCoreScenario.Main as T,
				createdAt: "2026-04-22T00:00:00.000Z",
				updatedAt: "2026-04-22T00:00:00.000Z",
			},
		];
	}
}

class ConflictThenSuccessCatalogStore {
	replaceCallCount = 0;
	lastEntries: ScenarioCatalogEntry[] = [];

	async replaceRepo(repoDid: string, entries: ScenarioCatalogEntry[]) {
		this.replaceCallCount += 1;
		if (this.replaceCallCount === 1) {
			throw new ScenarioCatalogReplaceConflictError(repoDid);
		}

		this.lastEntries = entries;
	}

	async list() {
		return {
			items: this.lastEntries,
		};
	}
}

describe("createScenarioCatalogService", () => {
	test("re-reads the repo before retrying a catalog replace conflict", async () => {
		const source = new RefreshingScenarioSource();
		const catalog = new ConflictThenSuccessCatalogStore();
		const service = createScenarioCatalogService({
			source,
			catalog: catalog as unknown as SqlScenarioCatalogStore,
		});

		await service.ingestRepo(DID);

		expect(source.callCount).toBe(2);
		expect(catalog.replaceCallCount).toBe(2);
		expect(catalog.lastEntries[0]?.title).toBe("Beta Mission");
	});

	test("downgrades unresolved recommended schemas to browse-only during ingest", async () => {
		const catalog = new ConflictThenSuccessCatalogStore();
		const service = createScenarioCatalogService({
			source: new SchemaResolutionScenarioSource(null),
			catalog: catalog as unknown as SqlScenarioCatalogStore,
		});

		await service.ingestRepo(DID);

		expect(catalog.lastEntries[0]?.hasRecommendedSheetSchema).toBe(false);
	});
});