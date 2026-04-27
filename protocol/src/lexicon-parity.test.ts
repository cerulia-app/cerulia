import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";

import * as Protocol from "./index.js";
import { ids, schemaDict } from "./generated/lexicons.js";

const LEXICON_DIR = new URL("./lexicon/", import.meta.url);
const CERULIA_SOURCE_PREFIX = "app.cerulia.dev.";
const SCENARIO_LIST_LEXICON = new URL(
	"./lexicon/app.cerulia.dev.scenario.list.json",
	import.meta.url,
);

function toBarrelExportName(lexiconId: string): string {
	const segments = lexiconId.split(".").slice(3);
	return `AppCerulia${segments
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join("")}`;
}

describe("generated lexicon parity", () => {
	test("keeps active Cerulia lexicon sources on the dev namespace", async () => {
		const entries = (await readdir(LEXICON_DIR)).filter((entry) =>
			entry.endsWith(".json"),
		);
		expect(entries.length).toBeGreaterThan(0);

		const allGeneratedCeruliaIds = Object.values(schemaDict)
			.map((doc) => doc.id)
			.filter((lexiconId) => lexiconId.startsWith("app.cerulia."));
		const allDeclaredCeruliaIds = Object.values(ids).filter((lexiconId) =>
			lexiconId.startsWith("app.cerulia."),
		);
		expect(
			allGeneratedCeruliaIds.every((lexiconId) =>
				lexiconId.startsWith(CERULIA_SOURCE_PREFIX),
			),
		).toBe(true);
		expect(
			allDeclaredCeruliaIds.every((lexiconId) =>
				lexiconId.startsWith(CERULIA_SOURCE_PREFIX),
			),
		).toBe(true);

		const generatedIds = new Set<string>(
			Object.values(schemaDict)
				.map((doc) => doc.id)
				.filter((lexiconId) => lexiconId.startsWith(CERULIA_SOURCE_PREFIX)),
		);
		const generatedIdSet = new Set<string>(
			Object.values(ids).filter((lexiconId) =>
				lexiconId.startsWith(CERULIA_SOURCE_PREFIX),
			),
		);

		const sourceIds: string[] = [];
		for (const entry of entries) {
			const lexiconId = entry.slice(0, -".json".length);
			const content = await readFile(new URL(entry, LEXICON_DIR), "utf8");
			const parsed = JSON.parse(content) as { id?: unknown };

			expect(lexiconId.startsWith(CERULIA_SOURCE_PREFIX)).toBe(true);
			expect(parsed.id).toBe(lexiconId);
			expect(generatedIds.has(lexiconId)).toBe(true);
			expect(generatedIdSet.has(lexiconId)).toBe(true);
			expect(
				(Protocol as Record<string, unknown>)[toBarrelExportName(lexiconId)],
			).toBeDefined();

			sourceIds.push(lexiconId);
		}

		expect(sourceIds.sort()).toEqual([...generatedIds].sort());
		expect(sourceIds.sort()).toEqual([...generatedIdSet].sort());
	});

	test("keeps scenario.list generated registry aligned with its source lexicon", async () => {
		const content = await readFile(SCENARIO_LIST_LEXICON, "utf8");
		const parsed = JSON.parse(content) as {
			defs?: {
				main?: {
					parameters?: {
						properties?: {
							ownerDid?: unknown;
						};
					};
				};
			};
		};
		const generatedOwnerDid =
			schemaDict.AppCeruliaDevScenarioList.defs.main.parameters.properties
				.ownerDid as unknown;

		expect(generatedOwnerDid).toEqual(
			parsed.defs?.main?.parameters?.properties?.ownerDid,
		);
	});
});
