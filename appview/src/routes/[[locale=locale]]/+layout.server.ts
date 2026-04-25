import { redirect } from "@sveltejs/kit";

import { createRouteI18nState } from "$lib/i18n/meta";
import { resolveLocalePathname } from "$lib/i18n/locale";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ url }) => {
	const resolved = resolveLocalePathname(url.pathname);

	if (resolved.shouldRedirectToCanonical) {
		redirect(308, `${resolved.canonicalPathname}${url.search}`);
	}

	return {
		i18n: createRouteI18nState(url),
	};
};