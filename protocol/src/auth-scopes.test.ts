import { describe, expect, test } from "bun:test";

import * as AppCeruliaAuthCoreReader from "./generated/types/app/cerulia/authCoreReader.js";
import * as AppCeruliaAuthCoreWriter from "./generated/types/app/cerulia/authCoreWriter.js";
import { AUTH_SCOPE_IDS } from "./auth-scopes.js";

describe("AUTH_SCOPE_IDS", () => {
	test("matches generated auth lexicon ids", () => {
		expect(AUTH_SCOPE_IDS.reader).toBe(
			AppCeruliaAuthCoreReader.MAIN.replace(/#main$/, ""),
		);
		expect(AUTH_SCOPE_IDS.writer).toBe(
			AppCeruliaAuthCoreWriter.MAIN.replace(/#main$/, ""),
		);
	});

	test("keeps the documented stable scope names", () => {
		expect(AUTH_SCOPE_IDS).toEqual({
			reader: "app.cerulia.authCoreReader",
			writer: "app.cerulia.authCoreWriter",
		});
	});
});