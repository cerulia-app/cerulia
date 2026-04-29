import { getPageI18n } from './i18n.server';
import { createRouteI18nState } from '$lib/i18n/meta';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	return {
		i18n: getPageI18n(createRouteI18nState(url))
	};
};
