<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data, children } = $props();

	let createMenuOpen = $state(false);

	function toggleCreateMenu() {
		createMenuOpen = !createMenuOpen;
	}

	function closeCreateMenu() {
		createMenuOpen = false;
	}
</script>

<a class="skip-link" href="#app-main">{data.i18n.text.skipToContent}</a>

{#if data.viewer}
	<!-- Signed-in shell: sidebar (desktop) + bottom tabs (mobile) -->
	<div class="app-shell">
		<!-- Desktop sidebar -->
		<nav class="sidebar" aria-label="メインナビゲーション">
			<a class="brand-mark" href={resolve(data.i18n.homeHref)} aria-label={data.i18n.text.homeAriaLabel}>
				Cerulia
			</a>

			<ul class="nav-list" role="list">
				<li>
					<a
						class="nav-item"
						href={resolve('/home')}
						aria-current={$page.url.pathname === '/home' ? 'page' : undefined}
					>
						<span class="nav-icon" aria-hidden="true">
							<Icon icon="lucide:house" width="18" height="18" />
						</span>
						{data.i18n.text.navHome}
					</a>
				</li>
				<li>
					<a
						class="nav-item"
						href={resolve(`/profile/${data.viewer.did}#characters`)}
						aria-current={$page.url.hash === '#characters' ? 'page' : undefined}
					>
						<span class="nav-icon" aria-hidden="true">
							<Icon icon="lucide:sparkles" width="18" height="18" />
						</span>
						{data.i18n.text.navCharacters}
					</a>
				</li>
				<li>
					<a
						class="nav-item"
						href={resolve(`/profile/${data.viewer.did}#sessions`)}
						aria-current={$page.url.hash === '#sessions' ? 'page' : undefined}
					>
						<span class="nav-icon" aria-hidden="true">
							<Icon icon="lucide:clipboard-list" width="18" height="18" />
						</span>
						{data.i18n.text.navSessions}
					</a>
				</li>
				<li>
					<a
						class="nav-item"
						href={resolve(`/profile/${data.viewer.did}`)}
						aria-current={$page.url.pathname === `/profile/${data.viewer.did}` ? 'page' : undefined}
					>
						<span class="nav-icon" aria-hidden="true">
							<Icon icon="lucide:user-round" width="18" height="18" />
						</span>
						{data.i18n.text.navProfile}
					</a>
				</li>
			</ul>

			<div class="sidebar-footer">
				<div class="create-split-btn">
					<a class="create-main" href={resolve('/characters/new')}>
						<span class="create-main-icon" aria-hidden="true">
							<Icon icon="lucide:plus" width="16" height="16" />
						</span>
						{data.i18n.text.navCreate}
					</a>
					<button
						class="create-chevron"
						aria-label={data.i18n.text.navCreateAriaLabel}
						aria-expanded={createMenuOpen}
						onclick={toggleCreateMenu}
					>
						<Icon icon="lucide:chevron-down" width="16" height="16" aria-hidden="true" />
					</button>
				</div>

				{#if createMenuOpen}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="create-menu-backdrop" onclick={closeCreateMenu}></div>
					<ul class="create-menu" role="list">
						<li>
							<button class="create-menu-item" onclick={closeCreateMenu}>
								<span class="create-menu-icon" aria-hidden="true">
									<Icon icon="lucide:sparkles" width="16" height="16" />
								</span>
								{data.i18n.text.navCreateSession}
							</button>
						</li>
						<li>
							<button class="create-menu-item" onclick={closeCreateMenu}>
								<span class="create-menu-icon" aria-hidden="true">
									<Icon icon="lucide:square" width="16" height="16" />
								</span>
								{data.i18n.text.navCreateScenario}
							</button>
						</li>
						<li>
							<button class="create-menu-item" onclick={closeCreateMenu}>
								<span class="create-menu-icon" aria-hidden="true">
									<Icon icon="lucide:circle" width="16" height="16" />
								</span>
								{data.i18n.text.navCreateCampaign}
							</button>
						</li>
						<li>
							<button class="create-menu-item" onclick={closeCreateMenu}>
								<span class="create-menu-icon" aria-hidden="true">
									<Icon icon="lucide:house" width="16" height="16" />
								</span>
								{data.i18n.text.navCreateHouse}
							</button>
						</li>
					</ul>
				{/if}
			</div>

			<div class="locale-row">
				<nav aria-label={data.i18n.text.localeNavAriaLabel}>
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
			</div>
		</nav>

		<!-- Main content area -->
		<main id="app-main" class="shell-main">
			{@render children()}
		</main>

		<!-- Mobile bottom tab bar -->
		<nav class="bottom-tabs" aria-label="モバイルナビゲーション">
			<a
				class="tab-item"
				href={resolve('/home')}
				aria-current={$page.url.pathname === '/home' ? 'page' : undefined}
			>
				<span class="tab-icon" aria-hidden="true">
					<Icon icon="lucide:house" width="18" height="18" />
				</span>
				<span class="tab-label">{data.i18n.text.navHome}</span>
			</a>
			<a class="tab-item" href={resolve(`/profile/${data.viewer.did}#characters`)}>
				<span class="tab-icon" aria-hidden="true">
					<Icon icon="lucide:sparkles" width="18" height="18" />
				</span>
				<span class="tab-label">{data.i18n.text.navCharacters}</span>
			</a>
			<a
				class="tab-item tab-create"
				href={resolve('/characters/new')}
				aria-label={data.i18n.text.navCreateCharacter}
			>
				<span class="tab-create-icon" aria-hidden="true">
					<Icon icon="lucide:plus" width="24" height="24" />
				</span>
			</a>
			<a class="tab-item" href={resolve(`/profile/${data.viewer.did}#sessions`)}>
				<span class="tab-icon" aria-hidden="true">
					<Icon icon="lucide:clipboard-list" width="18" height="18" />
				</span>
				<span class="tab-label">{data.i18n.text.navSessions}</span>
			</a>
			<a class="tab-item" href={resolve(`/profile/${data.viewer.did}`)}>
				<span class="tab-icon" aria-hidden="true">
					<Icon icon="lucide:user-round" width="18" height="18" />
				</span>
				<span class="tab-label">{data.i18n.text.navProfile}</span>
			</a>
		</nav>
	</div>
{:else}
	<!-- Public shell: simple top header -->
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

					<a class="signin-btn" href={resolve(data.signInHref)}>
						{data.i18n.text.navSignIn}
					</a>
				</div>
			</div>
		</header>

		<main id="app-main">
			{@render children()}
		</main>
	</div>
{/if}

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

	/* ─── Signed-in app shell ────────────────────────────────────────── */
	.app-shell {
		display: grid;
		grid-template-columns: var(--sidebar-width) 1fr;
		grid-template-rows: 1fr;
		min-height: 100vh;
	}

	.sidebar {
		position: sticky;
		top: 0;
		height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.25rem 0.75rem;
		border-right: 1px solid var(--border-subtle);
		background: var(--bg-canvas);
		overflow-y: auto;
	}

	.sidebar .brand-mark {
		display: block;
		padding: 0.25rem 0.75rem 1rem;
		font-size: 20px;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0.75rem;
		border-radius: var(--radius-md);
		font-size: 14px;
		text-decoration: none;
		color: var(--text-secondary);
		transition:
			background 120ms,
			color 120ms;
	}
	.nav-item:hover {
		background: var(--color-gray-100);
		color: var(--text-primary);
	}
	.nav-item[aria-current='page'] {
		background: var(--color-blue-50);
		color: var(--action-primary);
		font-weight: 600;
	}

	.nav-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
	}

	.create-main-icon,
	.create-menu-icon,
	.tab-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.sidebar-footer {
		margin-top: auto;
		position: relative;
	}

	.create-split-btn {
		display: flex;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--border-default);
	}

	.create-main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.6rem 0.75rem;
		background: var(--action-primary);
		color: var(--action-primary-text);
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
		transition: background 120ms;
	}
	.create-main:hover {
		background: var(--action-primary-hover);
	}

	.create-chevron {
		padding: 0.6rem 0.6rem;
		background: var(--action-primary);
		color: var(--action-primary-text);
		border: none;
		border-left: 1px solid rgba(255, 255, 255, 0.25);
		font-size: 12px;
		cursor: pointer;
		transition: background 120ms;
	}
	.create-chevron:hover {
		background: var(--action-primary-hover);
	}

	.create-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.create-menu {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		list-style: none;
		margin: 0;
		padding: 0.375rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 20;
	}

	.create-menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.6rem;
		border: none;
		border-radius: var(--radius-sm);
		background: none;
		font-size: 14px;
		cursor: pointer;
		text-align: left;
		color: var(--text-primary);
		transition: background 120ms;
	}
	.create-menu-item:hover {
		background: var(--color-gray-100);
	}

	.locale-row {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
	}

	.locale-row nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.shell-main {
		grid-column: 2;
		min-width: 0;
		overflow-x: hidden;
	}

	/* ─── Bottom tabs (mobile only) ──────────────────────────────────── */
	.bottom-tabs {
		display: none;
	}

	/* ─── Mobile overrides ───────────────────────────────────────────── */
	@media (max-width: 1023px) {
		.app-shell {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr auto;
			padding-bottom: var(--bottomnav-height);
		}

		.sidebar {
			display: none;
		}

		.shell-main {
			grid-column: 1;
		}

		.bottom-tabs {
			display: flex;
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			height: var(--bottomnav-height);
			background: rgba(255, 255, 255, 0.95);
			backdrop-filter: blur(8px);
			border-top: 1px solid var(--border-subtle);
			z-index: 40;
		}

		.tab-item {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 2px;
			text-decoration: none;
			color: var(--text-muted);
			font-size: 10px;
			transition: color 120ms;
		}
		.tab-item:hover,
		.tab-item[aria-current='page'] {
			color: var(--action-primary);
		}

		.tab-label {
			font-size: 10px;
		}

		.tab-create {
			flex: 0 0 56px;
			position: relative;
			top: -8px;
			margin: 0 0.25rem;
		}

		.tab-create-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 48px;
			height: 48px;
			border-radius: var(--radius-full);
			background: var(--action-primary);
			color: var(--action-primary-text);
			font-size: 24px;
			box-shadow: var(--shadow-md);
		}
	}
</style>
