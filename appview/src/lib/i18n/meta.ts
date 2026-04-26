import {
	DEFAULT_LOCALE,
	getLocaleDefinition,
	localizePathname,
	normalizePathname,
	resolveLocalePathname,
	selectTranslatedText,
	SUPPORTED_LOCALES,
	type SupportedLocale,
	type TextDirection,
	type TranslatedText,
} from "./locale";

export interface LocaleAlternateLink {
	locale: SupportedLocale;
	label: string;
	hrefLang: string;
	pathname: string;
	href: string;
}

export interface RouteI18nState {
	locale: SupportedLocale;
	htmlLang: string;
	direction: TextDirection;
	contentPathname: string;
	canonicalPathname: string;
	origin: string;
	alternates: LocaleAlternateLink[];
}

export interface LocalizedMetaDefinition {
	title: TranslatedText;
	description: TranslatedText;
	pathname?: string;
	robots?: string;
}

export interface LocalizedPageMeta {
	title: string;
	description: string;
	canonicalUrl: string;
	xDefaultUrl: string;
	ogLocale: string;
	ogAlternateLocales: string[];
	robots: string;
	alternateLinks: LocaleAlternateLink[];
}

function buildAlternateLinks(
	pathname: string,
	origin: string,
): LocaleAlternateLink[] {
	return SUPPORTED_LOCALES.map((locale) => {
		const definition = getLocaleDefinition(locale);
		const localizedPathname = localizePathname(pathname, locale);

		return {
			locale,
			label: definition.label,
			hrefLang: definition.htmlLang,
			pathname: localizedPathname,
			href: new URL(localizedPathname, origin).toString(),
		};
	});
}

export function createRouteI18nState(url: URL): RouteI18nState {
	const resolved = resolveLocalePathname(url.pathname);
	const definition = getLocaleDefinition(resolved.locale);

	return {
		locale: resolved.locale,
		htmlLang: definition.htmlLang,
		direction: definition.direction,
		contentPathname: resolved.contentPathname,
		canonicalPathname: resolved.canonicalPathname,
		origin: url.origin,
		alternates: buildAlternateLinks(resolved.contentPathname, url.origin),
	};
}

export function buildLocalizedMeta(
	route: RouteI18nState,
	definition: LocalizedMetaDefinition,
): LocalizedPageMeta {
	const contentPathname = definition.pathname
		? normalizePathname(definition.pathname)
		: route.contentPathname;
	const localeDefinition = getLocaleDefinition(route.locale);
	const alternateLinks = buildAlternateLinks(contentPathname, route.origin);

	return {
		title: selectTranslatedText(definition.title, route.locale),
		description: selectTranslatedText(definition.description, route.locale),
		canonicalUrl: new URL(
			localizePathname(contentPathname, route.locale),
			route.origin,
		).toString(),
		xDefaultUrl: new URL(
			localizePathname(contentPathname, DEFAULT_LOCALE),
			route.origin,
		).toString(),
		ogLocale: localeDefinition.ogLocale,
		ogAlternateLocales: alternateLinks
			.filter((alternate) => alternate.locale !== route.locale)
			.map((alternate) => getLocaleDefinition(alternate.locale).ogLocale),
		robots: definition.robots ?? "index,follow",
		alternateLinks,
	};
}
