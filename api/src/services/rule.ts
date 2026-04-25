import { areEquivalentCeruliaNsids } from "@cerulia/protocol";
import type {
	AppCeruliaCoreRuleProfile,
	AppCeruliaRuleCreateProfile,
	AppCeruliaCoreCharacterSheetSchema,
	AppCeruliaRuleCreateSheetSchema,
	AppCeruliaRuleGetSheetSchema,
	AppCeruliaRuleGetProfile,
	AppCeruliaRuleListProfiles,
	AppCeruliaRuleListSheetSchemas,
	AppCeruliaRuleUpdateProfile,
} from "@cerulia/protocol";
import { accepted, rejected } from "../ack.js";
import { COLLECTIONS } from "../constants.js";
import { ApiError } from "../errors.js";
import { parseAtUri } from "../refs.js";
import { paginate } from "../pagination.js";
import {
	buildExactRecordPin,
	areEquivalentRecordUris,
	assertCredentialFreeUri,
	createTypedRecord,
	listRecordsByCollectionAlias,
	loadSchema,
	requireRecord,
	updateTypedRecord,
} from "./shared.js";
import type { ServiceRuntime } from "./runtime.js";

export function createRuleService(runtime: ServiceRuntime) {
	return {
		async createSheetSchema(
			callerDid: string,
			input: AppCeruliaRuleCreateSheetSchema.InputSchema,
		) {
			const createdAt = runtime.now();
			const rkey = runtime.nextOpaque();
			const schemaRef = `at://${callerDid}/${COLLECTIONS.characterSheetSchema}/${rkey}`;
			const record = {
				$type: COLLECTIONS.characterSheetSchema,
				baseRulesetNsid: input.baseRulesetNsid,
				schemaVersion: input.schemaVersion,
				title: input.title,
				ownerDid: callerDid,
				createdAt,
				fieldDefs: input.fieldDefs,
			} satisfies AppCeruliaCoreCharacterSheetSchema.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterSheetSchema,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([schemaRef]);
		},

		async getSheetSchema(
			schemaRef: string,
		): Promise<AppCeruliaRuleGetSheetSchema.OutputSchema> {
			const record = await loadSchema(runtime, schemaRef);
			return {
				characterSheetSchema: record.value,
			};
		},

		async listSheetSchemas(
			rulesetNsid: string | undefined,
			limit: string | undefined,
			cursor: string | undefined,
		): Promise<AppCeruliaRuleListSheetSchemas.OutputSchema> {
			const records =
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterSheetSchema.Main>(
					runtime,
					COLLECTIONS.characterSheetSchema,
				);
			const filtered = records
				.filter(
					(record) =>
						!rulesetNsid ||
						areEquivalentCeruliaNsids(
							record.value.baseRulesetNsid,
							rulesetNsid,
						),
				)
				.sort((left, right) =>
					left.value.title.localeCompare(right.value.title),
				);

			const page = paginate(filtered, limit, cursor);
			return {
				items: page.items.map((record) => ({
					$type: "app.cerulia.dev.rule.listSheetSchemas#sheetSchemaListItem",
					schemaPin: buildExactRecordPin(record),
					baseRulesetNsid: record.value.baseRulesetNsid,
					schemaVersion: record.value.schemaVersion,
					title: record.value.title,
				})),
				cursor: page.cursor,
			};
		},

		async createProfile(
			callerDid: string,
			input: AppCeruliaRuleCreateProfile.InputSchema,
		) {
			const collection =
				input.scopeKind === "house-shared"
					? COLLECTIONS.house
					: input.scopeKind === "campaign-shared"
						? COLLECTIONS.campaign
						: null;

			if (!collection) {
				return rejected(
					"invalid-required-field",
					"scopeKind must be house-shared or campaign-shared",
				);
			}

			if (parseAtUri(input.scopeRef).repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"scopeRef must belong to the caller",
				);
			}

			await requireRecord(runtime, input.scopeRef, collection, "scopeRef");

			const uriError = assertCredentialFreeUri(
				input.rulesPatchUri,
				"rulesPatchUri",
			);
			if (uriError) {
				return rejected("invalid-public-uri", uriError);
			}

			const createdAt = runtime.now();
			const rkey = runtime.nextOpaque();
			const ruleProfileRef = `at://${callerDid}/${COLLECTIONS.ruleProfile}/${rkey}`;
			const record = {
				$type: COLLECTIONS.ruleProfile,
				baseRulesetNsid: input.baseRulesetNsid,
				profileTitle: input.profileTitle,
				scopeKind: input.scopeKind,
				scopeRef: input.scopeRef,
				rulesPatchUri: input.rulesPatchUri,
				ownerDid: callerDid,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreRuleProfile.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.ruleProfile,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([ruleProfileRef]);
		},

		async updateProfile(
			callerDid: string,
			input: AppCeruliaRuleUpdateProfile.InputSchema,
		) {
			const record = await requireRecord<AppCeruliaCoreRuleProfile.Main>(
				runtime,
				input.ruleProfileRef,
				COLLECTIONS.ruleProfile,
				"ruleProfileRef",
			);

			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"ruleProfileRef must belong to the caller",
				);
			}

			const uriError = assertCredentialFreeUri(
				input.rulesPatchUri,
				"rulesPatchUri",
			);
			if (uriError) {
				return rejected("invalid-public-uri", uriError);
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				profileTitle: input.profileTitle ?? record.value.profileTitle,
				rulesPatchUri: input.rulesPatchUri ?? record.value.rulesPatchUri,
				updatedAt,
			} satisfies AppCeruliaCoreRuleProfile.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.ruleProfile,
				rkey: parseAtUri(input.ruleProfileRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.ruleProfileRef]);
		},

		async getProfile(
			callerDid: string,
			ruleProfileRef: string,
		): Promise<AppCeruliaRuleGetProfile.OutputSchema> {
			const record = await requireRecord<AppCeruliaCoreRuleProfile.Main>(
				runtime,
				ruleProfileRef,
				COLLECTIONS.ruleProfile,
				"ruleProfileRef",
			);

			if (record.repoDid !== callerDid) {
				throw new ApiError("Forbidden", "ruleProfileRef is owner-only", 403);
			}

			return {
				ruleProfile: record.value,
			};
		},

		async listProfiles(
			callerDid: string,
			scopeRef: string | undefined,
			baseRulesetNsid: string | undefined,
			limit: string | undefined,
			cursor: string | undefined,
		): Promise<AppCeruliaRuleListProfiles.OutputSchema> {
			const records =
				await listRecordsByCollectionAlias<AppCeruliaCoreRuleProfile.Main>(
					runtime,
					COLLECTIONS.ruleProfile,
					callerDid,
				);
			const filtered = records.filter((record) => {
				return (
					(!scopeRef ||
						areEquivalentRecordUris(record.value.scopeRef, scopeRef)) &&
					(!baseRulesetNsid ||
						areEquivalentCeruliaNsids(
							record.value.baseRulesetNsid,
							baseRulesetNsid,
						))
				);
			});
			const page = paginate(filtered, limit, cursor);

			return {
				items: page.items.map((record) => ({
					$type: "app.cerulia.dev.rule.listProfiles#ruleProfileListItem",
					ruleProfileRef: record.uri,
					baseRulesetNsid: record.value.baseRulesetNsid,
					profileTitle: record.value.profileTitle,
					scopeKind: record.value.scopeKind,
					scopeRef: record.value.scopeRef,
				})),
				cursor: page.cursor,
			};
		},
	};
}
