import { redirect } from '@sveltejs/kit';

import { getLayoutI18n } from './i18n.server';
import { createRouteI18nState } from '$lib/i18n/meta';
import { resolveLocalePathname, localizePathname } from '$lib/i18n/locale';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ url, locals }) => {
	const resolved = resolveLocalePathname(url.pathname);

	if (resolved.shouldRedirectToCanonical) {
		redirect(308, `${resolved.canonicalPathname}${url.search}`);
	}

	const routeState = createRouteI18nState(url);

	return {
		i18n: getLayoutI18n(routeState),
		signInHref: localizePathname('/oauth/login', routeState.locale),
		viewer: locals.ceruliaViewerAuth ? { did: locals.ceruliaViewerAuth.did } : null
	};
};
