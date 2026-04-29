import { buildLocalizedMeta, type RouteI18nState } from '$lib/i18n/meta';
import { localizeTextValues } from '$lib/i18n/locale';

const pageMeta = {
	title: {
		ja: 'キャラクター詳細 | Cerulia',
		en: 'Character Detail | Cerulia',
		zh: '角色详情 | Cerulia'
	},
	description: {
		ja: 'Cerulia に公開されたキャラクターの詳細を確認できます。',
		en: 'View character details shared on Cerulia.',
		zh: '查看在 Cerulia 上共享的角色详情。'
	},
	robots: 'index,follow'
} as const;

const pageText = {
	draftBadge: {
		ja: '下書き',
		en: 'Draft',
		zh: '草稿'
	},
	draftNotice: {
		ja: 'このキャラクターはあなたにだけ表示されています',
		en: 'This character is only visible to you',
		zh: '此角色仅对您可见'
	},
	branchKindMain: {
		ja: 'メインライン',
		en: 'Main line',
		zh: '主线'
	},
	branchKindCampaignFork: {
		ja: 'キャンペーン分岐',
		en: 'Campaign fork',
		zh: '战役分支'
	},
	branchKindLocalOverride: {
		ja: 'ローカル上書き',
		en: 'Local override',
		zh: '本地覆盖'
	},
	sectionProfile: {
		ja: '人物像',
		en: 'Character profile',
		zh: '角色简介'
	},
	sectionSheet: {
		ja: 'シート詳細',
		en: 'Sheet details',
		zh: '角色表详情'
	},
	sectionSessions: {
		ja: '遊んだ記録',
		en: 'Session history',
		zh: '游戏记录'
	},
	sectionAdvancements: {
		ja: '成長',
		en: 'Advancements',
		zh: '成长记录'
	},
	noSessions: {
		ja: 'セッション記録はまだありません',
		en: 'No session records yet',
		zh: '尚无游戏记录'
	},
	noAdvancements: {
		ja: '成長記録はまだありません',
		en: 'No advancement records yet',
		zh: '尚无成长记录'
	},
	schemalessNotice: {
		ja: 'スキーマなしシートのため、構造化ステータスは表示されません',
		en: 'Structured stats are not shown for schema-less sheets',
		zh: '无模式角色表不显示结构化属性'
	},
	rolePl: {
		ja: 'PL',
		en: 'PL',
		zh: 'PL'
	},
	roleGm: {
		ja: 'GM',
		en: 'GM',
		zh: 'GM'
	},
	notFound: {
		ja: 'キャラクターが見つかりません',
		en: 'Character not found',
		zh: '未找到角色'
	},
	notFoundBody: {
		ja: 'このキャラクターは存在しないか、公開されていません。',
		en: 'This character does not exist or is not accessible.',
		zh: '此角色不存在或无法访问。'
	},
	backToTop: {
		ja: 'トップへ戻る',
		en: 'Back to top',
		zh: '返回顶部'
	},
	ownerEdit: {
		ja: '編集',
		en: 'Edit',
		zh: '编辑'
	},
	visibilityPublic: {
		ja: '公開',
		en: 'Public',
		zh: '公开'
	},
	visibilityDraft: {
		ja: '下書き',
		en: 'Draft',
		zh: '草稿'
	}
} as const;

export function getCharacterDetailI18n(route: RouteI18nState) {
	return {
		meta: buildLocalizedMeta(route, pageMeta),
		text: localizeTextValues(pageText, route.locale)
	};
}

export function getCharacterDetailTitleI18n(
	route: RouteI18nState,
	displayName: string
) {
	const base = localizeTextValues(pageMeta, route.locale);
	const title = {
		ja: `${displayName} | Cerulia`,
		en: `${displayName} | Cerulia`,
		zh: `${displayName} | Cerulia`
	};
	return {
		meta: buildLocalizedMeta(route, { ...pageMeta, title }),
		text: localizeTextValues(pageText, route.locale)
	};
}
