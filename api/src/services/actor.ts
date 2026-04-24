import type {
	AppCeruliaActorGetProfileView,
	AppCeruliaActorUpdateProfile,
	AppCeruliaCoreCharacterBranch,
	AppCeruliaCoreCharacterSheet,
	AppCeruliaCorePlayerProfile,
} from "@cerulia/protocol";
import { accepted, rejected } from "../ack.js";
import type { AuthContext } from "../auth.js";
import { isOwnerReader } from "../auth.js";
import { COLLECTIONS, SELF_RKEY } from "../constants.js";
import { parseAtUri } from "../refs.js";
import { isCredentialFreeUri } from "../uri-policy.js";
import type { ServiceRuntime } from "./runtime.js";
import {
	assertCredentialFreeUri,
	blobBelongsToCaller,
	createTypedRecord,
	getRecordByUriAlias,
	listRecordsByCollectionAlias,
	loadOptionalSheet,
	loadBlueskyProfile,
	requireRecord,
	updateTypedRecord,
} from "./shared.js";

function composeProfileSummary(
	did: string,
	profile: AppCeruliaCorePlayerProfile.Main | undefined,
	fallback: Awaited<ReturnType<typeof loadBlueskyProfile>>,
): AppCeruliaActorGetProfileView.ProfileSummary {
	const website = profile?.websiteOverride ?? fallback?.website;
	return {
		$type: "app.cerulia.dev.actor.getProfileView#profileSummary",
		did,
		displayName: profile?.displayNameOverride ?? fallback?.displayName,
		description: profile?.descriptionOverride ?? fallback?.description,
		avatar: profile?.avatarOverrideBlob ?? fallback?.avatar,
		banner: profile?.bannerOverrideBlob ?? fallback?.banner,
		website: website && isCredentialFreeUri(website) ? website : undefined,
		pronouns: profile?.pronounsOverride ?? fallback?.pronouns,
		roleDistribution: profile?.roleDistribution,
		playFormats: profile?.playFormats,
		tools: profile?.tools,
		ownedRulebooks: profile?.ownedRulebooks,
		playableTimeSummary: profile?.playableTimeSummary,
		preferredScenarioStyles: profile?.preferredScenarioStyles,
		playStyles: profile?.playStyles,
		boundaries: profile?.boundaries,
		skills: profile?.skills,
	};
}

export function createActorService(runtime: ServiceRuntime) {
	return {
		async updateProfile(
			callerDid: string,
			input: AppCeruliaActorUpdateProfile.InputSchema,
		) {
			if (input.blueskyProfileRef) {
				const parsed = parseAtUri(input.blueskyProfileRef);
				if (
					parsed.repoDid !== callerDid ||
					parsed.collection !== COLLECTIONS.blueskyProfile ||
					parsed.rkey !== SELF_RKEY
				) {
					return rejected(
						"forbidden-owner-mismatch",
						"blueskyProfileRef must point to the caller profile",
					);
				}
			}

			const websiteError = assertCredentialFreeUri(
				input.websiteOverride,
				"websiteOverride",
			);
			if (websiteError) {
				return rejected("invalid-public-uri", websiteError);
			}

			if (
				!(await blobBelongsToCaller(
					runtime,
					callerDid,
					input.avatarOverrideBlob,
				))
			) {
				return rejected(
					"invalid-required-field",
					"avatarOverrideBlob must belong to the caller repo",
				);
			}

			if (
				!(await blobBelongsToCaller(
					runtime,
					callerDid,
					input.bannerOverrideBlob,
				))
			) {
				return rejected(
					"invalid-required-field",
					"bannerOverrideBlob must belong to the caller repo",
				);
			}

			const profileRef = `at://${callerDid}/${COLLECTIONS.playerProfile}/${SELF_RKEY}`;
			const existing =
				await getRecordByUriAlias<AppCeruliaCorePlayerProfile.Main>(
					runtime,
					profileRef,
				);
			const createdAt = existing?.createdAt ?? runtime.now();
			const updatedAt = runtime.now();
			const record = {
				$type: COLLECTIONS.playerProfile,
				ownerDid: callerDid,
				blueskyProfileRef:
					input.blueskyProfileRef ?? existing?.value.blueskyProfileRef,
				displayNameOverride:
					input.displayNameOverride ?? existing?.value.displayNameOverride,
				descriptionOverride:
					input.descriptionOverride ?? existing?.value.descriptionOverride,
				avatarOverrideBlob:
					input.avatarOverrideBlob ?? existing?.value.avatarOverrideBlob,
				bannerOverrideBlob:
					input.bannerOverrideBlob ?? existing?.value.bannerOverrideBlob,
				websiteOverride:
					input.websiteOverride ?? existing?.value.websiteOverride,
				pronounsOverride:
					input.pronounsOverride ?? existing?.value.pronounsOverride,
				roleDistribution:
					input.roleDistribution ?? existing?.value.roleDistribution,
				playFormats: input.playFormats ?? existing?.value.playFormats,
				tools: input.tools ?? existing?.value.tools,
				ownedRulebooks: input.ownedRulebooks ?? existing?.value.ownedRulebooks,
				playableTimeSummary:
					input.playableTimeSummary ?? existing?.value.playableTimeSummary,
				preferredScenarioStyles:
					input.preferredScenarioStyles ??
					existing?.value.preferredScenarioStyles,
				playStyles: input.playStyles ?? existing?.value.playStyles,
				boundaries: input.boundaries ?? existing?.value.boundaries,
				skills: input.skills ?? existing?.value.skills,
				createdAt,
				updatedAt,
			} satisfies AppCeruliaCorePlayerProfile.Main;

			if (existing) {
				await updateTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.playerProfile,
					rkey: SELF_RKEY,
					value: record,
					createdAt,
					updatedAt,
				});
			} else {
				await createTypedRecord(runtime, {
					repoDid: callerDid,
					collection: COLLECTIONS.playerProfile,
					rkey: SELF_RKEY,
					value: record,
					createdAt,
					updatedAt,
				});
			}

			return accepted([profileRef]);
		},

		async getProfileView(
			auth: AuthContext,
			did: string,
		): Promise<AppCeruliaActorGetProfileView.OutputSchema> {
			const profileRef = `at://${did}/${COLLECTIONS.playerProfile}/${SELF_RKEY}`;
			const profileRecord =
				await getRecordByUriAlias<AppCeruliaCorePlayerProfile.Main>(
					runtime,
					profileRef,
				);
			const fallback = await loadBlueskyProfile(
				runtime,
				did,
				profileRecord?.value.blueskyProfileRef,
			);

			const branches =
				await listRecordsByCollectionAlias<AppCeruliaCoreCharacterBranch.Main>(
					runtime,
					COLLECTIONS.characterBranch,
					did,
				);
			const publicBranches = (
				await Promise.all(
					branches
						.filter((branch) => branch.value.visibility === "public")
						.map(
							async (
								branch,
							): Promise<AppCeruliaActorGetProfileView.BranchLink | null> => {
								const sheet = await loadOptionalSheet(
									runtime,
									branch.value.sheetRef,
								);
								if (!sheet) {
									return null;
								}

								return {
									$type: "app.cerulia.dev.actor.getProfileView#branchLink",
									characterBranchRef: branch.uri,
									displayName: sheet.value.displayName,
									branchLabel: branch.value.branchLabel,
									rulesetNsid: sheet.value.rulesetNsid,
								};
							},
						),
				)
			).filter(
				(branch): branch is AppCeruliaActorGetProfileView.BranchLink =>
					branch !== null,
			);

			if (isOwnerReader(auth, did)) {
				return {
					profile: profileRecord?.value,
					blueskyFallbackProfile: fallback
						? {
								$type: "app.cerulia.dev.actor.getProfileView#fallbackProfile",
								displayName: fallback.displayName,
								description: fallback.description,
								avatar: fallback.avatar,
								banner: fallback.banner,
								website: fallback.website,
								pronouns: fallback.pronouns,
							}
						: undefined,
					publicBranches,
				};
			}

			return {
				profileSummary: composeProfileSummary(
					did,
					profileRecord?.value,
					fallback,
				),
				publicBranches,
			};
		},
	};
}
