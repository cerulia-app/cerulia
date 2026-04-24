import { isValidNsid } from "@atproto/syntax";

export const CERULIA_NSID_PREFIX = "app.cerulia";
export const CERULIA_NSID_IMPLICIT_VARIANT = "v1";
export const CERULIA_NSID_ACTIVE_VARIANT = "dev";

const CERULIA_NSID_SINGLE_NAME_ROOT_SEGMENTS = new Set([
	"authCoreReader",
	"authCoreWriter",
	"defs",
]);

const CERULIA_NSID_FAMILY_ROOT_SEGMENTS = new Set([
	"actor",
	"campaign",
	"character",
	"core",
	"house",
	"rules",
	"ruleset",
	"rule",
	"scenario",
	"session",
]);

const CERULIA_NSID_CANONICAL_FAMILY_ROOT_SEGMENTS = new Map<string, string>([
	["ruleset", "rules"],
]);

const CERULIA_NSID_ROOT_SEGMENTS = new Set([
	...CERULIA_NSID_SINGLE_NAME_ROOT_SEGMENTS,
	...CERULIA_NSID_FAMILY_ROOT_SEGMENTS,
]);

export interface ParsedCeruliaNsid {
	originalNsid: string;
	bareNsid: string;
	currentNsid: string;
	rootSegment: string;
	suffix: string;
	variant: string;
	explicitVariant: string | null;
}

export type CeruliaLexiconTransform<T = unknown> = (value: T) => T;

function splitNsid(nsid: string): string[] {
	return nsid.split(".");
}

function isCeruliaPrefix(segments: string[]): boolean {
	return segments[0] === "app" && segments[1] === "cerulia";
}

function buildCeruliaNsidFromSuffix(
	suffix: string,
	variant: string | null | undefined,
): string {
	if (!variant || variant === CERULIA_NSID_IMPLICIT_VARIANT) {
		return `${CERULIA_NSID_PREFIX}.${suffix}`;
	}

	return `${CERULIA_NSID_PREFIX}.${variant}.${suffix}`;
}

function buildVariantKey(
	bareNsid: string,
	fromVariant: string,
	toVariant: string,
): string {
	return `${bareNsid}::${fromVariant}->${toVariant}`;
}

const lexiconTransforms = new Map<string, CeruliaLexiconTransform<unknown>>();

function canonicalizeCeruliaFamilyRootSegment(rootSegment: string): string {
	return (
		CERULIA_NSID_CANONICAL_FAMILY_ROOT_SEGMENTS.get(rootSegment) ?? rootSegment
	);
}

function buildRulesetSpellingAliases(parsed: ParsedCeruliaNsid): string[] {
	if (parsed.rootSegment !== "rules") {
		return [];
	}

	const suffixTail = parsed.suffix.split(".").slice(1);
	const alternateSuffix = ["ruleset", ...suffixTail].join(".");
	return [
		buildCeruliaNsidFromSuffix(alternateSuffix, CERULIA_NSID_ACTIVE_VARIANT),
		buildCeruliaNsidFromSuffix(alternateSuffix, CERULIA_NSID_IMPLICIT_VARIANT),
	];
}

function isExpectedCeruliaShape(
	segments: string[],
	rootSegment: string,
	hasExplicitVariant: boolean,
): boolean {
	if (CERULIA_NSID_SINGLE_NAME_ROOT_SEGMENTS.has(rootSegment)) {
		return segments.length === (hasExplicitVariant ? 4 : 3);
	}

	if (CERULIA_NSID_FAMILY_ROOT_SEGMENTS.has(rootSegment)) {
		return segments.length === (hasExplicitVariant ? 5 : 4);
	}

	return false;
}

export function parseCeruliaNsid(nsid: string): ParsedCeruliaNsid | null {
	if (!isValidNsid(nsid)) {
		return null;
	}

	const segments = splitNsid(nsid);
	if (segments.length < 3 || !isCeruliaPrefix(segments)) {
		return null;
	}

	const thirdSegment = segments[2];
	if (thirdSegment && CERULIA_NSID_ROOT_SEGMENTS.has(thirdSegment)) {
		if (!isExpectedCeruliaShape(segments, thirdSegment, false)) {
			return null;
		}

		const canonicalRootSegment =
			canonicalizeCeruliaFamilyRootSegment(thirdSegment);
		const suffix = [canonicalRootSegment, ...segments.slice(3)].join(".");
		const bareNsid = `${CERULIA_NSID_PREFIX}.${suffix}`;
		return {
			originalNsid: nsid,
			bareNsid,
			currentNsid: buildCeruliaNsidFromSuffix(
				suffix,
				CERULIA_NSID_ACTIVE_VARIANT,
			),
			rootSegment: canonicalRootSegment,
			suffix,
			variant: CERULIA_NSID_IMPLICIT_VARIANT,
			explicitVariant: null,
		};
	}

	const rootSegment = segments[3];
	if (
		!thirdSegment ||
		!rootSegment ||
		!CERULIA_NSID_ROOT_SEGMENTS.has(rootSegment)
	) {
		return null;
	}
	if (!isExpectedCeruliaShape(segments, rootSegment, true)) {
		return null;
	}

	const canonicalRootSegment =
		canonicalizeCeruliaFamilyRootSegment(rootSegment);
	const suffix = [canonicalRootSegment, ...segments.slice(4)].join(".");
	const bareNsid = `${CERULIA_NSID_PREFIX}.${suffix}`;
	return {
		originalNsid: nsid,
		bareNsid,
		currentNsid: buildCeruliaNsidFromSuffix(
			suffix,
			CERULIA_NSID_ACTIVE_VARIANT,
		),
		rootSegment: canonicalRootSegment,
		suffix,
		variant: thirdSegment,
		explicitVariant: thirdSegment,
	};
}

export function isCeruliaManagedNsid(nsid: string): boolean {
	return parseCeruliaNsid(nsid) !== null;
}

export function applyCeruliaNsidVariant(
	nsid: string,
	variant: string | null | undefined = CERULIA_NSID_ACTIVE_VARIANT,
): string {
	const parsed = parseCeruliaNsid(nsid);
	if (!parsed) {
		return nsid;
	}

	if (!variant || variant === CERULIA_NSID_IMPLICIT_VARIANT) {
		return parsed.bareNsid;
	}

	return buildCeruliaNsidFromSuffix(parsed.suffix, variant);
}

export function toCurrentCeruliaNsid(nsid: string): string {
	return applyCeruliaNsidVariant(nsid, CERULIA_NSID_ACTIVE_VARIANT);
}

export function toLegacyCeruliaNsid(nsid: string): string {
	return applyCeruliaNsidVariant(nsid, CERULIA_NSID_IMPLICIT_VARIANT);
}

export function areEquivalentCeruliaNsids(
	left: string,
	right: string,
): boolean {
	const parsedLeft = parseCeruliaNsid(left);
	const parsedRight = parseCeruliaNsid(right);
	if (parsedLeft && parsedRight) {
		return parsedLeft.bareNsid === parsedRight.bareNsid;
	}

	return left === right;
}

export function getCeruliaNsidAliases(nsid: string): readonly string[] {
	const parsed = parseCeruliaNsid(nsid);
	if (!parsed) {
		return [nsid];
	}

	const aliases = new Set<string>([parsed.currentNsid, parsed.bareNsid]);
	for (const alias of buildRulesetSpellingAliases(parsed)) {
		aliases.add(alias);
	}

	return [...aliases];
}

function splitCeruliaLexiconRef(value: string): {
	nsid: string;
	fragment: string | null;
} {
	const [nsid, fragment, ...rest] = value.split("#");
	if (!nsid || rest.length > 0) {
		return { nsid: value, fragment: null };
	}

	return {
		nsid,
		fragment: fragment ?? null,
	};
}

export function toCurrentCeruliaLexiconRef(value: string): string {
	const { nsid, fragment } = splitCeruliaLexiconRef(value);
	const currentNsid = toCurrentCeruliaNsid(nsid);
	return fragment ? `${currentNsid}#${fragment}` : currentNsid;
}

export function normalizeCeruliaTypedValues<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => normalizeCeruliaTypedValues(entry)) as T;
	}

	if (typeof value !== "object" || value === null) {
		return value;
	}

	const entries = Object.entries(value as Record<string, unknown>).map(
		([key, nested]) => {
			if (key === "$type" && typeof nested === "string") {
				return [key, toCurrentCeruliaLexiconRef(nested)];
			}

			return [key, normalizeCeruliaTypedValues(nested)];
		},
	);

	return Object.fromEntries(entries) as T;
}

export function registerCeruliaLexiconTransform<T = unknown>(options: {
	lexiconId: string;
	fromVariant: string;
	transform: CeruliaLexiconTransform<T>;
}): () => void {
	const bareLexiconId = toLegacyCeruliaNsid(options.lexiconId);
	const key = buildVariantKey(
		bareLexiconId,
		options.fromVariant,
		CERULIA_NSID_ACTIVE_VARIANT,
	);
	lexiconTransforms.set(
		key,
		options.transform as CeruliaLexiconTransform<unknown>,
	);

	return () => {
		if (lexiconTransforms.get(key) === options.transform) {
			lexiconTransforms.delete(key);
		}
	};
}

export function transformCeruliaLexiconValueToCurrent<T>(
	value: T,
	lexiconId: string,
): T {
	const parsed = parseCeruliaNsid(lexiconId);
	if (!parsed || parsed.variant === CERULIA_NSID_ACTIVE_VARIANT) {
		return value;
	}

	const key = buildVariantKey(
		parsed.bareNsid,
		parsed.variant,
		CERULIA_NSID_ACTIVE_VARIANT,
	);
	const transform = lexiconTransforms.get(key) as
		| CeruliaLexiconTransform<T>
		| undefined;

	return transform ? transform(value) : value;
}
