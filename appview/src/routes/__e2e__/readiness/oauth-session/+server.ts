import { DatabaseSync } from 'node:sqlite';
import { error, json } from '@sveltejs/kit';
import { getCeruliaE2eApiDbPath, isCeruliaE2eMode } from '$lib/server/cerulia-runtime';
import type { RequestHandler } from './$types';

const E2E_DID = 'did:plc:e2e-oauth';

function hasMirroredSession(did: string) {
	const db = new DatabaseSync(getCeruliaE2eApiDbPath(), { readOnly: true });
	try {
		return Boolean(db.prepare(`SELECT subject FROM oauth_sessions WHERE subject = ?`).get(did));
	} finally {
		db.close();
	}
}

export const GET: RequestHandler = async (event) => {
	if (!isCeruliaE2eMode()) {
		error(404, { message: 'Not found' });
	}

	const did = event.url.searchParams.get('did') ?? event.locals.ceruliaViewerAuth?.did ?? E2E_DID;
	return json({
		did: event.locals.ceruliaViewerAuth?.did ?? null,
		scopes: event.locals.ceruliaViewerAuth?.scopes ?? [],
		mirroredSessionPresent: hasMirroredSession(did)
	});
};
