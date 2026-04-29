import { buildLocalizedMeta, type RouteI18nState } from '$lib/i18n/meta';
import {
	getLocaleDefinition,
	localizeTextValues,
	localizePathname,
	SUPPORTED_LOCALES
} from '$lib/i18n/locale';

// ─── Layout ──────────────────────────────────────────────────────────────────

const layoutText = {
	skipToContent: {
		ja: '本文へ移動',
		en: 'Skip to content',
		zh: '跳转到正文'
	},
	homeAriaLabel: {
		ja: 'Cerulia のホームへ戻る',
		en: 'Return to the Cerulia home page',
		zh: '返回 Cerulia 首页'
	},
	localeNavAriaLabel: {
		ja: '表示言語',
		en: 'Display language',
		zh: '显示语言'
	},
	navHome: {
		ja: 'ホーム',
		en: 'Home',
		zh: '首页'
	},
	navCharacters: {
		ja: 'キャラクター',
		en: 'Characters',
		zh: '角色'
	},
	navSessions: {
		ja: '記録',
		en: 'Records',
		zh: '记录'
	},
	navProfile: {
		ja: 'マイページ',
		en: 'My Page',
		zh: '我的页面'
	},
	navCreate: {
		ja: '作成',
		en: 'Create',
		zh: '创建'
	},
	navCreateCharacter: {
		ja: 'キャラクターを作成',
		en: 'Create Character',
		zh: '创建角色'
	},
	navCreateSession: {
		ja: 'セッションを記録',
		en: 'Record Session',
		zh: '记录会话'
	},
	navCreateScenario: {
		ja: 'シナリオを登録',
		en: 'Register Scenario',
		zh: '登录剧本'
	},
	navCreateCampaign: {
		ja: 'キャンペーンを作成',
		en: 'Create Campaign',
		zh: '创建战役'
	},
	navCreateHouse: {
		ja: 'ハウスを作成',
		en: 'Create House',
		zh: '创建社群'
	},
	navCreateAriaLabel: {
		ja: '作成メニューを開く',
		en: 'Open create menu',
		zh: '打开创建菜单'
	},
	navSignIn: {
		ja: 'サインイン',
		en: 'Sign in',
		zh: '登录'
	},
	viewerSignedIn: {
		ja: 'サインイン済み',
		en: 'Signed in',
		zh: '已登录'
	}
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
				href: localizePathname(route.contentPathname, locale)
			};
		}),
		text: localizeTextValues(layoutText, route.locale)
	};
}

// ─── Top page ────────────────────────────────────────────────────────────────

const pageMeta = {
	title: {
		ja: 'Cerulia — TRPG キャラクター管理・共有サービス',
		en: 'Cerulia — TRPG Character Management & Sharing',
		zh: 'Cerulia — TRPG 角色管理与分享服务'
	},
	description: {
		ja: 'どのシステムでもキャラクターを作れる。遊んだ記録が残る。共有できる。Cerulia は TRPG プレイヤーのためのキャラクター管理・共有サービスです。',
		en: 'Create characters for any TRPG system. Keep play records. Share with your table. Cerulia is a character management and sharing service for TRPG players.',
		zh: '为任何TRPG系统创建角色。保留游玩记录。与桌游伙伴分享。Cerulia是为TRPG玩家提供的角色管理与分享服务。'
	}
} as const;

const pageText = {
	heroEyebrow: {
		ja: 'TRPG キャラクター管理・共有',
		en: 'TRPG Character Management & Sharing',
		zh: 'TRPG 角色管理与分享'
	},
	heroTitle: {
		ja: 'キャラクターを作り、記録し、共有する',
		en: 'Create, record, and share your characters',
		zh: '创建、记录并分享你的角色'
	},
	heroLead: {
		ja: 'どのルールシステムでも同じ場所でキャラクターを作れます。セッションを重ねるほど履歴が積み重なり、共有リンクひとつで卓相手に届けられます。',
		en: 'Create characters for any rule system in one place. Records accumulate with every session, and a single link delivers your character to your table.',
		zh: '在同一个地方为任何规则系统创建角色。随着每次游玩，记录不断积累，一个链接即可分享给桌游伙伴。'
	},
	heroCtaPrimary: {
		ja: 'サインインして作成を始める',
		en: 'Sign in to start creating',
		zh: '登录开始创建'
	},
	heroCtaSecondary: {
		ja: '公開キャラクター詳細の例を見る',
		en: 'See a public character detail example',
		zh: '查看公开角色详情示例'
	},
	heroImageAlt: {
		ja: '公開キャラクター詳細の例。立ち絵、主要ステータス、セッション要約を表示',
		en: 'Public character detail example showing portrait, key stats, and session summary',
		zh: '公开角色详情示例，显示立绘、主要属性值和会话摘要'
	},
	pillarsEyebrow: {
		ja: '3 つの価値',
		en: 'Three core values',
		zh: '三大核心价值'
	},
	pillarsHeading: {
		ja: 'Cerulia でできること',
		en: 'What you can do with Cerulia',
		zh: 'Cerulia 能为你做什么'
	},
	pillarCreate: {
		ja: '作る',
		en: 'Create',
		zh: '创建'
	},
	pillarCreateBody: {
		ja: 'CoC、D&D、SW など幅広いシステムのキャラクターシートを schema-backed で作れます。システムが変わっても同じ場所で管理できます。',
		en: 'Create character sheets for a wide range of systems including CoC, D&D, and SW with schema-backed support. Manage everything in one place regardless of system.',
		zh: '为CoC、D&D、SW等多种系统创建基于规范的角色卡。无论系统如何变化，都能在同一地方管理。'
	},
	pillarRecord: {
		ja: '記録する',
		en: 'Record',
		zh: '记录'
	},
	pillarRecordBody: {
		ja: 'セッションを終えたら、いつ・どのシナリオを・どのキャラクターで遊んだかを記録します。成長の履歴もキャラクターに積み重なります。',
		en: 'After each session, record when you played, which scenario, and which character. Growth history accumulates on your character.',
		zh: '每次游玩结束后，记录时间、剧本和角色。成长历史也会积累在角色上。'
	},
	pillarShare: {
		ja: '共有する',
		en: 'Share',
		zh: '分享'
	},
	pillarShareBody: {
		ja: 'キャラクター詳細リンクを卓相手に共有できます。プレイヤープロフィールは自己紹介として使えます。どちらも公開リンクひとつで届きます。',
		en: 'Share a character detail link with your table. Use your player profile as an introduction. Both reach anyone with a single public link.',
		zh: '与桌游伙伴分享角色详情链接。使用玩家档案作为自我介绍。两者都可通过单一公开链接访问。'
	},
	flowEyebrow: {
		ja: '使い方の流れ',
		en: 'How it works',
		zh: '使用流程'
	},
	flowHeading: {
		ja: '作成から共有まで、ひとつの場所で',
		en: 'From creation to sharing, all in one place',
		zh: '从创建到分享，全在一处'
	},
	flowStep1: {
		ja: '見る',
		en: 'Browse',
		zh: '浏览'
	},
	flowStep1Body: {
		ja: '他の PL のキャラクターや卓情報を見る',
		en: 'Browse characters and table info from other players',
		zh: '浏览其他玩家的角色和桌游信息'
	},
	flowStep2: {
		ja: '作る',
		en: 'Create',
		zh: '创建'
	},
	flowStep2Body: {
		ja: 'シートを選んでキャラクターを作成する',
		en: 'Choose a sheet and create your character',
		zh: '选择角色卡，创建你的角色'
	},
	flowStep3: {
		ja: '記録する',
		en: 'Record',
		zh: '记录'
	},
	flowStep3Body: {
		ja: 'セッション後に遊んだ記録を残す',
		en: 'Record your session after play',
		zh: '游玩后记录会话'
	},
	flowStep4: {
		ja: '再共有する',
		en: 'Re-share',
		zh: '再次分享'
	},
	flowStep4Body: {
		ja: '成長したキャラクターを次の卓で共有する',
		en: 'Share your grown character at the next table',
		zh: '在下次游玩时分享成长的角色'
	},
	splitEyebrow: {
		ja: '2 つの共有面',
		en: 'Two sharing surfaces',
		zh: '两个分享界面'
	},
	splitHeading: {
		ja: 'キャラクターとプレイヤー、使い分けられる共有面',
		en: 'Two surfaces for different sharing needs',
		zh: '角色与玩家，各有其用的分享界面'
	},
	splitCharacterTitle: {
		ja: 'キャラクター詳細',
		en: 'Character Detail',
		zh: '角色详情'
	},
	splitCharacterBody: {
		ja: '卓で使うキャラクター情報の共有がメイン。ステータス、立ち絵、セッション履歴を 1 ページに。',
		en: 'Primarily for sharing in-table character information. Stats, portrait, and session history in one page.',
		zh: '主要用于分享桌游用的角色信息。属性值、立绘和会话历史集于一页。'
	},
	splitCharacterCta: {
		ja: 'キャラクター詳細の例を見る',
		en: 'See a character detail example',
		zh: '查看角色详情示例'
	},
	splitProfileTitle: {
		ja: 'プレイヤープロフィール',
		en: 'Player Profile',
		zh: '玩家档案'
	},
	splitProfileBody: {
		ja: '自己紹介と公開キャラクター一覧を束ねる共有面。プレイスタイルや好みを示せます。',
		en: 'A sharing surface for self-introduction and public character collection. Show your play style and preferences.',
		zh: '汇集自我介绍和公开角色列表的分享界面。展示你的游玩风格和偏好。'
	},
	splitProfileCta: {
		ja: 'プレイヤープロフィールの例を見る',
		en: 'See a player profile example',
		zh: '查看玩家档案示例'
	},
	ctaHeading: {
		ja: 'まずはキャラクターを作ってみる',
		en: 'Start by creating a character',
		zh: '从创建一个角色开始'
	},
	ctaBody: {
		ja: 'アカウント登録は Bluesky や AT Protocol 対応サービスのアカウントで行います。新規アカウントを作る必要はありません。',
		en: 'Register with your Bluesky or AT Protocol-compatible account. No new account required.',
		zh: '使用Bluesky或AT Protocol兼容服务的账户注册。无需创建新账户。'
	},
	ctaPrimary: {
		ja: 'サインインして作成を始める',
		en: 'Sign in to start creating',
		zh: '登录开始创建'
	},
	ctaSecondary: {
		ja: '公開キャラクター詳細の例を見る',
		en: 'See a public character detail example',
		zh: '查看公开角色详情示例'
	},
	ctaTertiary: {
		ja: '公開プレイヤープロフィールの例を見る',
		en: 'See a public player profile example',
		zh: '查看公开玩家档案示例'
	},
	trustBody: {
		ja: 'キャラクターデータはあなたの AT Protocol アカウントに保存されます。サービスが変わっても、データはあなたのものです。',
		en: 'Character data is stored in your AT Protocol account. Even if the service changes, your data belongs to you.',
		zh: '角色数据存储在您的AT Protocol账户中。即使服务发生变化，数据也属于您。'
	}
} as const;

export function getPageI18n(route: RouteI18nState) {
	return {
		meta: buildLocalizedMeta(route, pageMeta),
		text: localizeTextValues(pageText, route.locale)
	};
}
