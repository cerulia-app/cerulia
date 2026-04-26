import { redirect } from "@sveltejs/kit";
import {
	deleteMirroredOauthSessionFromApi,
	mirrorOauthSessionToApi,
} from "$lib/server/cerulia-oauth-mirror";
import { getCeruliaOauthRuntime } from "$lib/server/oauth-runtime";
import type { RequestHandler } from "./$types";

function sanitizeReturnTo(returnTo: string | null | undefined) {
	if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
		return "/";
	}

	return returnTo;
}

function createSessionCookie(url: URL, sessionId: string) {
	return {
		name: "cerulia_session",
		value: sessionId,
		path: "/",
		httpOnly: true,
		sameSite: "lax" as const,
		secure: url.protocol === "https:",
	};
}

export const GET: RequestHandler = async ({ cookies, url }) => {
	const runtime = await getCeruliaOauthRuntime();
	const result = await runtime.finishLogin(url.searchParams);
	let mirrored = false;
	let sessionId: string | null = null;
	try {
		await mirrorOauthSessionToApi({
			did: result.did,
			grantedScope: result.grantedScope,
			savedSession: result.savedSession,
		});
		mirrored = true;
		sessionId = (
			await runtime.commitBrowserSession(result.did, result.grantedScope)
		).sessionId;
	} catch (error) {
		const compensationErrors: unknown[] = [];
		if (mirrored) {
			try {
				await deleteMirroredOauthSessionFromApi({
					did: result.did,
					grantedScope: result.grantedScope,
				});
			} catch (compensationError) {
				compensationErrors.push(compensationError);
			}
		}
		try {
			await runtime.rollbackLogin(result.did);
		} catch (compensationError) {
			compensationErrors.push(compensationError);
		}
		if (compensationErrors.length > 0) {
			throw new AggregateError(
				[error, ...compensationErrors],
				"OAuth callback compensation failed",
			);
		}
		throw error;
	}

	const cookie = createSessionCookie(url, sessionId);
	cookies.set(cookie.name, cookie.value, cookie);
	throw redirect(302, sanitizeReturnTo(result.returnTo));
};
