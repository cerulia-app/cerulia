import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	return json({
		did: locals.ceruliaViewerAuth?.did ?? null,
		scopes: locals.ceruliaViewerAuth?.scopes ?? [],
	});
};