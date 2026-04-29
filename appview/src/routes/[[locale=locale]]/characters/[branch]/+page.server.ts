import { error } from '@sveltejs/kit';

import { createRouteI18nState } from '$lib/i18n/meta';
import { requestCeruliaJson } from '$lib/server/cerulia-http';
import { getCharacterDetailTitleI18n } from './i18n.server';

import type { PageServerLoad } from './$types';

interface StatEntry {
	fieldId: string;
	label: string;
	value: string | number | boolean | null;
}

interface SessionSummary {
	sessionRef: string;
	role: string;
	playedAt: string;
	scenarioLabel?: string;
	outcomeSummary?: string;
	externalArchiveUris?: string[];
}

interface AdvancementSummary {
	advancementRef: string;
	advancementKind: string;
	effectiveAt: string;
	sessionSummary?: { sessionRef: string; playedAt: string; scenarioLabel?: string };
}

interface BranchSummary {
	branchRef: string;
	branchLabel: string;
	branchKind: string;
	visibility: string;
	revision: number;
	updatedAt?: string;
}

interface SheetSummary {
	sheetRef: string;
	displayName: string;
	rulesetNsid: string;
	structuredStats?: StatEntry[];
	portraitBlob?: { ref: { $link: string } };
	profileSummary?: string;
}

interface BranchViewData {
	branchSummary?: BranchSummary;
	sheetSummary?: SheetSummary;
	recentSessionSummaries?: SessionSummary[];
	advancementSummaries?: AdvancementSummary[];
}

export const load: PageServerLoad = async (event) => {
	const { params, url } = event;
	const routeState = createRouteI18nState(url);
	const branchRef = params.branch;

	const response = await requestCeruliaJson(
		event,
		'api',
		`/xrpc/app.cerulia.dev.character.getBranchView?characterBranchRef=${encodeURIComponent(branchRef)}`
	);

	if (response.status === 404) {
		const i18n = getCharacterDetailTitleI18n(routeState, '');
		return {
			i18n,
			found: false as const
		};
	}

	if (!response.ok) {
		error(response.status >= 500 ? 500 : 502, 'Failed to load character');
	}

	const data: BranchViewData = await response.json();

	const displayName = data.sheetSummary?.displayName ?? branchRef;
	const i18n = getCharacterDetailTitleI18n(routeState, displayName);

	return {
		i18n,
		found: true as const,
		branchRef,
		view: data,
		viewer: event.locals.ceruliaViewerAuth
			? { did: event.locals.ceruliaViewerAuth.did }
			: null
	};
};
