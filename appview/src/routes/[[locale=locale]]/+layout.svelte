<script lang="ts">
import { setContext } from "svelte";

import { I18N_CONTEXT_KEY, I18nRuntime } from "$lib/i18n/runtime.svelte";

let { data, children } = $props();

function createI18nRuntime() {
	return new I18nRuntime(data.i18n);
}

const i18n = createI18nRuntime();
const { t } = i18n;

setContext(I18N_CONTEXT_KEY, i18n);

$effect(() => {
	i18n.update(data.i18n);
});
</script>

<a class="skip-link" href="#app-main">{t({ ja: "本文へ移動", en: "Skip to content", zh: "跳转到正文" })}</a>

<div class="shell">
	<header class="shell-header">
		<div class="brand-cluster">
			<a
				class="brand-mark"
				href={i18n.path("/")}
				aria-label={t({
					ja: "Cerulia のホームへ戻る",
					en: "Return to the Cerulia home page",
					zh: "返回 Cerulia 首页",
				})}
			>
				Cerulia
			</a>
			<p class="brand-copy">
				{t({
					ja: "多言語基盤のプレースホルダー。実機能はまだ実装しません。",
					en: "A locale foundation placeholder. Product flows are intentionally not implemented yet.",
					zh: "这是多语言基础占位页。产品功能目前故意不实现。",
				})}
			</p>
		</div>

		<nav
			class="locale-nav"
			aria-label={t({ ja: "表示言語", en: "Display language", zh: "显示语言" })}
		>
			{#each i18n.availableLocales as option}
				<a
					class:current-locale={option.locale === i18n.locale}
					href={option.href}
					lang={option.hrefLang}
					hreflang={option.hrefLang}
					aria-current={option.locale === i18n.locale ? "page" : undefined}
				>
					{option.label}
				</a>
			{/each}
		</nav>
	</header>

	{@render children()}
</div>

<style>
	.skip-link {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 20;
		padding: 0.75rem 1rem;
		border-radius: 999px;
		background: #12334a;
		color: #f8fbff;
		text-decoration: none;
		transform: translateY(-200%);
		transition: transform 160ms ease;
	}

	.skip-link:focus {
		transform: translateY(0);
	}

	.shell {
		min-height: 100vh;
		padding: 1.25rem;
	}

	.shell-header {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2rem;
		align-items: center;
		justify-content: space-between;
		max-width: 72rem;
		margin: 0 auto 1.5rem;
		padding: 1.1rem 1.25rem;
		border: 1px solid rgba(19, 35, 47, 0.1);
		border-radius: 1.5rem;
		background: rgba(248, 251, 255, 0.76);
		backdrop-filter: blur(12px);
		box-shadow: 0 20px 40px rgba(19, 35, 47, 0.07);
	}

	.brand-cluster {
		display: grid;
		gap: 0.3rem;
	}

	.brand-mark {
		font-family: "Newsreader", serif;
		font-size: clamp(1.65rem, 3vw, 2.25rem);
		font-weight: 500;
		letter-spacing: 0.02em;
		text-decoration: none;
	}

	.brand-copy {
		margin: 0;
		max-width: 42rem;
		color: rgba(19, 35, 47, 0.74);
	}

	.locale-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.locale-nav a {
		padding: 0.55rem 0.85rem;
		border: 1px solid rgba(19, 35, 47, 0.14);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.84);
		text-decoration: none;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}

	.locale-nav a:hover,
		.locale-nav a:focus-visible {
		transform: translateY(-1px);
		border-color: rgba(19, 35, 47, 0.34);
		background: #ffffff;
	}

	.current-locale {
		border-color: transparent;
		background: #12334a;
		color: #f8fbff;
	}

	@media (max-width: 640px) {
		.shell {
			padding: 0.9rem;
		}

		.shell-header {
			padding: 1rem;
			border-radius: 1.2rem;
		}
	}
</style>