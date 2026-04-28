<script lang="ts">
	let { data, children } = $props();
</script>

<a class="skip-link" href="#app-main">{data.i18n.text.skipToContent}</a>

<div class="shell">
	<header class="shell-header">
		<div class="brand-cluster">
			<a class="brand-mark" href={data.i18n.homeHref} aria-label={data.i18n.text.homeAriaLabel}> Cerulia </a>
			<p class="brand-copy">{data.i18n.text.brandCopy}</p>
		</div>

		<nav class="locale-nav" aria-label={data.i18n.text.localeNavAriaLabel}>
			{#each data.i18n.availableLocales as option}
				<a
					class:current-locale={option.locale === data.i18n.locale}
					href={option.href}
					lang={option.hrefLang}
					hreflang={option.hrefLang}
					aria-current={option.locale === data.i18n.locale ? 'page' : undefined}
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
		font-family: 'Newsreader', serif;
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
