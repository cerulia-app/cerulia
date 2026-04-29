import { redirect } from '@sveltejs/kit';

import { getLayoutI18n } from './i18n.server';
import { createRouteI18nState } from '$lib/i18n/meta';
import { resolveLocalePathname, localizePathname } from '$lib/i18n/locale';

import type { LayoutServerLoad } from './$types';

function buildSignInHref(canonicalPathname: string, locale: 'ja' | 'en' | 'zh', search: string) {
	const signInPath = localizePathname('/sign-in', locale);
	const params = new URLSearchParams({ returnTo: `${canonicalPathname}${search}` });

	return `${signInPath}?${params.toString()}`;
}

export const load: LayoutServerLoad = ({ url, locals }) => {
	const resolved = resolveLocalePathname(url.pathname);

	if (resolved.shouldRedirectToCanonical) {
		redirect(308, `${resolved.canonicalPathname}${url.search}`);
	}

	const routeState = createRouteI18nState(url);

	return {
		i18n: getLayoutI18n(routeState),
		signInHref: buildSignInHref(routeState.canonicalPathname, routeState.locale, url.search),
		viewer: locals.ceruliaViewerAuth ? { did: locals.ceruliaViewerAuth.did } : null
	};
};
