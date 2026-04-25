import { areEquivalentCeruliaNsids } from "@cerulia/protocol";
import type {
	AppCeruliaCoreScenario,
	AppCeruliaScenarioCreate,
	AppCeruliaScenarioGetView,
	AppCeruliaScenarioUpdate,
} from "@cerulia/protocol";
import { accepted, rejected } from "../ack.js";
import type { AuthContext } from "../auth.js";
import { isOwnerReader } from "../auth.js";
import { COLLECTIONS } from "../constants.js";
import { ApiError } from "../errors.js";
import { parseAtUri } from "../refs.js";
import type { ServiceRuntime } from "./runtime.js";
import {
	assertCredentialFreeUri,
	createTypedRecord,
	createUniqueSlugRkey,
	loadExactSchema,
	loadOptionalExactSchema,
	requireRecord,
	updateTypedRecord,
} from "./shared.js";

async function hasResolvedRecommendedSheetSchema(
	runtime: ServiceRuntime,
	schemaPin: { uri: string; cid: string } | undefined,
): Promise<boolean> {
	if (!schemaPin) {
		return false;
	}

	try {
		return Boolean(
			await loadOptionalExactSchema(
				runtime,
				schemaPin,
				"recommendedSheetSchemaPin",
			),
		);
	} catch {
		return false;
	}
}

export function createScenarioService(runtime: ServiceRuntime) {
	return {
		async create(
			callerDid: string,
			input: AppCeruliaScenarioCreate.InputSchema,
		) {
			if (input.recommendedSheetSchemaPin && !input.rulesetNsid) {
				return rejected(
					"invalid-required-field",
					"recommendedSheetSchemaPin requires rulesetNsid",
				);
			}

			if (input.recommendedSheetSchemaPin && input.rulesetNsid) {
				let schema: Awaited<ReturnType<typeof loadExactSchema>>;
				try {
					schema = await loadExactSchema(
						runtime,
						input.recommendedSheetSchemaPin,
						"recommendedSheetSchemaPin",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-schema-link",
							"recommendedSheetSchemaPin must resolve an existing characterSheetSchema",
						);
					}

					throw error;
				}
				if (
					!areEquivalentCeruliaNsids(
						schema.value.baseRulesetNsid,
						input.rulesetNsid,
					)
				) {
					return rejected(
						"invalid-schema-link",
						"recommendedSheetSchemaPin must match rulesetNsid",
					);
				}
			}

			const sourceCitationError = assertCredentialFreeUri(
				input.sourceCitationUri,
				"sourceCitationUri",
			);
			if (sourceCitationError) {
				return rejected("invalid-public-uri", sourceCitationError);
			}

			const createdAt = runtime.now();
			const rkey = await createUniqueSlugRkey(
				runtime,
				COLLECTIONS.scenario,
				callerDid,
				input.title,
			);
			const scenarioRef = `at://${callerDid}/${COLLECTIONS.scenario}/${rkey}`;
			const record = {
				$type: COLLECTIONS.scenario,
				title: input.title,
				rulesetNsid: input.rulesetNsid,
				recommendedSheetSchemaPin: input.recommendedSheetSchemaPin,
				sourceCitationUri: input.sourceCitationUri,
				summary: input.summary,
				ownerDid: callerDid,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreScenario.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.scenario,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([scenarioRef]);
		},

		async update(
			callerDid: string,
			input: AppCeruliaScenarioUpdate.InputSchema,
		) {
			const record = await requireRecord<AppCeruliaCoreScenario.Main>(
				runtime,
				input.scenarioRef,
				COLLECTIONS.scenario,
				"scenarioRef",
			);
			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"scenarioRef must belong to the caller",
				);
			}

			const nextRulesetNsid = input.rulesetNsid ?? record.value.rulesetNsid;
			const nextRecommended =
				input.recommendedSheetSchemaPin ??
				record.value.recommendedSheetSchemaPin;

			if (nextRecommended && !nextRulesetNsid) {
				return rejected(
					"invalid-required-field",
					"recommendedSheetSchemaPin requires rulesetNsid",
				);
			}

			if (
				nextRecommended &&
				nextRulesetNsid &&
				(input.recommendedSheetSchemaPin !== undefined ||
					input.rulesetNsid !== undefined)
			) {
				let schema: Awaited<ReturnType<typeof loadExactSchema>>;
				try {
					schema = await loadExactSchema(
						runtime,
						nextRecommended,
						"recommendedSheetSchemaPin",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-schema-link",
							"recommendedSheetSchemaPin must resolve an existing characterSheetSchema",
						);
					}

					throw error;
				}
				if (
					!areEquivalentCeruliaNsids(
						schema.value.baseRulesetNsid,
						nextRulesetNsid,
					)
				) {
					return rejected(
						"invalid-schema-link",
						"recommendedSheetSchemaPin must match rulesetNsid",
					);
				}
			}

			const sourceCitationError = assertCredentialFreeUri(
				input.sourceCitationUri ?? record.value.sourceCitationUri,
				"sourceCitationUri",
			);
			if (sourceCitationError) {
				return rejected("invalid-public-uri", sourceCitationError);
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				title: input.title ?? record.value.title,
				rulesetNsid: nextRulesetNsid,
				recommendedSheetSchemaPin: nextRecommended,
				sourceCitationUri:
					input.sourceCitationUri ?? record.value.sourceCitationUri,
				summary: input.summary ?? record.value.summary,
				updatedAt,
			} satisfies AppCeruliaCoreScenario.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.scenario,
				rkey: parseAtUri(input.scenarioRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.scenarioRef]);
		},

		async getView(
			auth: AuthContext,
			scenarioRef: string,
		): Promise<AppCeruliaScenarioGetView.OutputSchema> {
			const record = await requireRecord<AppCeruliaCoreScenario.Main>(
				runtime,
				scenarioRef,
				COLLECTIONS.scenario,
				"scenarioRef",
			);

			if (isOwnerReader(auth, record.repoDid)) {
				return {
					scenario: record.value,
				};
			}

			return {
				scenarioSummary: {
					$type: "app.cerulia.dev.scenario.getView#scenarioSummary",
					scenarioRef,
					title: record.value.title,
					rulesetNsid: record.value.rulesetNsid,
					hasRecommendedSheetSchema: await hasResolvedRecommendedSheetSchema(
						runtime,
						record.value.recommendedSheetSchemaPin,
					),
					summary: record.value.summary,
					sourceCitationUri: record.value.sourceCitationUri,
				},
			};
		},
	};
}
