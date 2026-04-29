import { json } from '@sveltejs/kit';
import { deleteMirroredOauthSessionFromApi } from '$lib/server/cerulia-oauth-mirror';
import { getCeruliaOauthRuntime } from '$lib/server/oauth-runtime';
import type { RequestHandler } from './$types';

function clearSessionCookie(url: URL) {
	return {
		name: 'cerulia_session',
		value: '',
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
		expires: new Date(0),
		maxAge: 0
	};
}

export const POST: RequestHandler = async ({ cookies, url }) => {
	const sessionId = cookies.get('cerulia_session');
	const cookie = clearSessionCookie(url);
	cookies.set(cookie.name, cookie.value, cookie);
	if (sessionId) {
		const runtime = await getCeruliaOauthRuntime();
		const snapshot = await runtime.getLogoutSnapshot(sessionId);
		await runtime.clearBrowserSession(sessionId);
		if (snapshot) {
			await runtime.revokeOauthSession(snapshot.did);
			await deleteMirroredOauthSessionFromApi({
				did: snapshot.did,
				grantedScope: snapshot.grantedScope
			});
		}
	}

	return json({ ok: true });
};
