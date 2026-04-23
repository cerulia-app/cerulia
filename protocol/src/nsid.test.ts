import { describe, expect, test } from "bun:test";

import {
	CERULIA_NSID_ACTIVE_VARIANT,
	CERULIA_NSID_IMPLICIT_VARIANT,
	applyCeruliaNsidVariant,
	areEquivalentCeruliaNsids,
	getCeruliaNsidAliases,
	normalizeCeruliaTypedValues,
	parseCeruliaNsid,
	registerCeruliaLexiconTransform,
	toCurrentCeruliaNsid,
	toLegacyCeruliaNsid,
	transformCeruliaLexiconValueToCurrent,
} from "./nsid.js";
import { toCurrentCeruliaNsid as toCurrentCeruliaNsidFromRoot } from "./index.js";

describe("Cerulia NSID compatibility", () => {
	test("parses bare NSID as implicit v1", () => {
		const parsed = parseCeruliaNsid("app.cerulia.core.characterSheet");

		expect(parsed).not.toBeNull();
		expect(parsed?.variant).toBe(CERULIA_NSID_IMPLICIT_VARIANT);
		expect(parsed?.explicitVariant).toBeNull();
		expect(parsed?.currentNsid).toBe("app.cerulia.dev.core.characterSheet");
	});

	test("parses active variant NSID", () => {
		const parsed = parseCeruliaNsid("app.cerulia.dev.rule.createSheetSchema");

		expect(parsed).not.toBeNull();
		expect(parsed?.variant).toBe(CERULIA_NSID_ACTIVE_VARIANT);
		expect(parsed?.bareNsid).toBe("app.cerulia.rule.createSheetSchema");
	});

	test("parses Cerulia ruleset identifiers as managed NSIDs", () => {
		const bare = parseCeruliaNsid("app.cerulia.rules.coc7");
		const current = parseCeruliaNsid("app.cerulia.dev.ruleset.coc7");

		expect(bare?.currentNsid).toBe("app.cerulia.dev.rules.coc7");
		expect(current?.bareNsid).toBe("app.cerulia.rules.coc7");
		expect(
			areEquivalentCeruliaNsids(
				"app.cerulia.rules.coc7",
				"app.cerulia.dev.ruleset.coc7",
			),
		).toBe(true);
		expect(getCeruliaNsidAliases("app.cerulia.dev.ruleset.coc7")).toEqual([
			"app.cerulia.dev.rules.coc7",
			"app.cerulia.rules.coc7",
			"app.cerulia.dev.ruleset.coc7",
			"app.cerulia.ruleset.coc7",
		]);
	});

	test("leaves external NSIDs untouched", () => {
		expect(parseCeruliaNsid("app.bsky.actor.profile")).toBeNull();
		expect(toCurrentCeruliaNsid("app.bsky.actor.profile")).toBe(
			"app.bsky.actor.profile",
		);
	});

	test("rejects malformed Cerulia-like NSIDs", () => {
		expect(parseCeruliaNsid("app.cerulia.core..characterSheet")).toBeNull();
		expect(parseCeruliaNsid("app.cerulia.core.characterSheet.")).toBeNull();
		expect(parseCeruliaNsid("app.cerulia.authCoreReader.foo")).toBeNull();
		expect(parseCeruliaNsid("app.cerulia.dev.authCoreWriter.foo")).toBeNull();
	});

	test("applies and strips variants from Cerulia-managed NSIDs", () => {
		expect(applyCeruliaNsidVariant("app.cerulia.core.session", "temp")).toBe(
			"app.cerulia.temp.core.session",
		);
		expect(toCurrentCeruliaNsid("app.cerulia.temp.core.session")).toBe(
			"app.cerulia.dev.core.session",
		);
		expect(toLegacyCeruliaNsid("app.cerulia.dev.core.session")).toBe(
			"app.cerulia.core.session",
		);
	});

	test("compares bare v1 and current variant as equivalent", () => {
		expect(
			areEquivalentCeruliaNsids(
				"app.cerulia.core.characterSheet",
				"app.cerulia.dev.core.characterSheet",
			),
		).toBe(true);
		expect(
			areEquivalentCeruliaNsids(
				"app.cerulia.rule.createProfile",
				"app.cerulia.rule.updateProfile",
			),
		).toBe(false);
	});

	test("returns aliases for current and bare ids", () => {
		expect(getCeruliaNsidAliases("app.cerulia.core.scenario")).toEqual([
			"app.cerulia.dev.core.scenario",
			"app.cerulia.core.scenario",
		]);
	});

	test("normalizes nested typed values to current variant", () => {
		const normalized = normalizeCeruliaTypedValues({
			$type: "app.cerulia.core.characterSheet",
			nested: [
				{ $type: "app.cerulia.rule.createProfile" },
				{ $type: "app.bsky.actor.profile" },
			],
		});

		expect(normalized).toEqual({
			$type: "app.cerulia.dev.core.characterSheet",
			nested: [
				{ $type: "app.cerulia.dev.rule.createProfile" },
				{ $type: "app.bsky.actor.profile" },
			],
		});
	});

	test("uses registered transform when upgrading legacy payloads to current", () => {
		const unregister = registerCeruliaLexiconTransform<{ migrated: boolean }>({
			lexiconId: "app.cerulia.core.characterSheet",
			fromVariant: CERULIA_NSID_IMPLICIT_VARIANT,
			transform: (value) => ({
				...value,
				migrated: true,
			}),
		});

		try {
			expect(
				transformCeruliaLexiconValueToCurrent(
					{ migrated: false },
					"app.cerulia.core.characterSheet",
				),
			).toEqual({ migrated: true });
			
			expect(
				transformCeruliaLexiconValueToCurrent(
					{ migrated: false },
					"app.cerulia.dev.core.characterSheet",
				),
			).toEqual({ migrated: false });
		} finally {
			unregister();
		}
	});

	test("re-exports the helper from the protocol root", () => {
		expect(toCurrentCeruliaNsidFromRoot("app.cerulia.rule.getProfile")).toBe(
			"app.cerulia.dev.rule.getProfile",
		);
	});
});