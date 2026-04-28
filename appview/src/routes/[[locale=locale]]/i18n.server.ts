import { buildLocalizedMeta, type RouteI18nState } from '$lib/i18n/meta';
import {
	getLocaleDefinition,
	localizeTextValues,
	localizePathname,
	SUPPORTED_LOCALES,
} from '$lib/i18n/locale';

// ─── Layout ──────────────────────────────────────────────────────────────────

const layoutText = {
	skipToContent: {
		ja: '本文へ移動',
		en: 'Skip to content',
		zh: '跳转到正文',
	},
	homeAriaLabel: {
		ja: 'Cerulia のホームへ戻る',
		en: 'Return to the Cerulia home page',
		zh: '返回 Cerulia 首页',
	},
	brandCopy: {
		ja: '多言語基盤のプレースホルダー。実機能はまだ実装しません。',
		en: 'A locale foundation placeholder. Product flows are intentionally not implemented yet.',
		zh: '这是多语言基础占位页。产品功能目前故意不实现。',
	},
	localeNavAriaLabel: {
		ja: '表示言語',
		en: 'Display language',
		zh: '显示语言',
	},
} as const;

export function getLayoutI18n(route: RouteI18nState) {
	return {
		locale: route.locale,
		homeHref: localizePathname('/', route.locale),
		availableLocales: SUPPORTED_LOCALES.map((locale) => {
			const definition = getLocaleDefinition(locale);
			return {
				locale,
				label: definition.label,
				hrefLang: definition.htmlLang,
				href: localizePathname(route.contentPathname, locale),
			};
		}),
		text: localizeTextValues(layoutText, route.locale),
	};
}

// ─── Foundation page ─────────────────────────────────────────────────────────

const pageMeta = {
	title: {
		ja: 'Cerulia AppView の多言語基盤',
		en: 'Cerulia AppView locale foundation',
		zh: 'Cerulia AppView 多语言基础',
	},
	description: {
		ja: 'パスベースの locale ルーティング、サーバー選択済み翻訳、locale-aware な metadata を確認するための基盤ページです。',
		en: 'A foundation page that demonstrates path-based locale routing, server-selected translations, and locale-aware metadata.',
		zh: '用于演示基于路径的语言路由、服务器选择翻译与语言感知 metadata 的基础页面。',
	},
} as const;

const pageText = {
	heroTitle: {
		ja: '多言語対応の基盤だけを先に成立させる',
		en: 'Establish only the locale foundation first',
		zh: '先建立多语言基础，而不是功能本体',
	},
	heroLead: {
		ja: 'この画面は、Cerulia の機能を実装する前に、locale ルーティング、サーバー選択済み翻訳、metadata、アクセシビリティの足場を確認するためのプレースホルダーです。',
		en: 'This placeholder verifies locale routing, server-selected translations, metadata, and accessibility before Cerulia product features exist.',
		zh: '这个占位页用于先验证语言路由、服务器选择翻译、metadata 与可访问性，再开始实现 Cerulia 的产品功能。',
	},
	translationApiExampleAriaLabel: {
		ja: 'サーバー選択済み翻訳の例',
		en: 'Server-selected translation example',
		zh: '服务器选择翻译示例',
	},
	codeExample: `export const load: PageServerLoad = ({ url }) => {
	return { i18n: getPageI18n(createRouteI18nState(url)) };
};`,
	panelNote: {
		ja: 'ページは、サーバーで選択したその言語の文字列だけを受け取ります。',
		en: 'The page receives only the strings selected for the active locale on the server.',
		zh: '页面只接收服务器为当前语言选择后的字符串。',
	},
	pillarHeading: {
		ja: 'この基盤で固定すること',
		en: 'What this foundation fixes',
		zh: '这套基础固定了什么',
	},
	pillars: [
		{
			name: 'routing',
			title: {
				ja: 'URL が locale の正本です',
				en: 'The URL is the locale source of truth',
				zh: 'URL 是语言的单一真相来源',
			},
			body: {
				ja: '未指定の経路は日本語、/en/* は英語、/zh/* は中国語、/ja/* は正規 URL へリダイレクトします。',
				en: 'Unprefixed routes stay Japanese, /en/* stays English, /zh/* stays Chinese, and /ja/* redirects to the canonical path.',
				zh: '未带前缀的路径使用日语，/en/* 使用英语，/zh/* 使用中文，/ja/* 会重定向到规范 URL。',
			},
		},
		{
			name: 'server-copy',
			title: {
				ja: '翻訳はサーバーで選択します',
				en: 'Translations are selected on the server',
				zh: '翻译在服务器上选择',
			},
			body: {
				ja: 'クライアントへ全言語の文言マップを渡さず、現在の locale に対応する文字列だけをページデータに含めます。',
				en: 'Page data contains only the strings for the active locale instead of sending every locale map to the client.',
				zh: '页面数据只包含当前语言的字符串，而不是把所有语言的文案映射发送到客户端。',
			},
		},
		{
			name: 'metadata',
			title: {
				ja: 'head も locale から組み立てます',
				en: 'Head metadata is assembled from the locale state',
				zh: 'head metadata 也从语言状态生成',
			},
			body: {
				ja: 'html lang、canonical、hreflang、OG locale を同じ route 状態から導出し、ズレを防ぎます。',
				en: 'html lang, canonical URLs, hreflang links, and Open Graph locale tags come from the same route state to avoid drift.',
				zh: 'html lang、canonical、hreflang 与 Open Graph locale 标签都从同一个路由状態派生，避免彼此漂移。',
			},
		},
	],
	checklistHeading: {
		ja: '今回わざとやらないこと',
		en: 'What this page deliberately avoids',
		zh: '这个页面刻意不做的事',
	},
	checklist: [
		{
			label: {
				ja: 'Cerulia の実機能はまだ入れない',
				en: 'Do not implement Cerulia product flows yet',
				zh: '暂时不要实现 Cerulia 产品流程',
			},
		},
		{
			label: {
				ja: '将来の locale 追加で route 構造を増やしすぎない',
				en: 'Do not multiply route trees when a new locale is added',
				zh: '新增语言时不要复制整棵路由树',
			},
		},
		{
			label: {
				ja: '翻訳欠落時は日本語へ安全に戻す',
				en: 'Fall back to Japanese when a translation is missing',
				zh: '翻译缺失时安全回退到日语',
			},
		},
	],
} as const;

export function getPageI18n(route: RouteI18nState) {
	return {
		meta: buildLocalizedMeta(route, pageMeta),
		text: localizeTextValues(pageText, route.locale),
	};
}
