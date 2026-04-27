import type { RequestHandler } from "@sveltejs/kit";

import { proxyCeruliaJson } from "$lib/server/cerulia-http";
import { requireCeruliaE2eMode } from "$lib/server/cerulia-runtime";

export const GET: RequestHandler = async (event) => {
	requireCeruliaE2eMode();
	const rulesetNsid = event.url.searchParams.get("rulesetNsid");
	const query = rulesetNsid
		? `?rulesetNsid=${encodeURIComponent(rulesetNsid)}`
		: "";
	return proxyCeruliaJson(
		event,
		"projection",
		`/xrpc/app.cerulia.scenario.list${query}`,
	);
};
