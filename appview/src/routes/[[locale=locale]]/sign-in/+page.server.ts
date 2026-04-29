import { redirect } from '@sveltejs/kit';

import { createRouteI18nState } from '$lib/i18n/meta';
import { localizePathname } from '$lib/i18n/locale';

import { getSignInPageI18n } from './i18n.server';

import type { PageServerLoad } from './$types';

function sanitizeReturnTo(returnTo: string | null | undefined, fallback: string) {
	if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
		return fallback;
	}

	return returnTo;
}

export const load: PageServerLoad = ({ url, locals }) => {
	const routeState = createRouteI18nState(url);
	const fallbackReturnTo = localizePathname('/', routeState.locale);
	const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'), fallbackReturnTo);

	if (locals.ceruliaViewerAuth) {
		redirect(302, returnTo);
	}

	return {
		i18n: getSignInPageI18n(routeState),
		loginAction: '/oauth/login',
		returnTo,
		backHref: fallbackReturnTo
	};
};