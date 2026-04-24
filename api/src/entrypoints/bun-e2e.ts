import { createApiApp, type ApiAppStore } from "../app.js";
import {
	createAnonymousAuthContext,
	resolveHeaderAuthContext,
} from "../auth.js";
import type { AuthResolver } from "../auth.js";
import { createProjectionIngestFeature } from "../projection.js";
import { AtomicSqlRecordStore } from "../store/atomic-sql.js";
import { createBunSqliteDriver } from "../store/bun-sqlite.js";
import { createSqlOauthStores } from "../store/oauth.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const dbPath = process.env.CERULIA_API_DB ?? "./cerulia-api.sqlite";
const allowHeaderShim = process.env.CERULIA_ENABLE_HEADER_AUTH_SHIM === "1";
const listenHostname = process.env.HOST ?? "127.0.0.1";
const projectionBaseUrl = process.env.CERULIA_PROJECTION_INTERNAL_BASE_URL;
const projectionIngestToken =
	process.env.CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN;

if (Boolean(projectionBaseUrl) !== Boolean(projectionIngestToken)) {
	throw new Error(
		"CERULIA_PROJECTION_INTERNAL_BASE_URL and CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN must be configured together",
	);
}

const driver = createBunSqliteDriver(dbPath);
const oauthStores = createSqlOauthStores(driver);
let authResolver: AuthResolver = () => createAnonymousAuthContext();
const store: ApiAppStore = new AtomicSqlRecordStore(driver);
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

if (allowHeaderShim) {
	authResolver = resolveHeaderAuthContext;
}

const app = createApiApp({
	store,
	authResolver,
	projectionIngestFeature,
});

Bun.serve({
	hostname: listenHostname,
	port,
	fetch: app.fetch,
});

console.log(`cerulia-api-e2e listening on http://${listenHostname}:${port}`);