import { error } from '@sveltejs/kit';

import { createRouteI18nState } from '$lib/i18n/meta';
import { localizePathname } from '$lib/i18n/locale';
import { requestCeruliaJson } from '$lib/server/cerulia-http';
import { getErrorI18n, getPageI18n } from './i18n.server';

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
		const errorI18n = getErrorI18n(routeState).text;
		const notFoundError = {
			message: errorI18n.notFound,
			detail: errorI18n.notFoundBody,
			backToTop: errorI18n.backToTop,
			homeHref: localizePathname('/', routeState.locale)
		} as App.Error;
		error(404, notFoundError);
	}

	if (!response.ok) {
		const errorI18n = getErrorI18n(routeState).text;
		const loadFailedError = {
			message: errorI18n.errorTitle,
			detail: errorI18n.errorBody,
			backToTop: errorI18n.backToTop,
			homeHref: localizePathname('/', routeState.locale)
		} as App.Error;
		error(response.status >= 500 ? 500 : 502, loadFailedError);
	}

	const data: BranchViewData = await response.json();

	const displayName = data.sheetSummary?.displayName ?? branchRef;

	return {
		i18n: getPageI18n(routeState, displayName),
		branchRef,
		view: data
	};
};
