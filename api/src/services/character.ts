import {
	areEquivalentCeruliaNsids,
	getCeruliaNsidAliases,
} from "@cerulia/protocol";
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
	toStoredRecord,
	type StoredRecord,
} from "../store/types.js";
import {
	applyTypedWrites,
	assertCredentialFreeUri,
	areEquivalentRecordUris,
	buildExactRecordPin,
	blobBelongsToCaller,
	createTypedRecord,
	hasSameOwner,
	listRecordsByCollectionAlias,
	loadExactSchema,
	loadOptionalExactSchema,
	loadOptionalSheet,
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
		$type: "app.cerulia.dev.character.getHome#sessionListItem",
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

const MATERIALIZATION_SCOPE_COLLECTIONS = [
	...new Set(
		MATERIALIZATION_COLLECTIONS.flatMap((collection) =>
			getCeruliaNsidAliases(collection),
		),
	),
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
		const sheet = await loadOptionalSheet(runtime, branch.value.sheetRef);
		if (!sheet) {
			return null;
		}
		const advancements = (
			await listRecordsByCollectionAlias<AppCeruliaCoreCharacterAdvancement.Main>(
				runtime,
				COLLECTIONS.characterAdvancement,
				branch.repoDid,
			)
		).filter((record) =>
			areEquivalentRecordUris(record.value.characterBranchRef, branchRef),
		);
		const conversions = (
			await listRecordsByCollectionAlias<AppCeruliaCoreCharacterConversion.Main>(
				runtime,
				COLLECTIONS.characterConversion,
				branch.repoDid,
			)
		).filter((record) =>
			areEquivalentRecordUris(record.value.characterBranchRef, branchRef),
		);

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
			MATERIALIZATION_SCOPE_COLLECTIONS,
		);
		const latestState = await loadMaterializationState(branchRef);
		if (!latestState) {
			return null;
		}
		const scopeStateAfter = await runtime.store.getScopeStateToken(
			repoDid,
			MATERIALIZATION_SCOPE_COLLECTIONS,
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

	async function loadCurrentHeadBranchForSheet(
		callerDid: string,
		sheetRef: string,
	): Promise<StoredRecord<AppCeruliaCoreCharacterBranch.Main> | null> {
		const branches =
			await listRecordsByCollectionAlias<AppCeruliaCoreCharacterBranch.Main>(
				runtime,
				COLLECTIONS.characterBranch,
				callerDid,
			);

		return (
			branches.find((branch) =>
				areEquivalentRecordUris(branch.value.sheetRef, sheetRef),
			) ?? null
		);
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
			let schema: Awaited<ReturnType<typeof loadExactSchema>>;
			try {
				schema = await loadExactSchema(
					runtime,
					input.sheetSchemaPin,
					"sheetSchemaPin",
				);
			} catch (error) {
				if (error instanceof ApiError && error.status === 404) {
					return rejected(
						"invalid-schema-link",
						"sheetSchemaPin must resolve an existing characterSheetSchema",
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
					"sheetSchemaPin must match rulesetNsid",
				);
			}

			if (input.stats === undefined) {
				return rejected(
					"invalid-required-field",
					"stats is required when sheetSchemaPin is provided",
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
				sheetSchemaPin: input.sheetSchemaPin,
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
			const writes = [
				{
					kind: "create" as const,
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
					kind: "create" as const,
					draft: {
						repoDid: callerDid,
						collection: COLLECTIONS.characterBranch,
						rkey: branchRkey,
						value: branch,
						createdAt,
						updatedAt: createdAt,
					},
				},
			];
			const scopeCollections = [
				COLLECTIONS.characterSheet,
				COLLECTIONS.characterBranch,
			];

			const applyCreateSheetWrites = async () => {
				const expectedScopeState = await runtime.store.getScopeStateToken(
					callerDid,
					scopeCollections,
				);
				await applyTypedWrites(runtime, writes, { expectedScopeState });
			};

			try {
				await applyCreateSheetWrites();
			} catch (error) {
				if (!isRecordConflictError(error)) {
					throw error;
				}

				try {
					await applyCreateSheetWrites();
				} catch (retryError) {
					if (isRecordConflictError(retryError)) {
						return rebaseNeeded("repo state changed during character creation");
					}

					throw retryError;
				}
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

			const currentHeadBranch = await loadCurrentHeadBranchForSheet(
				callerDid,
				input.characterSheetRef,
			);
			if (!currentHeadBranch) {
				return rebaseNeeded(
					"characterSheetRef is no longer the current head for any branch",
				);
			}
			if (currentHeadBranch.value.retiredAt) {
				return rejected(
					"terminal-state-readonly",
					"retired branches are read-only",
				);
			}

			if (
				!(await blobBelongsToCaller(runtime, callerDid, input.portraitBlob))
			) {
				return rejected(
					"invalid-required-field",
					"portraitBlob must belong to the caller repo",
				);
			}

			if (record.value.sheetSchemaPin && input.stats !== undefined) {
				let schema: Awaited<ReturnType<typeof loadExactSchema>>;
				try {
					schema = await loadExactSchema(
						runtime,
						record.value.sheetSchemaPin,
						"sheetSchemaPin",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"repair-needed",
							"current branch sheet schema pin is unresolved; repair the branch before updating stats",
						);
					}

					throw error;
				}
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
				await updateTypedRecord(
					runtime,
					{
						repoDid: callerDid,
						collection: COLLECTIONS.characterSheet,
						rkey: parseAtUri(input.characterSheetRef).rkey,
						value: nextRecord,
						createdAt: record.createdAt,
						updatedAt,
					},
					{ expectedCurrent: record },
				);
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

			const currentHeadBranch = await loadCurrentHeadBranchForSheet(
				callerDid,
				input.characterSheetRef,
			);
			if (!currentHeadBranch) {
				return rebaseNeeded(
					"characterSheetRef is no longer the current head for any branch",
				);
			}
			if (currentHeadBranch.value.retiredAt) {
				return rejected(
					"terminal-state-readonly",
					"retired branches are read-only",
				);
			}

			let schema: Awaited<ReturnType<typeof loadExactSchema>>;
			try {
				schema = await loadExactSchema(
					runtime,
					input.targetSheetSchemaPin,
					"targetSheetSchemaPin",
				);
			} catch (error) {
				if (error instanceof ApiError && error.status === 404) {
					return rejected(
						"invalid-schema-link",
						"targetSheetSchemaPin must resolve an existing characterSheetSchema",
					);
				}

				throw error;
			}
			if (
				!areEquivalentCeruliaNsids(
					schema.value.baseRulesetNsid,
					record.value.rulesetNsid,
				)
			) {
				return rejected(
					"invalid-schema-link",
					"targetSheetSchemaPin must match the sheet ruleset",
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
				sheetSchemaPin: input.targetSheetSchemaPin,
				stats: nextStats,
				version: record.value.version + 1,
				updatedAt,
			} satisfies AppCeruliaCoreCharacterSheet.Main;

			try {
				await updateTypedRecord(
					runtime,
					{
						repoDid: callerDid,
						collection: COLLECTIONS.characterSheet,
						rkey: parseAtUri(input.characterSheetRef).rkey,
						value: nextRecord,
						createdAt: record.createdAt,
						updatedAt,
					},
					{ expectedCurrent: record },
				);
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
			let sourceBranch: StoredRecord<AppCeruliaCoreCharacterBranch.Main>;
			try {
				sourceBranch = await requireRecord<AppCeruliaCoreCharacterBranch.Main>(
					runtime,
					input.sourceBranchRef,
					COLLECTIONS.characterBranch,
					"sourceBranchRef",
				);
			} catch (error) {
				if (error instanceof ApiError && error.status === 404) {
					return rejected(
						"invalid-required-field",
						"sourceBranchRef must reference an existing characterBranch",
					);
				}

				throw error;
			}
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

			const sourceSheet = await loadOptionalSheet(
				runtime,
				sourceBranch.value.sheetRef,
			);
			if (!sourceSheet) {
				return rejected(
					"repair-needed",
					"source branch head sheet is missing; repair the branch before branching",
				);
			}
			if (sourceSheet.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"source branch sheet must belong to the caller",
				);
			}
			const sourceSchema = await loadOptionalExactSchema(
				runtime,
				sourceSheet.value.sheetSchemaPin,
				"sheetSchemaPin",
			);
			if (sourceSheet.value.sheetSchemaPin && !sourceSchema) {
				return rejected(
					"repair-needed",
					"source sheet schema pin is unresolved; repair the branch before branching",
				);
			}

			const advancements = (
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterAdvancement.Main>(
					runtime,
					COLLECTIONS.characterAdvancement,
					callerDid,
				)
			).filter((record) =>
				areEquivalentRecordUris(
					record.value.characterBranchRef,
					input.sourceBranchRef,
				),
			);
			const conversions = (
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterConversion.Main>(
					runtime,
					COLLECTIONS.characterConversion,
					callerDid,
				)
			).filter((record) =>
				areEquivalentRecordUris(
					record.value.characterBranchRef,
					input.sourceBranchRef,
				),
			);
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
				return rebaseNeeded(
					"source branch state changed during materialization",
				);
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
				sheetSchemaPin: sourceSheet.value.sheetSchemaPin,
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
					return rebaseNeeded(
						"source branch state changed during materialization",
					);
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
				await updateTypedRecord(
					runtime,
					{
						repoDid: callerDid,
						collection: COLLECTIONS.characterBranch,
						rkey: parseAtUri(input.characterBranchRef).rkey,
						value: nextRecord,
						createdAt: record.createdAt,
						updatedAt,
					},
					{ expectedCurrent: record },
				);
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
				await updateTypedRecord(
					runtime,
					{
						repoDid: callerDid,
						collection: COLLECTIONS.characterBranch,
						rkey: parseAtUri(input.characterBranchRef).rkey,
						value: nextRecord,
						createdAt: record.createdAt,
						updatedAt,
					},
					{ expectedCurrent: record },
				);
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

				try {
					await requireRecord(
						runtime,
						input.sessionRef,
						COLLECTIONS.session,
						"sessionRef",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-required-field",
							"sessionRef must reference an existing session",
						);
					}

					throw error;
				}
			}

			const currentSheet = await loadOptionalSheet(
				runtime,
				branch.value.sheetRef,
			);
			if (!currentSheet) {
				return rejected(
					"repair-needed",
					"current branch head sheet is missing; repair the branch before recording advancements",
				);
			}
			if (
				currentSheet.value.sheetSchemaPin &&
				!(await loadOptionalExactSchema(
					runtime,
					currentSheet.value.sheetSchemaPin,
					"sheetSchemaPin",
				))
			) {
				return rejected(
					"repair-needed",
					"current branch sheet schema pin is unresolved; repair the branch before recording advancements",
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
			const expectedScopeState = await runtime.store.getScopeStateToken(
				callerDid,
				[COLLECTIONS.characterAdvancement, COLLECTIONS.characterBranch],
			);

			try {
				await applyTypedWrites(
					runtime,
					[
						{
							kind: "create",
							draft: {
								repoDid: callerDid,
								collection: COLLECTIONS.characterAdvancement,
								rkey,
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
					{ expectedScopeState },
				);
			} catch (error) {
				if (isRecordConflictError(error)) {
					return rebaseNeeded(
						"characterBranch state changed during advancement",
					);
				}
				throw error;
			}

			return accepted([advancementRef]);
		},

		async recordConversion(
			callerDid: string,
			input: AppCeruliaCharacterRecordConversion.InputSchema,
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

			const sourceSheet = await loadOptionalSheet(
				runtime,
				branch.value.sheetRef,
			);
			if (!sourceSheet) {
				return rejected(
					"repair-needed",
					"current branch head sheet is missing; repair the branch before recording conversions",
				);
			}
			if (sourceSheet.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"branch sheet must belong to the caller",
				);
			}

			if (branch.value.revision !== input.expectedRevision) {
				return rebaseNeeded("characterBranch revision is stale");
			}

			if (
				areEquivalentCeruliaNsids(
					input.targetRulesetNsid,
					sourceSheet.value.rulesetNsid,
				)
			) {
				return rejected(
					"invalid-schema-link",
					"targetRulesetNsid must differ from the current sheet ruleset",
				);
			}

			let targetSchema: Awaited<ReturnType<typeof loadExactSchema>>;
			try {
				targetSchema = await loadExactSchema(
					runtime,
					input.targetSheetSchemaPin,
					"targetSheetSchemaPin",
				);
			} catch (error) {
				if (error instanceof ApiError && error.status === 404) {
					return rejected(
						"invalid-schema-link",
						"targetSheetSchemaPin must resolve an existing characterSheetSchema",
					);
				}

				throw error;
			}
			if (
				!areEquivalentCeruliaNsids(
					targetSchema.value.baseRulesetNsid,
					input.targetRulesetNsid,
				)
			) {
				return rejected(
					"invalid-schema-link",
					"targetSheetSchemaPin must match targetRulesetNsid",
				);
			}

			const advancements = (
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterAdvancement.Main>(
					runtime,
					COLLECTIONS.characterAdvancement,
					callerDid,
				)
			).filter((record) =>
				areEquivalentRecordUris(
					record.value.characterBranchRef,
					input.characterBranchRef,
				),
			);
			const conversions = (
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterConversion.Main>(
					runtime,
					COLLECTIONS.characterConversion,
					callerDid,
				)
			).filter((record) =>
				areEquivalentRecordUris(
					record.value.characterBranchRef,
					input.characterBranchRef,
				),
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
				return rebaseNeeded(
					"source branch state changed during materialization",
				);
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
			const conversionRef = `at://${callerDid}/${COLLECTIONS.characterConversion}/${conversionRkey}`;
			const sourceStateGuards = [
				branch,
				sourceSheet,
			] as StoredRecord<unknown>[];
			const targetSheet = {
				$type: COLLECTIONS.characterSheet,
				ownerDid: callerDid,
				sheetSchemaPin: input.targetSheetSchemaPin,
				rulesetNsid: input.targetRulesetNsid,
				displayName: sourceSheet.value.displayName,
				portraitBlob: sourceSheet.value.portraitBlob,
				profileSummary: sourceSheet.value.profileSummary,
				stats: convertedStats,
				version: 1,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCharacterSheet.Main;
			const targetSheetRecord = toStoredRecord({
				repoDid: callerDid,
				collection: COLLECTIONS.characterSheet,
				rkey: sheetRkey,
				value: targetSheet,
				createdAt,
				updatedAt: createdAt,
			});
			const targetSheetRef = targetSheetRecord.uri;
			const record = {
				$type: COLLECTIONS.characterConversion,
				characterBranchRef: input.characterBranchRef,
				sourceSheetPin: buildExactRecordPin(sourceSheet),
				sourceRulesetNsid: sourceSheet.value.rulesetNsid,
				targetSheetPin: buildExactRecordPin(targetSheetRecord),
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
					return rebaseNeeded(
						"source branch state changed during materialization",
					);
				}
				throw error;
			}

			return accepted([
				targetSheetRef,
				input.characterBranchRef,
				conversionRef,
			]);
		},

		async getHome(
			callerDid: string,
		): Promise<AppCeruliaCharacterGetHome.OutputSchema> {
			const branches =
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterBranch.Main>(
					runtime,
					COLLECTIONS.characterBranch,
					callerDid,
				);
			const sessions =
				await listRecordsByCollectionAlias<AppCeruliaCoreSession.Main>(
					runtime,
					COLLECTIONS.session,
					callerDid,
				);

			const recentSessions = await Promise.all(
				sortStoredRecordsDescending(
					sessions,
					(record) => record.value.playedAt,
				).map(async (record) =>
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
					$type: "app.cerulia.dev.character.getHome#branchListItem",
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
			const sheet = await loadOptionalSheet(runtime, branch.value.sheetRef);
			const advancements = (
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterAdvancement.Main>(
					runtime,
					COLLECTIONS.characterAdvancement,
					branch.repoDid,
				)
			).filter((record) =>
				areEquivalentRecordUris(record.value.characterBranchRef, branchRef),
			);
			const conversions = (
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterConversion.Main>(
					runtime,
					COLLECTIONS.characterConversion,
					branch.repoDid,
				)
			).filter((record) =>
				areEquivalentRecordUris(record.value.characterBranchRef, branchRef),
			);
			const sessions = (
				await listRecordsByCollectionAlias<AppCeruliaCoreSession.Main>(
					runtime,
					COLLECTIONS.session,
					branch.repoDid,
				)
			).filter((record) =>
				areEquivalentRecordUris(record.value.characterBranchRef, branchRef),
			);

			if (isOwnerReader(auth, branch.repoDid)) {
				return {
					branch: branch.value,
					sheet: sheet?.value,
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
						).map(async (record) => ({
							$type: "app.cerulia.dev.character.getBranchView#sessionListItem",
							sessionRef: record.uri,
							role: record.value.role,
							playedAt: record.value.playedAt,
							scenarioLabel: await resolveScenarioLabel(runtime, record.value),
							visibility: record.value.visibility,
						})),
					),
				};
			}

			if (!sheet) {
				return {
					branchSummary: {
						$type: "app.cerulia.dev.character.getBranchView#branchSummary",
						branchRef,
						branchLabel: branch.value.branchLabel,
						branchKind: branch.value.branchKind,
						visibility: branch.value.visibility,
						revision: branch.value.revision,
						updatedAt: branch.value.updatedAt,
					},
					recentSessionSummaries: await Promise.all(
						sortStoredRecordsDescending(
							sessions.filter((record) => record.value.visibility === "public"),
							(record) => record.value.playedAt,
						).map(async (record) => ({
							$type: "app.cerulia.dev.character.getBranchView#sessionSummary",
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
							$type:
								"app.cerulia.dev.character.getBranchView#advancementSummary",
							advancementRef: record.uri,
							advancementKind: record.value.advancementKind,
							effectiveAt: record.value.effectiveAt,
							sessionSummary: record.value.sessionRef
								? await (async () => {
										const session = sessions.find((sessionRecord) =>
											areEquivalentRecordUris(
												sessionRecord.uri,
												record.value.sessionRef,
											),
										);
										if (!session || session.value.visibility !== "public") {
											return undefined;
										}

										return {
											$type:
												"app.cerulia.dev.character.getBranchView#advancementSessionSummary",
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
						$type: "app.cerulia.dev.character.getBranchView#conversionSummary",
						sourceRulesetNsid: record.value.sourceRulesetNsid,
						targetRulesetNsid: record.value.targetRulesetNsid,
						convertedAt: record.value.convertedAt,
					})),
				};
			}

			const resolvedStats = await resolvedBranchStats(
				sheet.value,
				advancements,
				conversions,
			);
			let schema: Awaited<ReturnType<typeof loadOptionalExactSchema>> = null;
			try {
				schema = await loadOptionalExactSchema(
					runtime,
					sheet.value.sheetSchemaPin,
					"sheetSchemaPin",
				);
			} catch {
				schema = null;
			}
			const structuredStats = schema
				? flattenStructuredStats(schema.value.fieldDefs, resolvedStats)
				: undefined;

			return {
				branchSummary: {
					$type: "app.cerulia.dev.character.getBranchView#branchSummary",
					branchRef,
					branchLabel: branch.value.branchLabel,
					branchKind: branch.value.branchKind,
					visibility: branch.value.visibility,
					revision: branch.value.revision,
					updatedAt: branch.value.updatedAt,
				},
				sheetSummary: {
					$type: "app.cerulia.dev.character.getBranchView#sheetSummary",
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
					).map(async (record) => ({
						$type: "app.cerulia.dev.character.getBranchView#sessionSummary",
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
						$type: "app.cerulia.dev.character.getBranchView#advancementSummary",
						advancementRef: record.uri,
						advancementKind: record.value.advancementKind,
						effectiveAt: record.value.effectiveAt,
						sessionSummary: record.value.sessionRef
							? await (async () => {
									const session = sessions.find((sessionRecord) =>
										areEquivalentRecordUris(
											sessionRecord.uri,
											record.value.sessionRef,
										),
									);
									if (!session || session.value.visibility !== "public") {
										return undefined;
									}

									return {
										$type:
											"app.cerulia.dev.character.getBranchView#advancementSessionSummary",
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
					$type: "app.cerulia.dev.character.getBranchView#conversionSummary",
					sourceRulesetNsid: record.value.sourceRulesetNsid,
					targetRulesetNsid: record.value.targetRulesetNsid,
					convertedAt: record.value.convertedAt,
				})),
			};
		},
	};
}
