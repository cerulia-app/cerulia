import { createApiApp, type ApiOAuthFeature } from "../app.js";
import {
	createAnonymousAuthContext,
	createSessionAuthResolver,
} from "../auth.js";
import type { AuthResolver } from "../auth.js";
import { createPublicAgentProvider, createWorkerOAuthRuntime } from "../oauth.js";
import { AtprotoMirrorRecordStore } from "../store/atproto.js";
import { createD1Driver, createD1Store, type D1DatabaseLike } from "../store/d1.js";
import { createSqlOauthStores } from "../store/oauth.js";
import type { RecordStore } from "../store/types.js";

interface WorkerEnv {
	DB: D1DatabaseLike;
	CERULIA_PUBLIC_BASE_URL?: string;
	CERULIA_OAUTH_PRIVATE_JWK?: string;
	CERULIA_OAUTH_CLIENT_NAME?: string;
	CERULIA_DOH_ENDPOINT?: string;
}

const appCache = new WeakMap<
	D1DatabaseLike,
	Promise<ReturnType<typeof createApiApp>>
>();

export async function createWorkerApp(env: WorkerEnv) {
	const cacheStore = createD1Store(env.DB);
	const driver = createD1Driver(env.DB);
	const oauthStores = createSqlOauthStores(driver);
	const publicAgentProvider = createPublicAgentProvider({
		knownRepoCatalog: oauthStores.knownRepoCatalog,
		dohEndpoint: env.CERULIA_DOH_ENDPOINT,
	});
	const publicBaseUrl = env.CERULIA_PUBLIC_BASE_URL;
	const privateJwkJson = env.CERULIA_OAUTH_PRIVATE_JWK;

	if (Boolean(publicBaseUrl) !== Boolean(privateJwkJson)) {
		throw new Error(
			"CERULIA_PUBLIC_BASE_URL and CERULIA_OAUTH_PRIVATE_JWK must be configured together",
		);
	}

	let store: RecordStore = new AtprotoMirrorRecordStore(
		cacheStore,
		publicAgentProvider,
	);
	let authResolver: AuthResolver = () => createAnonymousAuthContext();
	let oauthFeature: ApiOAuthFeature | undefined;

	if (publicBaseUrl && privateJwkJson) {
		const oauthRuntime = await createWorkerOAuthRuntime({
			publicBaseUrl,
			privateJwkJson,
			knownRepoCatalog: oauthStores.knownRepoCatalog,
			stateStore: oauthStores.stateStore,
			sessionStore: oauthStores.sessionStore,
			browserSessionStore: oauthStores.browserSessionStore,
			clientName: env.CERULIA_OAUTH_CLIENT_NAME,
			dohEndpoint: env.CERULIA_DOH_ENDPOINT,
		});
		store = new AtprotoMirrorRecordStore(
			cacheStore,
			oauthRuntime.agentProvider,
		);
		authResolver = createSessionAuthResolver(oauthRuntime.oauthFeature);
		oauthFeature = oauthRuntime.oauthFeature;
	}

	return createApiApp({
		store,
		authResolver,
		oauthFeature,
	});
}

async function getApp(env: WorkerEnv) {
	let appPromise = appCache.get(env.DB);
	if (!appPromise) {
		appPromise = createWorkerApp(env);
		appCache.set(env.DB, appPromise);
	}

	return appPromise;
}

export default {
	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		const app = await getApp(env);
		return app.fetch(request, env);
	},
};
