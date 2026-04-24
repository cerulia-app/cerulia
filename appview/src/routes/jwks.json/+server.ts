import { json } from "@sveltejs/kit";
import { getCeruliaOauthRuntime } from "$lib/server/oauth-runtime";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	const runtime = await getCeruliaOauthRuntime();
	return json(runtime.jwks);
};