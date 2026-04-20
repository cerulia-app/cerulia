import type {
	AppCeruliaCharacterCreateBranch,
	AppCeruliaCharacterCreateSheet,
	AppCeruliaCharacterGetBranchView,
	AppCeruliaCharacterGetHome,
	AppCeruliaCharacterRebaseSheet,
	AppCeruliaCharacterRecordAdvancement,
	AppCeruliaCharacterRecordConversion,
	AppCeruliaCharacterRetireBranch,
	AppCeruliaCharacterUpdateBranch,
	AppCeruliaCharacterUpdateSheet,
	AppCeruliaCoreCharacterAdvancement,
	AppCeruliaCoreCharacterBranch,
	AppCeruliaCoreCharacterConversion,
	AppCeruliaCoreCharacterSheet,
	AppCeruliaCoreSession,
} from "@cerulia/protocol";
import { accepted, rebaseNeeded, rejected } from "../ack.js";
import type { AuthContext } from "../auth.js";
import { isOwnerReader } from "../auth.js";
import { COLLECTIONS } from "../constants.js";
import { ApiError } from "../errors.js";
import { parseAtUri } from "../refs.js";
import {
	flattenStructuredStats,
	mergeJsonObject,
	validateStatsAgainstSchema,
} from "../schema.js";
import type { ServiceRuntime } from "./runtime.js";
import type { StoredRecord } from "../store/types.js";
import {
	assertCredentialFreeUri,
	blobBelongsToCaller,
	createTypedRecord,
	hasSameOwner,
	loadSchema,
	loadSheet,
	requireRecord,
	resolveScenarioLabel,
	updateTypedRecord,
} from "./shared.js";

function buildSessionListItem(
	sessionRef: string,
	session: AppCeruliaCoreSession.Main,
	scenarioLabel?: string,
): AppCeruliaCharacterGetHome.SessionListItem {
	return {
		$type: "app.cerulia.character.getHome#sessionListItem",
		sessionRef,
		role: session.role,
		playedAt: session.playedAt,
		scenarioLabel,
		characterBranchRef: session.characterBranchRef,
		visibility: session.visibility,
	};
}

export function createCharacterService(runtime: ServiceRuntime) {
	async function resolvedBranchStats(
		sheet: AppCeruliaCoreCharacterSheet.Main,
		branch: AppCeruliaCoreCharacterBranch.Main,
		advancements: StoredRecord<AppCeruliaCoreCharacterAdvancement.Main>[],
	) {
		let current = sheet.stats;

		if (branch.overridePayload) {
			current = mergeJsonObject(current, branch.overridePayload) as {
				[_ in string]: unknown;
			};
		}

		const orderedAdvancements = [...advancements].sort((left, right) => {
			if (left.value.effectiveAt !== right.value.effectiveAt) {
				return left.value.effectiveAt.localeCompare(right.value.effectiveAt);
			}

			return left.rkey.localeCompare(right.rkey);
		});

		for (const advancement of orderedAdvancements) {
			current = mergeJsonObject(current, advancement.value.deltaPayload) as {
				[_ in string]: unknown;
			};
		}

		return current;
	}

	return {
		async createSheet(
			callerDid: string,
			input: AppCeruliaCharacterCreateSheet.InputSchema,
		) {
			const schema = await loadSchema(runtime, input.sheetSchemaRef);
			if (schema.value.baseRulesetNsid !== input.rulesetNsid) {
				return rejected(
					"invalid-schema-link",
					"sheetSchemaRef baseRulesetNsid must match rulesetNsid",
				);
			}

			if (input.stats !== undefined) {
				const err = validateStatsAgainstSchema(
					input.stats,
					schema.value.fieldDefs,
				);
				if (err) {
					return rejected("invalid-required-field", err);
				}
			}

			if (
				!(await blobBelongsToCaller(runtime, callerDid, input.portraitBlob))
			) {
				return rejected(
					"invalid-required-field",
					"portraitBlob must belong to the caller repo",
				);
			}

			const createdAt = runtime.now();
			const sheetRkey = runtime.nextTid();
			const branchRkey = runtime.nextTid();
			const sheetRef = `at://${callerDid}/${COLLECTIONS.characterSheet}/${sheetRkey}`;
			const branchRef = `at://${callerDid}/${COLLECTIONS.characterBranch}/${branchRkey}`;
			const sheet = {
				$type: COLLECTIONS.characterSheet,
				ownerDid: callerDid,
				sheetSchemaRef: input.sheetSchemaRef,
				rulesetNsid: input.rulesetNsid,
				displayName: input.displayName,
				portraitBlob: input.portraitBlob,
				profileSummary: input.profileSummary,
				stats: input.stats,
				version: 1,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterSheet.Main;

			const branch = {
				$type: COLLECTIONS.characterBranch,
				ownerDid: callerDid,
				baseSheetRef: sheetRef,
				branchKind: "main",
				branchLabel: input.displayName,
				visibility: input.initialBranchVisibility ?? "draft",
				revision: 1,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterBranch.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterSheet,
				rkey: sheetRkey,
				value: sheet,
				createdAt,
				updatedAt: createdAt,
			});

			try {
				await createTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.characterBranch,
					rkey: branchRkey,
					value: branch,
					createdAt,
					updatedAt: createdAt,
				});
			} catch (error) {
				await runtime.store.deleteRecord(sheetRef);
				throw error;
			}

			return accepted([sheetRef, branchRef]);
		},

		async updateSheet(
			callerDid: string,
			input: AppCeruliaCharacterUpdateSheet.InputSchema,
		) {
			const record = await loadSheet(runtime, input.characterSheetRef);
			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"characterSheetRef must belong to the caller",
				);
			}

			if (record.value.version !== input.expectedVersion) {
				return rebaseNeeded("characterSheet version is stale");
			}

			if (
				!(await blobBelongsToCaller(runtime, callerDid, input.portraitBlob))
			) {
				return rejected(
					"invalid-required-field",
					"portraitBlob must belong to the caller repo",
				);
			}

			if (record.value.sheetSchemaRef && input.stats !== undefined) {
				const schema = await loadSchema(runtime, record.value.sheetSchemaRef);
				const err = validateStatsAgainstSchema(
					input.stats,
					schema.value.fieldDefs,
				);
				if (err) {
					return rejected("invalid-required-field", err);
				}
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				displayName: input.displayName ?? record.value.displayName,
				portraitBlob: input.portraitBlob ?? record.value.portraitBlob,
				profileSummary: input.profileSummary ?? record.value.profileSummary,
				stats: input.stats ?? record.value.stats,
				version: record.value.version + 1,
				updatedAt,
			} satisfies AppCeruliaCoreCharacterSheet.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterSheet,
				rkey: parseAtUri(input.characterSheetRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.characterSheetRef]);
		},

		async rebaseSheet(
			callerDid: string,
			input: AppCeruliaCharacterRebaseSheet.InputSchema,
		) {
			const record = await loadSheet(runtime, input.characterSheetRef);
			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"characterSheetRef must belong to the caller",
				);
			}

			if (record.value.version !== input.expectedVersion) {
				return rebaseNeeded("characterSheet version is stale");
			}

			const schema = await loadSchema(runtime, input.targetSheetSchemaRef);
			if (schema.value.baseRulesetNsid !== record.value.rulesetNsid) {
				return rejected(
					"invalid-schema-link",
					"targetSheetSchemaRef must match the sheet ruleset",
				);
			}

			const nextStats = input.stats ?? record.value.stats;
			if (nextStats !== undefined) {
				const err = validateStatsAgainstSchema(
					nextStats,
					schema.value.fieldDefs,
				);
				if (err) {
					return input.stats
						? rejected("invalid-required-field", err)
						: rebaseNeeded("existing stats do not satisfy the target schema");
				}
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				sheetSchemaRef: input.targetSheetSchemaRef,
				stats: nextStats,
				version: record.value.version + 1,
				updatedAt,
			} satisfies AppCeruliaCoreCharacterSheet.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterSheet,
				rkey: parseAtUri(input.characterSheetRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.characterSheetRef]);
		},

		async createBranch(
			callerDid: string,
			input: AppCeruliaCharacterCreateBranch.InputSchema,
		) {
			const sheet = await loadSheet(runtime, input.baseSheetRef);
			if (sheet.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"baseSheetRef must belong to the caller",
				);
			}

			if (sheet.value.sheetSchemaRef && input.overridePayload) {
				const schema = await loadSchema(runtime, sheet.value.sheetSchemaRef);
				const err = validateStatsAgainstSchema(
					input.overridePayload,
					schema.value.fieldDefs,
					true,
				);
				if (err) {
					return rejected("invalid-required-field", err);
				}
			}

			const createdAt = runtime.now();
			const rkey = runtime.nextTid();
			const branchRef = `at://${callerDid}/${COLLECTIONS.characterBranch}/${rkey}`;
			const record = {
				$type: COLLECTIONS.characterBranch,
				ownerDid: callerDid,
				baseSheetRef: input.baseSheetRef,
				branchKind: input.branchKind,
				branchLabel: input.branchLabel,
				overridePayload: input.overridePayload,
				visibility: input.visibility ?? "draft",
				revision: 1,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterBranch.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterBranch,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([branchRef]);
		},

		async updateBranch(
			callerDid: string,
			input: AppCeruliaCharacterUpdateBranch.InputSchema,
		) {
			const record = await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
				runtime,
				input.characterBranchRef,
				COLLECTIONS.characterBranch,
				"characterBranchRef",
			);

			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"characterBranchRef must belong to the caller",
				);
			}

			if (record.value.retiredAt) {
				return rejected(
					"terminal-state-readonly",
					"retired branches are read-only",
				);
			}

			if (record.value.revision !== input.expectedRevision) {
				return rebaseNeeded("characterBranch revision is stale");
			}

			const sheet = await loadSheet(runtime, record.value.baseSheetRef);
			if (sheet.value.sheetSchemaRef && input.overridePayload) {
				const schema = await loadSchema(runtime, sheet.value.sheetSchemaRef);
				const err = validateStatsAgainstSchema(
					input.overridePayload,
					schema.value.fieldDefs,
					true,
				);
				if (err) {
					return rejected("invalid-required-field", err);
				}
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				branchLabel: input.branchLabel ?? record.value.branchLabel,
				overridePayload: input.overridePayload ?? record.value.overridePayload,
				visibility: input.visibility ?? record.value.visibility,
				revision: record.value.revision + 1,
				updatedAt,
			} satisfies AppCeruliaCoreCharacterBranch.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterBranch,
				rkey: parseAtUri(input.characterBranchRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.characterBranchRef]);
		},

		async retireBranch(
			callerDid: string,
			input: AppCeruliaCharacterRetireBranch.InputSchema,
		) {
			const record = await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
				runtime,
				input.characterBranchRef,
				COLLECTIONS.characterBranch,
				"characterBranchRef",
			);

			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"characterBranchRef must belong to the caller",
				);
			}

			if (record.value.retiredAt) {
				return rejected(
					"terminal-state-readonly",
					"retired branches are read-only",
				);
			}

			if (record.value.revision !== input.expectedRevision) {
				return rebaseNeeded("characterBranch revision is stale");
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				retiredAt: updatedAt,
				updatedAt,
				revision: record.value.revision + 1,
			} satisfies AppCeruliaCoreCharacterBranch.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterBranch,
				rkey: parseAtUri(input.characterBranchRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.characterBranchRef]);
		},

		async recordAdvancement(
			callerDid: string,
			input: AppCeruliaCharacterRecordAdvancement.InputSchema,
		) {
			const branch = await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
				runtime,
				input.characterBranchRef,
				COLLECTIONS.characterBranch,
				"characterBranchRef",
			);

			if (branch.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"characterBranchRef must belong to the caller",
				);
			}

			if (branch.value.retiredAt) {
				return rejected(
					"terminal-state-readonly",
					"retired branches are read-only",
				);
			}

			if (
				["retrain", "respec", "correction"].includes(input.advancementKind) &&
				!input.previousValues
			) {
				return rejected(
					"invalid-required-field",
					"previousValues is required for retrain/respec/correction",
				);
			}

			if (input.sessionRef) {
				if (!hasSameOwner(input.sessionRef, callerDid)) {
					return rejected(
						"forbidden-owner-mismatch",
						"sessionRef must belong to the caller",
					);
				}

				await requireRecord(
					runtime,
					input.sessionRef,
					COLLECTIONS.session,
					"sessionRef",
				);
			}

			const createdAt = runtime.now();
			const rkey = runtime.nextTid();
			const advancementRef = `at://${callerDid}/${COLLECTIONS.characterAdvancement}/${rkey}`;
			const record = {
				$type: COLLECTIONS.characterAdvancement,
				characterBranchRef: input.characterBranchRef,
				advancementKind: input.advancementKind,
				deltaPayload: input.deltaPayload,
				sessionRef: input.sessionRef,
				previousValues: input.previousValues,
				effectiveAt: input.effectiveAt,
				createdAt,
				note: input.note,
			} satisfies AppCeruliaCoreCharacterAdvancement.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterAdvancement,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([advancementRef]);
		},

		async recordConversion(
			callerDid: string,
			input: AppCeruliaCharacterRecordConversion.InputSchema,
		) {
			const sourceSheet = await loadSheet(runtime, input.sourceSheetRef);
			const targetSheet = await loadSheet(runtime, input.targetSheetRef);
			const sourceBranch =
				await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
					runtime,
					input.sourceBranchRef,
					COLLECTIONS.characterBranch,
					"sourceBranchRef",
				);
			const targetBranch =
				await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
					runtime,
					input.targetBranchRef,
					COLLECTIONS.characterBranch,
					"targetBranchRef",
				);

			if (
				sourceSheet.repoDid !== callerDid ||
				targetSheet.repoDid !== callerDid ||
				sourceBranch.repoDid !== callerDid ||
				targetBranch.repoDid !== callerDid
			) {
				return rejected(
					"forbidden-owner-mismatch",
					"all conversion refs must belong to the caller",
				);
			}

			if (
				input.sourceRulesetNsid !== sourceSheet.value.rulesetNsid ||
				input.targetRulesetNsid !== targetSheet.value.rulesetNsid
			) {
				return rejected(
					"invalid-schema-link",
					"rulesetNsid values must match the referenced sheets",
				);
			}

			if (
				sourceBranch.value.baseSheetRef !== input.sourceSheetRef ||
				targetBranch.value.baseSheetRef !== input.targetSheetRef
			) {
				return rejected(
					"invalid-schema-link",
					"source/target branch refs must match the referenced sheets",
				);
			}

			const contractError = assertCredentialFreeUri(
				input.conversionContractRef,
				"conversionContractRef",
			);
			if (contractError) {
				return rejected("invalid-public-uri", contractError);
			}

			const createdAt = runtime.now();
			const rkey = runtime.nextTid();
			const conversionRef = `at://${callerDid}/${COLLECTIONS.characterConversion}/${rkey}`;
			const record = {
				$type: COLLECTIONS.characterConversion,
				sourceSheetRef: input.sourceSheetRef,
				sourceSheetVersion: sourceSheet.value.version,
				sourceBranchRef: input.sourceBranchRef,
				sourceRulesetNsid: input.sourceRulesetNsid,
				targetSheetRef: input.targetSheetRef,
				targetSheetVersion: targetSheet.value.version,
				targetBranchRef: input.targetBranchRef,
				targetRulesetNsid: input.targetRulesetNsid,
				conversionContractRef: input.conversionContractRef,
				convertedAt: input.convertedAt,
				note: input.note,
			} satisfies AppCeruliaCoreCharacterConversion.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.characterConversion,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([conversionRef]);
		},

		async getHome(
			callerDid: string,
		): Promise<AppCeruliaCharacterGetHome.OutputSchema> {
			const branches =
				await runtime.store.listRecords<AppCeruliaCoreCharacterBranch.Main>(
					COLLECTIONS.characterBranch,
					callerDid,
				);
			const sessions =
				await runtime.store.listRecords<AppCeruliaCoreSession.Main>(
					COLLECTIONS.session,
					callerDid,
				);

			const recentSessions = await Promise.all(
				[...sessions]
					.sort((left, right) =>
						right.value.playedAt.localeCompare(left.value.playedAt),
					)
					.map(async (record) =>
						buildSessionListItem(
							record.uri,
							record.value,
							await resolveScenarioLabel(runtime, record.value),
						),
					),
			);

			return {
				ownerDid: callerDid,
				branches: branches.map((record) => ({
					$type: "app.cerulia.character.getHome#branchListItem",
					branchRef: record.uri,
					branchLabel: record.value.branchLabel,
					baseSheetRef: record.value.baseSheetRef,
					branchKind: record.value.branchKind,
					visibility: record.value.visibility,
					revision: record.value.revision,
					updatedAt: record.value.updatedAt,
				})),
				recentSessions,
			};
		},

		async getBranchView(
			auth: AuthContext,
			branchRef: string,
		): Promise<AppCeruliaCharacterGetBranchView.OutputSchema> {
			const branch = await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
				runtime,
				branchRef,
				COLLECTIONS.characterBranch,
				"characterBranchRef",
			);
			const sheet = await loadSheet(runtime, branch.value.baseSheetRef);
			const advancements = (
				await runtime.store.listRecords<AppCeruliaCoreCharacterAdvancement.Main>(
					COLLECTIONS.characterAdvancement,
					branch.repoDid,
				)
			).filter((record) => record.value.characterBranchRef === branchRef);
			const conversions = (
				await runtime.store.listRecords<AppCeruliaCoreCharacterConversion.Main>(
					COLLECTIONS.characterConversion,
					branch.repoDid,
				)
			).filter((record) => {
				return (
					record.value.sourceBranchRef === branchRef ||
					record.value.targetBranchRef === branchRef
				);
			});
			const sessions = (
				await runtime.store.listRecords<AppCeruliaCoreSession.Main>(
					COLLECTIONS.session,
					branch.repoDid,
				)
			).filter((record) => record.value.characterBranchRef === branchRef);

			if (isOwnerReader(auth, branch.repoDid)) {
				return {
					branch: branch.value,
					sheet: sheet.value,
					advancements: advancements.map((record) => record.value),
					conversions: conversions.map((record) => record.value),
					recentSessions: await Promise.all(
						sessions
							.sort((left, right) =>
								right.value.playedAt.localeCompare(left.value.playedAt),
							)
							.map(async (record) => ({
								$type: "app.cerulia.character.getBranchView#sessionListItem",
								sessionRef: record.uri,
								role: record.value.role,
								playedAt: record.value.playedAt,
								scenarioLabel: await resolveScenarioLabel(
									runtime,
									record.value,
								),
								visibility: record.value.visibility,
							})),
					),
				};
			}

			const resolvedStats = await resolvedBranchStats(
				sheet.value,
				branch.value,
				advancements,
			);
			const schema = sheet.value.sheetSchemaRef
				? await loadSchema(runtime, sheet.value.sheetSchemaRef)
				: null;
			const structuredStats = schema
				? flattenStructuredStats(schema.value.fieldDefs, resolvedStats)
				: undefined;

			return {
				branchSummary: {
					$type: "app.cerulia.character.getBranchView#branchSummary",
					branchRef,
					branchLabel: branch.value.branchLabel,
					branchKind: branch.value.branchKind,
					visibility: branch.value.visibility,
					revision: branch.value.revision,
					updatedAt: branch.value.updatedAt,
				},
				sheetSummary: {
					$type: "app.cerulia.character.getBranchView#sheetSummary",
					sheetRef: branch.value.baseSheetRef,
					displayName: sheet.value.displayName,
					rulesetNsid: sheet.value.rulesetNsid,
					structuredStats,
					portraitBlob: sheet.value.portraitBlob,
					profileSummary: sheet.value.profileSummary,
				},
				recentSessionSummaries: await Promise.all(
					sessions
						.filter((record) => record.value.visibility === "public")
						.sort((left, right) =>
							right.value.playedAt.localeCompare(left.value.playedAt),
						)
						.map(async (record) => ({
							$type: "app.cerulia.character.getBranchView#sessionSummary",
							sessionRef: record.uri,
							role: record.value.role,
							playedAt: record.value.playedAt,
							scenarioLabel: await resolveScenarioLabel(runtime, record.value),
							hoLabel: record.value.hoLabel,
							hoSummary: record.value.hoSummary,
							outcomeSummary: record.value.outcomeSummary,
							externalArchiveUris: record.value.externalArchiveUris,
						})),
				),
				advancementSummaries: await Promise.all(
					advancements.map(async (record) => ({
						$type: "app.cerulia.character.getBranchView#advancementSummary",
						advancementRef: record.uri,
						advancementKind: record.value.advancementKind,
						effectiveAt: record.value.effectiveAt,
						sessionSummary: record.value.sessionRef
							? await (async () => {
									const session = sessions.find(
										(sessionRecord) =>
											sessionRecord.uri === record.value.sessionRef,
									);
									if (!session) {
										return undefined;
									}

									return {
										$type:
											"app.cerulia.character.getBranchView#advancementSessionSummary",
										sessionRef: session.uri,
										role: session.value.role,
										playedAt: session.value.playedAt,
										scenarioLabel: await resolveScenarioLabel(
											runtime,
											session.value,
										),
									};
								})()
							: undefined,
					})),
				),
				conversionSummaries: conversions.map((record) => ({
					$type: "app.cerulia.character.getBranchView#conversionSummary",
					conversionRef: record.uri,
					sourceRulesetNsid: record.value.sourceRulesetNsid,
					targetRulesetNsid: record.value.targetRulesetNsid,
					convertedAt: record.value.convertedAt,
				})),
			};
		},
	};
}
