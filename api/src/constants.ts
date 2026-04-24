import { AUTH_SCOPE_IDS } from "@cerulia/protocol";

export const XRPC_PREFIX = "/xrpc";
export const OAUTH_SCOPE = "atproto transition:generic";

export const AUTH_SCOPES = AUTH_SCOPE_IDS;

export const COLLECTIONS = {
	characterSheet: "app.cerulia.dev.core.characterSheet",
	characterBranch: "app.cerulia.dev.core.characterBranch",
	characterAdvancement: "app.cerulia.dev.core.characterAdvancement",
	characterConversion: "app.cerulia.dev.core.characterConversion",
	playerProfile: "app.cerulia.dev.core.playerProfile",
	session: "app.cerulia.dev.core.session",
	campaign: "app.cerulia.dev.core.campaign",
	house: "app.cerulia.dev.core.house",
	scenario: "app.cerulia.dev.core.scenario",
	ruleProfile: "app.cerulia.dev.core.ruleProfile",
	characterSheetSchema: "app.cerulia.dev.core.characterSheetSchema",
	blueskyProfile: "app.bsky.actor.profile",
} as const;

export const SELF_RKEY = "self";
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export type CoreCollection = (typeof COLLECTIONS)[Exclude<
	keyof typeof COLLECTIONS,
	"blueskyProfile"
>];
