import {
	createApiApp,
	type ApiAppStore,
	type ApiOAuthFeature,
} from "../app.js";
import {
	createAnonymousAuthContext,
	createSessionAuthResolver,
	resolveHeaderAuthContext,
} from "../auth.js";
import type { AuthResolver } from "../auth.js";
import { createBunOAuthRuntime, createPublicAgentProvider } from "../oauth.js";
import { AtprotoMirrorRecordStore } from "../store/atproto.js";
import {
	createBunSqliteDriver,
	createBunSqliteStore,
} from "../store/bun-sqlite.js";
import { createSqlOauthStores } from "../store/oauth.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const dbPath = process.env.CERULIA_API_DB ?? "./cerulia-api.sqlite";

const cacheStore = createBunSqliteStore(dbPath);
const driver = createBunSqliteDriver(dbPath);
const oauthStores = createSqlOauthStores(driver);
const publicAgentProvider = createPublicAgentProvider({
	knownRepoCatalog: oauthStores.knownRepoCatalog,
	dohEndpoint: process.env.CERULIA_DOH_ENDPOINT,
});
const publicBaseUrl = process.env.CERULIA_PUBLIC_BASE_URL;
const privateJwkJson = process.env.CERULIA_OAUTH_PRIVATE_JWK;
const allowHeaderShim = process.env.CERULIA_ENABLE_HEADER_AUTH_SHIM === "1";

if (Boolean(publicBaseUrl) !== Boolean(privateJwkJson)) {
	throw new Error(
		"CERULIA_PUBLIC_BASE_URL and CERULIA_OAUTH_PRIVATE_JWK must be configured together",
	);
}

let store: ApiAppStore = new AtprotoMirrorRecordStore(
	cacheStore,
	publicAgentProvider,
);
let authResolver: AuthResolver = () => createAnonymousAuthContext();
let oauthFeature: ApiOAuthFeature | undefined;

if (publicBaseUrl && privateJwkJson) {
	const oauthRuntime = await createBunOAuthRuntime({
		publicBaseUrl,
		privateJwkJson,
		knownRepoCatalog: oauthStores.knownRepoCatalog,
		stateStore: oauthStores.stateStore,
		sessionStore: oauthStores.sessionStore,
		browserSessionStore: oauthStores.browserSessionStore,
		clientName: process.env.CERULIA_OAUTH_CLIENT_NAME,
		dohEndpoint: process.env.CERULIA_DOH_ENDPOINT,
	});
	store = new AtprotoMirrorRecordStore(
		cacheStore,
		oauthRuntime.agentProvider,
	);
	authResolver = createSessionAuthResolver(oauthRuntime.oauthFeature, {
		allowHeaderShim,
	});
	oauthFeature = oauthRuntime.oauthFeature;
} else if (allowHeaderShim) {
	authResolver = resolveHeaderAuthContext;
}

const app = createApiApp({
	store,
	authResolver,
	oauthFeature,
});

Bun.serve({
	port,
	fetch: app.fetch,
});

console.log(`cerulia-api listening on http://localhost:${port}`);
