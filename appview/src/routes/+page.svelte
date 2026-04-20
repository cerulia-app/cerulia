<script lang="ts">
type MutationAck = {
	resultKind: "accepted" | "rejected" | "rebase-needed";
	reasonCode?: string;
	message?: string;
	emittedRecordRefs?: string[];
};

type CharacterHomeResponse = {
	ownerDid: string | null;
	branches: Array<{
		branch_ref: string;
		visibility: "draft" | "public";
		sheet_ref: string;
		display_name: string;
	}>;
	recentSessions: Array<{
		ref: string;
		role: "pl" | "gm";
		played_at: string;
		character_branch_ref: string | null;
	}>;
};

type CharacterBranchViewResponse = {
	branchSummary?: {
		characterBranchRef: string;
		state?: string;
		visibility?: string;
	};
	sheetSummary?: {
		characterSheetRef: string;
		displayName: string;
		profileSummary: string | null;
	};
};

type SessionViewResponse = {
	session?: {
		sessionRef: string;
		state?: string;
		role?: "pl" | "gm";
		playedAt?: string;
		outcomeSummary?: string | null;
	};
	sessionSummary?: {
		sessionRef: string;
		role?: "pl" | "gm";
		playedAt?: string;
		outcomeSummary?: string | null;
	};
};

let apiBase = $state("http://localhost:8787");
let bearerToken = $state("");

let displayName = $state("Alice of Cerulia");
let rulesetNsid = $state("app.cerulia.ruleset.default");
let sheetSchemaRef = $state(
	"at://did:plc:rule/app.cerulia.core.characterSheetSchema/aaa",
);
let branchVisibility = $state<"draft" | "public">("public");

let createdSheetRef = $state("");
let createdBranchRef = $state("");
let expectedSheetRev = $state("1");
let updatedDisplayName = $state("Alice, Revision 2");

let sessionRole = $state<"pl" | "gm">("pl");
let sessionPlayedAt = $state(new Date().toISOString());
let sessionScenarioRef = $state("");
let sessionScenarioLabel = $state("Unknown Ruin");
let sessionOutcomeSummary = $state(
	"We escaped the archive with one unresolved omen.",
);
let createdSessionRef = $state("");

let homeView = $state<CharacterHomeResponse | null>(null);
let branchView = $state<CharacterBranchViewResponse | null>(null);
let sessionView = $state<SessionViewResponse | null>(null);

let activityLog = $state<string[]>([]);
let isBusy = $state(false);

function pushLog(message: string) {
	activityLog = [
		new Date().toLocaleTimeString() + "  " + message,
		...activityLog,
	].slice(0, 20);
}

async function rpcCall<T>(
	path: string,
	method: "GET" | "POST",
	body?: Record<string, unknown>,
	extraHeaders?: Record<string, string>,
): Promise<T> {
	const headers: Record<string, string> = {
		...extraHeaders,
	};

	if (bearerToken.trim().length > 0) {
		headers.authorization = `Bearer ${bearerToken.trim()}`;
	}

	if (method === "POST") {
		headers["content-type"] = "application/json";
	}

	const response = await fetch(`${apiBase}${path}`, {
		method,
		headers,
		body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
	});

	const payload = (await response.json()) as
		| T
		| MutationAck
		| { error: string };
	if (!response.ok) {
		throw new Error(JSON.stringify(payload));
	}

	return payload as T;
}

async function createCharacter() {
	isBusy = true;
	try {
		const ack = await rpcCall<MutationAck>(
			"/xrpc/app.cerulia.rpc.createCharacterSheet",
			"POST",
			{
				rulesetNsid,
				sheetSchemaRef,
				displayName,
				initialBranchVisibility: branchVisibility,
			},
		);

		if (
			ack.resultKind !== "accepted" ||
			!ack.emittedRecordRefs ||
			ack.emittedRecordRefs.length < 2
		) {
			throw new Error(`Create rejected: ${ack.reasonCode ?? "unknown"}`);
		}

		createdSheetRef = ack.emittedRecordRefs[0] ?? "";
		createdBranchRef = ack.emittedRecordRefs[1] ?? "";
		pushLog(`Character created: ${createdSheetRef}`);
	} catch (error) {
		pushLog(`Create character failed: ${(error as Error).message}`);
	} finally {
		isBusy = false;
	}
}

async function updateCharacter() {
	if (!createdSheetRef) {
		pushLog("Update skipped: create a character first.");
		return;
	}

	isBusy = true;
	try {
		const ack = await rpcCall<MutationAck>(
			"/xrpc/app.cerulia.rpc.updateCharacterSheet",
			"POST",
			{
				characterSheetRef: createdSheetRef,
				displayName: updatedDisplayName,
			},
			{ "x-cerulia-base-rev": expectedSheetRev.trim() },
		);

		if (ack.resultKind !== "accepted") {
			pushLog(
				`Update returned ${ack.resultKind}: ${ack.reasonCode ?? "no-reason"}`,
			);
			return;
		}

		pushLog(`Character updated: ${createdSheetRef}`);
	} catch (error) {
		pushLog(`Update character failed: ${(error as Error).message}`);
	} finally {
		isBusy = false;
	}
}

async function createSession() {
	if (sessionRole === "pl" && !createdBranchRef) {
		pushLog("Session skipped: create a character branch first.");
		return;
	}

	isBusy = true;
	try {
		const scenarioRef = sessionScenarioRef.trim();
		const scenarioLabel = sessionScenarioLabel.trim();

		if (scenarioRef.length === 0 && scenarioLabel.length === 0) {
			pushLog(
				"Create session failed: scenarioRef or scenarioLabel is required.",
			);
			return;
		}

		if (scenarioRef.length > 0 && scenarioLabel.length > 0) {
			pushLog(
				"Create session failed: provide either scenarioRef or scenarioLabel, not both.",
			);
			return;
		}

		const payload: Record<string, unknown> = {
			role: sessionRole,
			playedAt: sessionPlayedAt,
			outcomeSummary: sessionOutcomeSummary,
			visibility: "public",
		};

		if (sessionRole === "pl") {
			payload.characterBranchRef = createdBranchRef;
		}

		if (scenarioRef.length > 0) {
			payload.scenarioRef = scenarioRef;
		} else {
			payload.scenarioLabel = scenarioLabel;
		}

		const ack = await rpcCall<MutationAck>(
			"/xrpc/app.cerulia.rpc.createSession",
			"POST",
			{
				...payload,
			},
		);

		if (
			ack.resultKind !== "accepted" ||
			!ack.emittedRecordRefs ||
			ack.emittedRecordRefs.length < 1
		) {
			throw new Error(
				`Create session rejected: ${ack.reasonCode ?? "unknown"}`,
			);
		}

		createdSessionRef = ack.emittedRecordRefs[0] ?? "";
		pushLog(`Session created: ${createdSessionRef}`);
	} catch (error) {
		pushLog(`Create session failed: ${(error as Error).message}`);
	} finally {
		isBusy = false;
	}
}

async function loadHome() {
	isBusy = true;
	try {
		homeView = await rpcCall<CharacterHomeResponse>(
			"/xrpc/app.cerulia.rpc.getCharacterHome",
			"GET",
		);
		pushLog("Loaded owner home view.");
	} catch (error) {
		pushLog(`Load home failed: ${(error as Error).message}`);
	} finally {
		isBusy = false;
	}
}

async function loadBranchView() {
	if (!createdBranchRef) {
		pushLog("Branch view skipped: no branch ref yet.");
		return;
	}

	isBusy = true;
	try {
		branchView = await rpcCall<CharacterBranchViewResponse>(
			`/xrpc/app.cerulia.rpc.getCharacterBranchView?characterBranchRef=${encodeURIComponent(createdBranchRef)}`,
			"GET",
		);
		pushLog("Loaded branch view.");
	} catch (error) {
		pushLog(`Load branch view failed: ${(error as Error).message}`);
	} finally {
		isBusy = false;
	}
}

async function loadSessionView() {
	if (!createdSessionRef) {
		pushLog("Session view skipped: no session ref yet.");
		return;
	}

	isBusy = true;
	try {
		sessionView = await rpcCall<SessionViewResponse>(
			`/xrpc/app.cerulia.rpc.getSessionView?sessionRef=${encodeURIComponent(createdSessionRef)}`,
			"GET",
		);
		pushLog("Loaded session view.");
	} catch (error) {
		pushLog(`Load session view failed: ${(error as Error).message}`);
	} finally {
		isBusy = false;
	}
}
</script>

<svelte:head>
	<title>Cerulia - Phase 2 Workbench</title>
</svelte:head>

<main class="page">
	<section class="hero">
		<p class="eyebrow">Cerulia / Phase 2</p>
		<h1>Canonical Flow Workbench</h1>
		<p>
			This page drives live API calls for character create-edit, session recording, and owner/public
			reads.
		</p>
	</section>

	<section class="panel auth">
		<h2>Connection</h2>
		<label>
			API Base URL
			<input bind:value={apiBase} placeholder="http://localhost:8787" />
		</label>
		<label>
			Bearer Token
			<input bind:value={bearerToken} placeholder="HS256 JWT or dev:did:... (if enabled)" />
		</label>
	</section>

	<section class="grid">
		<article class="panel">
			<h2>Character Create</h2>
			<label>Display Name <input bind:value={displayName} /></label>
			<label>Ruleset NSID <input bind:value={rulesetNsid} /></label>
			<label>Schema Ref <input bind:value={sheetSchemaRef} /></label>
			<label>
				Initial Visibility
				<select bind:value={branchVisibility}>
					<option value="draft">draft</option>
					<option value="public">public</option>
				</select>
			</label>
			<button onclick={createCharacter} disabled={isBusy}>Create Character</button>
			<p class="meta">sheetRef: {createdSheetRef || '-'}</p>
			<p class="meta">branchRef: {createdBranchRef || '-'}</p>
		</article>

		<article class="panel">
			<h2>Character Update</h2>
			<label>Expected Rev Header <input bind:value={expectedSheetRev} /></label>
			<label>Updated Name <input bind:value={updatedDisplayName} /></label>
			<button onclick={updateCharacter} disabled={isBusy}>Update Character</button>
		</article>

		<article class="panel">
			<h2>Session Create</h2>
			<label>
				Role
				<select bind:value={sessionRole}>
					<option value="pl">pl</option>
					<option value="gm">gm</option>
				</select>
			</label>
			{#if sessionRole === 'pl'}
				<p class="meta">PL mode requires an existing character branch.</p>
			{:else}
				<p class="meta">GM mode records session without branch binding.</p>
			{/if}
			<label>Played At <input bind:value={sessionPlayedAt} /></label>
			<label>Scenario Ref (optional) <input bind:value={sessionScenarioRef} /></label>
			<label>Scenario Label (optional) <input bind:value={sessionScenarioLabel} /></label>
			<label>Outcome Summary <textarea bind:value={sessionOutcomeSummary}></textarea></label>
			<button onclick={createSession} disabled={isBusy}>Create Session</button>
			<p class="meta">sessionRef: {createdSessionRef || '-'}</p>
		</article>
	</section>

	<section class="grid">
		<article class="panel">
			<h2>Read: Character Home</h2>
			<button onclick={loadHome} disabled={isBusy}>Load Home</button>
			{#if homeView}
				<p class="meta">ownerDid: {homeView.ownerDid}</p>
				<p class="meta">branches: {homeView.branches.length}</p>
				<p class="meta">sessions: {homeView.recentSessions.length}</p>
			{/if}
		</article>

		<article class="panel">
			<h2>Read: Branch View</h2>
			<button onclick={loadBranchView} disabled={isBusy}>Load Branch View</button>
			{#if branchView?.sheetSummary}
				<p class="meta">displayName: {branchView.sheetSummary.displayName}</p>
			{:else if branchView?.branchSummary?.state}
				<p class="meta">state: {branchView.branchSummary.state}</p>
			{/if}
		</article>

		<article class="panel">
			<h2>Read: Session View</h2>
			<button onclick={loadSessionView} disabled={isBusy}>Load Session View</button>
			{#if sessionView?.session?.state}
				<p class="meta">state: {sessionView.session.state}</p>
			{:else if sessionView?.session?.role}
				<p class="meta">role: {sessionView.session.role}</p>
				<p class="meta">outcome: {sessionView.session.outcomeSummary}</p>
			{:else if sessionView?.sessionSummary?.role}
				<p class="meta">role: {sessionView.sessionSummary.role}</p>
				<p class="meta">outcome: {sessionView.sessionSummary.outcomeSummary}</p>
			{/if}
		</article>
	</section>

	<section class="panel log">
		<h2>Activity</h2>
		<ul>
			{#each activityLog as item, index (`${item}-${index}`)}
				<li>{item}</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.2rem 4rem;
		display: grid;
		gap: 1rem;
	}

	.hero {
		background: linear-gradient(140deg, #13232f 0%, #2a4f5f 100%);
		color: #f7fbff;
		border-radius: 1rem;
		padding: 1.4rem;
		box-shadow: 0 16px 40px rgba(8, 18, 26, 0.22);
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-size: 0.72rem;
		opacity: 0.82;
		margin: 0;
	}

	h1 {
		margin: 0.2rem 0 0.4rem;
		font-size: clamp(1.8rem, 5vw, 2.8rem);
	}

	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	}

	.panel {
		background: rgba(255, 255, 255, 0.84);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(34, 55, 68, 0.15);
		border-radius: 0.9rem;
		padding: 1rem;
		display: grid;
		gap: 0.55rem;
	}

	.auth {
		grid-template-columns: 1fr 1fr;
	}

	.auth h2 {
		grid-column: 1 / -1;
	}

	label {
		display: grid;
		gap: 0.22rem;
		font-size: 0.85rem;
	}

	input,
	select,
	textarea,
	button {
		font: inherit;
	}

	input,
	select,
	textarea {
		background: #ffffff;
		border: 1px solid #9cb3bf;
		border-radius: 0.55rem;
		padding: 0.45rem 0.6rem;
	}

	textarea {
		min-height: 5.2rem;
		resize: vertical;
	}

	button {
		background: #13232f;
		color: #fff;
		border: none;
		border-radius: 999px;
		padding: 0.5rem 0.9rem;
		cursor: pointer;
		justify-self: start;
	}

	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.meta {
		font-size: 0.82rem;
		margin: 0;
		color: #29404d;
		word-break: break-all;
	}

	.log ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.4rem;
	}

	.log li {
		font-size: 0.82rem;
		padding: 0.35rem 0.45rem;
		background: rgba(34, 55, 68, 0.06);
		border-radius: 0.4rem;
	}

	@media (max-width: 780px) {
		.auth {
			grid-template-columns: 1fr;
		}
	}
</style>
