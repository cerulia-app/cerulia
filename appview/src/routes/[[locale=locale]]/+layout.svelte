<script lang="ts">
	import { resolve } from '$app/paths';

	let { data, children } = $props();
</script>

<a class="skip-link" href="#app-main">{data.i18n.text.skipToContent}</a>


<div class="public-shell">
	<header class="public-header">
		<div class="header-inner">
			<a class="brand-mark" href={resolve(data.i18n.homeHref)} aria-label={data.i18n.text.homeAriaLabel}>
				Cerulia
			</a>

			<div class="header-right">
				<nav class="locale-nav" aria-label={data.i18n.text.localeNavAriaLabel}>
					{#each data.i18n.availableLocales as option (option.locale)}
						<a
							class="locale-link"
							class:current={option.locale === data.i18n.locale}
							href={resolve(option.href)}
							lang={option.hrefLang}
							hreflang={option.hrefLang}
							aria-current={option.locale === data.i18n.locale ? 'page' : undefined}
						>
							{option.label}
						</a>
					{/each}
				</nav>

				{#if data.viewer}
					<p class="viewer-pill">{data.i18n.text.viewerSignedIn}</p>
				{:else}
					<a class="signin-btn" href={resolve(data.signInHref)}>
						{data.i18n.text.navSignIn}
					</a>
				{/if}
			</div>
		</div>
	</header>

	<main id="app-main">
		{@render children()}
	</main>
</div>

<style>
	/* ─── Skip link ──────────────────────────────────────────────────── */
	.skip-link {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 100;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-full);
		background: var(--action-primary);
		color: var(--action-primary-text);
		text-decoration: none;
		font-size: 14px;
		transform: translateY(-200%);
		transition: transform 160ms ease;
	}
	.skip-link:focus {
		transform: translateY(0);
	}

	/* ─── Public shell ───────────────────────────────────────────────── */
	.public-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.public-header {
		position: sticky;
		top: 0;
		z-index: 40;
		border-bottom: 1px solid var(--border-subtle);
		background: rgba(255, 255, 255, 0.92);
		backdrop-filter: blur(8px);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
		height: 56px;
		gap: 1rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	/* ─── Brand mark ─────────────────────────────────────────────────── */
	.brand-mark {
		font-size: 22px;
		font-weight: 700;
		text-decoration: none;
		color: var(--text-primary);
		letter-spacing: -0.02em;
	}

	/* ─── Locale nav ─────────────────────────────────────────────────── */
	.locale-nav {
		display: flex;
		gap: 0.25rem;
	}

	.locale-link {
		padding: 0.3rem 0.6rem;
		border-radius: var(--radius-full);
		font-size: 13px;
		text-decoration: none;
		color: var(--text-secondary);
		transition:
			background 120ms,
			color 120ms;
	}
	.locale-link:hover {
		background: var(--color-gray-100);
		color: var(--text-primary);
	}
	.locale-link.current {
		background: var(--color-gray-900);
		color: var(--color-white);
	}

	/* ─── Sign-in button ─────────────────────────────────────────────── */
	.signin-btn {
		padding: 0.4rem 0.9rem;
		border-radius: var(--radius-full);
		background: var(--action-primary);
		color: var(--action-primary-text);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		transition: background 120ms;
	}
	.signin-btn:hover {
		background: var(--action-primary-hover);
	}

	.viewer-pill {
		margin: 0;
		padding: 0.4rem 0.9rem;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-full);
		background: var(--color-gray-50);
		color: var(--text-primary);
		font-size: 13px;
		font-weight: 600;
	}
</style>
