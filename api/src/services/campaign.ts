import type {
	AppCeruliaCampaignCreate,
	AppCeruliaCampaignGetView,
	AppCeruliaCampaignUpdate,
	AppCeruliaCoreCampaign,
	AppCeruliaCoreRuleProfile,
	AppCeruliaCoreSession,
} from "@cerulia/protocol";
import { accepted, rejected } from "../ack.js";
import type { AuthContext } from "../auth.js";
import { isOwnerReader } from "../auth.js";
import { COLLECTIONS } from "../constants.js";
import { parseAtUri } from "../refs.js";
import type { StoredRecord } from "../store/types.js";
import type { ServiceRuntime } from "./runtime.js";
import {
	createTypedRecord,
	createUniqueSlugRkey,
	getOptionalRecord,
	requireRecord,
	resolveScenarioLabel,
	updateTypedRecord,
} from "./shared.js";

function sortSessionsByPlayedAt(
	sessions: StoredRecord<AppCeruliaCoreSession.Main>[],
) {
	return [...sessions].sort((left, right) => {
		if (left.value.playedAt !== right.value.playedAt) {
			return right.value.playedAt.localeCompare(left.value.playedAt);
		}

		return right.rkey.localeCompare(left.rkey);
	});
}

async function validateRuleProfileRefs(
	runtime: ServiceRuntime,
	callerDid: string,
	refs: string[] | undefined,
	rulesetNsid: string,
): Promise<string | null> {
	if (!refs) {
		return null;
	}

	for (const ref of refs) {
		const record = await requireRecord<AppCeruliaCoreRuleProfile.Main>(
			runtime,
			ref,
			COLLECTIONS.ruleProfile,
			"ruleProfileRef",
		);

		if (record.repoDid !== callerDid) {
			return "sharedRuleProfileRefs must belong to the caller";
		}

		if (record.value.baseRulesetNsid !== rulesetNsid) {
			return "sharedRuleProfileRefs must match campaign.rulesetNsid";
		}
	}

	return null;
}

export function createCampaignService(runtime: ServiceRuntime) {
	return {
		async create(
			callerDid: string,
			input: AppCeruliaCampaignCreate.InputSchema,
		) {
			let seededRuleProfiles = input.sharedRuleProfileRefs;
			if (input.houseRef) {
				const house = await requireRecord<{
					defaultRuleProfileRefs?: string[];
				}>(runtime, input.houseRef, COLLECTIONS.house, "houseRef");
				if (house.repoDid !== callerDid) {
					return rejected(
						"forbidden-owner-mismatch",
						"houseRef must belong to the caller",
					);
				}

				if (!seededRuleProfiles) {
					seededRuleProfiles = house.value.defaultRuleProfileRefs;
				}
			}

			const refsError = await validateRuleProfileRefs(
				runtime,
				callerDid,
				seededRuleProfiles,
				input.rulesetNsid,
			);
			if (refsError) {
				return rejected("invalid-schema-link", refsError);
			}

			const createdAt = runtime.now();
			const rkey = await createUniqueSlugRkey(
				runtime,
				COLLECTIONS.campaign,
				callerDid,
				input.title,
			);
			const campaignRef = `at://${callerDid}/${COLLECTIONS.campaign}/${rkey}`;
			const record = {
				$type: COLLECTIONS.campaign,
				campaignId: rkey,
				title: input.title,
				houseRef: input.houseRef,
				rulesetNsid: input.rulesetNsid,
				sharedRuleProfileRefs: seededRuleProfiles,
				visibility: input.visibility ?? "draft",
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreCampaign.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.campaign,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([campaignRef]);
		},

		async update(
			callerDid: string,
			input: AppCeruliaCampaignUpdate.InputSchema,
		) {
			const record = await requireRecord<AppCeruliaCoreCampaign.Main>(
				runtime,
				input.campaignRef,
				COLLECTIONS.campaign,
				"campaignRef",
			);
			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"campaignRef must belong to the caller",
				);
			}

			if (
				record.value.archivedAt &&
				(input.title !== undefined ||
					input.houseRef !== undefined ||
					input.rulesetNsid !== undefined ||
					input.sharedRuleProfileRefs !== undefined ||
					input.visibility !== undefined)
			) {
				return rejected(
					"terminal-state-readonly",
					"archived campaigns are read-only",
				);
			}

			const nextHouseRef = input.houseRef ?? record.value.houseRef;
			if (nextHouseRef) {
				const house = await requireRecord(
					runtime,
					nextHouseRef,
					COLLECTIONS.house,
					"houseRef",
				);
				if (house.repoDid !== callerDid) {
					return rejected(
						"forbidden-owner-mismatch",
						"houseRef must belong to the caller",
					);
				}
			}

			const nextRulesetNsid = input.rulesetNsid ?? record.value.rulesetNsid;
			const nextRuleProfiles =
				input.sharedRuleProfileRefs ?? record.value.sharedRuleProfileRefs;
			const refsError = await validateRuleProfileRefs(
				runtime,
				callerDid,
				nextRuleProfiles,
				nextRulesetNsid,
			);
			if (refsError) {
				return rejected("invalid-schema-link", refsError);
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				title: input.title ?? record.value.title,
				houseRef: nextHouseRef,
				rulesetNsid: nextRulesetNsid,
				sharedRuleProfileRefs: nextRuleProfiles,
				visibility: input.visibility ?? record.value.visibility,
				archivedAt: input.archivedAt ?? record.value.archivedAt,
				updatedAt,
			} satisfies AppCeruliaCoreCampaign.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.campaign,
				rkey: parseAtUri(input.campaignRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.campaignRef]);
		},

		async getView(
			auth: AuthContext,
			campaignRef: string,
		): Promise<AppCeruliaCampaignGetView.OutputSchema> {
			const record = await requireRecord<AppCeruliaCoreCampaign.Main>(
				runtime,
				campaignRef,
				COLLECTIONS.campaign,
				"campaignRef",
			);
			const sessions = (
				await runtime.store.listRecords<AppCeruliaCoreSession.Main>(
					COLLECTIONS.session,
				)
			).filter((session) => session.value.campaignRef === campaignRef);
			const ruleOverlay = (await Promise.all(
				(record.value.sharedRuleProfileRefs ?? []).map((ref) =>
					getOptionalRecord<AppCeruliaCoreRuleProfile.Main>(
						runtime,
						ref,
						COLLECTIONS.ruleProfile,
						"ruleProfileRef",
					),
				),
			)).filter(
				(entry): entry is StoredRecord<AppCeruliaCoreRuleProfile.Main> =>
					entry !== null,
			);

			if (isOwnerReader(auth, record.repoDid)) {
				return {
					campaign: record.value,
					sessions: await Promise.all(
						sortSessionsByPlayedAt(sessions).map(async (session) => ({
							$type: "app.cerulia.campaign.getView#sessionListItem",
							sessionRef: session.uri,
							role: session.value.role,
							playedAt: session.value.playedAt,
							scenarioLabel: await resolveScenarioLabel(runtime, session.value),
							characterBranchRef: session.value.characterBranchRef,
							visibility: session.value.visibility,
						})),
					),
					ruleOverlay: ruleOverlay.map((entry) => entry.value),
				};
			}

			return {
				campaignSummary: {
					$type: "app.cerulia.campaign.getView#campaignSummary",
					campaignRef,
					title: record.value.title,
					rulesetNsid: record.value.rulesetNsid,
					visibility: record.value.visibility,
					updatedAt: record.value.updatedAt,
				},
				sessionSummaries: await Promise.all(
					sortSessionsByPlayedAt(sessions)
						.filter((session) => session.value.visibility === "public")
						.map(async (session) => ({
							$type: "app.cerulia.campaign.getView#sessionSummary",
							sessionRef: session.uri,
							role: session.value.role,
							playedAt: session.value.playedAt,
							scenarioLabel: await resolveScenarioLabel(runtime, session.value),
							hoLabel: session.value.hoLabel,
							hoSummary: session.value.hoSummary,
							outcomeSummary: session.value.outcomeSummary,
						})),
				),
				ruleOverlaySummary: {
					$type: "app.cerulia.campaign.getView#ruleOverlaySummary",
					ruleProfiles: ruleOverlay.map((entry) => ({
						$type: "app.cerulia.campaign.getView#ruleProfileLink",
						ruleProfileRef: entry.uri,
						profileTitle: entry.value.profileTitle,
					})),
				},
			};
		},
	};
}
