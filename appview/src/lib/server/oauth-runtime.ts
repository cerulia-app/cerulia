import { JoseKey } from '@atproto/jwk-jose';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import {
	createAppviewOauthStores,
	type AppviewOauthStores,
	type SavedOauthSession
} from '$lib/server/oauth-store';
import {
	getCeruliaAppviewAuthDbPath,
	getCeruliaAppviewPublicBaseUrl,
	getCeruliaOauthPrivateJwk,
	isCeruliaE2eMode,
	isCeruliaOauthConfigured
} from '$lib/server/cerulia-runtime';

export interface CeruliaOauthSessionResult {
	did: string;
	grantedScope: string;
	returnTo: string | null;
	savedSession: SavedOauthSession;
}

interface SessionLike {
	did: string;
	scope?: string;
	tokenSet?: {
		scope?: string;
	};
	signOut?: () => Promise<void>;
}

interface CeruliaOauthRuntime {
	clientMetadata: Record<string, unknown>;
	jwks: Record<string, unknown>;
	beginLogin(identifier: string, returnTo: string): Promise<string>;
	finishLogin(params: URLSearchParams): Promise<CeruliaOauthSessionResult>;
	commitBrowserSession(did: string, grantedScope: string): Promise<{ sessionId: string }>;
	rollbackLogin(did: string): Promise<void>;
	getBrowserSession(sessionId: string): Promise<{
		did: string;
		grantedScope: string;
	} | null>;
	getLogoutSnapshot(sessionId: string): Promise<{
		did: string;
		grantedScope: string;
	} | null>;
	clearBrowserSession(sessionId: string): Promise<void>;
	restoreSession(did: string, refresh?: boolean | 'auto'): Promise<SessionLike>;
	revokeOauthSession(did: string): Promise<void>;
}

let runtimePromise: Promise<CeruliaOauthRuntime> | null = null;
let stores: AppviewOauthStores | null = null;

function normalizeBaseUrl(value: string): URL {
	const url = new URL(value);
	if (url.protocol !== 'https:') {
		throw new Error('CERULIA_APPVIEW_PUBLIC_BASE_URL must use https');
	}
	if (url.username || url.password) {
		throw new Error('CERULIA_APPVIEW_PUBLIC_BASE_URL must not include credentials');
	}
	if (url.pathname !== '/' && url.pathname !== '') {
		throw new Error('CERULIA_APPVIEW_PUBLIC_BASE_URL must not include a path');
	}

	url.pathname = '';
	url.search = '';
	url.hash = '';
	return url;
}

function buildClientMetadata() {
	const baseUrl = normalizeBaseUrl(getCeruliaAppviewPublicBaseUrl());
	const baseHref = baseUrl.toString().replace(/\/+$/, '');
	return {
		client_id: `${baseHref}/client-metadata.json`,
		client_name: 'Cerulia',
		client_uri: baseHref,
		redirect_uris: [`${baseHref}/oauth/callback`] as [string],
		grant_types: ['authorization_code', 'refresh_token'] as ['authorization_code', 'refresh_token'],
		response_types: ['code'] as ['code'],
		scope: 'atproto transition:generic',
		application_type: 'web' as const,
		token_endpoint_auth_method: 'private_key_jwt' as const,
		token_endpoint_auth_signing_alg: 'ES256' as const,
		dpop_bound_access_tokens: true,
		jwks_uri: `${baseHref}/jwks.json`
	};
}

function getStores() {
	if (!stores) {
		stores = createAppviewOauthStores(getCeruliaAppviewAuthDbPath());
	}

	return stores;
}

function extractGrantedScope(session: SessionLike) {
	const grantedScope = session.tokenSet?.scope ?? session.scope;
	if (!grantedScope) {
		throw new Error('OAuth session must include a granted scope');
	}
	const granted = new Set(
		grantedScope
			.split(/\s+/)
			.map((scope) => scope.trim())
			.filter((scope) => scope.length > 0)
	);
	if (!granted.has('atproto')) {
		throw new Error('OAuth session must grant the atproto scope');
	}
	return grantedScope;
}

function createE2eSavedSession(grantedScope: string): SavedOauthSession {
	return {
		authMethod: 'oauth',
		tokenSet: { scope: grantedScope },
		refreshJwt: 'refresh-token',
		dpopJwk: { kty: 'EC' }
	} as unknown as SavedOauthSession;
}

async function createRuntime(): Promise<CeruliaOauthRuntime> {
	const clientMetadata = buildClientMetadata();
	const key = await JoseKey.fromJWK(JSON.parse(getCeruliaOauthPrivateJwk()));
	const localStores = getStores();
	const client = new NodeOAuthClient({
		clientMetadata,
		keyset: [key],
		stateStore: localStores.stateStore,
		sessionStore: localStores.sessionStore
	});

	return {
		clientMetadata,
		jwks: {
			keys: [key.publicJwk]
		},
		async beginLogin(identifier: string, returnTo: string) {
			if (isCeruliaE2eMode()) {
				const callbackUrl = new URL('/oauth/callback', 'https://appview.e2e.local');
				callbackUrl.searchParams.set('e2eDid', 'did:plc:e2e-oauth');
				callbackUrl.searchParams.set('e2eGrantedScope', 'atproto transition:generic');
				callbackUrl.searchParams.set('e2eIdentifier', identifier);
				callbackUrl.searchParams.set('e2eReturnTo', returnTo);
				return `${callbackUrl.pathname}${callbackUrl.search}`;
			}
			const url = await client.authorize(identifier, { state: returnTo });
			return url.toString();
		},
		async finishLogin(params: URLSearchParams) {
			if (isCeruliaE2eMode() && params.has('e2eDid')) {
				const did = params.get('e2eDid');
				const grantedScope = params.get('e2eGrantedScope');
				if (!did || !grantedScope) {
					throw new Error('E2E OAuth callback requires did and granted scope');
				}
				const savedSession = createE2eSavedSession(grantedScope);
				await localStores.sessionStore.set(did, savedSession);
				return {
					did,
					grantedScope,
					returnTo: params.get('e2eReturnTo') ?? null,
					savedSession
				};
			}
			const { session, state } = await client.callback(params);
			const grantedScope = extractGrantedScope(session);
			const savedSession = await localStores.sessionStore.get(session.did);
			if (!savedSession) {
				throw new Error('OAuth session store did not persist the callback result');
			}

			return {
				did: session.did,
				grantedScope,
				returnTo: state ?? null,
				savedSession
			};
		},
		async commitBrowserSession(did: string, grantedScope: string) {
			const browserSession = await localStores.browserSessionStore.createBrowserSession(
				did,
				grantedScope
			);
			return { sessionId: browserSession.sessionId };
		},
		async rollbackLogin(did: string) {
			const errors: unknown[] = [];
			const session = await client.restore(did).catch(() => null);
			if (session && typeof session.signOut === 'function') {
				try {
					await session.signOut();
				} catch (error) {
					errors.push(error);
				}
			}
			try {
				await localStores.sessionStore.del(did);
			} catch (error) {
				errors.push(error);
			}
			if (errors.length === 1) {
				throw errors[0];
			}
			if (errors.length > 1) {
				throw new AggregateError(errors, 'OAuth login rollback failed');
			}
		},
		getBrowserSession(sessionId: string) {
			return localStores.browserSessionStore
				.getBrowserSession(sessionId)
				.then((binding) =>
					binding ? { did: binding.did, grantedScope: binding.grantedScope } : null
				);
		},
		async getLogoutSnapshot(sessionId: string) {
			const binding = await localStores.browserSessionStore.getBrowserSession(sessionId);
			if (!binding) {
				return null;
			}
			return {
				did: binding.did,
				grantedScope: binding.grantedScope
			};
		},
		clearBrowserSession(sessionId: string) {
			return localStores.browserSessionStore.deleteBrowserSession(sessionId);
		},
		restoreSession(did: string, refresh: boolean | 'auto' = 'auto') {
			return client.restore(did, refresh) as Promise<SessionLike>;
		},
		async revokeOauthSession(did: string) {
			let signOutError: unknown = null;
			const session = await client.restore(did).catch(() => null);
			if (session && typeof session.signOut === 'function') {
				try {
					await session.signOut();
				} catch (error) {
					signOutError = error;
				}
			}
			try {
				await localStores.sessionStore.del(did);
			} catch (storeError) {
				if (signOutError) {
					throw new AggregateError([signOutError, storeError], 'OAuth session revoke failed', {
						cause: storeError
					});
				}
				throw new Error('OAuth session store delete failed', { cause: storeError });
			}
		}
	};
}

export function hasCeruliaOauthRuntime() {
	return isCeruliaOauthConfigured() && !isCeruliaE2eMode();
}

export async function getCeruliaOauthRuntime() {
	if (!isCeruliaOauthConfigured()) {
		throw new Error('Cerulia OAuth runtime is not configured');
	}

	runtimePromise ??= createRuntime();
	return runtimePromise;
}
