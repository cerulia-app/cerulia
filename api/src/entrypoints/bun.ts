import { createApiApp, type ApiAppStore } from "../app.js";
import {
	createAnonymousAuthContext,
	resolveInternalServiceAuthContext,
	resolveHeaderAuthContext,
} from "../auth.js";
import type { AuthResolver } from "../auth.js";
import { createBunOAuthRuntime } from "../oauth.js";
import {
	createPublicAgentProvider,
	createNodePublicAgentLookup,
} from "../public-agent-node.js";
import { AtprotoMirrorRecordStore } from "../store/atproto.js";
import {
	createBunSqliteDriver,
	createBunSqliteStore,
} from "../store/bun-sqlite.js";
import { createProjectionIngestFeature } from "../projection.js";
import { createSqlOauthStores } from "../store/oauth.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const dbPath = process.env.CERULIA_API_DB ?? "./cerulia-api.sqlite";

const cacheStore = createBunSqliteStore(dbPath);
const driver = createBunSqliteDriver(dbPath);
const oauthStores = createSqlOauthStores(driver);
const publicAgentLookup = createNodePublicAgentLookup(
	process.env.CERULIA_DOH_ENDPOINT,
);
const publicAgentProvider = createPublicAgentProvider({
	knownRepoCatalog: oauthStores.knownRepoCatalog,
	dohEndpoint: process.env.CERULIA_DOH_ENDPOINT,
});
const publicBaseUrl = process.env.CERULIA_APPVIEW_PUBLIC_BASE_URL;
const privateJwkJson = process.env.CERULIA_OAUTH_PRIVATE_JWK;
const internalAuthSecret = process.env.CERULIA_APPVIEW_INTERNAL_AUTH_SECRET;
const allowHeaderShim = process.env.CERULIA_ENABLE_HEADER_AUTH_SHIM === "1";
const listenHostname = allowHeaderShim ? "127.0.0.1" : process.env.HOST;
const projectionBaseUrl = process.env.CERULIA_PROJECTION_INTERNAL_BASE_URL;
const projectionIngestToken =
	process.env.CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN;

if (
	Boolean(publicBaseUrl) ||
	Boolean(privateJwkJson) ||
	Boolean(internalAuthSecret)
) {
	if (!(publicBaseUrl && privateJwkJson && internalAuthSecret)) {
	throw new Error(
		"CERULIA_APPVIEW_PUBLIC_BASE_URL, CERULIA_OAUTH_PRIVATE_JWK, and CERULIA_APPVIEW_INTERNAL_AUTH_SECRET must be configured together",
	);
	}
}

if (Boolean(projectionBaseUrl) !== Boolean(projectionIngestToken)) {
	throw new Error(
		"CERULIA_PROJECTION_INTERNAL_BASE_URL and CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN must be configured together",
	);
}

let store: ApiAppStore = new AtprotoMirrorRecordStore(
	cacheStore,
	publicAgentProvider,
);
let authResolver: AuthResolver = () => createAnonymousAuthContext();
const projectionIngestFeature =
	projectionBaseUrl && projectionIngestToken
		? createProjectionIngestFeature({
				baseUrl: projectionBaseUrl,
				knownRepoCatalog: oauthStores.knownRepoCatalog,
				token: projectionIngestToken,
			})
		: undefined;

if (projectionIngestFeature) {
	const replayProjectionIngest = () => {
		void projectionIngestFeature.replayKnownRepoDids().catch(() => undefined);
	};

	replayProjectionIngest();
	const replayTimer = setInterval(replayProjectionIngest, 30_000);
	replayTimer.unref?.();
}

if (publicBaseUrl && privateJwkJson) {
	const oauthRuntime = await createBunOAuthRuntime({
		publicBaseUrl,
		privateJwkJson,
		knownRepoCatalog: oauthStores.knownRepoCatalog,
		stateStore: oauthStores.stateStore,
		sessionStore: oauthStores.sessionStore,
		publicAgentLookup,
		clientName: process.env.CERULIA_OAUTH_CLIENT_NAME,
		dohEndpoint: process.env.CERULIA_DOH_ENDPOINT,
	});
	store = new AtprotoMirrorRecordStore(cacheStore, oauthRuntime.agentProvider);
}

if (internalAuthSecret) {
	authResolver = async (request) => {
		const internalAuth = await resolveInternalServiceAuthContext(request, {
			sharedSecret: internalAuthSecret,
		});
		if (internalAuth) {
			return internalAuth;
		}

		return allowHeaderShim
			? resolveHeaderAuthContext(request)
			: createAnonymousAuthContext();
	};
} else if (allowHeaderShim) {
	authResolver = resolveHeaderAuthContext;
}

const app = createApiApp({
	store,
	authResolver,
	internalOauthSessionFeature:
		publicBaseUrl && privateJwkJson && internalAuthSecret
			? {
				async upsertSession(did, session) {
					await oauthStores.sessionStore.set(did, session as never);
					await oauthStores.knownRepoCatalog.rememberRepoDid(did);
				},
				deleteSession(did) {
					return oauthStores.sessionStore.del(did);
				},
			}
			: undefined,
	projectionIngestFeature,
});

Bun.serve({
	hostname: listenHostname,
	port,
	fetch: app.fetch,
});

console.log(
	`cerulia-api listening on http://${listenHostname ?? "localhost"}:${port}`,
);
