<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.i18n.meta.title}</title>
	<meta name="description" content={data.i18n.meta.description} />
	<meta name="robots" content={data.i18n.meta.robots} />
	<link rel="canonical" href={data.i18n.meta.canonicalUrl} />
	<link rel="alternate" href={data.i18n.meta.xDefaultUrl} hreflang="x-default" />
	{#each data.i18n.meta.alternateLinks as alternate (alternate.locale)}
		<link rel="alternate" href={alternate.href} hreflang={alternate.hrefLang} />
	{/each}
</svelte:head>

<section class="sign-in-page" aria-labelledby="sign-in-heading">
	<div class="sign-in-inner">
		<div class="sign-in-copy">
			<p class="eyebrow">{data.i18n.text.eyebrow}</p>
			<h1 id="sign-in-heading" class="sign-in-title">{data.i18n.text.heading}</h1>
			<p class="sign-in-lead">{data.i18n.text.lead}</p>
		</div>

		<form class="sign-in-form" method="GET" action={resolve(data.loginAction)}>
			<input type="hidden" name="returnTo" value={data.returnTo} />
			<label class="field-label" for="identifier">{data.i18n.text.identifierLabel}</label>
			<p class="field-hint">{data.i18n.text.identifierHint}</p>
			<input
				id="identifier"
				name="identifier"
				type="text"
				class="text-input"
				placeholder={data.i18n.text.identifierPlaceholder}
				autocomplete="username"
				required
			/>
			<button class="submit-btn" type="submit">{data.i18n.text.submit}</button>
			<a class="back-link" href={data.backHref}>{data.i18n.text.back}</a>
		</form>
	</div>
</section>

<style>
	.sign-in-page {
		padding: 4rem 1.5rem 5rem;
	}

	.sign-in-inner {
		max-width: 960px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(320px, 420px);
		gap: 2rem;
		align-items: start;
	}

	.eyebrow {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--action-primary);
		margin-bottom: 0.75rem;
	}

	.sign-in-title {
		font-size: clamp(28px, 4vw, 40px);
		line-height: 1.2;
		margin-bottom: 1rem;
		color: var(--text-primary);
	}

	.sign-in-lead {
		font-size: 16px;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.sign-in-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl);
		background: var(--bg-elevated);
		box-shadow: var(--shadow-sm);
	}

	.field-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.field-hint {
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.text-input {
		width: 100%;
		padding: 0.8rem 0.9rem;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		font: inherit;
		color: var(--text-primary);
		background: var(--bg-canvas);
	}

	.submit-btn {
		padding: 0.8rem 1rem;
		border: none;
		border-radius: var(--radius-full);
		background: var(--action-primary);
		color: var(--action-primary-text);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.submit-btn:hover {
		background: var(--action-primary-hover);
	}

	.back-link {
		font-size: 14px;
		color: var(--text-secondary);
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--text-primary);
	}

	@media (max-width: 767px) {
		.sign-in-page {
			padding-top: 3rem;
		}

		.sign-in-inner {
			grid-template-columns: 1fr;
		}
	}
</style>