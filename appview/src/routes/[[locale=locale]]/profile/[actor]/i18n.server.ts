import { buildLocalizedMeta, type RouteI18nState } from '$lib/i18n/meta';
import { localizeTextValues } from '$lib/i18n/locale';

const pageMeta = {
	title: {
		ja: 'プロフィール | Cerulia',
		en: 'Profile | Cerulia',
		zh: '个人主页 | Cerulia'
	},
	description: {
		ja: 'Cerulia に登録されたプレイヤーのプロフィールを確認できます。',
		en: 'View a player profile registered on Cerulia.',
		zh: '查看在 Cerulia 上注册的玩家个人主页。'
	}
} as const;

const pageText = {
	sectionTrpgProfile: {
		ja: 'TRPG プロフィール',
		en: 'TRPG Profile',
		zh: 'TRPG 资料'
	},
	sectionCharacters: {
		ja: '公開キャラクター',
		en: 'Public characters',
		zh: '公开角色'
	},
	fieldPronouns: {
		ja: '代名詞',
		en: 'Pronouns',
		zh: '代词'
	},
	fieldRoleDistribution: {
		ja: '主な役割',
		en: 'Main role',
		zh: '主要角色分布'
	},
	fieldPlayFormats: {
		ja: 'プレイ形式',
		en: 'Play formats',
		zh: '游戏形式'
	},
	fieldTools: {
		ja: '使用ツール',
		en: 'Tools',
		zh: '使用工具'
	},
	fieldOwnedRulebooks: {
		ja: '所持ルールブック',
		en: 'Owned rulebooks',
		zh: '拥有的规则书'
	},
	fieldPlayableTime: {
		ja: 'プレイ可能な時間帯',
		en: 'Playable time',
		zh: '可游玩时间'
	},
	fieldPreferredScenarioStyles: {
		ja: '好みのシナリオ',
		en: 'Preferred scenarios',
		zh: '偏好剧本类型'
	},
	fieldPlayStyles: {
		ja: 'プレイスタイル',
		en: 'Play styles',
		zh: '游戏风格'
	},
	fieldBoundaries: {
		ja: '地雷・苦手',
		en: 'Boundaries',
		zh: '不适内容'
	},
	fieldSkills: {
		ja: 'できること・スキル',
		en: 'Skills',
		zh: '技能与特长'
	},
	noCharacters: {
		ja: '公開キャラクターはまだありません',
		en: 'No public characters yet',
		zh: '尚无公开角色'
	},
	viewCharacter: {
		ja: '詳細を見る',
		en: 'View detail',
		zh: '查看详情'
	},
	roleDistributionPl: {
		ja: 'PL {pct}%',
		en: 'PL {pct}%',
		zh: 'PL {pct}%'
	},
	roleDistributionGm: {
		ja: 'GM {pct}%',
		en: 'GM {pct}%',
		zh: 'GM {pct}%'
	}
} as const;

const errorText = {
	notFound: {
		ja: 'プロフィールが見つかりません',
		en: 'Profile not found',
		zh: '未找到个人主页'
	},
	notFoundBody: {
		ja: 'このプロフィールは存在しないか、公開されていません。',
		en: 'This profile does not exist or is not accessible.',
		zh: '此个人主页不存在或无法访问。'
	},
	backToTop: {
		ja: 'トップへ戻る',
		en: 'Back to top',
		zh: '返回顶部'
	},
	errorTitle: {
		ja: 'プロフィールを表示できません',
		en: 'Unable to show this profile',
		zh: '无法显示此个人主页'
	},
	errorBody: {
		ja: '時間をおいて再試行してください。',
		en: 'Please try again later.',
		zh: '请稍后重试。'
	}
} as const;

export function getPageI18n(route: RouteI18nState, displayName?: string) {
	const title = displayName
		? {
				ja: `${displayName} | Cerulia`,
				en: `${displayName} | Cerulia`,
				zh: `${displayName} | Cerulia`
			}
		: pageMeta.title;

	return {
		meta: buildLocalizedMeta(route, { ...pageMeta, title }),
		text: localizeTextValues(pageText, route.locale)
	};
}

export function getErrorI18n(route: RouteI18nState) {
	return {
		text: localizeTextValues(errorText, route.locale)
	};
}
