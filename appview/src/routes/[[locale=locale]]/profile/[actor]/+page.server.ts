import { error } from '@sveltejs/kit';

import { createRouteI18nState } from '$lib/i18n/meta';
import { localizePathname } from '$lib/i18n/locale';
import { requestCeruliaJson } from '$lib/server/cerulia-http';
import { getErrorI18n, getPageI18n } from './i18n.server';

import type { PageServerLoad } from './$types';

interface BranchLink {
	characterBranchRef: string;
	displayName: string;
	branchLabel: string;
	rulesetNsid: string;
}

interface ProfileSummary {
	did: string;
	displayName?: string;
	description?: string;
	avatar?: { ref: { $link: string } };
	banner?: { ref: { $link: string } };
	website?: string;
	pronouns?: string;
	roleDistribution?: number;
	playFormats?: string[];
	tools?: string[];
	ownedRulebooks?: string;
	playableTimeSummary?: string;
	preferredScenarioStyles?: string[];
	playStyles?: string[];
	boundaries?: string[];
	skills?: string[];
}

interface ProfileViewData {
	profileSummary?: ProfileSummary;
	publicBranches?: BranchLink[];
}

export const load: PageServerLoad = async (event) => {
	const { params, url } = event;
	const routeState = createRouteI18nState(url);
	const actor = params.actor;

	const response = await requestCeruliaJson(
		event,
		'api',
		`/xrpc/app.cerulia.dev.actor.getProfileView?did=${encodeURIComponent(actor)}`
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

	const data: ProfileViewData = await response.json();

	const displayName = data.profileSummary?.displayName ?? actor;

	return {
		i18n: getPageI18n(routeState, displayName),
		actor,
		view: data
	};
};
