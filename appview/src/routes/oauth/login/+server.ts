import { json, redirect } from "@sveltejs/kit";
import { getCeruliaOauthRuntime } from "$lib/server/oauth-runtime";
import type { RequestHandler } from "./$types";

function sanitizeReturnTo(returnTo: string | null | undefined) {
	if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
		return "/";
	}

	return returnTo;
}

export const GET: RequestHandler = async ({ url }) => {
	const identifier = url.searchParams.get("identifier");
	if (!identifier) {
		return json(
			{
				error: "InvalidRequest",
				message: "identifier is required",
			},
			{ status: 400 },
		);
	}

	const runtime = await getCeruliaOauthRuntime();
	const authorizeUrl = await runtime.beginLogin(
		identifier,
		sanitizeReturnTo(url.searchParams.get("returnTo")),
	);
	throw redirect(302, authorizeUrl);
};