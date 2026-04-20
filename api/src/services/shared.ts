import {
	AppCeruliaCoreCharacterSheet,
	AppCeruliaCoreCharacterSheetSchema,
	AppCeruliaCorePlayerProfile,
	AppCeruliaCoreScenario,
	validateById,
} from "@cerulia/protocol";
import { COLLECTIONS, SELF_RKEY } from "../constants.js";
import { ApiError } from "../errors.js";
import { slugify } from "../ids.js";
import { parseAtUri } from "../refs.js";
import type { BlobRefLike, RecordDraft, StoredRecord } from "../store/types.js";
import { isCredentialFreeUri } from "../uri-policy.js";
import type { ServiceRuntime } from "./runtime.js";

export interface BlueskyProfile {
	displayName?: string;
	description?: string;
	avatar?: AppCeruliaCorePlayerProfile.Main["avatarOverrideBlob"];
	banner?: AppCeruliaCorePlayerProfile.Main["bannerOverrideBlob"];
	website?: string;
	pronouns?: string;
}

function ensureValidation(value: unknown, lexiconId: string): void {
	const result = validateById(value, lexiconId, "main", true);
	if (!result.success) {
		throw result.error;
	}
}

export async function createTypedRecord<T extends { $type: string }>(
	runtime: ServiceRuntime,
	draft: RecordDraft<T>,
): Promise<StoredRecord<T>> {
	ensureValidation(draft.value, draft.collection);
	return runtime.store.createRecord(draft);
}

export async function updateTypedRecord<T extends { $type: string }>(
	runtime: ServiceRuntime,
	draft: RecordDraft<T>,
): Promise<StoredRecord<T>> {
	ensureValidation(draft.value, draft.collection);
	return runtime.store.updateRecord(draft);
}

export async function requireRecord<T>(
	runtime: ServiceRuntime,
	uri: string,
	collection: string,
	label: string,
): Promise<StoredRecord<T>> {
	const parsed = parseAtUri(uri);
	if (parsed.collection !== collection) {
		throw new ApiError(
			"InvalidRequest",
			`${label} must reference ${collection}`,
			400,
		);
	}

	const record = await runtime.store.getRecord<T>(uri);
	if (!record) {
		throw new ApiError("NotFound", `${label} was not found`, 404);
	}

	return record;
}

export function hasSameOwner(uri: string, did: string): boolean {
	return parseAtUri(uri).repoDid === did;
}

export function assertCredentialFreeUri(
	value: string | undefined,
	label: string,
): string | null {
	if (value === undefined) {
		return null;
	}

	return isCredentialFreeUri(value)
		? null
		: `${label} must be a credential-free public URI`;
}

export function assertCredentialFreeUriList(
	values: string[] | undefined,
	label: string,
): string | null {
	if (!values) {
		return null;
	}

	for (const value of values) {
		if (!isCredentialFreeUri(value)) {
			return `${label} must contain only credential-free public URIs`;
		}
	}

	return null;
}

export async function blobBelongsToCaller(
	runtime: ServiceRuntime,
	callerDid: string,
	blob: BlobRefLike | undefined,
): Promise<boolean> {
	if (!blob) {
		return true;
	}

	return runtime.store.hasOwnedBlob(callerDid, blob);
}

export async function loadSchema(
	runtime: ServiceRuntime,
	schemaRef: string,
): Promise<StoredRecord<AppCeruliaCoreCharacterSheetSchema.Main>> {
	return requireRecord<AppCeruliaCoreCharacterSheetSchema.Main>(
		runtime,
		schemaRef,
		COLLECTIONS.characterSheetSchema,
		"characterSheetSchemaRef",
	);
}

export async function loadSheet(
	runtime: ServiceRuntime,
	sheetRef: string,
): Promise<StoredRecord<AppCeruliaCoreCharacterSheet.Main>> {
	return requireRecord<AppCeruliaCoreCharacterSheet.Main>(
		runtime,
		sheetRef,
		COLLECTIONS.characterSheet,
		"characterSheetRef",
	);
}

export async function resolveScenarioLabel(
	runtime: ServiceRuntime,
	session: {
		scenarioLabel?: string;
		scenarioRef?: string;
	},
): Promise<string | undefined> {
	if (session.scenarioLabel) {
		return session.scenarioLabel;
	}

	if (!session.scenarioRef) {
		return undefined;
	}

	const scenario = await runtime.store.getRecord<AppCeruliaCoreScenario.Main>(
		session.scenarioRef,
	);
	return scenario?.value.title;
}

export async function loadBlueskyProfile(
	runtime: ServiceRuntime,
	did: string,
	explicitRef?: string,
): Promise<BlueskyProfile | null> {
	const profileRef =
		explicitRef ?? `at://${did}/${COLLECTIONS.blueskyProfile}/${SELF_RKEY}`;

	if (!hasSameOwner(profileRef, did)) {
		return null;
	}

	const parsed = parseAtUri(profileRef);
	if (parsed.collection !== COLLECTIONS.blueskyProfile) {
		return null;
	}

	const record = await runtime.store.getRecord<BlueskyProfile>(profileRef);
	return record?.value ?? null;
}

export async function createUniqueSlugRkey(
	runtime: ServiceRuntime,
	collection: string,
	repoDid: string,
	title: string,
): Promise<string> {
	const baseSlug = slugify(title);
	const records = await runtime.store.listRecords<unknown>(collection, repoDid);
	const used = new Set(records.map((record) => record.rkey));

	if (!used.has(baseSlug)) {
		return baseSlug;
	}

	let suffix = 2;
	while (used.has(`${baseSlug}-${suffix}`)) {
		suffix += 1;
	}

	return `${baseSlug}-${suffix}`;
}
