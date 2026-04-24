import type { Cookies } from "@sveltejs/kit";
import {
	CERULIA_E2E_DID_COOKIE_NAME,
	CERULIA_E2E_SCOPES_COOKIE_NAME,
} from "$lib/cerulia-e2e";
import { isCeruliaE2eMode } from "$lib/server/cerulia-runtime";

export interface CeruliaViewerAuth {
	did: string;
	scopes: string[];
}

function parseScopes(rawScopes: string | undefined) {
	return rawScopes
		?.split(",")
		.map((scope) => scope.trim())
		.filter((scope) => scope.length > 0) ?? [];
}

export function readCeruliaViewerAuth(
	cookies: Cookies,
): CeruliaViewerAuth | null {
	if (!isCeruliaE2eMode()) {
		return null;
	}

	const did = cookies.get(CERULIA_E2E_DID_COOKIE_NAME);
	if (!did) {
		return null;
	}

	return {
		did,
		scopes: parseScopes(cookies.get(CERULIA_E2E_SCOPES_COOKIE_NAME)),
	};
}

export function createCeruliaAuthHeaders(
	viewerAuth: CeruliaViewerAuth | null,
) {
	if (!viewerAuth) {
		return {};
	}

	return {
		"x-cerulia-did": viewerAuth.did,
		"x-cerulia-scopes": viewerAuth.scopes.join(","),
	};
}