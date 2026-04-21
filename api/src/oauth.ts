import { AtprotoDohHandleResolver } from "@atproto-labs/handle-resolver";
import { createIdentityResolver } from "@atproto-labs/identity-resolver";
import { getPdsEndpoint, isValidDidDoc } from "@atproto/common-web";
import { Agent } from "@atproto/api";
import {
	OAuthClient,
	type OAuthSession,
	requestLocalLock,
} from "@atproto/oauth-client";
import { JoseKey } from "@atproto/jwk-jose";
import { WebcryptoKey } from "@atproto/jwk-webcrypto";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import type { ApiOAuthFeature } from "./app.js";
import { OAUTH_SCOPE } from "./constants.js";
import { ApiError } from "./errors.js";
import type { AgentProvider } from "./store/atproto.js";
import type {
	BrowserSessionStore,
	KnownRepoCatalog,
	OAuthSessionCatalog,
	SavedOAuthSessionStore,
	SavedOAuthStateStore,
} from "./store/oauth.js";
import {
	toOAuthSessionStore,
	toOAuthStateStore,
} from "./store/oauth.js";

interface SessionLike {
	did: string;
	signOut?: () => Promise<void>;
	tokenSet?: {
		scope?: string;
	};
	scope?: string;
}

interface BaseOAuthRuntimeOptions {
	publicBaseUrl: string;
	privateJwkJson: string;
	browserSessionStore: BrowserSessionStore;
	dohEndpoint?: string;
	clientName?: string;
	clientId?: string;
	redirectUri?: string;
	clientUri?: string;
	jwksUri?: string;
}

interface OAuthRuntimeClient {
	clientMetadata: Record<string, unknown>;
	jwks: Record<string, unknown>;
	authorize(input: string, options?: { state?: string }): Promise<URL>;
	callback(params: URLSearchParams): Promise<{
		session: OAuthSession;
		state: string | null;
	}>;
	restore(sub: string, refresh?: boolean | "auto"): Promise<OAuthSession>;
}

export interface BunOAuthRuntimeOptions extends BaseOAuthRuntimeOptions {
	knownRepoCatalog: KnownRepoCatalog;
	stateStore: SavedOAuthStateStore;
	sessionStore: SavedOAuthSessionStore & OAuthSessionCatalog;
	clientName?: string;
	clientId?: string;
	redirectUri?: string;
	clientUri?: string;
	jwksUri?: string;
}

export interface WorkerOAuthRuntimeOptions extends BaseOAuthRuntimeOptions {
	knownRepoCatalog: KnownRepoCatalog;
	stateStore: SavedOAuthStateStore;
	sessionStore: SavedOAuthSessionStore & OAuthSessionCatalog;
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

	if (url.pathname !== "/" && url.pathname !== "") {
		throw new ApiError(
			"InvalidRequest",
			"CERULIA_PUBLIC_BASE_URL must not include a path",
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

function buildClientMetadata(options: BaseOAuthRuntimeOptions) {
	const baseUrl = normalizeBaseUrl(options.publicBaseUrl);
	const baseHref = baseUrl.toString().replace(/\/+$/, "");
	const clientId = options.clientId ?? `${baseHref}/client-metadata.json`;
	const redirectUri = options.redirectUri ?? `${baseHref}/oauth/callback`;
	const clientUri = options.clientUri ?? baseHref;
	const jwksUri = options.jwksUri ?? `${baseHref}/jwks.json`;

	return {
		clientMetadata: {
			client_id: clientId,
			client_name: options.clientName ?? "Cerulia",
			client_uri: clientUri,
			redirect_uris: [redirectUri] as [string],
			grant_types: ["authorization_code", "refresh_token"] as [
				"authorization_code",
				"refresh_token",
			],
			response_types: ["code"] as ["code"],
			scope: OAUTH_SCOPE,
			application_type: "web" as const,
			token_endpoint_auth_method: "private_key_jwt" as const,
			token_endpoint_auth_signing_alg: "ES256" as const,
			dpop_bound_access_tokens: true,
			jwks_uri: jwksUri,
		},
	};
}

function createOAuthRuntimeBundle(
	client: OAuthRuntimeClient,
	browserSessionStore: BrowserSessionStore,
	sessionCatalog: OAuthSessionCatalog,
	knownRepoCatalog: KnownRepoCatalog,
	publicAgentLookup: NonNullable<AgentProvider["getPublicAgent"]>,
): {
	agentProvider: AgentProvider;
	oauthFeature: ApiOAuthFeature;
} {
	const agentProvider: AgentProvider = {
		async getAgent(repoDid: string) {
			const session = await client.restore(repoDid).catch(() => null);
			return session ? new Agent(session) : null;
		},
		async listRepoDids() {
			const repoDids = new Set(await knownRepoCatalog.listRepoDids());
			for (const subjectDid of await sessionCatalog.listSubjects()) {
				repoDids.add(subjectDid);
			}
			return [...repoDids].sort((left, right) => left.localeCompare(right));
		},
		getPublicAgent: publicAgentLookup,
		rememberRepoDid(repoDid: string) {
			return knownRepoCatalog.rememberRepoDid(repoDid);
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
				const grantedScope = extractGrantedScope(session);
				if (!grantedScope.split(/\s+/).includes("atproto")) {
					throw new ApiError(
						"Forbidden",
						"OAuth session must grant the atproto scope",
						403,
					);
				}

				const browserSession =
					await browserSessionStore.createBrowserSession(
						session.did,
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
				const binding = await browserSessionStore.getBrowserSession(sessionId);
				if (!binding) {
					return;
				}

				const session = await client.restore(binding.did).catch(() => null);
				if (session && typeof session.signOut === "function") {
					await session.signOut().catch(() => undefined);
				}

				await browserSessionStore.deleteBrowserSession(sessionId);
			},
			async getBrowserSession(sessionId: string) {
				const binding = await browserSessionStore.getBrowserSession(sessionId);
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

function createPublicAgentLookup(
	fetchImpl: typeof globalThis.fetch,
	dohEndpoint?: string,
): NonNullable<AgentProvider["getPublicAgent"]> {
	const identityResolver = createIdentityResolver({
		fetch: fetchImpl,
		handleResolver: new AtprotoDohHandleResolver({
			dohEndpoint: dohEndpoint ?? "https://cloudflare-dns.com/dns-query",
			fetch: fetchImpl,
		}),
	});

	return async (repoDid: string) => {
		const identity = await identityResolver.resolve(repoDid).catch(() => null);
		if (!identity || !isValidDidDoc(identity.didDoc)) {
			return null;
		}

		const pdsEndpoint = getPdsEndpoint(identity.didDoc);
		return pdsEndpoint
			? new Agent({
				service: pdsEndpoint,
				fetch: fetchImpl,
			})
			: null;
	};
}

export function createPublicAgentProvider(options: {
	knownRepoCatalog: KnownRepoCatalog;
	dohEndpoint?: string;
}): AgentProvider {
	const fetchImpl = globalThis.fetch.bind(globalThis);
	return {
		async getAgent() {
			return null;
		},
		listRepoDids() {
			return options.knownRepoCatalog.listRepoDids();
		},
		getPublicAgent: createPublicAgentLookup(fetchImpl, options.dohEndpoint),
		rememberRepoDid(repoDid: string) {
			return options.knownRepoCatalog.rememberRepoDid(repoDid);
		},
	};
}

function subtleDigestName(name: "sha256" | "sha384" | "sha512") {
	switch (name) {
		case "sha256":
			return "SHA-256";
		case "sha384":
			return "SHA-384";
		case "sha512":
			return "SHA-512";
	}
}

export async function createBunOAuthRuntime(
	options: BunOAuthRuntimeOptions,
) {
	const { clientMetadata } = buildClientMetadata(options);
	const key = await JoseKey.fromJWK(JSON.parse(options.privateJwkJson));
	const fetchImpl = globalThis.fetch.bind(globalThis);

	const client = new NodeOAuthClient({
		clientMetadata,
		keyset: [key],
		stateStore: options.stateStore,
		sessionStore: options.sessionStore,
	});

	return createOAuthRuntimeBundle(
		client,
		options.browserSessionStore,
		options.sessionStore,
		options.knownRepoCatalog,
		createPublicAgentLookup(fetchImpl, options.dohEndpoint),
	);
}

export async function createWorkerOAuthRuntime(
	options: WorkerOAuthRuntimeOptions,
) {
	const { clientMetadata } = buildClientMetadata(options);
	const key = await JoseKey.fromJWK(JSON.parse(options.privateJwkJson));
	const fetchImpl = globalThis.fetch.bind(globalThis);
	const client = new OAuthClient({
		responseMode: "query",
		clientMetadata,
		keyset: [key],
		stateStore: toOAuthStateStore(options.stateStore),
		sessionStore: toOAuthSessionStore(options.sessionStore),
		handleResolver: new AtprotoDohHandleResolver({
			dohEndpoint:
				options.dohEndpoint ?? "https://cloudflare-dns.com/dns-query",
			fetch: fetchImpl,
		}),
		runtimeImplementation: {
			requestLock: requestLocalLock,
			createKey: (algs) => WebcryptoKey.generate(algs),
			getRandomValues: (length) => crypto.getRandomValues(new Uint8Array(length)),
			digest: async (data, algorithm) =>
				new Uint8Array(
					await crypto.subtle.digest(
						subtleDigestName(algorithm.name),
						new Uint8Array(data),
					),
				),
		},
		fetch: fetchImpl,
	});

	return createOAuthRuntimeBundle(
		client,
		options.browserSessionStore,
		options.sessionStore,
		options.knownRepoCatalog,
		createPublicAgentLookup(fetchImpl, options.dohEndpoint),
	);
}