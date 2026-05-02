<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
</script>

<svelte:head>
	<title>{page.error?.message} | Cerulia</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="error-page">
	<div class="error-inner">
		<div class="error-icon" aria-hidden="true">
			<Icon
				icon={page.status === 404 ? 'lucide:user-x' : 'lucide:triangle-alert'}
				width="48"
				height="48"
			/>
		</div>
		<h1 class="error-title">{page.error?.message}</h1>
		<p class="error-body">{page.error?.detail}</p>
		<a class="back-link" href={resolve(page.error?.homeHref ?? '/')}>
			{page.error?.backToTop}
		</a>
	</div>
</div>

<style>
	.error-page {
		padding: 5rem 1.5rem;
		text-align: center;
	}

	.error-inner {
		max-width: 480px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.error-icon {
		color: var(--text-muted);
	}

	.error-title {
		font-size: clamp(20px, 3vw, 28px);
		color: var(--text-primary);
		margin: 0;
	}

	.error-body {
		font-size: 15px;
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.back-link {
		font-size: 14px;
		color: var(--action-primary);
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}
</style>
