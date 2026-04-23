import type {
	AppCeruliaCoreSession,
	AppCeruliaSessionCreate,
	AppCeruliaSessionGetView,
	AppCeruliaSessionList,
	AppCeruliaSessionUpdate,
} from "@cerulia/protocol";
import { accepted, rejected } from "../ack.js";
import { COLLECTIONS } from "../constants.js";
import type { AuthContext } from "../auth.js";
import { isOwnerReader } from "../auth.js";
import { ApiError } from "../errors.js";
import type { ServiceRuntime } from "./runtime.js";
import {
	assertCredentialFreeUriList,
	areEquivalentRecordUris,
	createTypedRecord,
	getOptionalRecord,
	hasSameOwner,
	listRecordsByCollectionAlias,
	requireRecord,
	resolveScenarioLabel,
	updateTypedRecord,
} from "./shared.js";
import { paginate } from "../pagination.js";
import { parseAtUri } from "../refs.js";

function sessionSummary(
	sessionRef: string,
	session: AppCeruliaCoreSession.Main,
	scenarioLabel?: string,
): AppCeruliaSessionGetView.SessionSummary {
	return {
		$type: "app.cerulia.dev.session.getView#sessionSummary",
		sessionRef,
		role: session.role,
		playedAt: session.playedAt,
		scenarioLabel,
		hoLabel: session.hoLabel,
		hoSummary: session.hoSummary,
		outcomeSummary: session.outcomeSummary,
		visibility: session.visibility,
		externalArchiveUris: session.externalArchiveUris,
	};
}

export function createSessionService(runtime: ServiceRuntime) {
	return {
		async create(
			callerDid: string,
			input: AppCeruliaSessionCreate.InputSchema,
		) {
			const hasScenarioRef = Boolean(input.scenarioRef);
			const hasScenarioLabel = Boolean(input.scenarioLabel);

			if (hasScenarioRef === hasScenarioLabel) {
				return rejected(
					"invalid-exactly-one",
					"scenarioRef and scenarioLabel must be exactly one",
				);
			}

			if (input.role === "pl" && !input.characterBranchRef) {
				return rejected(
					"invalid-required-field",
					"role=pl requires characterBranchRef",
				);
			}

			if (
				input.characterBranchRef &&
				!hasSameOwner(input.characterBranchRef, callerDid)
			) {
				return rejected(
					"forbidden-owner-mismatch",
					"characterBranchRef must belong to the caller",
				);
			}

			if (input.scenarioRef) {
				try {
					await requireRecord(
						runtime,
						input.scenarioRef,
						COLLECTIONS.scenario,
						"scenarioRef",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-required-field",
							"scenarioRef must reference an existing scenario",
						);
					}

					throw error;
				}
			}

			if (input.characterBranchRef) {
				try {
					await requireRecord(
						runtime,
						input.characterBranchRef,
						COLLECTIONS.characterBranch,
						"characterBranchRef",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-required-field",
							"characterBranchRef must reference an existing characterBranch",
						);
					}

					throw error;
				}
			}

			if (input.campaignRef) {
				let campaign;
				try {
					campaign = await requireRecord(
						runtime,
						input.campaignRef,
						COLLECTIONS.campaign,
						"campaignRef",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-required-field",
							"campaignRef must reference an existing campaign",
						);
					}

					throw error;
				}
				if (campaign.repoDid !== callerDid) {
					return rejected(
						"forbidden-owner-mismatch",
						"campaignRef must belong to the caller",
					);
				}
			}

			const uriError = assertCredentialFreeUriList(
				input.externalArchiveUris,
				"externalArchiveUris",
			);
			if (uriError) {
				return rejected("invalid-public-uri", uriError);
			}

			const createdAt = runtime.now();
			const rkey = runtime.nextTid();
			const sessionRef = `at://${callerDid}/${COLLECTIONS.session}/${rkey}`;
			const record = {
				$type: COLLECTIONS.session,
				scenarioRef: input.scenarioRef,
				scenarioLabel: input.scenarioLabel,
				characterBranchRef: input.characterBranchRef,
				role: input.role,
				campaignRef: input.campaignRef,
				playedAt: input.playedAt,
				hoLabel: input.hoLabel,
				hoSummary: input.hoSummary,
				outcomeSummary: input.outcomeSummary,
				externalArchiveUris: input.externalArchiveUris,
				visibility: input.visibility ?? "draft",
				note: input.note,
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreSession.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.session,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([sessionRef]);
		},

		async update(
			callerDid: string,
			input: AppCeruliaSessionUpdate.InputSchema,
		) {
			const record = await requireRecord<AppCeruliaCoreSession.Main>(
				runtime,
				input.sessionRef,
				COLLECTIONS.session,
				"sessionRef",
			);

			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"sessionRef must belong to the caller",
				);
			}

			const nextScenarioRef =
				input.scenarioRef ??
				(input.scenarioLabel ? undefined : record.value.scenarioRef);
			const nextScenarioLabel =
				input.scenarioLabel ??
				(input.scenarioRef ? undefined : record.value.scenarioLabel);
			const nextRole = input.role ?? record.value.role;
			const nextCharacterBranchRef =
				input.characterBranchRef ?? record.value.characterBranchRef;
			const nextCampaignRef = input.campaignRef ?? record.value.campaignRef;
			const currentScenarioRefIsStale = Boolean(
				record.value.scenarioRef &&
					!(await getOptionalRecord(
						runtime,
						record.value.scenarioRef,
						COLLECTIONS.scenario,
						"scenarioRef",
					)),
			);
			const currentCampaignRefIsStale = Boolean(
				record.value.campaignRef &&
					!(await getOptionalRecord(
						runtime,
						record.value.campaignRef,
						COLLECTIONS.campaign,
						"campaignRef",
					)),
			);

			if (Boolean(nextScenarioRef) === Boolean(nextScenarioLabel)) {
				return rejected(
					"invalid-exactly-one",
					"updated session must include exactly one scenario identity",
				);
			}

			if (nextRole === "pl" && !nextCharacterBranchRef) {
				return rejected(
					"invalid-required-field",
					"role=pl requires characterBranchRef",
				);
			}

			if (
				nextCharacterBranchRef &&
				!hasSameOwner(nextCharacterBranchRef, callerDid)
			) {
				return rejected(
					"forbidden-owner-mismatch",
					"characterBranchRef must belong to the caller",
				);
			}

			if (
				currentScenarioRefIsStale &&
				areEquivalentRecordUris(nextScenarioRef, record.value.scenarioRef)
			) {
				return rejected(
					"repair-needed",
					"current scenarioRef is stale; replace it or switch to scenarioLabel before updating",
				);
			}

			if (
				currentCampaignRefIsStale &&
				areEquivalentRecordUris(nextCampaignRef, record.value.campaignRef)
			) {
				return rejected(
					"repair-needed",
					"current campaignRef is stale; replace it before updating",
				);
			}

			if (nextScenarioRef) {
				try {
					await requireRecord(
						runtime,
						nextScenarioRef,
						COLLECTIONS.scenario,
						"scenarioRef",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-required-field",
							"scenarioRef must reference an existing scenario",
						);
					}

					throw error;
				}
			}

			if (nextCharacterBranchRef) {
				try {
					await requireRecord(
						runtime,
						nextCharacterBranchRef,
						COLLECTIONS.characterBranch,
						"characterBranchRef",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-required-field",
							"characterBranchRef must reference an existing characterBranch",
						);
					}

					throw error;
				}
			}

			if (nextCampaignRef) {
				let campaign;
				try {
					campaign = await requireRecord(
						runtime,
						nextCampaignRef,
						COLLECTIONS.campaign,
						"campaignRef",
					);
				} catch (error) {
					if (error instanceof ApiError && error.status === 404) {
						return rejected(
							"invalid-required-field",
							"campaignRef must reference an existing campaign",
						);
					}

					throw error;
				}
				if (campaign.repoDid !== callerDid) {
					return rejected(
						"forbidden-owner-mismatch",
						"campaignRef must belong to the caller",
					);
				}
			}

			const uriError = assertCredentialFreeUriList(
				input.externalArchiveUris ?? record.value.externalArchiveUris,
				"externalArchiveUris",
			);
			if (uriError) {
				return rejected("invalid-public-uri", uriError);
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				scenarioRef: nextScenarioRef,
				scenarioLabel: nextScenarioLabel,
				characterBranchRef: nextCharacterBranchRef,
				role: nextRole,
				campaignRef: input.campaignRef ?? record.value.campaignRef,
				playedAt: input.playedAt ?? record.value.playedAt,
				hoLabel: input.hoLabel ?? record.value.hoLabel,
				hoSummary: input.hoSummary ?? record.value.hoSummary,
				outcomeSummary: input.outcomeSummary ?? record.value.outcomeSummary,
				externalArchiveUris:
					input.externalArchiveUris ?? record.value.externalArchiveUris,
				visibility: input.visibility ?? record.value.visibility,
				note: input.note ?? record.value.note,
				updatedAt,
			} satisfies AppCeruliaCoreSession.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.session,
				rkey: parseAtUri(input.sessionRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.sessionRef]);
		},

		async list(
			callerDid: string,
			limit: string | undefined,
			cursor: string | undefined,
		): Promise<AppCeruliaSessionList.OutputSchema> {
			const records =
				await listRecordsByCollectionAlias<AppCeruliaCoreSession.Main>(
					runtime,
					COLLECTIONS.session,
					callerDid,
				);
			const sorted = [...records].sort((left, right) => {
				if (left.value.playedAt !== right.value.playedAt) {
					return right.value.playedAt.localeCompare(left.value.playedAt);
				}

				return right.rkey.localeCompare(left.rkey);
			});

			const page = paginate(sorted, limit, cursor);
			const items = await Promise.all(
				page.items.map(
					async (record): Promise<AppCeruliaSessionList.SessionListItem> => ({
						$type: "app.cerulia.dev.session.list#sessionListItem",
						sessionRef: record.uri,
						role: record.value.role,
						playedAt: record.value.playedAt,
						scenarioLabel: await resolveScenarioLabel(runtime, record.value),
						characterBranchRef: record.value.characterBranchRef,
						visibility: record.value.visibility,
					}),
				),
			);

			return {
				items,
				cursor: page.cursor,
			};
		},

		async getView(
			auth: AuthContext,
			sessionRef: string,
		): Promise<AppCeruliaSessionGetView.OutputSchema> {
			const record = await requireRecord<AppCeruliaCoreSession.Main>(
				runtime,
				sessionRef,
				COLLECTIONS.session,
				"sessionRef",
			);
			const scenarioLabel = await resolveScenarioLabel(runtime, record.value);

			if (isOwnerReader(auth, record.repoDid)) {
				return {
					session: record.value,
				};
			}

			return {
				sessionSummary: sessionSummary(record.uri, record.value, scenarioLabel),
			};
		},
	};
}
