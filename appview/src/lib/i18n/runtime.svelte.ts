import { getContext } from "svelte";

import {
	buildLocalizedMeta,
	type LocalizedMetaDefinition,
	type RouteI18nState,
} from "./meta";
import {
	getLocaleDefinition,
	localizePathname,
	selectTranslatedText,
	SUPPORTED_LOCALES,
	type SupportedLocale,
	type TextDirection,
	type TranslatedText,
} from "./locale";

export const I18N_CONTEXT_KEY = Symbol("cerulia.i18n");

export class I18nRuntime {
	locale = $state<SupportedLocale>("ja");
	htmlLang = $state("ja");
	direction = $state<TextDirection>("ltr");
	contentPathname = $state("/");
	canonicalPathname = $state("/");
	origin = $state("");
	alternates = $state<RouteI18nState["alternates"]>([]);

	constructor(initial: RouteI18nState) {
		this.update(initial);
	}

	update(next: RouteI18nState): void {
		this.locale = next.locale;
		this.htmlLang = next.htmlLang;
		this.direction = next.direction;
		this.contentPathname = next.contentPathname;
		this.canonicalPathname = next.canonicalPathname;
		this.origin = next.origin;
		this.alternates = next.alternates;
	}

	get availableLocales() {
		return SUPPORTED_LOCALES.map((locale) => {
			const definition = getLocaleDefinition(locale);

			return {
				locale,
				label: definition.label,
				hrefLang: definition.htmlLang,
				href: localizePathname(this.contentPathname, locale),
			};
		});
	}

	get snapshot(): RouteI18nState {
		return {
			locale: this.locale,
			htmlLang: this.htmlLang,
			direction: this.direction,
			contentPathname: this.contentPathname,
			canonicalPathname: this.canonicalPathname,
			origin: this.origin,
			alternates: this.alternates,
		};
	}

	t = (translations: TranslatedText): string => selectTranslatedText(translations, this.locale);

	path = (pathname: string, locale: SupportedLocale = this.locale): string =>
		localizePathname(pathname, locale);

	switchLocale = (locale: SupportedLocale): string => this.path(this.contentPathname, locale);

	meta = (definition: LocalizedMetaDefinition) => buildLocalizedMeta(this.snapshot, definition);
}

export function useI18n(): I18nRuntime {
	return getContext<I18nRuntime>(I18N_CONTEXT_KEY);
}