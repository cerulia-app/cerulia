import { describe, expect, it } from 'vitest';

import {
	localizePathname,
	normalizePathname,
	resolveLocalePathname,
	selectTranslatedText
} from './locale';

describe('normalizePathname', () => {
	it('keeps the root pathname stable', () => {
		expect(normalizePathname('/')).toBe('/');
		expect(normalizePathname('')).toBe('/');
	});

	it('strips a trailing slash from non-root paths', () => {
		expect(normalizePathname('/en/')).toBe('/en');
		expect(normalizePathname('characters/main-branch/')).toBe('/characters/main-branch');
	});
});

describe('localizePathname', () => {
	it('keeps Japanese routes unprefixed', () => {
		expect(localizePathname('/', 'ja')).toBe('/');
		expect(localizePathname('/profile/example.com', 'ja')).toBe('/profile/example.com');
	});

	it('prefixes non-default locales', () => {
		expect(localizePathname('/', 'en')).toBe('/en');
		expect(localizePathname('/characters/new', 'zh')).toBe('/zh/characters/new');
	});
});

describe('resolveLocalePathname', () => {
	it('resolves unprefixed routes as Japanese', () => {
		expect(resolveLocalePathname('/profile/did:plc:ceruliaowner')).toEqual({
			locale: 'ja',
			pathLocale: null,
			contentPathname: '/profile/did:plc:ceruliaowner',
			canonicalPathname: '/profile/did:plc:ceruliaowner',
			shouldRedirectToCanonical: false
		});
	});

	it('resolves explicit English routes without redirecting', () => {
		expect(resolveLocalePathname('/en/profile/example.com')).toEqual({
			locale: 'en',
			pathLocale: 'en',
			contentPathname: '/profile/example.com',
			canonicalPathname: '/en/profile/example.com',
			shouldRedirectToCanonical: false
		});
	});

	it('marks explicit Japanese aliases for canonical redirect', () => {
		expect(resolveLocalePathname('/ja/characters/new')).toEqual({
			locale: 'ja',
			pathLocale: 'ja',
			contentPathname: '/characters/new',
			canonicalPathname: '/characters/new',
			shouldRedirectToCanonical: true
		});
	});

	it('supports future Chinese routes without changing the API', () => {
		expect(resolveLocalePathname('/zh/characters/main-branch')).toEqual({
			locale: 'zh',
			pathLocale: 'zh',
			contentPathname: '/characters/main-branch',
			canonicalPathname: '/zh/characters/main-branch',
			shouldRedirectToCanonical: false
		});
	});
});

describe('selectTranslatedText', () => {
	it('falls back to Japanese when a translation is missing', () => {
		expect(selectTranslatedText({ ja: 'こんにちは', en: 'Hello' }, 'zh')).toBe('こんにちは');
	});
});
