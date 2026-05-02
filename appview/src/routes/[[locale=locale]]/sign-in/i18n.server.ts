import { buildLocalizedMeta, type RouteI18nState } from '$lib/i18n/meta';
import { localizeTextValues } from '$lib/i18n/locale';

const pageMeta = {
	title: {
		ja: 'サインイン | Cerulia',
		en: 'Sign in | Cerulia',
		zh: '登录 | Cerulia'
	},
	description: {
		ja: 'Bluesky または AT Protocol 対応アカウントで Cerulia にサインインします。',
		en: 'Sign in to Cerulia with your Bluesky or AT Protocol-compatible account.',
		zh: '使用您的 Bluesky 或兼容 AT Protocol 的账户登录 Cerulia。'
	},
	pathname: '/sign-in'
} as const;

const pageText = {
	eyebrow: {
		ja: 'Cerulia へサインイン',
		en: 'Sign in to Cerulia',
		zh: '登录 Cerulia'
	},
	heading: {
		ja: '使っているアカウントでそのまま始める',
		en: 'Start with the account you already use',
		zh: '直接使用您现有的账户开始'
	},
	lead: {
		ja: 'Bluesky の handle や DID を入力すると、Cerulia が OAuth サインインを開始します。新しいアカウントを作る必要はありません。',
		en: 'Enter your Bluesky handle or DID and Cerulia will start the OAuth sign-in flow. No new account is required.',
		zh: '输入您的 Bluesky handle 或 DID，Cerulia 会开始 OAuth 登录流程。无需创建新账户。'
	},
	identifierLabel: {
		ja: 'アカウント',
		en: 'Account',
		zh: '账户'
	},
	identifierHint: {
		ja: 'Bluesky の handle または DID を入力してください',
		en: 'Enter your Bluesky handle or DID',
		zh: '请输入您的 Bluesky handle 或 DID'
	},
	identifierPlaceholder: {
		ja: 'example.bsky.social',
		en: 'example.bsky.social',
		zh: 'example.bsky.social'
	},
	submit: {
		ja: 'OAuth でサインインする',
		en: 'Continue with OAuth',
		zh: '使用 OAuth 继续'
	},
	back: {
		ja: 'トップページに戻る',
		en: 'Back to the top page',
		zh: '返回顶部页面'
	}
} as const;

export function getPageI18n(route: RouteI18nState) {
	return {
		meta: buildLocalizedMeta(route, pageMeta),
		text: localizeTextValues(pageText, route.locale)
	};
}
