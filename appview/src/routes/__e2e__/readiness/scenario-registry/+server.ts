import { error, json, type RequestHandler } from '@sveltejs/kit';

import { proxyCeruliaJson } from '$lib/server/cerulia-http';
import { isCeruliaE2eMode } from '$lib/server/cerulia-runtime';

export const GET: RequestHandler = async (event) => {
	if (!isCeruliaE2eMode()) {
		error(404, { message: 'Not found' });
	}

	const ownerDid = event.url.searchParams.get('ownerDid');
	if (!ownerDid) {
		return json(
			{
				error: 'InvalidRequest',
				message: 'ownerDid is required'
			},
			{ status: 400 }
		);
	}

	const rulesetNsid = event.url.searchParams.get('rulesetNsid');
	const query = new URLSearchParams();
	query.set('ownerDid', ownerDid);
	if (rulesetNsid) {
		query.set('rulesetNsid', rulesetNsid);
	}
	return proxyCeruliaJson(
		event,
		'projection',
		`/xrpc/app.cerulia.scenario.list?${query.toString()}`
	);
};
