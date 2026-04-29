import { createApiApp, type ApiAppStore } from "../app.js";
import {
	createAnonymousAuthContext,
	resolveInternalServiceAuthContext,
} from "../auth.js";
import type { AuthResolver } from "../auth.js";
import {
	createPublicAgentProvider,
	createWorkerOAuthRuntime,
} from "../oauth.js";
import { AtprotoMirrorRecordStore } from "../store/atproto.js";
import {
	createD1Driver,
	createD1Store,
	type D1DatabaseLike,
} from "../store/d1.js";
import { createSqlOauthStores } from "../store/oauth.js";

interface WorkerEnv {
	DB: D1DatabaseLike;
	CERULIA_APPVIEW_PUBLIC_BASE_URL?: string;
	CERULIA_OAUTH_PRIVATE_JWK?: string;
	CERULIA_OAUTH_CLIENT_NAME?: string;
	CERULIA_APPVIEW_INTERNAL_AUTH_SECRET?: string;
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
	});
	const publicBaseUrl = env.CERULIA_APPVIEW_PUBLIC_BASE_URL;
	const privateJwkJson = env.CERULIA_OAUTH_PRIVATE_JWK;
	const internalAuthSecret = env.CERULIA_APPVIEW_INTERNAL_AUTH_SECRET;

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

	let store: ApiAppStore = new AtprotoMirrorRecordStore(
		cacheStore,
		publicAgentProvider,
	);
	let authResolver: AuthResolver = () => createAnonymousAuthContext();

	if (publicBaseUrl && privateJwkJson) {
		const oauthRuntime = await createWorkerOAuthRuntime({
			publicBaseUrl,
			privateJwkJson,
			knownRepoCatalog: oauthStores.knownRepoCatalog,
			stateStore: oauthStores.stateStore,
			sessionStore: oauthStores.sessionStore,
			clientName: env.CERULIA_OAUTH_CLIENT_NAME,
			dohEndpoint: env.CERULIA_DOH_ENDPOINT,
		});
		store = new AtprotoMirrorRecordStore(
			cacheStore,
			oauthRuntime.agentProvider,
		);
	}

	if (internalAuthSecret) {
		authResolver = async (request) => {
			return (
				(await resolveInternalServiceAuthContext(request, {
					sharedSecret: internalAuthSecret,
				})) ?? createAnonymousAuthContext()
			);
		};
	}

	return createApiApp({
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
