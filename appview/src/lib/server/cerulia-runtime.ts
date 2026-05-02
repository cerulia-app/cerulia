import { env } from '$env/dynamic/private';

function readConfiguredValue(
	primaryName: string,
	primaryValue: string | undefined,
	fallbackName: string,
	fallbackValue: string | undefined
) {
	const resolved = primaryValue || fallbackValue;
	if (!resolved) {
		throw new Error(
			`${primaryName} or ${fallbackName} must be configured for the AppView server`
		);
	}

	return resolved;
}

export function isCeruliaE2eMode() {
	return env.APP_ENV === 'test' || Boolean(env.CERULIA_E2E_SUITE);
}

export function getCeruliaApiBaseUrl() {
	return readConfiguredValue(
		'CERULIA_API_BASE_URL',
		env.CERULIA_API_BASE_URL,
		'CERULIA_E2E_API_BASE_URL',
		env.CERULIA_E2E_API_BASE_URL
	);
}

export function getCeruliaProjectionBaseUrl() {
	return readConfiguredValue(
		'CERULIA_PROJECTION_BASE_URL',
		env.CERULIA_PROJECTION_BASE_URL,
		'CERULIA_E2E_PROJECTION_BASE_URL',
		env.CERULIA_E2E_PROJECTION_BASE_URL
	);
}

export function isCeruliaOauthConfigured() {
	const hasAnyOauthConfig = Boolean(
		env.CERULIA_APPVIEW_PUBLIC_BASE_URL ||
		env.CERULIA_OAUTH_PRIVATE_JWK ||
		env.CERULIA_APPVIEW_INTERNAL_AUTH_SECRET
	);
	if (
		hasAnyOauthConfig &&
		!(
			env.CERULIA_APPVIEW_PUBLIC_BASE_URL &&
			env.CERULIA_OAUTH_PRIVATE_JWK &&
			env.CERULIA_APPVIEW_INTERNAL_AUTH_SECRET
		)
	) {
		throw new Error(
			'CERULIA_APPVIEW_PUBLIC_BASE_URL, CERULIA_OAUTH_PRIVATE_JWK, and CERULIA_APPVIEW_INTERNAL_AUTH_SECRET must be configured together for the AppView server'
		);
	}

	return Boolean(
		env.CERULIA_APPVIEW_PUBLIC_BASE_URL &&
		env.CERULIA_OAUTH_PRIVATE_JWK &&
		env.CERULIA_APPVIEW_INTERNAL_AUTH_SECRET
	);
}

export function getCeruliaAppviewPublicBaseUrl() {
	return readConfiguredValue(
		'CERULIA_APPVIEW_PUBLIC_BASE_URL',
		env.CERULIA_APPVIEW_PUBLIC_BASE_URL,
		'CERULIA_E2E_APPVIEW_PUBLIC_BASE_URL',
		env.CERULIA_E2E_APPVIEW_PUBLIC_BASE_URL
	);
}

export function getCeruliaOauthPrivateJwk() {
	const privateJwk = env.CERULIA_OAUTH_PRIVATE_JWK;
	if (!privateJwk) {
		throw new Error(
			'CERULIA_OAUTH_PRIVATE_JWK must be configured for the AppView server'
		);
	}

	return privateJwk;
}

export function getCeruliaAppviewAuthDbPath() {
	return env.CERULIA_APPVIEW_AUTH_DB ?? '.local/cerulia-appview-auth.sqlite';
}

export function hasCeruliaAppviewInternalAuthSecret() {
	return Boolean(env.CERULIA_APPVIEW_INTERNAL_AUTH_SECRET);
}

export function getCeruliaAppviewInternalAuthSecret() {
	const secret = env.CERULIA_APPVIEW_INTERNAL_AUTH_SECRET;
	if (!secret) {
		throw new Error(
			'CERULIA_APPVIEW_INTERNAL_AUTH_SECRET must be configured for the AppView server'
		);
	}

	return secret;
}

export function getCeruliaE2eApiDbPath() {
	if (!isCeruliaE2eMode()) {
		throw new Error(
			'CERULIA_E2E_API_DB_PATH can only be read in E2E mode'
		);
	}
	const dbPath = env.CERULIA_E2E_API_DB_PATH;
	if (!dbPath) {
		throw new Error(
			'CERULIA_E2E_API_DB_PATH must be configured for E2E'
		);
	}

	return dbPath;
}
