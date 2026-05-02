<script lang="ts">
	import PageHead from '$lib/components/PageHead.svelte';
	import Icon from '@iconify/svelte';

	let { data } = $props();
</script>

<PageHead
	meta={data.i18n.meta}
	robots="index,follow"
	ogType="profile"
	twitterCard="summary_large_image"
/>

{#if data.view}
	{@const view = data.view!}
	{@const branch = view.branchSummary}
	{@const sheet = view.sheetSummary}
	{@const sessions = view.recentSessionSummaries ?? []}
	{@const advancements = view.advancementSummaries ?? []}
	{@const isDraft = branch?.visibility === 'draft'}

	<div class="character-detail">
		<!-- ── Draft notice ─────────────────────────────────────────── -->
		{#if isDraft}
			<div class="draft-banner" role="status">
				<Icon icon="lucide:eye-off" width="16" height="16" aria-hidden="true" />
				<span>{data.i18n.text.draftNotice}</span>
			</div>
		{/if}

		<!-- ── 1. Hero ───────────────────────────────────────────────── -->
		<section class="hero-section" aria-labelledby="char-name-heading">
			<div class="hero-inner">
				<!-- Portrait -->
				<div class="portrait-frame" aria-hidden="true">
					{#if sheet?.portraitBlob}
						<img
							class="portrait-img"
							src="/api/blob/{sheet.portraitBlob.ref.$link}"
							alt=""
							loading="eager"
							width="280"
							height="392"
						/>
					{:else}
						<div class="portrait-placeholder">
							<Icon icon="lucide:user" width="64" height="64" />
						</div>
					{/if}
				</div>

				<!-- Identity and stats -->
				<div class="hero-info">
					<div class="hero-meta-row">
						<span class="ruleset-badge">{sheet?.rulesetNsid ?? '—'}</span>
						{#if branch}
							<span class="visibility-badge" class:draft={isDraft}>
								{isDraft ? data.i18n.text.visibilityDraft : data.i18n.text.visibilityPublic}
							</span>
						{/if}
					</div>

					<h1 id="char-name-heading" class="char-name">
						{sheet?.displayName ?? '—'}
					</h1>

					{#if branch?.branchLabel}
						<p class="branch-label">{branch.branchLabel}</p>
					{/if}

					{#if sheet?.profileSummary}
						<p class="profile-summary">{sheet.profileSummary}</p>
					{/if}

					<!-- Key stats -->
					{#if sheet?.structuredStats && sheet.structuredStats.length > 0}
						<div class="stats-grid" aria-label="主要ステータス">
							{#each sheet.structuredStats.slice(0, 8) as stat (stat.fieldId)}
								<div class="stat-cell">
									<span class="stat-label">{stat.label}</span>
									<span class="stat-value">{stat.value ?? '—'}</span>
								</div>
							{/each}
						</div>
					{:else if sheet && !sheet.structuredStats}
						<p class="schemaless-notice">{data.i18n.text.schemalessNotice}</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- ── 2. 人物像 ──────────────────────────────────────────── -->
		{#if sheet?.profileSummary}
			<section class="content-section" aria-labelledby="section-profile">
				<div class="section-inner">
					<h2 id="section-profile" class="section-heading">{data.i18n.text.sectionProfile}</h2>
					<p class="profile-text">{sheet.profileSummary}</p>
				</div>
			</section>
		{/if}

		<!-- ── 3. 遊んだ記録 ─────────────────────────────────────── -->
		<section class="content-section" aria-labelledby="section-sessions">
			<div class="section-inner">
				<h2 id="section-sessions" class="section-heading">{data.i18n.text.sectionSessions}</h2>
				{#if sessions.length === 0}
					<p class="empty-notice">{data.i18n.text.noSessions}</p>
				{:else}
					<ol class="session-list" role="list">
						{#each sessions as session (session.sessionRef)}
							<li class="session-card">
								<div class="session-header">
									<span class="session-role-badge">
										{session.role === 'gm' ? data.i18n.text.roleGm : data.i18n.text.rolePl}
									</span>
									<time class="session-date" datetime={session.playedAt}>
										{new Date(session.playedAt).toLocaleDateString()}
									</time>
								</div>
								{#if session.scenarioLabel}
									<p class="session-scenario">{session.scenarioLabel}</p>
								{/if}
								{#if session.outcomeSummary}
									<p class="session-outcome">{session.outcomeSummary}</p>
								{/if}
								{#if session.externalArchiveUris && session.externalArchiveUris.length > 0}
									<ul class="session-links" role="list">
										{#each session.externalArchiveUris as uri (uri)}
											<li>
												<a
													class="session-archive-link"
													href={uri}
													target="_blank"
													rel="noopener noreferrer"
												>
													<Icon
														icon="lucide:external-link"
														width="14"
														height="14"
														aria-hidden="true"
													/>
													{uri}
												</a>
											</li>
										{/each}
									</ul>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		</section>

		<!-- ── 4. 成長 ───────────────────────────────────────────── -->
		{#if advancements.length > 0}
			<section class="content-section" aria-labelledby="section-advancements">
				<div class="section-inner">
					<h2 id="section-advancements" class="section-heading">
						{data.i18n.text.sectionAdvancements}
					</h2>
					<ol class="advancement-list" role="list">
						{#each advancements as adv (adv.advancementRef)}
							<li class="advancement-row">
								<time class="advancement-date" datetime={adv.effectiveAt}>
									{new Date(adv.effectiveAt).toLocaleDateString()}
								</time>
								<span class="advancement-kind">{adv.advancementKind}</span>
								{#if adv.sessionSummary?.scenarioLabel}
									<span class="advancement-scenario">
										{adv.sessionSummary.scenarioLabel}
									</span>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			</section>
		{/if}
	</div>
{/if}

<style>
	/* ─── Draft banner ───────────────────────────────────────────────── */
	.draft-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.5rem;
		background: #fef9c3;
		border-bottom: 1px solid #fde047;
		font-size: 13px;
		color: #713f12;
	}

	/* ─── Character detail wrapper ───────────────────────────────────── */
	.character-detail {
		display: flex;
		flex-direction: column;
	}

	/* ─── Hero ───────────────────────────────────────────────────────── */
	.hero-section {
		background: linear-gradient(160deg, var(--color-blue-50) 0%, var(--color-white) 70%);
		padding: 2.5rem 0 3rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.hero-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 2.5rem;
		align-items: start;
	}

	/* Portrait */
	.portrait-frame {
		width: 280px;
		aspect-ratio: 5 / 7;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--color-gray-100);
		box-shadow: var(--shadow-md);
		flex-shrink: 0;
	}

	.portrait-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.portrait-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
	}

	/* Hero info */
	.hero-meta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.ruleset-badge {
		font-size: 12px;
		font-weight: 500;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-default);
		color: var(--text-secondary);
		background: var(--bg-canvas);
		font-family: monospace;
	}

	.visibility-badge {
		font-size: 12px;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full);
		background: var(--color-blue-100);
		color: var(--color-blue-700);
	}

	.visibility-badge.draft {
		background: #fef9c3;
		color: #713f12;
	}

	.char-name {
		font-size: clamp(24px, 4vw, 40px);
		font-weight: 700;
		line-height: 1.2;
		color: var(--text-primary);
		margin: 0 0 0.5rem;
	}

	.branch-label {
		font-size: 14px;
		color: var(--text-secondary);
		margin: 0 0 0.75rem;
	}

	.profile-summary {
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin: 0 0 1.5rem;
		max-width: 560px;
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 0.5rem;
		max-width: 560px;
	}

	.stat-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem 0.4rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--bg-canvas);
		text-align: center;
	}

	.stat-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.stat-value {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.schemaless-notice {
		font-size: 13px;
		color: var(--text-muted);
		margin: 0;
	}

	/* ─── Content sections ───────────────────────────────────────────── */
	.content-section {
		border-bottom: 1px solid var(--border-subtle);
		padding: 2.5rem 0;
	}

	.section-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.section-heading {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 1.5rem;
	}

	/* ─── Profile text ───────────────────────────────────────────────── */
	.profile-text {
		font-size: 15px;
		line-height: 1.8;
		color: var(--text-secondary);
		max-width: 720px;
		white-space: pre-wrap;
		margin: 0;
	}

	/* ─── Session list ───────────────────────────────────────────────── */
	.session-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.session-card {
		padding: 1rem 1.25rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		background: var(--bg-canvas);
		box-shadow: var(--shadow-sm);
	}

	.session-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.session-role-badge {
		font-size: 11px;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-full);
		background: var(--color-blue-100);
		color: var(--color-blue-700);
		text-transform: uppercase;
	}

	.session-date {
		font-size: 13px;
		color: var(--text-muted);
	}

	.session-scenario {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 0.4rem;
	}

	.session-outcome {
		font-size: 14px;
		color: var(--text-secondary);
		margin: 0 0 0.5rem;
		line-height: 1.6;
	}

	.session-links {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.session-archive-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 13px;
		color: var(--action-primary);
		text-decoration: none;
		word-break: break-all;
	}

	.session-archive-link:hover {
		text-decoration: underline;
	}

	/* ─── Advancement list ───────────────────────────────────────────── */
	.advancement-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.advancement-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--border-subtle);
		font-size: 14px;
	}

	.advancement-date {
		color: var(--text-muted);
		font-size: 13px;
		flex-shrink: 0;
	}

	.advancement-kind {
		font-weight: 600;
		color: var(--text-primary);
	}

	.advancement-scenario {
		color: var(--text-secondary);
	}

	/* ─── Empty notice ───────────────────────────────────────────────── */
	.empty-notice {
		font-size: 14px;
		color: var(--text-muted);
		margin: 0;
	}

	/* ─── Responsive ─────────────────────────────────────────────────── */
	@media (max-width: 1023px) {
		.hero-inner {
			grid-template-columns: 200px 1fr;
			gap: 1.5rem;
		}

		.portrait-frame {
			width: 200px;
		}
	}

	@media (max-width: 767px) {
		.hero-section {
			padding: 1.5rem 0 2rem;
		}

		.hero-inner {
			grid-template-columns: 1fr;
			gap: 1.25rem;
		}

		.portrait-frame {
			width: 100%;
			max-width: 280px;
			aspect-ratio: 5 / 7;
			margin: 0 auto;
		}

		.stats-grid {
			max-width: none;
		}
	}
</style>
