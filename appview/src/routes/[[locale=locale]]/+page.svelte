<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.i18n.meta.title}</title>
	<meta name="description" content={data.i18n.meta.description} />
	<meta name="robots" content={data.i18n.meta.robots} />
	<link rel="canonical" href={data.i18n.meta.canonicalUrl} />
	<link rel="alternate" href={data.i18n.meta.xDefaultUrl} hreflang="x-default" />
	{#each data.i18n.meta.alternateLinks as alternate}
		<link rel="alternate" href={alternate.href} hreflang={alternate.hrefLang} />
	{/each}
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Cerulia" />
	<meta property="og:title" content={data.i18n.meta.title} />
	<meta property="og:description" content={data.i18n.meta.description} />
	<meta property="og:url" content={data.i18n.meta.canonicalUrl} />
	<meta property="og:locale" content={data.i18n.meta.ogLocale} />
	{#each data.i18n.meta.ogAlternateLocales as alternateLocale}
		<meta property="og:locale:alternate" content={alternateLocale} />
	{/each}
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={data.i18n.meta.title} />
	<meta name="twitter:description" content={data.i18n.meta.description} />
</svelte:head>

<main id="app-main" class="foundation-page">
	<section class="hero" aria-labelledby="foundation-title">
		<div class="hero-copy">
			<p class="eyebrow">Cerulia AppView</p>
			<h1 id="foundation-title">{data.i18n.text.heroTitle}</h1>
			<p class="lead">{data.i18n.text.heroLead}</p>
		</div>

		<div class="hero-panel" aria-label={data.i18n.text.translationApiExampleAriaLabel}>
			<p class="panel-label">Svelte</p>
			<pre><code>{data.i18n.text.codeExample}</code></pre>
			<p class="panel-note">{data.i18n.text.panelNote}</p>
		</div>
	</section>

	<section class="pillars" aria-labelledby="pillar-title">
		<div class="section-heading">
			<p class="eyebrow">Foundation</p>
			<h2 id="pillar-title">{data.i18n.text.pillarHeading}</h2>
		</div>

		<div class="pillar-grid">
			{#each data.i18n.text.pillars as pillar}
				<article class="pillar-card" aria-labelledby={`pillar-${pillar.name}`}>
					<h3 id={`pillar-${pillar.name}`}>{pillar.title}</h3>
					<p>{pillar.body}</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="checklist" aria-labelledby="checklist-title">
		<div class="section-heading">
			<p class="eyebrow">Constraints</p>
			<h2 id="checklist-title">{data.i18n.text.checklistHeading}</h2>
		</div>

		<ul>
			{#each data.i18n.text.checklist as item}
				<li>{item.label}</li>
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
		font-family: 'SFMono-Regular', 'Consolas', monospace;
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
