import { createApiApp, type ApiOAuthFeature } from "../app.js";
import {
	createSessionAuthResolver,
	resolveHeaderAuthContext,
} from "../auth.js";
import type { AuthResolver } from "../auth.js";
import { createBunOAuthRuntime } from "../oauth.js";
import { AtprotoMirrorRecordStore } from "../store/atproto.js";
import {
	createBunSqliteDriver,
	createBunSqliteStore,
} from "../store/bun-sqlite.js";
import { createSqlOauthStores } from "../store/oauth.js";
import type { RecordStore } from "../store/types.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const dbPath = process.env.CERULIA_API_DB ?? "./cerulia-api.sqlite";

const cacheStore = createBunSqliteStore(dbPath);
const driver = createBunSqliteDriver(dbPath);
const publicBaseUrl = process.env.CERULIA_PUBLIC_BASE_URL;
const privateJwkJson = process.env.CERULIA_OAUTH_PRIVATE_JWK;
const allowHeaderShim = process.env.CERULIA_ENABLE_HEADER_AUTH_SHIM === "1";

if (Boolean(publicBaseUrl) !== Boolean(privateJwkJson)) {
	throw new Error(
		"CERULIA_PUBLIC_BASE_URL and CERULIA_OAUTH_PRIVATE_JWK must be configured together",
	);
}

let store: RecordStore = cacheStore;
let authResolver: AuthResolver = resolveHeaderAuthContext;
let oauthFeature: ApiOAuthFeature | undefined;

if (publicBaseUrl && privateJwkJson) {
	const oauthStores = createSqlOauthStores(driver);
	const oauthRuntime = await createBunOAuthRuntime({
		publicBaseUrl,
		privateJwkJson,
		stateStore: oauthStores.stateStore,
		sessionStore: oauthStores.sessionStore,
		browserSessionStore: oauthStores.browserSessionStore,
		clientName: process.env.CERULIA_OAUTH_CLIENT_NAME,
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
