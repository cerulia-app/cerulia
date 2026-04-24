import type { Handle } from "@sveltejs/kit";
import { readCeruliaViewerAuth } from "$lib/server/cerulia-auth";

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.ceruliaViewerAuth = await readCeruliaViewerAuth(event.cookies);
	return resolve(event);
};