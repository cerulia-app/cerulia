import { ValidationError, type ValidationResult } from "@atproto/lexicon";
import { isValidNsid } from "@atproto/syntax";
import { validate } from "../generated/lexicons.js";
import {
	normalizeCeruliaTypedValues,
	toCurrentCeruliaLexiconRef,
	toCurrentCeruliaNsid,
	transformCeruliaLexiconValueToCurrent,
} from "../nsid.js";
import { parseAtUri } from "../at-uri.js";

const CHARACTER_SHEET_SCHEMA_ID = toCurrentCeruliaNsid(
	"app.cerulia.core.characterSheetSchema",
);
const CREATE_SHEET_SCHEMA_ID = toCurrentCeruliaNsid(
	"app.cerulia.rule.createSheetSchema",
);
const CREATE_SESSION_ID = toCurrentCeruliaNsid("app.cerulia.session.create");
const UPDATE_SESSION_ID = toCurrentCeruliaNsid("app.cerulia.session.update");

type FieldDefLike = {
	fieldType?: string;
	children?: unknown;
	itemDef?: unknown;
	extensible?: unknown;
	additionalFieldDef?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRfc3339Datetime(value: unknown): value is string {
	if (typeof value !== "string") {
		return false;
	}
	// RFC3339 with Z and optional milliseconds (matches our canonical examples)
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
		return false;
	}
	return !Number.isNaN(Date.parse(value));
}

function isAtUri(value: unknown): value is string {
	if (typeof value !== "string" || value.length === 0) {
		return false;
	}
	try {
		parseAtUri(value);
		return true;
	} catch {
		return false;
	}
}

function isPublicUri(value: unknown): value is string {
	if (typeof value !== "string" || value.length === 0) {
		return false;
	}
	try {
		// Lexicon "uri" format expects absolute URIs
		// eslint-disable-next-line no-new
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

type CreationRuleLike = {
	ruleId?: unknown;
	kind?: unknown;
	targetFieldIds?: unknown;
	dice?: unknown;
	dependsOnRuleIds?: unknown;
};

function collectDeclaredFieldIds(fieldDefs: unknown): Set<string> | null {
	if (!Array.isArray(fieldDefs)) {
		return null;
	}

	const ids = new Set<string>();

	function visit(node: unknown): void {
		if (!isObject(node)) {
			return;
		}
		const fieldId = node.fieldId;
		if (typeof fieldId === "string" && fieldId.length > 0) {
			ids.add(fieldId);
		}
		// Note: additionalFieldDef is a template, not a declared field instance.
		const children = node.children;
		if (Array.isArray(children)) {
			for (const c of children) {
				visit(c);
			}
		}
		if (isObject(node.itemDef)) {
			visit(node.itemDef);
		}
	}

	for (const root of fieldDefs) {
		visit(root);
	}

	return ids;
}

function validateCharacterSheetSchemaAuthoring(value: unknown): string | null {
	if (!isObject(value)) {
		return "characterSheetSchema record must be an object";
	}

	const authoring = value.authoring;
	if (authoring === undefined) {
		return null;
	}
	if (!isObject(authoring)) {
		return "authoring must be an object";
	}

	const creationRules = authoring.creationRules;
	if (creationRules === undefined) {
		return null;
	}
	if (!Array.isArray(creationRules)) {
		return "authoring.creationRules must be an array";
	}

	const declaredFieldIds = collectDeclaredFieldIds(value.fieldDefs);

	const ruleIds: string[] = [];
	const ruleIdSet = new Set<string>();
	for (let i = 0; i < creationRules.length; i += 1) {
		const rule = creationRules[i];
		const path = `authoring.creationRules[${i}]`;
		if (!isObject(rule)) {
			return `${path} must be an object`;
		}

		const r = rule as CreationRuleLike;
		if (typeof r.ruleId !== "string" || r.ruleId.length === 0) {
			return `${path}.ruleId must be a non-empty string`;
		}
		if (ruleIdSet.has(r.ruleId)) {
			return `duplicate ruleId: ${r.ruleId}`;
		}
		ruleIdSet.add(r.ruleId);
		ruleIds.push(r.ruleId);

		if (typeof r.kind !== "string" || r.kind.length === 0) {
			return `${path}.kind must be a non-empty string`;
		}

		if (!Array.isArray(r.targetFieldIds) || r.targetFieldIds.length === 0) {
			return `${path}.targetFieldIds must be a non-empty array`;
		}
		for (let j = 0; j < r.targetFieldIds.length; j += 1) {
			const tid = r.targetFieldIds[j];
			if (typeof tid !== "string" || tid.length === 0) {
				return `${path}.targetFieldIds[${j}] must be a non-empty string`;
			}
			if (declaredFieldIds && !declaredFieldIds.has(tid)) {
				return `${path}.targetFieldIds[${j}] references unknown fieldId: ${tid}`;
			}
		}

		if (r.kind === "dice" && !isObject(r.dice)) {
			return `${path}.dice is required when kind=dice`;
		}

		if (r.dependsOnRuleIds !== undefined) {
			if (!Array.isArray(r.dependsOnRuleIds)) {
				return `${path}.dependsOnRuleIds must be an array`;
			}
			for (let j = 0; j < r.dependsOnRuleIds.length; j += 1) {
				const dep = r.dependsOnRuleIds[j];
				if (typeof dep !== "string" || dep.length === 0) {
					return `${path}.dependsOnRuleIds[${j}] must be a non-empty string`;
				}
			}
		}
	}

	// unknown dependsOnRuleIds reject
	for (let i = 0; i < creationRules.length; i += 1) {
		const rule = creationRules[i] as Record<string, unknown>;
		const deps = rule.dependsOnRuleIds;
		if (!Array.isArray(deps)) {
			continue;
		}
		for (let j = 0; j < deps.length; j += 1) {
			const dep = deps[j];
			if (typeof dep !== "string") {
				continue;
			}
			if (!ruleIdSet.has(dep)) {
				return `unknown dependsOnRuleId: ${dep}`;
			}
		}
	}

	// cycle detection (DFS over ruleId graph)
	const visiting = new Set<string>();
	const visited = new Set<string>();
	const depsById = new Map<string, string[]>();
	for (let i = 0; i < creationRules.length; i += 1) {
		const rule = creationRules[i] as Record<string, unknown>;
		const ruleId = rule.ruleId as string;
		const deps = Array.isArray(rule.dependsOnRuleIds)
			? (rule.dependsOnRuleIds.filter((x) => typeof x === "string") as string[])
			: [];
		depsById.set(ruleId, deps);
	}

	function dfs(id: string): boolean {
		if (visited.has(id)) {
			return false;
		}
		if (visiting.has(id)) {
			return true;
		}
		visiting.add(id);
		const deps = depsById.get(id) ?? [];
		for (const dep of deps) {
			if (dfs(dep)) {
				return true;
			}
		}
		visiting.delete(id);
		visited.add(id);
		return false;
	}

	for (const id of ruleIds) {
		if (dfs(id)) {
			return "creationRules contains cycle";
		}
	}

	return null;
}

function validateCreateSheetSchemaInput(value: unknown): string | null {
	if (!isObject(value)) {
		return "createSheetSchema input must be an object";
	}

	if (typeof value.baseRulesetNsid !== "string" || !isValidNsid(value.baseRulesetNsid)) {
		return "baseRulesetNsid must be a valid nsid";
	}
	if (typeof value.schemaVersion !== "string" || value.schemaVersion.length === 0) {
		return "schemaVersion must be a non-empty string";
	}
	if (typeof value.title !== "string" || value.title.length === 0 || value.title.length > 640) {
		return "title must be a non-empty string with maxLength 640";
	}
	if (!Array.isArray(value.fieldDefs)) {
		return "fieldDefs must be an array";
	}

	// Validate authoring (if present) against fieldDefs reference integrity, etc.
	const authoringErr = validateCharacterSheetSchemaAuthoring(value);
	if (authoringErr) {
		return authoringErr;
	}

	// Reuse the existing fieldDefs structural validator.
	return validateCharacterSheetSchemaFieldDefs(value);
}

function validateSessionCreateInput(value: unknown): string | null {
	if (!isObject(value)) {
		return "session.create input must be an object";
	}
	if (value.role !== "pl" && value.role !== "gm") {
		return "role must be pl or gm";
	}
	if (!isRfc3339Datetime(value.playedAt)) {
		return "playedAt must be a datetime";
	}
	if (value.scenarioRef !== undefined && !isAtUri(value.scenarioRef)) {
		return "scenarioRef must be an at-uri";
	}
	if (value.characterBranchRef !== undefined && !isAtUri(value.characterBranchRef)) {
		return "characterBranchRef must be an at-uri";
	}
	if (value.campaignRef !== undefined && !isAtUri(value.campaignRef)) {
		return "campaignRef must be an at-uri";
	}
	if (value.externalArchiveUris !== undefined) {
		if (!Array.isArray(value.externalArchiveUris)) {
			return "externalArchiveUris must be an array";
		}
		for (let i = 0; i < value.externalArchiveUris.length; i += 1) {
			if (!isPublicUri(value.externalArchiveUris[i])) {
				return `externalArchiveUris[${i}] must be a uri`;
			}
		}
	}
	// exactly-one / conditional required lives in validateSessionInput
	return validateSessionInput(value, true);
}

function validateSessionUpdateInput(value: unknown): string | null {
	if (!isObject(value)) {
		return "session.update input must be an object";
	}
	if (!isAtUri(value.sessionRef)) {
		return "sessionRef must be an at-uri";
	}
	if (value.role !== undefined && value.role !== "pl" && value.role !== "gm") {
		return "role must be pl or gm";
	}
	if (value.playedAt !== undefined && !isRfc3339Datetime(value.playedAt)) {
		return "playedAt must be a datetime";
	}
	if (value.scenarioRef !== undefined && !isAtUri(value.scenarioRef)) {
		return "scenarioRef must be an at-uri";
	}
	if (value.characterBranchRef !== undefined && !isAtUri(value.characterBranchRef)) {
		return "characterBranchRef must be an at-uri";
	}
	if (value.campaignRef !== undefined && !isAtUri(value.campaignRef)) {
		return "campaignRef must be an at-uri";
	}
	if (value.externalArchiveUris !== undefined) {
		if (!Array.isArray(value.externalArchiveUris)) {
			return "externalArchiveUris must be an array";
		}
		for (let i = 0; i < value.externalArchiveUris.length; i += 1) {
			if (!isPublicUri(value.externalArchiveUris[i])) {
				return `externalArchiveUris[${i}] must be a uri`;
			}
		}
	}
	// exactly-one / conditional required lives in validateSessionInput
	return validateSessionInput(value, false);
}

function validateFieldDefNode(
	node: unknown,
	depth: number,
	path: string,
): string | null {
	if (!isObject(node)) {
		return `${path} must be an object`;
	}

	if (depth > 3) {
		return `${path} exceeds max depth 3`;
	}

	const fieldDef = node as FieldDefLike;
	const fieldType = fieldDef.fieldType;

	const children = Array.isArray(fieldDef.children) ? fieldDef.children : null;
	const hasChildren = children !== null;
	const hasItemDef = isObject(fieldDef.itemDef);

	if (hasChildren && fieldType !== "group" && fieldType !== "array") {
		return `${path}.children is only allowed on group or array fields`;
	}

	if (hasItemDef && fieldType !== "array") {
		return `${path}.itemDef is only allowed on array fields`;
	}

	if (fieldDef.extensible === true && fieldType !== "group") {
		return `${path}.extensible is only allowed on group fields`;
	}

	if (isObject(fieldDef.additionalFieldDef)) {
		if (fieldType !== "group" || fieldDef.extensible !== true) {
			return `${path}.additionalFieldDef is only allowed on extensible group fields`;
		}

		if ((fieldDef.additionalFieldDef as FieldDefLike).extensible === true) {
			return `${path}.additionalFieldDef must not be extensible`;
		}
	}

	if (fieldType === "array" && isObject(fieldDef.itemDef)) {
		const itemType = (fieldDef.itemDef as FieldDefLike).fieldType;
		if (itemType === "array") {
			return `${path}.itemDef must not be array (array-of-array is forbidden)`;
		}
	}

	if (hasChildren) {
		for (let i = 0; i < children.length; i += 1) {
			const err = validateFieldDefNode(
				children[i],
				depth + 1,
				`${path}.children[${i}]`,
			);
			if (err) {
				return err;
			}
		}
	}

	if (hasItemDef) {
		const err = validateFieldDefNode(
			fieldDef.itemDef,
			depth + 1,
			`${path}.itemDef`,
		);
		if (err) {
			return err;
		}
	}

	if (isObject(fieldDef.additionalFieldDef)) {
		const err = validateFieldDefNode(
			fieldDef.additionalFieldDef,
			depth + 1,
			`${path}.additionalFieldDef`,
		);
		if (err) {
			return err;
		}
	}

	return null;
}

export function validateCharacterSheetSchemaFieldDefs(
	value: unknown,
): string | null {
	if (!isObject(value)) {
		return "characterSheetSchema record must be an object";
	}

	const fieldDefs = value.fieldDefs;
	if (!Array.isArray(fieldDefs)) {
		return "fieldDefs must be an array";
	}

	for (let i = 0; i < fieldDefs.length; i += 1) {
		const err = validateFieldDefNode(fieldDefs[i], 1, `fieldDefs[${i}]`);
		if (err) {
			return err;
		}
	}

	return null;
}

function applyExtraValidation(
	value: unknown,
	lexiconId: string,
	defId: string,
): ValidationResult | null {
	if (lexiconId === CHARACTER_SHEET_SCHEMA_ID && defId === "main") {
		const authoringErr = validateCharacterSheetSchemaAuthoring(value);
		if (authoringErr) {
			return {
				success: false,
				error: new ValidationError(authoringErr),
			};
		}

		const err = validateCharacterSheetSchemaFieldDefs(value);
		if (err) {
			return {
				success: false,
				error: new ValidationError(err),
			};
		}
	}

	if (lexiconId === CREATE_SHEET_SCHEMA_ID && defId === "main") {
		const authoringErr = validateCharacterSheetSchemaAuthoring(value);
		if (authoringErr) {
			return {
				success: false,
				error: new ValidationError(authoringErr),
			};
		}

		const err = validateCharacterSheetSchemaFieldDefs(value);
		if (err) {
			return {
				success: false,
				error: new ValidationError(err),
			};
		}
	}

	if (lexiconId === CREATE_SESSION_ID && defId === "main") {
		const err = validateSessionInput(value, true);
		if (err) {
			return {
				success: false,
				error: new ValidationError(err),
			};
		}
	}

	if (lexiconId === UPDATE_SESSION_ID && defId === "main") {
		const err = validateSessionInput(value, false);
		if (err) {
			return {
				success: false,
				error: new ValidationError(err),
			};
		}
	}

	return null;
}

function validateSessionInput(
	value: unknown,
	requireScenarioExactlyOne: boolean,
): string | null {
	if (!isObject(value)) {
		return "session input must be an object";
	}

	const hasScenarioRef =
		typeof value.scenarioRef === "string" && value.scenarioRef.length > 0;
	const hasScenarioLabel =
		typeof value.scenarioLabel === "string" && value.scenarioLabel.length > 0;

	if (requireScenarioExactlyOne) {
		if (hasScenarioRef === hasScenarioLabel) {
			return "session input must include exactly one of scenarioRef or scenarioLabel";
		}
	} else if (hasScenarioRef && hasScenarioLabel) {
		return "session update must not include both scenarioRef and scenarioLabel";
	}

	if (value.role === "pl") {
		const hasBranch =
			typeof value.characterBranchRef === "string" &&
			value.characterBranchRef.length > 0;
		if (!hasBranch) {
			return "session input with role=pl requires characterBranchRef";
		}
	}

	return null;
}

function normalizeValueForValidation<T>(value: T, lexiconId: string): T {
	return normalizeCeruliaTypedValues(
		transformCeruliaLexiconValueToCurrent(value, lexiconId),
	);
}

export function validateTyped<T extends { $type: string }>(
	value: T,
): ValidationResult {
	const canonicalTypeRef = toCurrentCeruliaLexiconRef(value.$type);
	const typeParts = canonicalTypeRef.split("#");
	const lexiconId = typeParts[0] ?? canonicalTypeRef;
	const defId = typeParts[1] ?? "main";
	const normalizedValue = normalizeValueForValidation(value, value.$type);
	const result = validate(normalizedValue, lexiconId, defId, true);
	if (!result.success) {
		return result;
	}

	return applyExtraValidation(normalizedValue, lexiconId, defId) ?? result;
}

export function validateById(
	value: unknown,
	lexiconId: string,
	defId = "main",
	enforceLexiconType = false,
): ValidationResult {
	const canonicalLexiconId = toCurrentCeruliaNsid(lexiconId);
	const normalizedValue = normalizeValueForValidation(value, lexiconId);
	// Procedure inputs are not validated by @atproto/lexicon at runtime. For a
	// small set of procedure inputs with authoritative extra rules, run focused
	// checks here so we can detect regressions without inventing a $type convention.
	if (!enforceLexiconType && defId === "main") {
		if (canonicalLexiconId === CREATE_SHEET_SCHEMA_ID) {
			const err = validateCreateSheetSchemaInput(normalizedValue);
			return err
				? { success: false, error: new ValidationError(err) }
				: { success: true, value: normalizedValue };
		}

		if (canonicalLexiconId === CREATE_SESSION_ID) {
			const err = validateSessionCreateInput(normalizedValue);
			return err
				? { success: false, error: new ValidationError(err) }
				: { success: true, value: normalizedValue };
		}

		if (canonicalLexiconId === UPDATE_SESSION_ID) {
			const err = validateSessionUpdateInput(normalizedValue);
			return err
				? { success: false, error: new ValidationError(err) }
				: { success: true, value: normalizedValue };
		}
	}

	let result: ValidationResult;
	try {
		result = enforceLexiconType
			? validate(normalizedValue, canonicalLexiconId, defId, true)
			: validate(normalizedValue, canonicalLexiconId, defId);
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "lexicon validation failed";
		return { success: false, error: new ValidationError(message) };
	}

	if (!result.success) {
		return result;
	}

	return (
		applyExtraValidation(normalizedValue, canonicalLexiconId, defId) ?? result
	);
}
