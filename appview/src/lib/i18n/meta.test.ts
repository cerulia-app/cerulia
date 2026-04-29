import { describe, expect, it } from 'vitest';

import { buildLocalizedMeta, createRouteI18nState } from './meta';

describe('createRouteI18nState', () => {
	it('builds a locale-aware route state from the current URL', () => {
		const state = createRouteI18nState(
			new URL('https://app.cerulia.example.com/en/profile/example.com')
		);

		expect(state).toMatchObject({
			locale: 'en',
			htmlLang: 'en',
			direction: 'ltr',
			contentPathname: '/profile/example.com',
			canonicalPathname: '/en/profile/example.com',
			origin: 'https://app.cerulia.example.com'
		});
		expect(state.alternates).toEqual([
			{
				locale: 'ja',
				label: '日本語',
				hrefLang: 'ja',
				pathname: '/profile/example.com',
				href: 'https://app.cerulia.example.com/profile/example.com'
			},
			{
				locale: 'en',
				label: 'English',
				hrefLang: 'en',
				pathname: '/en/profile/example.com',
				href: 'https://app.cerulia.example.com/en/profile/example.com'
			},
			{
				locale: 'zh',
				label: '中文',
				hrefLang: 'zh-Hans',
				pathname: '/zh/profile/example.com',
				href: 'https://app.cerulia.example.com/zh/profile/example.com'
			}
		]);
	});
});

describe('buildLocalizedMeta', () => {
	it('derives canonical and alternate metadata from the same route state', () => {
		const route = createRouteI18nState(
			new URL('https://app.cerulia.example.com/zh/characters/branch-main')
		);
		const meta = buildLocalizedMeta(route, {
			title: {
				ja: 'キャラクター詳細',
				en: 'Character Detail',
				zh: '角色详情'
			},
			description: {
				ja: 'Cerulia の共有キャラクター詳細。',
				en: 'Cerulia shared character detail.',
				zh: 'Cerulia 的共享角色详情。'
			}
		});

		expect(meta).toEqual({
			title: '角色详情',
			description: 'Cerulia 的共享角色详情。',
			canonicalUrl: 'https://app.cerulia.example.com/zh/characters/branch-main',
			xDefaultUrl: 'https://app.cerulia.example.com/characters/branch-main',
			ogLocale: 'zh_CN',
			ogAlternateLocales: ['ja_JP', 'en_US'],
			robots: 'index,follow',
			alternateLinks: [
				{
					locale: 'ja',
					label: '日本語',
					hrefLang: 'ja',
					pathname: '/characters/branch-main',
					href: 'https://app.cerulia.example.com/characters/branch-main'
				},
				{
					locale: 'en',
					label: 'English',
					hrefLang: 'en',
					pathname: '/en/characters/branch-main',
					href: 'https://app.cerulia.example.com/en/characters/branch-main'
				},
				{
					locale: 'zh',
					label: '中文',
					hrefLang: 'zh-Hans',
					pathname: '/zh/characters/branch-main',
					href: 'https://app.cerulia.example.com/zh/characters/branch-main'
				}
			]
		});
	});
});
