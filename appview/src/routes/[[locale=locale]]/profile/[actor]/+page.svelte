<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHead from '$lib/components/PageHead.svelte';
	import Icon from '@iconify/svelte';

	let { data } = $props();
</script>

<PageHead meta={data.i18n.meta} robots="index,follow" ogType="profile" twitterCard="summary" />

{#if data.view}
	{@const view = data.view!}
	{@const summary = view.profileSummary}
	{@const branches = view.publicBranches ?? []}

	<div class="profile-page">
		<!-- ── 1. Hero ───────────────────────────────────────────────── -->
		<section class="hero-section" aria-labelledby="profile-name-heading">
			<div class="hero-inner">
				<!-- Avatar -->
				<div class="avatar-frame" aria-hidden="true">
					{#if summary?.avatar}
						<img
							class="avatar-img"
							src="/api/blob/{summary.avatar.ref.$link}"
							alt=""
							loading="eager"
							width="120"
							height="120"
						/>
					{:else}
						<div class="avatar-placeholder">
							<Icon icon="lucide:user" width="40" height="40" />
						</div>
					{/if}
				</div>

				<!-- Identity -->
				<div class="hero-info">
					<h1 id="profile-name-heading" class="profile-name">
						{summary?.displayName ?? data.actor}
					</h1>

					{#if summary?.pronouns}
						<p class="profile-pronouns">{summary.pronouns}</p>
					{/if}

					{#if summary?.description}
						<p class="profile-description">{summary.description}</p>
					{/if}

					{#if summary?.website}
						<a
							class="profile-website"
							href={summary.website}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Icon icon="lucide:globe" width="14" height="14" aria-hidden="true" />
							{summary.website}
						</a>
					{/if}

					{#if summary?.roleDistribution !== undefined}
						<div class="role-bar" aria-label="プレイヤー役割比率">
							<div
								class="role-bar-pl"
								style="width: {summary.roleDistribution}%"
								title="PL {summary.roleDistribution}%"
							></div>
							<div
								class="role-bar-gm"
								style="width: {100 - summary.roleDistribution}%"
								title="GM {100 - summary.roleDistribution}%"
							></div>
						</div>
						<p class="role-bar-label">
							PL {summary.roleDistribution}% / GM {100 - summary.roleDistribution}%
						</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- ── 2. TRPG プロフィール ──────────────────────────────── -->
		{#if summary && (summary.playFormats?.length || summary.tools?.length || summary.ownedRulebooks || summary.playableTimeSummary || summary.preferredScenarioStyles?.length || summary.playStyles?.length || summary.boundaries?.length || summary.skills?.length)}
			<section class="content-section" aria-labelledby="section-trpg">
				<div class="section-inner">
					<h2 id="section-trpg" class="section-heading">{data.i18n.text.sectionTrpgProfile}</h2>
					<dl class="profile-fields">
						{#if summary.playFormats && summary.playFormats.length > 0}
							<div class="field-row">
								<dt class="field-label">{data.i18n.text.fieldPlayFormats}</dt>
								<dd class="field-value">
									<ul class="tag-list" role="list">
										{#each summary.playFormats as fmt (fmt)}
											<li class="tag">{fmt}</li>
										{/each}
									</ul>
								</dd>
							</div>
						{/if}

						{#if summary.tools && summary.tools.length > 0}
							<div class="field-row">
								<dt class="field-label">{data.i18n.text.fieldTools}</dt>
								<dd class="field-value">
									<ul class="tag-list" role="list">
										{#each summary.tools as tool (tool)}
											<li class="tag">{tool}</li>
										{/each}
									</ul>
								</dd>
							</div>
						{/if}

						{#if summary.ownedRulebooks}
							<div class="field-row">
								<dt class="field-label">{data.i18n.text.fieldOwnedRulebooks}</dt>
								<dd class="field-value field-text">{summary.ownedRulebooks}</dd>
							</div>
						{/if}

						{#if summary.playableTimeSummary}
							<div class="field-row">
								<dt class="field-label">{data.i18n.text.fieldPlayableTime}</dt>
								<dd class="field-value field-text">{summary.playableTimeSummary}</dd>
							</div>
						{/if}

						{#if summary.preferredScenarioStyles && summary.preferredScenarioStyles.length > 0}
							<div class="field-row">
								<dt class="field-label">{data.i18n.text.fieldPreferredScenarioStyles}</dt>
								<dd class="field-value">
									<ul class="tag-list" role="list">
										{#each summary.preferredScenarioStyles as style (style)}
											<li class="tag">{style}</li>
										{/each}
									</ul>
								</dd>
							</div>
						{/if}

						{#if summary.playStyles && summary.playStyles.length > 0}
							<div class="field-row">
								<dt class="field-label">{data.i18n.text.fieldPlayStyles}</dt>
								<dd class="field-value">
									<ul class="tag-list" role="list">
										{#each summary.playStyles as style (style)}
											<li class="tag">{style}</li>
										{/each}
									</ul>
								</dd>
							</div>
						{/if}

						{#if summary.boundaries && summary.boundaries.length > 0}
							<div class="field-row">
								<dt class="field-label">{data.i18n.text.fieldBoundaries}</dt>
								<dd class="field-value">
									<ul class="tag-list" role="list">
										{#each summary.boundaries as b (b)}
											<li class="tag tag-caution">{b}</li>
										{/each}
									</ul>
								</dd>
							</div>
						{/if}

						{#if summary.skills && summary.skills.length > 0}
							<div class="field-row">
								<dt class="field-label">{data.i18n.text.fieldSkills}</dt>
								<dd class="field-value">
									<ul class="tag-list" role="list">
										{#each summary.skills as skill (skill)}
											<li class="tag">{skill}</li>
										{/each}
									</ul>
								</dd>
							</div>
						{/if}
					</dl>
				</div>
			</section>
		{/if}

		<!-- ── 3. 公開キャラクター ────────────────────────────────── -->
		<section class="content-section" aria-labelledby="section-characters">
			<div class="section-inner">
				<h2 id="section-characters" class="section-heading">{data.i18n.text.sectionCharacters}</h2>
				{#if branches.length === 0}
					<p class="empty-notice">{data.i18n.text.noCharacters}</p>
				{:else}
					<ul class="character-list" role="list">
						{#each branches as branch (branch.characterBranchRef)}
							<li class="character-card">
								<div class="character-info">
									<p class="character-name">{branch.displayName}</p>
									{#if branch.branchLabel}
										<p class="character-branch">{branch.branchLabel}</p>
									{/if}
									<p class="character-ruleset">{branch.rulesetNsid}</p>
								</div>
								<a
									class="character-link"
									href={resolve(`/characters/${encodeURIComponent(branch.characterBranchRef)}`)}
								>
									{data.i18n.text.viewCharacter}
									<Icon icon="lucide:arrow-right" width="14" height="14" aria-hidden="true" />
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	</div>
{/if}

<style>
	/* ─── Profile page ───────────────────────────────────────────────── */
	.profile-page {
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
		display: flex;
		align-items: flex-start;
		gap: 1.75rem;
	}

	/* Avatar */
	.avatar-frame {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-gray-100);
		box-shadow: var(--shadow-sm);
		flex-shrink: 0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
	}

	/* Identity */
	.profile-name {
		font-size: clamp(22px, 3.5vw, 32px);
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 0.3rem;
	}

	.profile-pronouns {
		font-size: 13px;
		color: var(--text-muted);
		margin: 0 0 0.5rem;
	}

	.profile-description {
		font-size: 15px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin: 0 0 0.75rem;
		max-width: 520px;
		white-space: pre-wrap;
	}

	.profile-website {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 13px;
		color: var(--action-primary);
		text-decoration: none;
		margin-bottom: 0.75rem;
		word-break: break-all;
	}

	.profile-website:hover {
		text-decoration: underline;
	}

	/* Role bar */
	.role-bar {
		display: flex;
		height: 8px;
		border-radius: var(--radius-full);
		overflow: hidden;
		width: 240px;
		background: var(--color-gray-200);
	}

	.role-bar-pl {
		background: var(--color-blue-500);
		height: 100%;
		transition: width 300ms ease;
	}

	.role-bar-gm {
		background: var(--color-gray-300);
		height: 100%;
		transition: width 300ms ease;
	}

	.role-bar-label {
		font-size: 12px;
		color: var(--text-muted);
		margin: 0.25rem 0 0;
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

	/* ─── Profile fields ─────────────────────────────────────────────── */
	.profile-fields {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field-row {
		display: grid;
		grid-template-columns: 180px 1fr;
		gap: 0.5rem;
		align-items: baseline;
	}

	.field-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.field-value {
		margin: 0;
	}

	.field-text {
		font-size: 14px;
		color: var(--text-primary);
		line-height: 1.6;
	}

	/* Tags */
	.tag-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.tag {
		font-size: 12px;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full);
		background: var(--color-gray-100);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.tag-caution {
		background: #fef9c3;
		color: #713f12;
		border-color: #fde047;
	}

	/* ─── Character list ─────────────────────────────────────────────── */
	.character-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}

	.character-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		background: var(--bg-canvas);
		box-shadow: var(--shadow-sm);
	}

	.character-info {
		min-width: 0;
	}

	.character-name {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.character-branch {
		font-size: 13px;
		color: var(--text-secondary);
		margin: 0;
	}

	.character-ruleset {
		font-size: 12px;
		color: var(--text-muted);
		margin: 0;
		font-family: monospace;
	}

	.character-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 13px;
		font-weight: 500;
		color: var(--action-primary);
		text-decoration: none;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.character-link:hover {
		text-decoration: underline;
	}

	/* ─── Empty notice ───────────────────────────────────────────────── */
	.empty-notice {
		font-size: 14px;
		color: var(--text-muted);
		margin: 0;
	}

	/* ─── Responsive ─────────────────────────────────────────────────── */
	@media (max-width: 767px) {
		.hero-section {
			padding: 1.5rem 0 2rem;
		}

		.hero-inner {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.profile-description {
			max-width: none;
		}

		.role-bar {
			margin: 0 auto;
		}

		.role-bar-label {
			text-align: center;
		}

		.field-row {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}

		.character-list {
			grid-template-columns: 1fr;
		}
	}
</style>
