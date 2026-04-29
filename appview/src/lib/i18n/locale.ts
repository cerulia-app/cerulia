export const DEFAULT_LOCALE = 'ja' as const;

export const SUPPORTED_LOCALES = [DEFAULT_LOCALE, 'en', 'zh'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type TextDirection = 'ltr' | 'rtl';

export type TranslatedText = {
	ja: string;
} & Partial<Record<Exclude<SupportedLocale, 'ja'>, string>>;

export interface LocaleDefinition {
	label: string;
	htmlLang: string;
	ogLocale: string;
	direction: TextDirection;
	pathPrefix: string;
}

export interface LocalePathResolution {
	locale: SupportedLocale;
	pathLocale: SupportedLocale | null;
	contentPathname: string;
	canonicalPathname: string;
	shouldRedirectToCanonical: boolean;
}

export const LOCALE_DEFINITIONS = {
	ja: {
		label: '日本語',
		htmlLang: 'ja',
		ogLocale: 'ja_JP',
		direction: 'ltr',
		pathPrefix: ''
	},
	en: {
		label: 'English',
		htmlLang: 'en',
		ogLocale: 'en_US',
		direction: 'ltr',
		pathPrefix: '/en'
	},
	zh: {
		label: '中文',
		htmlLang: 'zh-Hans',
		ogLocale: 'zh_CN',
		direction: 'ltr',
		pathPrefix: '/zh'
	}
} as const satisfies Record<SupportedLocale, LocaleDefinition>;

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
	return SUPPORTED_LOCALES.some((locale) => locale === value);
}

export function getLocaleDefinition(locale: SupportedLocale): LocaleDefinition {
	return LOCALE_DEFINITIONS[locale];
}

export function normalizePathname(pathname: string): string {
	if (pathname === '') {
		return '/';
	}

	const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;

	if (normalized.length > 1 && normalized.endsWith('/')) {
		return normalized.slice(0, -1);
	}

	return normalized;
}

export function localizePathname(pathname: string, locale: SupportedLocale): string {
	const normalizedPathname = normalizePathname(pathname);
	const prefix = getLocaleDefinition(locale).pathPrefix;

	if (normalizedPathname === '/') {
		return prefix || '/';
	}

	return `${prefix}${normalizedPathname}` || normalizedPathname;
}

export function resolveLocalePathname(pathname: string): LocalePathResolution {
	const normalizedPathname = normalizePathname(pathname);
	const segments = normalizedPathname.slice(1).split('/');
	const firstSegment = segments[0] || null;
	const pathLocale = isSupportedLocale(firstSegment) ? firstSegment : null;
	const contentSegments = pathLocale === null ? segments : segments.slice(1);
	const contentPathname = normalizePathname(contentSegments.join('/'));
	const locale = pathLocale ?? DEFAULT_LOCALE;
	const canonicalPathname = localizePathname(contentPathname, locale);

	return {
		locale,
		pathLocale,
		contentPathname,
		canonicalPathname,
		shouldRedirectToCanonical: canonicalPathname !== normalizedPathname
	};
}

export function selectTranslatedText(
	translations: TranslatedText,
	locale: SupportedLocale
): string {
	return translations[locale] ?? translations.ja;
}

// ─── Localized copy ──────────────────────────────────────────────────────────

export type LocalizedValues<T> = {
	[Key in keyof T]: T[Key] extends TranslatedText
		? string
		: T[Key] extends readonly (infer Item)[]
			? LocalizedValues<Item>[]
			: T[Key] extends object
				? LocalizedValues<T[Key]>
				: T[Key];
};

function isTranslatedText(value: unknown): value is TranslatedText {
	return (
		value !== null &&
		typeof value === 'object' &&
		'ja' in value &&
		typeof (value as { ja: unknown }).ja === 'string'
	);
}

export function localizeTextValues<T>(value: T, locale: SupportedLocale): LocalizedValues<T> {
	if (Array.isArray(value)) {
		return value.map((item) => localizeTextValues(item, locale)) as LocalizedValues<T>;
	}

	if (isTranslatedText(value)) {
		return selectTranslatedText(value, locale) as LocalizedValues<T>;
	}

	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [key, localizeTextValues(nested, locale)])
		) as LocalizedValues<T>;
	}

	return value as LocalizedValues<T>;
}
