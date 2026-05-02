<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHead from '$lib/components/PageHead.svelte';
	import Icon from '@iconify/svelte';

	let { data } = $props();

	const exampleCharacterHref = '#split-character';
	const exampleProfileHref = '#split-profile';
</script>

<PageHead
	meta={data.i18n.meta}
	robots="index,follow"
	ogType="website"
	twitterCard="summary_large_image"
/>

<div class="top-page">
	<!-- ── 1. Hero ──────────────────────────────────────────────────────── -->
	<section id="top-hero" class="hero-section" aria-labelledby="hero-heading">
		<div class="hero-inner">
			<div class="hero-copy">
				<p class="eyebrow">{data.i18n.text.heroEyebrow}</p>
				<h1 id="hero-heading" class="hero-title">{data.i18n.text.heroTitle}</h1>
				<p class="hero-lead">{data.i18n.text.heroLead}</p>
				<div class="hero-ctas">
					<a class="btn-primary" href={resolve(data.signInHref)}>
						{data.i18n.text.heroCtaPrimary}
					</a>
					<a class="btn-ghost" href={exampleCharacterHref}>
						{data.i18n.text.heroCtaSecondary}
					</a>
				</div>
			</div>

			<div class="hero-visual" aria-hidden="true">
				<div class="character-dossier-mock">
					<div class="mock-portrait-area"></div>
					<div class="mock-info">
						<div class="mock-name-line"></div>
						<div class="mock-meta-line"></div>
						<div class="mock-stats-row">
							<div class="mock-stat"></div>
							<div class="mock-stat"></div>
							<div class="mock-stat"></div>
							<div class="mock-stat"></div>
						</div>
					</div>
					<div class="mock-section-header"></div>
					<div class="mock-session-card"></div>
					<div class="mock-session-card short"></div>
				</div>
			</div>
		</div>
	</section>

	<!-- ── 2. Value pillars ─────────────────────────────────────────────── -->
	<section id="top-value-pillars" class="pillars-section" aria-labelledby="pillars-heading">
		<div class="section-inner">
			<div class="section-header">
				<p class="eyebrow">{data.i18n.text.pillarsEyebrow}</p>
				<h2 id="pillars-heading" class="section-title">{data.i18n.text.pillarsHeading}</h2>
			</div>

			<div class="pillars-grid">
				<article class="pillar-card" aria-labelledby="pillar-create">
					<div class="pillar-icon" aria-hidden="true">
						<Icon icon="lucide:sparkles" width="28" height="28" />
					</div>
					<h3 id="pillar-create" class="pillar-title">{data.i18n.text.pillarCreate}</h3>
					<p class="pillar-body">{data.i18n.text.pillarCreateBody}</p>
				</article>

				<article class="pillar-card" aria-labelledby="pillar-record">
					<div class="pillar-icon" aria-hidden="true">
						<Icon icon="lucide:clipboard-list" width="28" height="28" />
					</div>
					<h3 id="pillar-record" class="pillar-title">{data.i18n.text.pillarRecord}</h3>
					<p class="pillar-body">{data.i18n.text.pillarRecordBody}</p>
				</article>

				<article class="pillar-card" aria-labelledby="pillar-share">
					<div class="pillar-icon" aria-hidden="true">
						<Icon icon="lucide:link-2" width="28" height="28" />
					</div>
					<h3 id="pillar-share" class="pillar-title">{data.i18n.text.pillarShare}</h3>
					<p class="pillar-body">{data.i18n.text.pillarShareBody}</p>
				</article>
			</div>
		</div>
	</section>

	<!-- ── 3. Flow preview ──────────────────────────────────────────────── -->
	<section id="top-flow-preview" class="flow-section" aria-labelledby="flow-heading">
		<div class="section-inner">
			<div class="section-header">
				<p class="eyebrow">{data.i18n.text.flowEyebrow}</p>
				<h2 id="flow-heading" class="section-title">{data.i18n.text.flowHeading}</h2>
			</div>

			<ol class="flow-steps" role="list">
				<li class="flow-step">
					<div class="flow-step-num" aria-hidden="true">1</div>
					<h3 class="flow-step-title">{data.i18n.text.flowStep1}</h3>
					<p class="flow-step-body">{data.i18n.text.flowStep1Body}</p>
				</li>
				<div class="flow-arrow" aria-hidden="true">→</div>
				<li class="flow-step">
					<div class="flow-step-num" aria-hidden="true">2</div>
					<h3 class="flow-step-title">{data.i18n.text.flowStep2}</h3>
					<p class="flow-step-body">{data.i18n.text.flowStep2Body}</p>
				</li>
				<div class="flow-arrow" aria-hidden="true">→</div>
				<li class="flow-step">
					<div class="flow-step-num" aria-hidden="true">3</div>
					<h3 class="flow-step-title">{data.i18n.text.flowStep3}</h3>
					<p class="flow-step-body">{data.i18n.text.flowStep3Body}</p>
				</li>
				<div class="flow-arrow" aria-hidden="true">→</div>
				<li class="flow-step">
					<div class="flow-step-num" aria-hidden="true">4</div>
					<h3 class="flow-step-title">{data.i18n.text.flowStep4}</h3>
					<p class="flow-step-body">{data.i18n.text.flowStep4Body}</p>
				</li>
			</ol>
		</div>
	</section>

	<!-- ── 4. Surface split ─────────────────────────────────────────────── -->
	<section id="top-surface-split" class="split-section" aria-labelledby="split-heading">
		<div class="section-inner">
			<div class="section-header">
				<p class="eyebrow">{data.i18n.text.splitEyebrow}</p>
				<h2 id="split-heading" class="section-title">{data.i18n.text.splitHeading}</h2>
			</div>

			<div class="split-grid">
				<article class="split-card" aria-labelledby="split-character">
					<div class="split-visual" aria-hidden="true">
						<div class="split-mock-character">
							<div class="split-mock-portrait"></div>
							<div class="split-mock-lines">
								<div class="split-mock-line w80"></div>
								<div class="split-mock-line w50"></div>
								<div class="split-mock-stats">
									<div class="split-mock-stat"></div>
									<div class="split-mock-stat"></div>
									<div class="split-mock-stat"></div>
								</div>
							</div>
						</div>
					</div>
					<div class="split-copy">
						<h3 id="split-character" class="split-card-title">
							{data.i18n.text.splitCharacterTitle}
						</h3>
						<p class="split-card-body">{data.i18n.text.splitCharacterBody}</p>
						<a class="split-cta" href={exampleCharacterHref}>{data.i18n.text.splitCharacterCta} →</a
						>
					</div>
				</article>

				<article class="split-card" aria-labelledby="split-profile">
					<div class="split-visual" aria-hidden="true">
						<div class="split-mock-profile">
							<div class="split-mock-avatar"></div>
							<div class="split-mock-lines">
								<div class="split-mock-line w60"></div>
								<div class="split-mock-line w80"></div>
								<div class="split-mock-chips">
									<div class="split-mock-chip"></div>
									<div class="split-mock-chip"></div>
									<div class="split-mock-chip"></div>
								</div>
							</div>
						</div>
					</div>
					<div class="split-copy">
						<h3 id="split-profile" class="split-card-title">{data.i18n.text.splitProfileTitle}</h3>
						<p class="split-card-body">{data.i18n.text.splitProfileBody}</p>
						<a class="split-cta" href={exampleProfileHref}>{data.i18n.text.splitProfileCta} →</a>
					</div>
				</article>
			</div>
		</div>
	</section>

	<!-- ── 5. Primary CTA ───────────────────────────────────────────────── -->
	<section id="top-primary-cta" class="cta-section" aria-labelledby="cta-heading">
		<div class="cta-inner">
			<h2 id="cta-heading" class="cta-title">{data.i18n.text.ctaHeading}</h2>
			<p class="cta-body">{data.i18n.text.ctaBody}</p>
			<div class="cta-btns">
				<a class="btn-primary" href={resolve(data.signInHref)}>
					{data.i18n.text.ctaPrimary}
				</a>
				<a class="btn-ghost" href={exampleCharacterHref}>
					{data.i18n.text.ctaSecondary}
				</a>
			</div>
			<p class="cta-tertiary">
				<a class="text-link" href={exampleProfileHref}>{data.i18n.text.ctaTertiary}</a>
			</p>
		</div>
	</section>

	<!-- ── 6. Trust copy ────────────────────────────────────────────────── -->
	<section id="top-trust-copy" class="trust-section">
		<div class="section-inner">
			<p class="trust-body">{data.i18n.text.trustBody}</p>
		</div>
	</section>
</div>

<style>
	/* ─── Page wrapper ───────────────────────────────────────────────── */
	.top-page {
		display: flex;
		flex-direction: column;
	}

	/* ─── Common section ─────────────────────────────────────────────── */
	.section-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.section-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.eyebrow {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--action-primary);
		margin-bottom: 0.5rem;
	}

	.section-title {
		font-size: clamp(22px, 3vw, 32px);
		font-weight: 700;
		color: var(--text-primary);
	}

	/* ─── Hero ───────────────────────────────────────────────────────── */
	.hero-section {
		padding: 5rem 0 4rem;
		background: linear-gradient(160deg, var(--color-blue-50) 0%, var(--color-white) 60%);
	}

	.hero-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
		display: grid;
		grid-template-columns: 7fr 5fr;
		gap: 3rem;
		align-items: center;
	}

	.hero-copy .eyebrow {
		margin-bottom: 0.75rem;
	}

	.hero-title {
		font-size: clamp(28px, 4.5vw, 48px);
		font-weight: 700;
		line-height: 1.2;
		color: var(--text-primary);
		margin-bottom: 1.25rem;
	}

	.hero-lead {
		font-size: 16px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin-bottom: 2rem;
		max-width: 520px;
	}

	.hero-ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	/* ─── Buttons ────────────────────────────────────────────────────── */
	.btn-primary {
		display: inline-flex;
		align-items: center;
		padding: 0.7rem 1.4rem;
		border-radius: var(--radius-full);
		background: var(--action-primary);
		color: var(--action-primary-text);
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
		transition: background 120ms;
	}

	.btn-primary:hover {
		background: var(--action-primary-hover);
	}

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		padding: 0.7rem 1.2rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-default);
		background: transparent;
		color: var(--text-primary);
		font-size: 15px;
		font-weight: 500;
		text-decoration: none;
		transition:
			border-color 120ms,
			background 120ms;
	}

	.btn-ghost:hover {
		border-color: var(--color-gray-400);
		background: var(--color-gray-50);
	}

	/* ─── Hero visual / character dossier mock ───────────────────────── */
	.hero-visual {
		display: flex;
		justify-content: center;
	}

	.character-dossier-mock {
		width: 100%;
		max-width: 380px;
		background: var(--color-white);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.mock-portrait-area {
		width: 100%;
		aspect-ratio: 4 / 3;
		border-radius: var(--radius-lg);
		background: linear-gradient(135deg, var(--color-blue-100), var(--color-blue-50));
	}

	.mock-info {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.mock-name-line {
		height: 18px;
		width: 65%;
		border-radius: var(--radius-sm);
		background: var(--color-gray-200);
	}

	.mock-meta-line {
		height: 12px;
		width: 45%;
		border-radius: var(--radius-sm);
		background: var(--color-gray-100);
	}

	.mock-stats-row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.mock-stat {
		flex: 1;
		height: 36px;
		border-radius: var(--radius-md);
		background: var(--color-gray-100);
	}

	.mock-section-header {
		height: 12px;
		width: 40%;
		border-radius: var(--radius-sm);
		background: var(--color-gray-200);
		margin-top: 0.25rem;
	}

	.mock-session-card {
		height: 44px;
		border-radius: var(--radius-md);
		background: var(--color-gray-50);
		border: 1px solid var(--border-subtle);
	}

	.mock-session-card.short {
		height: 36px;
	}

	/* ─── Value pillars ──────────────────────────────────────────────── */
	.pillars-section {
		padding: 5rem 0;
		background: var(--bg-canvas);
	}

	.pillars-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}

	.pillar-card {
		padding: 2rem 1.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl);
		background: var(--color-white);
		box-shadow: var(--shadow-sm);
		transition:
			box-shadow 160ms,
			transform 160ms;
	}

	.pillar-card:hover {
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.pillar-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.pillar-title {
		font-size: 20px;
		font-weight: 700;
		margin-bottom: 0.75rem;
		color: var(--text-primary);
	}

	.pillar-body {
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	/* ─── Flow preview ───────────────────────────────────────────────── */
	.flow-section {
		padding: 5rem 0;
		background: var(--color-gray-50);
	}

	.flow-steps {
		display: flex;
		align-items: flex-start;
		gap: 0;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.flow-step {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 1.5rem 1rem;
	}

	.flow-step-num {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
		background: var(--action-primary);
		color: var(--action-primary-text);
		font-size: 16px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.flow-step-title {
		font-size: 18px;
		font-weight: 700;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.flow-step-body {
		font-size: 13px;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.flow-arrow {
		flex: 0 0 auto;
		align-self: center;
		font-size: 20px;
		color: var(--color-gray-300);
		padding-bottom: 2rem;
	}

	/* ─── Surface split ──────────────────────────────────────────────── */
	.split-section {
		padding: 5rem 0;
		background: var(--bg-canvas);
	}

	.split-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	.split-card {
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl);
		overflow: hidden;
		background: var(--color-white);
		box-shadow: var(--shadow-sm);
		transition: box-shadow 160ms;
	}

	.split-card:hover {
		box-shadow: var(--shadow-md);
	}

	.split-visual {
		padding: 1.5rem;
		background: var(--color-gray-50);
		border-bottom: 1px solid var(--border-subtle);
	}

	.split-mock-character,
	.split-mock-profile {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.split-mock-portrait {
		width: 60px;
		height: 80px;
		flex-shrink: 0;
		border-radius: var(--radius-md);
		background: linear-gradient(135deg, var(--color-blue-100), var(--color-blue-50));
	}

	.split-mock-avatar {
		width: 56px;
		height: 56px;
		flex-shrink: 0;
		border-radius: var(--radius-full);
		background: linear-gradient(135deg, var(--color-blue-200), var(--color-blue-100));
	}

	.split-mock-lines {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.25rem;
	}

	.split-mock-line {
		height: 12px;
		border-radius: var(--radius-sm);
		background: var(--color-gray-200);
	}

	.split-mock-line.w80 {
		width: 80%;
	}

	.split-mock-line.w60 {
		width: 60%;
	}

	.split-mock-line.w50 {
		width: 50%;
	}

	.split-mock-stats {
		display: flex;
		gap: 0.375rem;
		margin-top: 0.25rem;
	}

	.split-mock-stat {
		flex: 1;
		height: 28px;
		border-radius: var(--radius-sm);
		background: var(--color-gray-100);
	}

	.split-mock-chips {
		display: flex;
		gap: 0.375rem;
		flex-wrap: wrap;
		margin-top: 0.25rem;
	}

	.split-mock-chip {
		width: 52px;
		height: 22px;
		border-radius: var(--radius-full);
		background: var(--color-blue-100);
	}

	.split-copy {
		padding: 1.5rem;
	}

	.split-card-title {
		font-size: 18px;
		font-weight: 700;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.split-card-body {
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin-bottom: 1rem;
	}

	.split-cta {
		font-size: 14px;
		font-weight: 600;
		color: var(--action-primary);
		text-decoration: none;
	}

	.split-cta:hover {
		text-decoration: underline;
	}

	/* ─── Primary CTA ────────────────────────────────────────────────── */
	.cta-section {
		padding: 5rem 0;
		background: var(--color-blue-600);
	}

	.cta-inner {
		max-width: 640px;
		margin: 0 auto;
		padding: 0 1.5rem;
		text-align: center;
	}

	.cta-title {
		font-size: clamp(22px, 3vw, 32px);
		font-weight: 700;
		color: var(--color-white);
		margin-bottom: 1rem;
	}

	.cta-body {
		font-size: 15px;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.85);
		margin-bottom: 2rem;
	}

	.cta-btns {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
		margin-bottom: 1.25rem;
	}

	.cta-section .btn-primary {
		background: var(--color-white);
		color: var(--action-primary);
	}

	.cta-section .btn-primary:hover {
		background: var(--color-gray-100);
	}

	.cta-section .btn-ghost {
		border-color: rgba(255, 255, 255, 0.5);
		color: var(--color-white);
	}

	.cta-section .btn-ghost:hover {
		border-color: var(--color-white);
		background: rgba(255, 255, 255, 0.1);
	}

	.cta-tertiary {
		font-size: 14px;
	}

	.text-link {
		color: rgba(255, 255, 255, 0.8);
		text-decoration: underline;
	}

	.text-link:hover {
		color: var(--color-white);
	}

	/* ─── Trust copy ─────────────────────────────────────────────────── */
	.trust-section {
		padding: 2.5rem 0;
		background: var(--color-gray-50);
		border-top: 1px solid var(--border-subtle);
	}

	.trust-body {
		font-size: 13px;
		color: var(--text-muted);
		text-align: center;
		max-width: 640px;
		margin: 0 auto;
		line-height: 1.7;
	}

	/* ─── Responsive ─────────────────────────────────────────────────── */
	@media (max-width: 1023px) {
		.hero-inner {
			grid-template-columns: 1fr 1fr;
			gap: 2rem;
		}
	}

	@media (max-width: 767px) {
		.hero-section {
			padding: 3rem 0 2.5rem;
		}

		.hero-inner {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.hero-visual {
			order: -1;
		}

		.character-dossier-mock {
			max-width: 100%;
		}

		.pillars-grid {
			grid-template-columns: 1fr;
		}

		.flow-steps {
			flex-direction: column;
			align-items: stretch;
		}

		.flow-arrow {
			transform: rotate(90deg);
			align-self: center;
			padding-bottom: 0;
		}

		.split-grid {
			grid-template-columns: 1fr;
		}

		.section-header {
			margin-bottom: 2rem;
		}

		.pillars-section,
		.flow-section,
		.split-section,
		.cta-section {
			padding: 3.5rem 0;
		}
	}
</style>
