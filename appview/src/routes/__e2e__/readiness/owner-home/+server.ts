import { error } from '@sveltejs/kit';
import { proxyCeruliaJson } from '$lib/server/cerulia-http';
import { isCeruliaE2eMode } from '$lib/server/cerulia-runtime';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (!isCeruliaE2eMode()) {
		error(404, { message: 'Not found' });
	}

	return proxyCeruliaJson(event, 'api', '/xrpc/app.cerulia.dev.character.getHome');
};
