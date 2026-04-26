<script lang="ts">
import { useI18n } from "$lib/i18n/runtime.svelte";

const i18n = useI18n();
const { t } = i18n;

const meta = $derived(
	i18n.meta({
		title: {
			ja: "Cerulia AppView の多言語基盤",
			en: "Cerulia AppView locale foundation",
			zh: "Cerulia AppView 多语言基础",
		},
		description: {
			ja: "パスベースの locale ルーティング、インライン翻訳 API、locale-aware な metadata を確認するための基盤ページです。",
			en: "A foundation page that demonstrates path-based locale routing, inline translations, and locale-aware metadata.",
			zh: "用于演示基于路径的语言路由、内联翻译 API 与语言感知 metadata 的基础页面。",
		},
	}),
);

const pillars = [
	{
		name: "routing",
		title: {
			ja: "URL が locale の正本です",
			en: "The URL is the locale source of truth",
			zh: "URL 是语言的单一真相来源",
		},
		body: {
			ja: "未指定の経路は日本語、/en/* は英語、/zh/* は中国語、/ja/* は正規 URL へリダイレクトします。",
			en: "Unprefixed routes stay Japanese, /en/* stays English, /zh/* stays Chinese, and /ja/* redirects to the canonical path.",
			zh: "未带前缀的路径使用日语，/en/* 使用英语，/zh/* 使用中文，/ja/* 会重定向到规范 URL。",
		},
	},
	{
		name: "inline-copy",
		title: {
			ja: "翻訳は Svelte ファイルの近くに置きます",
			en: "Translations stay next to the Svelte code",
			zh: "翻译内容与 Svelte 代码保持邻近",
		},
		body: {
			ja: "t({ ja: ..., en: ... }) をその場で呼べるため、コンポーネントの文脈を失わずに文言を管理できます。",
			en: "You can call t({ ja: ..., en: ... }) in place, so the component keeps its copy close to the UI that uses it.",
			zh: "可以直接调用 t({ ja: ..., en: ... })，让组件文案与对应 UI 保持在同一上下文。",
		},
	},
	{
		name: "metadata",
		title: {
			ja: "head も locale から組み立てます",
			en: "Head metadata is assembled from the locale state",
			zh: "head metadata 也从语言状态生成",
		},
		body: {
			ja: "html lang、canonical、hreflang、OG locale を同じ route 状態から導出し、ズレを防ぎます。",
			en: "html lang, canonical URLs, hreflang links, and Open Graph locale tags come from the same route state to avoid drift.",
			zh: "html lang、canonical、hreflang 与 Open Graph locale 标签都从同一个路由状态派生，避免彼此漂移。",
		},
	},
];

const checklist = [
	{
		label: {
			ja: "Cerulia の実機能はまだ入れない",
			en: "Do not implement Cerulia product flows yet",
			zh: "暂时不要实现 Cerulia 产品流程",
		},
	},
	{
		label: {
			ja: "将来の locale 追加で route 構造を増やしすぎない",
			en: "Do not multiply route trees when a new locale is added",
			zh: "新增语言时不要复制整棵路由树",
		},
	},
	{
		label: {
			ja: "翻訳欠落時は日本語へ安全に戻す",
			en: "Fall back to Japanese when a translation is missing",
			zh: "翻译缺失时安全回退到日语",
		},
	},
];
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<meta name="robots" content={meta.robots} />
	<link rel="canonical" href={meta.canonicalUrl} />
	<link rel="alternate" href={meta.xDefaultUrl} hreflang="x-default" />
	{#each meta.alternateLinks as alternate}
		<link rel="alternate" href={alternate.href} hreflang={alternate.hrefLang} />
	{/each}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Cerulia" />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:url" content={meta.canonicalUrl} />
	<meta property="og:locale" content={meta.ogLocale} />
	{#each meta.ogAlternateLocales as alternateLocale}
		<meta property="og:locale:alternate" content={alternateLocale} />
	{/each}
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
</svelte:head>

<main id="app-main" class="foundation-page">
	<section class="hero" aria-labelledby="foundation-title">
		<div class="hero-copy">
			<p class="eyebrow">Cerulia AppView</p>
			<h1 id="foundation-title">
				{t({
					ja: "多言語対応の基盤だけを先に成立させる",
					en: "Establish only the locale foundation first",
					zh: "先建立多语言基础，而不是功能本体",
				})}
			</h1>
			<p class="lead">
				{t({
					ja: "この画面は、Cerulia の機能を実装する前に、locale ルーティング、インライン翻訳、metadata、アクセシビリティの足場を確認するためのプレースホルダーです。",
					en: "This placeholder verifies locale routing, inline translations, metadata, and accessibility before Cerulia product features exist.",
					zh: "这个占位页用于先验证语言路由、内联翻译、metadata 与可访问性，再开始实现 Cerulia 的产品功能。",
				})}
			</p>
		</div>

		<div class="hero-panel" aria-label={t({ ja: "翻訳 API の例", en: "Inline translation API example", zh: "内联翻译 API 示例" })}>
			<p class="panel-label">Svelte</p>
			<pre><code>{`const { t } = useI18n();

<h1>{t({
  ja: "こんにちは",
  en: "Hello",
  zh: "你好"
})}</h1>`}</code></pre>
			<p class="panel-note">
				{t({
					ja: "タグ指定や外部キーではなく、文脈の近くに翻訳を書きます。",
					en: "The translation stays near the component instead of moving into tag syntax or distant keys.",
					zh: "翻译内容保持在组件上下文附近，而不是拆到标签语法或远处的 key。",
				})}
			</p>
		</div>
	</section>

	<section class="pillars" aria-labelledby="pillar-title">
		<div class="section-heading">
			<p class="eyebrow">Foundation</p>
			<h2 id="pillar-title">{t({ ja: "この基盤で固定すること", en: "What this foundation fixes", zh: "这套基础固定了什么" })}</h2>
		</div>

		<div class="pillar-grid">
			{#each pillars as pillar}
				<article class="pillar-card" aria-labelledby={`pillar-${pillar.name}`}>
					<h3 id={`pillar-${pillar.name}`}>{t(pillar.title)}</h3>
					<p>{t(pillar.body)}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="checklist" aria-labelledby="checklist-title">
		<div class="section-heading">
			<p class="eyebrow">Constraints</p>
			<h2 id="checklist-title">{t({ ja: "今回わざとやらないこと", en: "What this page deliberately avoids", zh: "这个页面刻意不做的事" })}</h2>
		</div>

		<ul>
			{#each checklist as item}
				<li>{t(item.label)}</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	.foundation-page {
		max-width: 72rem;
		margin: 0 auto;
		display: grid;
		gap: 2rem;
		padding: 0 0 2rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
		gap: 1.5rem;
		align-items: stretch;
	}

	.hero-copy,
		.hero-panel,
		.pillar-card,
		.checklist {
		padding: clamp(1.25rem, 2.5vw, 2rem);
		border: 1px solid rgba(19, 35, 47, 0.09);
		border-radius: 1.75rem;
		background: rgba(250, 252, 255, 0.85);
		box-shadow: 0 24px 48px rgba(19, 35, 47, 0.08);
	}

	.eyebrow,
		.panel-label {
		margin: 0 0 0.75rem;
		font-size: 0.82rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #4a697e;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.7rem, 7vw, 5.1rem);
		line-height: 0.95;
	}

	.lead {
		margin: 1rem 0 0;
		max-width: 38rem;
		font-size: 1.05rem;
		line-height: 1.8;
		color: rgba(19, 35, 47, 0.78);
	}

	.hero-panel {
		display: grid;
		gap: 0.85rem;
		align-content: start;
		background:
			linear-gradient(180deg, rgba(12, 28, 39, 0.95), rgba(18, 51, 74, 0.98)),
			radial-gradient(circle at top right, rgba(119, 202, 255, 0.22), transparent 45%);
		color: #f5fbff;
	}

	pre {
		margin: 0;
		padding: 1rem;
		border-radius: 1rem;
		overflow-x: auto;
		background: rgba(255, 255, 255, 0.08);
	}

	code {
		font-family: "SFMono-Regular", "Consolas", monospace;
		font-size: 0.92rem;
	}

	.panel-note {
		margin: 0;
		color: rgba(245, 251, 255, 0.82);
	}

	.section-heading {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 1rem;
	}

	.section-heading h2,
		.pillar-card h3 {
		margin: 0;
	}

	.pillar-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.pillar-card p,
		.checklist li {
		line-height: 1.7;
		color: rgba(19, 35, 47, 0.8);
	}

	.checklist ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.checklist li + li {
		margin-top: 0.75rem;
	}

	@media (max-width: 900px) {
		.hero,
		.pillar-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.foundation-page {
			gap: 1.25rem;
		}

		.hero-copy,
			.hero-panel,
			.pillar-card,
			.checklist {
			padding: 1.15rem;
			border-radius: 1.3rem;
		}

		h1 {
			font-size: clamp(2.2rem, 15vw, 3.6rem);
		}
	}
</style>