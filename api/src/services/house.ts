import type {
	AppCeruliaCoreCampaign,
	AppCeruliaCoreHouse,
	AppCeruliaCoreRuleProfile,
	AppCeruliaCoreSession,
	AppCeruliaHouseCreate,
	AppCeruliaHouseGetView,
	AppCeruliaHouseUpdate,
} from "@cerulia/protocol";
import { accepted, rejected } from "../ack.js";
import type { AuthContext } from "../auth.js";
import { isOwnerReader } from "../auth.js";
import { COLLECTIONS } from "../constants.js";
import { ApiError } from "../errors.js";
import { parseAtUri } from "../refs.js";
import { paginate } from "../pagination.js";
import type { StoredRecord } from "../store/types.js";
import type { ServiceRuntime } from "./runtime.js";
import {
	assertCredentialFreeUri,
	createTypedRecord,
	createUniqueSlugRkey,
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

async function validateDefaultRuleProfiles(
	runtime: ServiceRuntime,
	callerDid: string,
	refs: string[] | undefined,
): Promise<string | null> {
	if (!refs || refs.length === 0) {
		return null;
	}

	let baseRulesetNsid: string | undefined;
	for (const ref of refs) {
		let record: StoredRecord<AppCeruliaCoreRuleProfile.Main>;
		try {
			record = await requireRecord<AppCeruliaCoreRuleProfile.Main>(
				runtime,
				ref,
				COLLECTIONS.ruleProfile,
				"ruleProfileRef",
			);
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				return "defaultRuleProfileRefs must reference existing rule profiles";
			}

			throw error;
		}
		if (record.repoDid !== callerDid) {
			return "defaultRuleProfileRefs must belong to the caller";
		}

		baseRulesetNsid ??= record.value.baseRulesetNsid;
		if (record.value.baseRulesetNsid !== baseRulesetNsid) {
			return "defaultRuleProfileRefs must belong to a single ruleset family";
		}
	}

	return null;
}

export function createHouseService(runtime: ServiceRuntime) {
	return {
		async create(callerDid: string, input: AppCeruliaHouseCreate.InputSchema) {
			const uriError = assertCredentialFreeUri(
				input.externalCommunityUri,
				"externalCommunityUri",
			);
			if (uriError) {
				return rejected("invalid-public-uri", uriError);
			}

			const refsError = await validateDefaultRuleProfiles(
				runtime,
				callerDid,
				input.defaultRuleProfileRefs,
			);
			if (refsError) {
				return rejected("invalid-schema-link", refsError);
			}

			const createdAt = runtime.now();
			const rkey = await createUniqueSlugRkey(
				runtime,
				COLLECTIONS.house,
				callerDid,
				input.title,
			);
			const houseRef = `at://${callerDid}/${COLLECTIONS.house}/${rkey}`;
			const record = {
				$type: COLLECTIONS.house,
				houseId: rkey,
				title: input.title,
				canonSummary: input.canonSummary,
				defaultRuleProfileRefs: input.defaultRuleProfileRefs,
				policySummary: input.policySummary,
				externalCommunityUri: input.externalCommunityUri,
				visibility: input.visibility ?? "draft",
				createdAt,
				updatedAt: createdAt,
			} satisfies AppCeruliaCoreHouse.Main;

			await createTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.house,
				rkey,
				value: record,
				createdAt,
				updatedAt: createdAt,
			});

			return accepted([houseRef]);
		},

		async update(callerDid: string, input: AppCeruliaHouseUpdate.InputSchema) {
			const record = await requireRecord<AppCeruliaCoreHouse.Main>(
				runtime,
				input.houseRef,
				COLLECTIONS.house,
				"houseRef",
			);
			if (record.repoDid !== callerDid) {
				return rejected(
					"forbidden-owner-mismatch",
					"houseRef must belong to the caller",
				);
			}

			const uriError = assertCredentialFreeUri(
				input.externalCommunityUri ?? record.value.externalCommunityUri,
				"externalCommunityUri",
			);
			if (uriError) {
				return rejected("invalid-public-uri", uriError);
			}

			const nextRuleProfiles =
				input.defaultRuleProfileRefs ?? record.value.defaultRuleProfileRefs;
			const refsError = await validateDefaultRuleProfiles(
				runtime,
				callerDid,
				nextRuleProfiles,
			);
			if (refsError) {
				return rejected("invalid-schema-link", refsError);
			}

			const updatedAt = runtime.now();
			const nextRecord = {
				...record.value,
				title: input.title ?? record.value.title,
				canonSummary: input.canonSummary ?? record.value.canonSummary,
				defaultRuleProfileRefs: nextRuleProfiles,
				policySummary: input.policySummary ?? record.value.policySummary,
				externalCommunityUri:
					input.externalCommunityUri ?? record.value.externalCommunityUri,
				visibility: input.visibility ?? record.value.visibility,
				updatedAt,
			} satisfies AppCeruliaCoreHouse.Main;

			await updateTypedRecord(runtime, {
				repoDid: callerDid,
				collection: COLLECTIONS.house,
				rkey: parseAtUri(input.houseRef).rkey,
				value: nextRecord,
				createdAt: record.createdAt,
				updatedAt,
			});

			return accepted([input.houseRef]);
		},

		async getView(
			auth: AuthContext,
			houseRef: string,
		): Promise<AppCeruliaHouseGetView.OutputSchema> {
			const record = await requireRecord<AppCeruliaCoreHouse.Main>(
				runtime,
				houseRef,
				COLLECTIONS.house,
				"houseRef",
			);
			const campaigns = (
				await runtime.store.listRecords<AppCeruliaCoreCampaign.Main>(
					COLLECTIONS.campaign,
				)
			).filter(
				(campaign) =>
					campaign.repoDid === record.repoDid &&
					campaign.value.houseRef === houseRef,
			);
			const publicCampaigns = campaigns.filter(
				(campaign) => campaign.value.visibility === "public",
			);
			const campaignRefs = new Set(campaigns.map((campaign) => campaign.uri));
			const publicCampaignRefs = new Set(
				publicCampaigns.map((campaign) => campaign.uri),
			);
			const sessions = (
				await runtime.store.listRecords<AppCeruliaCoreSession.Main>(
					COLLECTIONS.session,
				)
			).filter(
				(session) =>
					session.repoDid === record.repoDid &&
					session.value.campaignRef &&
					campaignRefs.has(session.value.campaignRef),
			);

			if (isOwnerReader(auth, record.repoDid)) {
				return {
					house: record.value,
					campaigns: campaigns.map((campaign) => ({
						$type: "app.cerulia.house.getView#campaignListItem",
						campaignRef: campaign.uri,
						title: campaign.value.title,
						rulesetNsid: campaign.value.rulesetNsid,
						visibility: campaign.value.visibility,
						updatedAt: campaign.value.updatedAt,
					})),
					sessions: await Promise.all(
						sortSessionsByPlayedAt(sessions).map(async (session) => ({
							$type: "app.cerulia.house.getView#sessionListItem",
							sessionRef: session.uri,
							role: session.value.role,
							playedAt: session.value.playedAt,
							scenarioLabel: await resolveScenarioLabel(runtime, session.value),
							visibility: session.value.visibility,
						})),
					),
				};
			}

			return {
				houseSummary: {
					$type: "app.cerulia.house.getView#houseSummary",
					houseRef,
					title: record.value.title,
					visibility: record.value.visibility,
					canonSummary: record.value.canonSummary,
					externalCommunityUri: record.value.externalCommunityUri,
				},
				campaignSummaries: publicCampaigns.map((campaign) => ({
						$type: "app.cerulia.house.getView#campaignSummary",
						campaignRef: campaign.uri,
						title: campaign.value.title,
						rulesetNsid: campaign.value.rulesetNsid,
						visibility: campaign.value.visibility,
						updatedAt: campaign.value.updatedAt,
					})),
				sessionSummaries: await Promise.all(
					sortSessionsByPlayedAt(sessions)
						.filter(
							(session) => {
								const campaignRef = session.value.campaignRef;
								return (
									session.value.visibility === "public" &&
									campaignRef !== undefined &&
									publicCampaignRefs.has(campaignRef)
								);
							},
						)
						.map(async (session) => ({
							$type: "app.cerulia.house.getView#sessionSummary",
							sessionRef: session.uri,
							role: session.value.role,
							playedAt: session.value.playedAt,
							scenarioLabel: await resolveScenarioLabel(runtime, session.value),
							hoLabel: session.value.hoLabel,
							hoSummary: session.value.hoSummary,
							outcomeSummary: session.value.outcomeSummary,
						})),
				),
			};
		},
	};
}
