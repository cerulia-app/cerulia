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
import {
	isRecordConflictError,
	scopeStateTokenEquals,
	type StoredRecord,
} from "../store/types.js";
import {
	applyTypedWrites,
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

function compareTimestampAndRkey(
	leftTimestamp: string,
	leftRkey: string,
	rightTimestamp: string,
	rightRkey: string,
) {
	if (leftTimestamp !== rightTimestamp) {
		return leftTimestamp.localeCompare(rightTimestamp);
	}

	return leftRkey.localeCompare(rightRkey);
}

function maxRkey(left?: string, right?: string) {
	if (!left) {
		return right;
	}

	if (!right) {
		return left;
	}

	return left.localeCompare(right) >= 0 ? left : right;
}

function sortStoredRecordsAscending<T>(
	records: StoredRecord<T>[],
	getTimestamp: (record: StoredRecord<T>) => string,
) {
	return [...records].sort((left, right) =>
		compareTimestampAndRkey(
			getTimestamp(left),
			left.rkey,
			getTimestamp(right),
			right.rkey,
		),
	);
}

function sortStoredRecordsDescending<T>(
	records: StoredRecord<T>[],
	getTimestamp: (record: StoredRecord<T>) => string,
) {
	return sortStoredRecordsAscending(records, getTimestamp).reverse();
}

const MATERIALIZATION_COLLECTIONS = [
	COLLECTIONS.characterBranch,
	COLLECTIONS.characterSheet,
	COLLECTIONS.characterAdvancement,
	COLLECTIONS.characterConversion,
];

export function createCharacterService(runtime: ServiceRuntime) {
	function activeAdvancementsForCurrentEpoch(
		advancements: StoredRecord<AppCeruliaCoreCharacterAdvancement.Main>[],
		conversions: StoredRecord<AppCeruliaCoreCharacterConversion.Main>[],
	) {
		const orderedAdvancements = sortStoredRecordsAscending(
			advancements,
			(record) => record.value.effectiveAt,
		);
		const orderedConversions = sortStoredRecordsAscending(
			conversions,
			(record) => record.value.convertedAt,
		);

		const latestConversion = orderedConversions.at(-1);
		if (!latestConversion) {
			return orderedAdvancements;
		}

		return orderedAdvancements.filter((record) => {
			return (
				compareTimestampAndRkey(
					record.value.effectiveAt,
					record.rkey,
					latestConversion.value.convertedAt,
					latestConversion.rkey,
				) > 0
			);
		});
	}

	function materializationStateSignature(
		branch: StoredRecord<AppCeruliaCoreCharacterBranch.Main>,
		sheet: StoredRecord<AppCeruliaCoreCharacterSheet.Main>,
		advancements: StoredRecord<AppCeruliaCoreCharacterAdvancement.Main>[],
		conversions: StoredRecord<AppCeruliaCoreCharacterConversion.Main>[],
	) {
		const orderedConversions = sortStoredRecordsAscending(
			conversions,
			(record) => record.value.convertedAt,
		);
		const latestConversion = orderedConversions.at(-1);
		const activeAdvancementRefs = activeAdvancementsForCurrentEpoch(
			advancements,
			conversions,
		).map((record) => record.uri);

		return JSON.stringify({
			sheetRef: branch.value.sheetRef,
			retiredAt: branch.value.retiredAt ?? null,
			sheetVersion: sheet.value.version,
			sheetUpdatedAt: sheet.updatedAt,
			latestConversionRef: latestConversion?.uri ?? null,
			activeAdvancementRefs,
		});
	}

	async function loadMaterializationState(branchRef: string) {
		const branch = await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
			runtime,
			branchRef,
			COLLECTIONS.characterBranch,
			"characterBranchRef",
		);
		const sheet = await loadSheet(runtime, branch.value.sheetRef);
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
		).filter((record) => record.value.characterBranchRef === branchRef);

		return {
			branch,
			sheet,
			advancements,
			conversions,
			signature: materializationStateSignature(
				branch,
				sheet,
				advancements,
				conversions,
			),
		};
	}

	async function readStableMaterializationState(
		repoDid: string,
		branchRef: string,
		expectedSignature: string,
	) {
		const scopeStateBefore = await runtime.store.getScopeStateToken(
			repoDid,
			MATERIALIZATION_COLLECTIONS,
		);
		const latestState = await loadMaterializationState(branchRef);
		const scopeStateAfter = await runtime.store.getScopeStateToken(
			repoDid,
			MATERIALIZATION_COLLECTIONS,
		);

		if (
			latestState.signature !== expectedSignature ||
			!scopeStateTokenEquals(scopeStateBefore, scopeStateAfter)
		) {
			return null;
		}

		return {
			latestState,
			scopeState: scopeStateAfter,
		};
	}

	async function resolvedBranchStats(
		sheet: AppCeruliaCoreCharacterSheet.Main,
		advancements: StoredRecord<AppCeruliaCoreCharacterAdvancement.Main>[],
		conversions: StoredRecord<AppCeruliaCoreCharacterConversion.Main>[],
	) {
		let current = sheet.stats;

		const orderedAdvancements = activeAdvancementsForCurrentEpoch(
			advancements,
			conversions,
		);

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

			if (input.stats === undefined) {
				return rejected(
					"invalid-required-field",
					"stats is required when sheetSchemaRef is provided",
				);
			}

			const err = validateStatsAgainstSchema(
				input.stats,
				schema.value.fieldDefs,
			);
			if (err) {
				return rejected("invalid-required-field", err);
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
				sheetRef,
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

			try {
				await updateTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.characterSheet,
					rkey: parseAtUri(input.characterSheetRef).rkey,
					value: nextRecord,
					createdAt: record.createdAt,
					updatedAt,
				}, { expectedCurrent: record });
			} catch (error) {
				if (isRecordConflictError(error)) {
					return rebaseNeeded("characterSheet version is stale");
				}
				throw error;
			}

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

			try {
				await updateTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.characterSheet,
					rkey: parseAtUri(input.characterSheetRef).rkey,
					value: nextRecord,
					createdAt: record.createdAt,
					updatedAt,
				}, { expectedCurrent: record });
			} catch (error) {
				if (isRecordConflictError(error)) {
					return rebaseNeeded("characterSheet version is stale");
				}
				throw error;
			}

			return accepted([input.characterSheetRef]);
		},

		async createBranch(
			callerDid: string,
			input: AppCeruliaCharacterCreateBranch.InputSchema,
		) {
			const sourceBranch =
				await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
					runtime,
					input.sourceBranchRef,
					COLLECTIONS.characterBranch,
					"sourceBranchRef",
				);
			if (sourceBranch.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"sourceBranchRef must belong to the caller",
				);
			}

			if (sourceBranch.value.retiredAt) {
				return rejected(
					"terminal-state-readonly",
					"retired branches are read-only",
				);
			}

			const sourceSheet = await loadSheet(runtime, sourceBranch.value.sheetRef);
			if (sourceSheet.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"source branch sheet must belong to the caller",
				);
			}
			const sourceSchema = sourceSheet.value.sheetSchemaRef
				? await loadSchema(runtime, sourceSheet.value.sheetSchemaRef)
				: null;

			const advancements = (
				await runtime.store.listRecords<AppCeruliaCoreCharacterAdvancement.Main>(
					COLLECTIONS.characterAdvancement,
					callerDid,
				)
			).filter((record) => record.value.characterBranchRef === input.sourceBranchRef);
			const conversions = (
				await runtime.store.listRecords<AppCeruliaCoreCharacterConversion.Main>(
					COLLECTIONS.characterConversion,
					callerDid,
				)
			).filter((record) => record.value.characterBranchRef === input.sourceBranchRef);
			const materializedStats = await resolvedBranchStats(
				sourceSheet.value,
				advancements,
				conversions,
			);
			const sourceStateSignature = materializationStateSignature(
				sourceBranch,
				sourceSheet,
				advancements,
				conversions,
			);
			const stableSourceState = await readStableMaterializationState(
				callerDid,
				input.sourceBranchRef,
				sourceStateSignature,
			);
			if (!stableSourceState) {
				return rebaseNeeded("source branch state changed during materialization");
			}

			if (sourceSchema) {
				const err = validateStatsAgainstSchema(
					materializedStats ?? {},
					sourceSchema.value.fieldDefs,
				);
				if (err) {
					return rejected("invalid-required-field", err);
				}
			}

			const createdAt = runtime.now();
			const sheetRkey = runtime.nextTid();
			const branchRkey = runtime.nextTid();
			const sheetRef = `at://${callerDid}/${COLLECTIONS.characterSheet}/${sheetRkey}`;
			const branchRef = `at://${callerDid}/${COLLECTIONS.characterBranch}/${branchRkey}`;
			const sheet = {
				$type: COLLECTIONS.characterSheet,
				ownerDid: callerDid,
				sheetSchemaRef: sourceSheet.value.sheetSchemaRef,
				rulesetNsid: sourceSheet.value.rulesetNsid,
				displayName: sourceSheet.value.displayName,
				portraitBlob: sourceSheet.value.portraitBlob,
				profileSummary: sourceSheet.value.profileSummary,
				stats: materializedStats,
				version: 1,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterSheet.Main;
			const record = {
				$type: COLLECTIONS.characterBranch,
				ownerDid: callerDid,
				sheetRef,
				forkedFromBranchRef: input.sourceBranchRef,
				branchKind: input.branchKind,
				branchLabel: input.branchLabel,
				visibility: input.visibility ?? "draft",
				revision: 1,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterBranch.Main;

			try {
				await applyTypedWrites(
					runtime,
					[
						{
							kind: "create",
							draft: {
								repoDid: callerDid,
								collection: COLLECTIONS.characterSheet,
								rkey: sheetRkey,
								value: sheet,
								createdAt,
								updatedAt: createdAt,
							},
						},
						{
							kind: "create",
							draft: {
								repoDid: callerDid,
								collection: COLLECTIONS.characterBranch,
								rkey: branchRkey,
								value: record,
								createdAt,
								updatedAt: createdAt,
							},
						},
					],
					{ expectedScopeState: stableSourceState.scopeState },
				);
			} catch (error) {
				if (isRecordConflictError(error)) {
					return rebaseNeeded("source branch state changed during materialization");
				}
				throw error;
			}

			return accepted([sheetRef, branchRef]);
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

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				branchLabel: input.branchLabel ?? record.value.branchLabel,
				visibility: input.visibility ?? record.value.visibility,
				revision: record.value.revision + 1,
				updatedAt,
			} satisfies AppCeruliaCoreCharacterBranch.Main;

			try {
				await updateTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.characterBranch,
					rkey: parseAtUri(input.characterBranchRef).rkey,
					value: nextRecord,
					createdAt: record.createdAt,
					updatedAt,
				}, { expectedCurrent: record });
			} catch (error) {
				if (isRecordConflictError(error)) {
					return rebaseNeeded("characterBranch revision is stale");
				}
				throw error;
			}

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

			try {
				await updateTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.characterBranch,
					rkey: parseAtUri(input.characterBranchRef).rkey,
					value: nextRecord,
					createdAt: record.createdAt,
					updatedAt,
				}, { expectedCurrent: record });
			} catch (error) {
				if (isRecordConflictError(error)) {
					return rebaseNeeded("characterBranch revision is stale");
				}
				throw error;
			}

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
			const nextBranch = {
				...branch.value,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterBranch.Main;

			try {
				await createTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.characterAdvancement,
					rkey,
					value: record,
					createdAt,
					updatedAt: createdAt,
				}, { guardUnchanged: [branch] });
			} catch (error) {
				if (isRecordConflictError(error)) {
					return rebaseNeeded("characterBranch state changed during advancement");
				}
				throw error;
			}

			try {
				await updateTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.characterBranch,
					rkey: parseAtUri(input.characterBranchRef).rkey,
					value: nextBranch,
					createdAt: branch.createdAt,
					updatedAt: createdAt,
				}, { expectedCurrent: branch });
			} catch (error) {
				await runtime.store.deleteRecord(advancementRef);
				if (isRecordConflictError(error)) {
					return rebaseNeeded("characterBranch state changed during advancement");
				}
				throw error;
			}

			return accepted([advancementRef]);
		},

		async recordConversion(
			callerDid: string,
			input: AppCeruliaCharacterRecordConversion.InputSchema,
		) {
			const branch =
				await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
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

			if (branch.value.revision !== input.expectedRevision) {
				return rebaseNeeded("characterBranch revision is stale");
			}

			const sourceSheet = await loadSheet(runtime, branch.value.sheetRef);
			if (sourceSheet.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"branch sheet must belong to the caller",
				);
			}

			if (input.targetRulesetNsid === sourceSheet.value.rulesetNsid) {
				return rejected(
					"invalid-schema-link",
					"targetRulesetNsid must differ from the current sheet ruleset",
				);
			}

			const targetSchema = await loadSchema(runtime, input.targetSheetSchemaRef);
			if (targetSchema.value.baseRulesetNsid !== input.targetRulesetNsid) {
				return rejected(
					"invalid-schema-link",
					"targetSheetSchemaRef must match targetRulesetNsid",
				);
			}

			const advancements = (
				await runtime.store.listRecords<AppCeruliaCoreCharacterAdvancement.Main>(
					COLLECTIONS.characterAdvancement,
					callerDid,
				)
			).filter(
				(record) => record.value.characterBranchRef === input.characterBranchRef,
			);
			const conversions = (
				await runtime.store.listRecords<AppCeruliaCoreCharacterConversion.Main>(
					COLLECTIONS.characterConversion,
					callerDid,
				)
			).filter(
				(record) => record.value.characterBranchRef === input.characterBranchRef,
			);
			const latestConversion = sortStoredRecordsAscending(
				conversions,
				(record) => record.value.convertedAt,
			).at(-1);
			const latestActiveAdvancement = activeAdvancementsForCurrentEpoch(
				advancements,
				conversions,
			).at(-1);
			const sameTimestampFloorRkey = maxRkey(
				latestConversion?.value.convertedAt === input.convertedAt
					? latestConversion.rkey
					: undefined,
				latestActiveAdvancement?.value.effectiveAt === input.convertedAt
					? latestActiveAdvancement.rkey
					: undefined,
			);
			const conversionRkey = runtime.nextTid(sameTimestampFloorRkey);
			if (
				latestConversion &&
				compareTimestampAndRkey(
					input.convertedAt,
					conversionRkey,
					latestConversion.value.convertedAt,
					latestConversion.rkey,
				) <= 0
			) {
				return rejected(
					"invalid-required-field",
					"convertedAt must be later than the current branch conversion head",
				);
			}
			if (
				latestActiveAdvancement &&
				compareTimestampAndRkey(
					input.convertedAt,
					conversionRkey,
					latestActiveAdvancement.value.effectiveAt,
					latestActiveAdvancement.rkey,
				) <= 0
			) {
				return rejected(
					"invalid-required-field",
					"convertedAt must be later than active advancements in the current epoch",
				);
			}
			const convertedStats =
				(await resolvedBranchStats(
					sourceSheet.value,
					advancements,
					conversions,
				)) ?? {};
			const sourceStateSignature = materializationStateSignature(
				branch,
				sourceSheet,
				advancements,
				conversions,
			);
			const stableSourceState = await readStableMaterializationState(
				callerDid,
				input.characterBranchRef,
				sourceStateSignature,
			);
			if (!stableSourceState) {
				return rebaseNeeded("source branch state changed during materialization");
			}
			const validationError = validateStatsAgainstSchema(
				convertedStats,
				targetSchema.value.fieldDefs,
			);
			if (validationError) {
				return rejected("invalid-required-field", validationError);
			}

			const contractError = assertCredentialFreeUri(
				input.conversionContractRef,
				"conversionContractRef",
			);
			if (contractError) {
				return rejected("invalid-public-uri", contractError);
			}

			const createdAt = runtime.now();
			const sheetRkey = runtime.nextTid();
			const targetSheetRef = `at://${callerDid}/${COLLECTIONS.characterSheet}/${sheetRkey}`;
			const conversionRef = `at://${callerDid}/${COLLECTIONS.characterConversion}/${conversionRkey}`;
			const sourceStateGuards = [branch, sourceSheet] as StoredRecord<unknown>[];
			const targetSheet = {
				$type: COLLECTIONS.characterSheet,
				ownerDid: callerDid,
				sheetSchemaRef: input.targetSheetSchemaRef,
				rulesetNsid: input.targetRulesetNsid,
				displayName: sourceSheet.value.displayName,
				portraitBlob: sourceSheet.value.portraitBlob,
				profileSummary: sourceSheet.value.profileSummary,
				stats: convertedStats,
				version: 1,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterSheet.Main;
			const record = {
				$type: COLLECTIONS.characterConversion,
				characterBranchRef: input.characterBranchRef,
				sourceSheetRef: branch.value.sheetRef,
				sourceSheetVersion: sourceSheet.value.version,
				sourceRulesetNsid: sourceSheet.value.rulesetNsid,
				targetSheetRef,
				targetSheetVersion: targetSheet.version,
				targetRulesetNsid: input.targetRulesetNsid,
				conversionContractRef: input.conversionContractRef,
				convertedAt: input.convertedAt,
				note: input.note,
			} satisfies AppCeruliaCoreCharacterConversion.Main;
			const nextBranch = {
				...branch.value,
				sheetRef: targetSheetRef,
				revision: branch.value.revision + 1,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterBranch.Main;

			try {
				await applyTypedWrites(
					runtime,
					[
						{
							kind: "create",
							draft: {
								repoDid: callerDid,
								collection: COLLECTIONS.characterSheet,
								rkey: sheetRkey,
								value: targetSheet,
								createdAt,
								updatedAt: createdAt,
							},
						},
						{
							kind: "create",
							draft: {
								repoDid: callerDid,
								collection: COLLECTIONS.characterConversion,
								rkey: conversionRkey,
								value: record,
								createdAt,
								updatedAt: createdAt,
							},
						},
						{
							kind: "update",
							draft: {
								repoDid: callerDid,
								collection: COLLECTIONS.characterBranch,
								rkey: parseAtUri(input.characterBranchRef).rkey,
								value: nextBranch,
								createdAt: branch.createdAt,
								updatedAt: createdAt,
							},
						},
					],
					{ expectedScopeState: stableSourceState.scopeState },
				);
			} catch (error) {
				if (isRecordConflictError(error)) {
					return rebaseNeeded("source branch state changed during materialization");
				}
				throw error;
			}

			return accepted([targetSheetRef, input.characterBranchRef, conversionRef]);
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
				sortStoredRecordsDescending(
					sessions,
					(record) => record.value.playedAt,
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
				branches: sortStoredRecordsDescending(
					branches,
					(record) => record.value.updatedAt,
				).map((record) => ({
					$type: "app.cerulia.character.getHome#branchListItem",
					branchRef: record.uri,
					branchLabel: record.value.branchLabel,
					sheetRef: record.value.sheetRef,
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
			const sheet = await loadSheet(runtime, branch.value.sheetRef);
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
			).filter((record) => record.value.characterBranchRef === branchRef);
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
					advancements: sortStoredRecordsDescending(
						advancements,
						(record) => record.value.effectiveAt,
					).map((record) => record.value),
					conversions: sortStoredRecordsDescending(
						conversions,
						(record) => record.value.convertedAt,
					).map((record) => record.value),
					recentSessions: await Promise.all(
						sortStoredRecordsDescending(
							sessions,
							(record) => record.value.playedAt,
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
				advancements,
				conversions,
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
					sheetRef: branch.value.sheetRef,
					displayName: sheet.value.displayName,
					rulesetNsid: sheet.value.rulesetNsid,
					structuredStats,
					portraitBlob: sheet.value.portraitBlob,
					profileSummary: sheet.value.profileSummary,
				},
				recentSessionSummaries: await Promise.all(
					sortStoredRecordsDescending(
						sessions.filter((record) => record.value.visibility === "public"),
						(record) => record.value.playedAt,
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
					sortStoredRecordsDescending(
						advancements,
						(record) => record.value.effectiveAt,
					).map(async (record) => ({
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
									if (!session || session.value.visibility !== "public") {
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
				conversionSummaries: sortStoredRecordsDescending(
					conversions,
					(record) => record.value.convertedAt,
				).map((record) => ({
					$type: "app.cerulia.character.getBranchView#conversionSummary",
					sourceRulesetNsid: record.value.sourceRulesetNsid,
					targetRulesetNsid: record.value.targetRulesetNsid,
					convertedAt: record.value.convertedAt,
				})),
			};
		},
	};
}
