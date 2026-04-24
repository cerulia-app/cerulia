import { error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

function readConfiguredValue(
	primaryName: string,
	primaryValue: string | undefined,
	fallbackName: string,
	fallbackValue: string | undefined,
) {
	const resolved = primaryValue || fallbackValue;
	if (!resolved) {
		throw error(
			500,
			`${primaryName} or ${fallbackName} must be configured for the AppView server`,
		);
	}

	return resolved;
}

export function isCeruliaE2eMode() {
	return env.APP_ENV === "test" || Boolean(env.CERULIA_E2E_SUITE);
}

export function requireCeruliaE2eMode() {
	if (!isCeruliaE2eMode()) {
		throw error(404, "Not found");
	}
}

export function getCeruliaApiBaseUrl() {
	return readConfiguredValue(
		"CERULIA_API_BASE_URL",
		env.CERULIA_API_BASE_URL,
		"CERULIA_E2E_API_BASE_URL",
		env.CERULIA_E2E_API_BASE_URL,
	);
}

export function getCeruliaProjectionBaseUrl() {
	return readConfiguredValue(
		"CERULIA_PROJECTION_BASE_URL",
		env.CERULIA_PROJECTION_BASE_URL,
		"CERULIA_E2E_PROJECTION_BASE_URL",
		env.CERULIA_E2E_PROJECTION_BASE_URL,
	);
}