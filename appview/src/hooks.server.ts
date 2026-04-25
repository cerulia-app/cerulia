import type { Handle } from "@sveltejs/kit";

import { getLocaleDefinition, resolveLocalePathname } from "$lib/i18n/locale";
import { readCeruliaViewerAuth } from "$lib/server/cerulia-auth";

export const handle: Handle = async ({ event, resolve }) => {
	const locale = resolveLocalePathname(event.url.pathname).locale;
	const localeDefinition = getLocaleDefinition(locale);

	event.locals.appLocale = locale;
	event.locals.htmlLang = localeDefinition.htmlLang;
	event.locals.textDirection = localeDefinition.direction;
	event.locals.ceruliaViewerAuth = await readCeruliaViewerAuth(event.cookies);

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace("%cerulia.html_lang%", event.locals.htmlLang)
				.replace("%cerulia.text_direction%", event.locals.textDirection),
	});
};