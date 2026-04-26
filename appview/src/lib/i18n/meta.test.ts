import { describe, expect, it } from "vitest";

import { buildLocalizedMeta, createRouteI18nState } from "./meta";

describe("createRouteI18nState", () => {
	it("builds a locale-aware route state from the current URL", () => {
		const state = createRouteI18nState(
			new URL("https://app.cerulia.example.com/en/characters"),
		);

		expect(state).toMatchObject({
			locale: "en",
			htmlLang: "en",
			direction: "ltr",
			contentPathname: "/characters",
			canonicalPathname: "/en/characters",
			origin: "https://app.cerulia.example.com",
		});
		expect(state.alternates).toEqual([
			{
				locale: "ja",
				label: "日本語",
				hrefLang: "ja",
				pathname: "/characters",
				href: "https://app.cerulia.example.com/characters",
			},
			{
				locale: "en",
				label: "English",
				hrefLang: "en",
				pathname: "/en/characters",
				href: "https://app.cerulia.example.com/en/characters",
			},
			{
				locale: "zh",
				label: "中文",
				hrefLang: "zh-Hans",
				pathname: "/zh/characters",
				href: "https://app.cerulia.example.com/zh/characters",
			},
		]);
	});
});

describe("buildLocalizedMeta", () => {
	it("derives canonical and alternate metadata from the same route state", () => {
		const route = createRouteI18nState(
			new URL("https://app.cerulia.example.com/zh/characters"),
		);
		const meta = buildLocalizedMeta(route, {
			title: {
				ja: "キャラクター",
				en: "Characters",
				zh: "角色",
			},
			description: {
				ja: "Cerulia の共有キャラクター詳細。",
				en: "Cerulia shared character detail.",
				zh: "Cerulia 的共享角色详情。",
			},
		});

		expect(meta).toEqual({
			title: "角色",
			description: "Cerulia 的共享角色详情。",
			canonicalUrl: "https://app.cerulia.example.com/zh/characters",
			xDefaultUrl: "https://app.cerulia.example.com/characters",
			ogLocale: "zh_CN",
			ogAlternateLocales: ["ja_JP", "en_US"],
			robots: "index,follow",
			alternateLinks: [
				{
					locale: "ja",
					label: "日本語",
					hrefLang: "ja",
					pathname: "/characters",
					href: "https://app.cerulia.example.com/characters",
				},
				{
					locale: "en",
					label: "English",
					hrefLang: "en",
					pathname: "/en/characters",
					href: "https://app.cerulia.example.com/en/characters",
				},
				{
					locale: "zh",
					label: "中文",
					hrefLang: "zh-Hans",
					pathname: "/zh/characters",
					href: "https://app.cerulia.example.com/zh/characters",
				},
			],
		});
	});
});
