import { proxyCeruliaJson } from "$lib/server/cerulia-http";
import { requireCeruliaE2eMode } from "$lib/server/cerulia-runtime";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	requireCeruliaE2eMode();
	return proxyCeruliaJson(event, "api", "/oauth/session");
};