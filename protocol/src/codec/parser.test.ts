import { describe, expect, test } from "bun:test";

import { decodeById, decodeTyped, tryDecodeById } from "./parser.js";
import { validateById, validateTyped } from "./validator.js";

describe("codec parser/validator", () => {
	test("validateById succeeds for a valid character sheet record", () => {
		const record = {
			$type: "app.cerulia.core.characterSheet",
			ownerDid: "did:plc:exampleownerdid1234567890",
			rulesetNsid: "app.cerulia.ruleset.coc7",
			displayName: "Kurosawa Reiji",
			version: 1,
			createdAt: "2026-04-18T00:00:00.000Z",
			updatedAt: "2026-04-18T00:00:00.000Z",
		};

		const result = validateById(
			record,
			"app.cerulia.core.characterSheet",
			"main",
			true,
		);
		expect(result.success).toBe(true);
	});

	test("decodeTyped normalizes a legacy bare record type to the current dev variant", () => {
		const decoded = decodeTyped<{
			$type: string;
			ownerDid: string;
			rulesetNsid: string;
			displayName: string;
			version: number;
			createdAt: string;
			updatedAt: string;
		}>({
			$type: "app.cerulia.core.characterSheet",
			ownerDid: "did:plc:exampleownerdid1234567890",
			rulesetNsid: "app.cerulia.ruleset.coc7",
			displayName: "Kurosawa Reiji",
			version: 1,
			createdAt: "2026-04-18T00:00:00.000Z",
			updatedAt: "2026-04-18T00:00:00.000Z",
		});

		expect(decoded.$type).toBe("app.cerulia.dev.core.characterSheet");
	});

	test("validateById accepts the current dev lexicon id for a legacy bare payload", () => {
		const record = {
			$type: "app.cerulia.core.characterSheet",
			ownerDid: "did:plc:exampleownerdid1234567890",
			rulesetNsid: "app.cerulia.ruleset.coc7",
			displayName: "Kurosawa Reiji",
			version: 1,
			createdAt: "2026-04-18T00:00:00.000Z",
			updatedAt: "2026-04-18T00:00:00.000Z",
		};

		const result = validateById(
			record,
			"app.cerulia.dev.core.characterSheet",
			"main",
			true,
		);
		expect(result.success).toBe(true);
	});

	test("decodeTyped throws for invalid payload", () => {
		const invalidRecord = {
			$type: "app.cerulia.core.characterSheet",
			ownerDid: "invalid-did",
			rulesetNsid: "not.an.nsid",
			displayName: "broken",
			version: 1,
			createdAt: "not-datetime",
			updatedAt: "not-datetime",
		};

		expect(() => decodeTyped(invalidRecord as never)).toThrow();
	});

	test("decodeById returns validated payload", () => {
		const payload = {
			resultKind: "accepted",
			emittedRecordRefs: [
				"at://did:plc:exampleownerdid1234567890/app.cerulia.core.session/3lcabcde12345",
			],
		};

		const decoded = decodeById<typeof payload>(
			payload,
			"app.cerulia.defs",
			"mutationAck",
		);
		expect(decoded.resultKind).toBe("accepted");
	});

	test("tryDecodeById returns failure for malformed mutationAck", () => {
		const result = tryDecodeById({}, "app.cerulia.defs", "mutationAck", false);

		expect(result.success).toBe(false);
	});

	test("validateTyped accepts fragment-qualified legacy defs payloads", () => {
		const result = validateTyped({
			$type: "app.cerulia.defs#mutationAck",
			resultKind: "accepted",
		});

		expect(result.success).toBe(true);
	});

	test("validateById rejects character-sheet-schema array-of-array fieldDefs", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Invalid nested array schema",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			fieldDefs: [
				{
					fieldId: "skills",
					label: "Skills",
					fieldType: "array",
					required: false,
					itemDef: {
						fieldId: "nested",
						label: "Nested",
						fieldType: "array",
						required: false,
					},
				},
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);

		expect(result.success).toBe(false);
	});

	test("validateById rejects scalar field with children", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Invalid scalar children schema",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			fieldDefs: [
				{
					fieldId: "hp",
					label: "HP",
					fieldType: "integer",
					required: true,
					children: [
						{
							fieldId: "illegal-child",
							label: "Illegal",
							fieldType: "integer",
							required: false,
						},
					],
				},
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);

		expect(result.success).toBe(false);
	});

	test("validateById rejects non-array field with itemDef", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Invalid itemDef schema",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			fieldDefs: [
				{
					fieldId: "name",
					label: "Name",
					fieldType: "string",
					required: true,
					itemDef: {
						fieldId: "illegal-item",
						label: "Illegal",
						fieldType: "string",
						required: false,
					},
				},
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);

		expect(result.success).toBe(false);
	});

	test("validateById rejects additionalFieldDef on non-extensible group", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Invalid additionalFieldDef parent",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			fieldDefs: [
				{
					fieldId: "section",
					label: "Section",
					fieldType: "group",
					required: false,
					additionalFieldDef: {
						fieldId: "extra",
						label: "Extra",
						fieldType: "string",
						required: false,
					},
				},
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);

		expect(result.success).toBe(false);
	});

	test("validateById accepts character-sheet-schema with authoring.creationRules", () => {
		const schema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Valid schema with authoring",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			authoring: {
				creationRules: [
					{
						ruleId: "roll-abilities",
						kind: "dice",
						targetFieldIds: ["str", "dex"],
						dice: { expression: "3d6" },
					},
					{
						ruleId: "derive-hp",
						kind: "derived",
						targetFieldIds: ["hp"],
						dependsOnRuleIds: ["roll-abilities"],
					},
				],
			},
			fieldDefs: [
				{ fieldId: "str", label: "STR", fieldType: "integer", required: true },
				{ fieldId: "dex", label: "DEX", fieldType: "integer", required: true },
				{ fieldId: "hp", label: "HP", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			schema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);
		expect(result.success).toBe(true);
	});

	test("validateById rejects duplicate creationRules ruleId", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Duplicate ruleId schema",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			authoring: {
				creationRules: [
					{
						ruleId: "r1",
						kind: "dice",
						targetFieldIds: ["str"],
						dice: { expression: "3d6" },
					},
					{ ruleId: "r1", kind: "derived", targetFieldIds: ["hp"] },
				],
			},
			fieldDefs: [
				{ fieldId: "str", label: "STR", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects unknown dependsOnRuleIds reference", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Unknown dependency schema",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			authoring: {
				creationRules: [
					{
						ruleId: "r1",
						kind: "derived",
						targetFieldIds: ["hp"],
						dependsOnRuleIds: ["missing"],
					},
				],
			},
			fieldDefs: [
				{ fieldId: "hp", label: "HP", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects creationRules dependency cycle", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Cyclic dependency schema",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			authoring: {
				creationRules: [
					{
						ruleId: "a",
						kind: "derived",
						targetFieldIds: ["x"],
						dependsOnRuleIds: ["b"],
					},
					{
						ruleId: "b",
						kind: "derived",
						targetFieldIds: ["y"],
						dependsOnRuleIds: ["a"],
					},
				],
			},
			fieldDefs: [
				{ fieldId: "x", label: "X", fieldType: "integer", required: true },
				{ fieldId: "y", label: "Y", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects kind=dice without dice payload", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Missing dice payload schema",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			authoring: {
				creationRules: [
					{ ruleId: "r1", kind: "dice", targetFieldIds: ["str"] },
				],
			},
			fieldDefs: [
				{ fieldId: "str", label: "STR", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects creationRules with unknown targetFieldIds", () => {
		const invalidSchema = {
			$type: "app.cerulia.core.characterSheetSchema",
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Unknown targetFieldIds schema",
			ownerDid: "did:plc:exampleownerdid1234567890",
			createdAt: "2026-04-18T00:00:00.000Z",
			authoring: {
				creationRules: [
					{
						ruleId: "r1",
						kind: "dice",
						targetFieldIds: ["unknown-field"],
						dice: { expression: "3d6" },
					},
				],
			},
			fieldDefs: [
				{ fieldId: "str", label: "STR", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			invalidSchema,
			"app.cerulia.core.characterSheetSchema",
			"main",
			true,
		);
		expect(result.success).toBe(false);
	});

	test("validateById accepts createSheetSchema input with authoring", () => {
		const input = {
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Create input with authoring",
			authoring: {
				creationRules: [
					{
						ruleId: "roll-abilities",
						kind: "dice",
						targetFieldIds: ["str"],
						dice: { expression: "3d6" },
					},
				],
			},
			fieldDefs: [
				{ fieldId: "str", label: "STR", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			input,
			"app.cerulia.rule.createSheetSchema",
			"main",
			false,
		);
		expect(result.success).toBe(true);
	});

	test("validateById rejects createSheetSchema input missing baseRulesetNsid", () => {
		const input = {
			schemaVersion: "1.0.0",
			title: "Missing baseRulesetNsid",
			fieldDefs: [
				{ fieldId: "str", label: "STR", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			input,
			"app.cerulia.rule.createSheetSchema",
			"main",
			false,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects createSheetSchema input fieldDefs missing fieldId", () => {
		const input = {
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Missing fieldId in fieldDefs",
			fieldDefs: [{ label: "STR", fieldType: "integer", required: true }],
		};

		const result = validateById(
			input,
			"app.cerulia.rule.createSheetSchema",
			"main",
			false,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects createSheetSchema input with kind=dice and no dice payload", () => {
		const input = {
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Invalid create input with authoring",
			authoring: {
				creationRules: [
					{ ruleId: "r1", kind: "dice", targetFieldIds: ["str"] },
				],
			},
			fieldDefs: [
				{ fieldId: "str", label: "STR", fieldType: "integer", required: true },
			],
		};

		const result = validateById(
			input,
			"app.cerulia.rule.createSheetSchema",
			"main",
			false,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects invalid createSheetSchema input fieldDefs", () => {
		const invalidInput = {
			baseRulesetNsid: "app.cerulia.ruleset.coc7",
			schemaVersion: "1.0.0",
			title: "Invalid create input",
			fieldDefs: [
				{
					fieldId: "name",
					label: "Name",
					fieldType: "string",
					required: true,
					itemDef: {
						fieldId: "illegal-item",
						label: "Illegal",
						fieldType: "string",
						required: false,
					},
				},
			],
		};

		const result = validateById(
			invalidInput,
			"app.cerulia.rule.createSheetSchema",
			"main",
			false,
		);

		expect(result.success).toBe(false);
	});

	test("validateById rejects session.create without exactly-one scenario identity", () => {
		const invalidInput = {
			role: "pl",
			playedAt: "2026-04-18T00:00:00.000Z",
			characterBranchRef:
				"at://did:plc:exampleownerdid1234567890/app.cerulia.core.characterBranch/3lcabcde12345",
		};

		const result = validateById(
			invalidInput,
			"app.cerulia.session.create",
			"main",
			false,
		);

		expect(result.success).toBe(false);
	});

	test("validateById accepts session.create with timezone-offset datetime", () => {
		const input = {
			role: "gm",
			playedAt: "2026-04-18T00:00:00+09:00",
			scenarioLabel: "Offset datetime scenario",
		};

		const result = validateById(
			input,
			"app.cerulia.session.create",
			"main",
			false,
		);

		expect(result.success).toBe(true);
	});

	test("validateById rejects session.create with role=pl and no characterBranchRef", () => {
		const invalidInput = {
			role: "pl",
			playedAt: "2026-04-18T00:00:00.000Z",
			scenarioLabel: "Missing branch test scenario",
		};

		const result = validateById(
			invalidInput,
			"app.cerulia.session.create",
			"main",
			false,
		);

		expect(result.success).toBe(false);
	});

	test("validateById rejects session.update with both scenarioRef and scenarioLabel", () => {
		const invalidInput = {
			sessionRef:
				"at://did:plc:exampleownerdid1234567890/app.cerulia.core.session/3lcabcde12345",
			scenarioRef:
				"at://did:plc:examplescenario/app.cerulia.core.scenario/3lcxyz12345",
			scenarioLabel: "Conflicting scenario label",
		};

		const result = validateById(
			invalidInput,
			"app.cerulia.session.update",
			"main",
			false,
		);

		expect(result.success).toBe(false);
	});

	test("validateById rejects session.update empty object (missing sessionRef)", () => {
		const result = validateById(
			{},
			"app.cerulia.session.update",
			"main",
			false,
		);
		expect(result.success).toBe(false);
	});

	test("validateById accepts session.update with timezone-offset datetime", () => {
		const input = {
			sessionRef:
				"at://did:plc:exampleownerdid1234567890/app.cerulia.core.session/3lcabcde12345",
			playedAt: "2026-04-18T00:00:00+09:00",
		};

		const result = validateById(
			input,
			"app.cerulia.session.update",
			"main",
			false,
		);
		expect(result.success).toBe(true);
	});

	test("validateById rejects session.create with datetime missing timezone", () => {
		const input = {
			role: "gm",
			playedAt: "2026-04-18T00:00:00",
			scenarioLabel: "No timezone",
		};

		const result = validateById(
			input,
			"app.cerulia.session.create",
			"main",
			false,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects session.create with datetime offset missing colon", () => {
		const input = {
			role: "gm",
			playedAt: "2026-04-18T00:00:00+0900",
			scenarioLabel: "Offset without colon",
		};

		const result = validateById(
			input,
			"app.cerulia.session.create",
			"main",
			false,
		);
		expect(result.success).toBe(false);
	});

	test("validateById rejects session.create with non-datetime string", () => {
		const input = {
			role: "gm",
			playedAt: "not-a-datetime",
			scenarioLabel: "Invalid format",
		};

		const result = validateById(
			input,
			"app.cerulia.session.create",
			"main",
			false,
		);
		expect(result.success).toBe(false);
	});
});
