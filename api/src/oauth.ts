import { Agent } from "@atproto/api";
import { JoseKey, NodeOAuthClient } from "@atproto/oauth-client-node";
import { OAUTH_SCOPE } from "./constants.js";
import { ApiError } from "./errors.js";
import type { AgentProvider } from "./store/atproto.js";
import type {
	BrowserSessionStore,
	OAuthSessionCatalog,
} from "./store/oauth.js";
import type {
	NodeSavedSessionStore,
	NodeSavedStateStore,
} from "@atproto/oauth-client-node";

interface SessionLike {
	did: string;
	signOut?: () => Promise<void>;
	tokenSet?: {
		scope?: string;
	};
	scope?: string;
}

export interface BunOAuthRuntimeOptions {
	publicBaseUrl: string;
	privateJwkJson: string;
	stateStore: NodeSavedStateStore;
	sessionStore: NodeSavedSessionStore & OAuthSessionCatalog;
	browserSessionStore: BrowserSessionStore;
	clientName?: string;
	clientId?: string;
	redirectUri?: string;
	clientUri?: string;
	jwksUri?: string;
}

function normalizeBaseUrl(value: string): URL {
	const url = new URL(value);
	if (url.protocol !== "https:") {
		throw new ApiError(
			"InvalidRequest",
			"CERULIA_PUBLIC_BASE_URL must use https",
			500,
		);
	}

	url.pathname = url.pathname.replace(/\/+$/, "");
	url.search = "";
	url.hash = "";
	return url;
}

function extractGrantedScope(session: SessionLike): string {
	return session.tokenSet?.scope ?? session.scope ?? OAUTH_SCOPE;
}

export async function createBunOAuthRuntime(
	options: BunOAuthRuntimeOptions,
) {
	const baseUrl = normalizeBaseUrl(options.publicBaseUrl);
	const clientId =
		options.clientId ?? `${baseUrl.toString()}/client-metadata.json`;
	const redirectUri =
		options.redirectUri ?? `${baseUrl.toString()}/oauth/callback`;
	const clientUri = options.clientUri ?? baseUrl.toString();
	const jwksUri = options.jwksUri ?? `${baseUrl.toString()}/jwks.json`;
	const key = await JoseKey.fromJWK(JSON.parse(options.privateJwkJson));

	const client = new NodeOAuthClient({
		clientMetadata: {
			client_id: clientId,
			client_name: options.clientName ?? "Cerulia",
			client_uri: clientUri,
			redirect_uris: [redirectUri],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			scope: OAUTH_SCOPE,
			application_type: "web",
			token_endpoint_auth_method: "private_key_jwt",
			token_endpoint_auth_signing_alg: "ES256",
			dpop_bound_access_tokens: true,
			jwks_uri: jwksUri,
		},
		keyset: [key],
		stateStore: options.stateStore,
		sessionStore: options.sessionStore,
	});

	const agentProvider: AgentProvider = {
		async getAgent(repoDid: string) {
			const session = await client.restore(repoDid).catch(() => null);
			return session ? new Agent(session) : null;
		},
		async listRepoDids() {
			return options.sessionStore.listSubjects();
		},
	};

	return {
		agentProvider,
		oauthFeature: {
			clientMetadata: client.clientMetadata,
			jwks: client.jwks,
			async beginLogin(identifier: string, returnTo: string) {
					const url = await client.authorize(identifier, {
					state: returnTo,
				});
					return url.toString();
			},
			async finishLogin(params: URLSearchParams) {
				const { session, state } = await client.callback(params);
				const grantedScope = extractGrantedScope(session as SessionLike);
				if (!grantedScope.split(/\s+/).includes("atproto")) {
					throw new ApiError(
						"Forbidden",
						"OAuth session must grant the atproto scope",
						403,
					);
				}

				const browserSession =
					await options.browserSessionStore.createBrowserSession(
						(session as SessionLike).did,
						grantedScope,
					);

				return {
					sessionId: browserSession.sessionId,
					did: browserSession.did,
					grantedScope,
					returnTo: state ?? null,
				};
			},
			async signOut(sessionId: string) {
				const binding =
					await options.browserSessionStore.getBrowserSession(sessionId);
				if (!binding) {
					return;
				}

				const session = await client.restore(binding.did).catch(() => null);
				if (session && typeof (session as SessionLike).signOut === "function") {
					await (session as SessionLike).signOut?.().catch(() => undefined);
				}

				await options.browserSessionStore.deleteBrowserSession(sessionId);
			},
			async getBrowserSession(sessionId: string) {
				const binding =
					await options.browserSessionStore.getBrowserSession(sessionId);
				return binding
					? {
						did: binding.did,
						grantedScope: binding.grantedScope,
					}
					: null;
			},
		},
	};
}