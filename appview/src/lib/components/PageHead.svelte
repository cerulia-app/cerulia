<script lang="ts">
	import type { LocalizedPageMeta } from '$lib/i18n/meta';

	interface Props {
		meta: LocalizedPageMeta;
		robots: string;
		ogType: 'website' | 'profile';
		twitterCard: 'summary' | 'summary_large_image';
	}

	let { meta, robots, ogType, twitterCard }: Props = $props();
</script>

<svelte:head>
	<title>{meta.title}</title>
	<meta name="description" content={meta.description} />
	<meta name="robots" content={robots} />
	<link rel="canonical" href={meta.canonicalUrl} />
	<link rel="alternate" href={meta.xDefaultUrl} hreflang="x-default" />
	{#each meta.alternateLinks as alternate (alternate.locale)}
		<link rel="alternate" href={alternate.href} hreflang={alternate.hrefLang} />
	{/each}
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content="Cerulia" />
	<meta property="og:title" content={meta.title} />
	<meta property="og:description" content={meta.description} />
	<meta property="og:url" content={meta.canonicalUrl} />
	<meta property="og:locale" content={meta.ogLocale} />
	{#each meta.ogAlternateLocales as alternateLocale (alternateLocale)}
		<meta property="og:locale:alternate" content={alternateLocale} />
	{/each}
	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:title" content={meta.title} />
	<meta name="twitter:description" content={meta.description} />
</svelte:head>
