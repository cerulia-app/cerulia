import type { Cookies } from "@sveltejs/kit";
import {
	CERULIA_E2E_DID_COOKIE_NAME,
	CERULIA_E2E_SCOPES_COOKIE_NAME,
} from "$lib/cerulia-e2e";
import {
	getCeruliaAppviewInternalAuthSecret,
	hasCeruliaAppviewInternalAuthSecret,
	isCeruliaOauthConfigured,
	isCeruliaE2eMode,
} from "$lib/server/cerulia-runtime";
import { getCeruliaOauthRuntime } from "$lib/server/oauth-runtime";

export interface CeruliaViewerAuth {
	did: string;
	scopes: string[];
}

function parseScopes(rawScopes: string | undefined) {
	return (
		rawScopes
			?.split(",")
			.map((scope) => scope.trim())
			.filter((scope) => scope.length > 0) ?? []
	);
}

export function deriveCeruliaAuthScopes(grantedScope: string) {
	const granted = new Set(
		grantedScope
			.split(/\s+/)
			.map((scope) => scope.trim())
			.filter((scope) => scope.length > 0),
	);
	const scopes: string[] = [];
	if (granted.has("atproto")) {
		scopes.push("app.cerulia.dev.authCoreReader");
	}
	if (granted.has("transition:generic")) {
		if (!scopes.includes("app.cerulia.dev.authCoreReader")) {
			scopes.push("app.cerulia.dev.authCoreReader");
		}
		scopes.push("app.cerulia.dev.authCoreWriter");
	}
	return scopes;
}

export function readCeruliaViewerAuth(
	cookies: Cookies,
): Promise<CeruliaViewerAuth | null> {
	if (isCeruliaOauthConfigured()) {
		const sessionId = cookies.get("cerulia_session");
		if (!sessionId) {
			return Promise.resolve(null);
		}

		return getCeruliaOauthRuntime().then(async (runtime) => {
			const binding = await runtime.getBrowserSession(sessionId);
			if (!binding) {
				return null;
			}

			return {
				did: binding.did,
				scopes: deriveCeruliaAuthScopes(binding.grantedScope),
			};
		});
	}

	if (!isCeruliaE2eMode()) {
		return Promise.resolve(null);
	}

	const did = cookies.get(CERULIA_E2E_DID_COOKIE_NAME);
	if (!did) {
		return Promise.resolve(null);
	}

	return Promise.resolve({
		did,
		scopes: parseScopes(cookies.get(CERULIA_E2E_SCOPES_COOKIE_NAME)),
	});
}

async function createInternalAuthSignature(input: {
	method: string;
	pathWithQuery: string;
	did: string;
	scopes: string[];
	timestamp: string;
	bodySha256: string;
}) {
	const payload = [
		input.method.toUpperCase(),
		input.pathWithQuery,
		input.did,
		input.scopes.join(","),
		input.timestamp,
		input.bodySha256,
	].join("\n");
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(getCeruliaAppviewInternalAuthSecret()),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload),
	);
	return Buffer.from(signature).toString("base64url");
}

async function digestRequestBody(body: BodyInit | null | undefined) {
	const bytes =
		body === null || body === undefined
			? new Uint8Array()
			: new Uint8Array(await new Response(body).arrayBuffer());
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Buffer.from(digest).toString("base64url");
}

export async function createCeruliaAuthHeaders(
	viewerAuth: CeruliaViewerAuth | null,
	requestUrl?: string,
	method = "GET",
	body?: BodyInit | null,
) {
	if (!viewerAuth) {
		return {};
	}

	if (!requestUrl) {
		return {
			"x-cerulia-did": viewerAuth.did,
			"x-cerulia-scopes": viewerAuth.scopes.join(","),
		};
	}

	if (isCeruliaE2eMode() && !hasCeruliaAppviewInternalAuthSecret()) {
		return {
			"x-cerulia-did": viewerAuth.did,
			"x-cerulia-scopes": viewerAuth.scopes.join(","),
		};
	}

	const url = new URL(requestUrl);
	const timestamp = `${Date.now()}`;
	const bodySha256 = await digestRequestBody(body);
	const signature = await createInternalAuthSignature({
		method,
		pathWithQuery: `${url.pathname}${url.search}`,
		did: viewerAuth.did,
		scopes: viewerAuth.scopes,
		timestamp,
		bodySha256,
	});

	return {
		"x-cerulia-did": viewerAuth.did,
		"x-cerulia-scopes": viewerAuth.scopes.join(","),
		"x-cerulia-auth-timestamp": timestamp,
		"x-cerulia-auth-signature": signature,
	};
}
