import { Agent } from "@atproto/api";
import { getPdsEndpoint, isValidDidDoc } from "@atproto/common-web";
import { isPubliclyRoutableIpLiteral, parseIpLiteral } from "@cerulia/protocol";
import { OAuthClient, requestLocalLock } from "@atproto/oauth-client";
import { JoseKey } from "@atproto/jwk-jose";
import { WebcryptoKey } from "@atproto/jwk-webcrypto";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { OAUTH_SCOPE } from "./constants.js";
import { ApiError } from "./errors.js";
import type { AgentProvider } from "./store/atproto.js";
import type {
	KnownRepoCatalog,
	OAuthSessionCatalog,
	SavedOAuthSessionStore,
	SavedOAuthStateStore,
} from "./store/oauth.js";
import { toOAuthSessionStore, toOAuthStateStore } from "./store/oauth.js";
import { createDidResolverWithFetch, DohHandleResolver } from "./identity.js";

type FetchLike = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<Response>;

interface BaseOAuthRuntimeOptions {
	publicBaseUrl: string;
	privateJwkJson: string;
	clientName?: string;
	clientId?: string;
	redirectUri?: string;
	clientUri?: string;
	jwksUri?: string;
}

interface OAuthRuntimeClient {
	restore(sub: string, refresh?: boolean | "auto"): Promise<Agent | null>;
}

export interface BunOAuthRuntimeOptions extends BaseOAuthRuntimeOptions {
	knownRepoCatalog: KnownRepoCatalog;
	stateStore: SavedOAuthStateStore;
	sessionStore: SavedOAuthSessionStore & OAuthSessionCatalog;
	publicAgentLookup?: NonNullable<AgentProvider["getPublicAgent"]>;
}

export interface WorkerOAuthRuntimeOptions extends BaseOAuthRuntimeOptions {
	knownRepoCatalog: KnownRepoCatalog;
	stateStore: SavedOAuthStateStore;
	sessionStore: SavedOAuthSessionStore & OAuthSessionCatalog;
	dohEndpoint?: string;
}

function normalizeBaseUrl(value: string): URL {
	const url = new URL(value);
	if (url.protocol !== "https:") {
		throw new ApiError(
			"InvalidRequest",
			"CERULIA_APPVIEW_PUBLIC_BASE_URL must use https",
			500,
		);
	}
	if (url.username || url.password) {
		throw new ApiError(
			"InvalidRequest",
			"CERULIA_APPVIEW_PUBLIC_BASE_URL must not include credentials",
			500,
		);
	}

	if (url.pathname !== "/" && url.pathname !== "") {
		throw new ApiError(
			"InvalidRequest",
			"CERULIA_APPVIEW_PUBLIC_BASE_URL must not include a path",
			500,
		);
	}

	url.pathname = url.pathname.replace(/\/+$/, "");
	url.search = "";
	url.hash = "";
	return url;
}

function assertSafePublicServiceUrl(rawUrl: string): URL {
	const url = new URL(rawUrl);
	const hostname = url.hostname.toLowerCase();
	if (url.protocol !== "https:") {
		throw new Error("PDS endpoint must use https");
	}
	if (url.username || url.password) {
		throw new Error("PDS endpoint must not include credentials");
	}
	if (url.pathname !== "/" && url.pathname !== "") {
		throw new Error("PDS endpoint must not include a path");
	}
	if (
		hostname === "localhost" ||
		hostname.endsWith(".internal") ||
		hostname.endsWith(".local") ||
		(!hostname.includes(".") && !hostname.includes(":"))
	) {
		throw new Error("PDS endpoint must not target a private or loopback host");
	}
	if (parseIpLiteral(hostname) && !isPubliclyRoutableIpLiteral(hostname)) {
		throw new Error("PDS endpoint must not target a private or loopback host");
	}

	url.pathname = "";
	url.search = "";
	url.hash = "";
	return url;
}

function createTimeoutFetch(
	fetchImpl: FetchLike,
	timeoutMs: number,
): FetchLike {
	return async (input, init) => {
		const abortController = new AbortController();
		const timeout = setTimeout(() => abortController.abort(), timeoutMs);
		try {
			return await fetchImpl(input, {
				...init,
				redirect: init?.redirect ?? "error",
				signal: abortController.signal,
			});
		} finally {
			clearTimeout(timeout);
		}
	};
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
	sessionCatalog: OAuthSessionCatalog,
	knownRepoCatalog: KnownRepoCatalog,
	publicAgentLookup: NonNullable<AgentProvider["getPublicAgent"]>,
): { agentProvider: AgentProvider } {
	const agentProvider: AgentProvider = {
		async getAgent(repoDid: string) {
			return client.restore(repoDid).catch(() => null);
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
	};
}

function createPublicAgentLookup(
	fetchImpl: FetchLike,
	resolveDidDoc: ((repoDid: string) => Promise<unknown | null>) | undefined,
): NonNullable<AgentProvider["getPublicAgent"]> {
	const timedFetch = createTimeoutFetch(fetchImpl, 1_500) as typeof fetch;
	const didResolver = resolveDidDoc
		? null
		: createDidResolverWithFetch({
				fetch: timedFetch,
				timeoutMs: 1_500,
			});

	return async (repoDid: string) => {
		const didDoc = resolveDidDoc
			? await resolveDidDoc(repoDid).catch(() => null)
			: ((await didResolver?.resolve(repoDid).catch(() => null)) ?? null);
		if (!didDoc || !isValidDidDoc(didDoc)) {
			return null;
		}

		const pdsEndpoint = getPdsEndpoint(didDoc);
		if (!pdsEndpoint) {
			return null;
		}

		let safePdsEndpoint: URL;
		try {
			safePdsEndpoint = assertSafePublicServiceUrl(pdsEndpoint);
		} catch {
			return null;
		}

		return new Agent({
			service: safePdsEndpoint.toString(),
			fetch: timedFetch,
		});
	};
}

export function createPublicAgentProvider(options: {
	knownRepoCatalog: KnownRepoCatalog;
	fetchImpl?: FetchLike;
	resolveDidDoc?: (repoDid: string) => Promise<unknown | null>;
}): AgentProvider {
	const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
	return {
		async getAgent() {
			return null;
		},
		listRepoDids() {
			return options.knownRepoCatalog.listRepoDids();
		},
		getPublicAgent: createPublicAgentLookup(
			fetchImpl,
			options.resolveDidDoc,
		),
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

export async function createBunOAuthRuntime(options: BunOAuthRuntimeOptions) {
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
		{
			async restore(sub, refresh = "auto") {
				const session = await client.restore(sub, refresh);
				return new Agent(session);
			},
		},
		options.sessionStore,
		options.knownRepoCatalog,
		options.publicAgentLookup ??
			createPublicAgentLookup(fetchImpl, undefined),
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
		handleResolver: new DohHandleResolver({
			dohEndpoint: options.dohEndpoint,
			fetch: fetchImpl,
		}),
		runtimeImplementation: {
			requestLock: requestLocalLock,
			createKey: (algs) => WebcryptoKey.generate(algs),
			getRandomValues: (length) =>
				crypto.getRandomValues(new Uint8Array(length)),
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
		{
			async restore(sub, refresh = "auto") {
				const session = await client.restore(sub, refresh);
				return new Agent(session);
			},
		},
		options.sessionStore,
		options.knownRepoCatalog,
		createPublicAgentLookup(fetchImpl, undefined),
	);
}
