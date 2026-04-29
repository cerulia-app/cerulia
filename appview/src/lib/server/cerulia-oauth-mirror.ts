import { getCeruliaApiBaseUrl } from '$lib/server/cerulia-runtime';
import { createCeruliaAuthHeaders, deriveCeruliaAuthScopes } from '$lib/server/cerulia-auth';

async function requestMirror(path: string, init: RequestInit, did: string, grantedScope: string) {
	const url = `${getCeruliaApiBaseUrl()}${path}`;
	const method = init.method ?? 'GET';
	const headers = new Headers(init.headers);
	headers.set('accept', 'application/json');
	for (const [name, value] of Object.entries(
		await createCeruliaAuthHeaders(
			{
				did,
				scopes: deriveCeruliaAuthScopes(grantedScope)
			},
			url,
			method,
			init.body
		)
	)) {
		headers.set(name, value);
	}

	if (init.body && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	const response = await fetch(url, {
		...init,
		headers
	});
	if (!response.ok) {
		throw new Error(`API OAuth mirror request failed with status ${response.status}`);
	}
	return response;
}

export async function mirrorOauthSessionToApi(options: {
	did: string;
	grantedScope: string;
	savedSession: Record<string, unknown>;
}) {
	await requestMirror(
		'/internal/oauth/session',
		{
			method: 'POST',
			body: JSON.stringify({
				did: options.did,
				session: options.savedSession
			})
		},
		options.did,
		options.grantedScope
	);
}

export async function deleteMirroredOauthSessionFromApi(options: {
	did: string;
	grantedScope: string;
}) {
	await requestMirror(
		`/internal/oauth/session?did=${encodeURIComponent(options.did)}`,
		{
			method: 'DELETE'
		},
		options.did,
		options.grantedScope
	);
}
