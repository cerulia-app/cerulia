import { error } from '@sveltejs/kit';

import { createRouteI18nState } from '$lib/i18n/meta';
import { requestCeruliaJson } from '$lib/server/cerulia-http';
import { getProfilePageTitleI18n } from './i18n.server';

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
		const i18n = getProfilePageTitleI18n(routeState, '');
		return {
			i18n,
			found: false as const
		};
	}

	if (!response.ok) {
		error(response.status >= 500 ? 500 : 502, 'Failed to load profile');
	}

	const data: ProfileViewData = await response.json();

	const displayName = data.profileSummary?.displayName ?? actor;
	const i18n = getProfilePageTitleI18n(routeState, displayName);

	return {
		i18n,
		found: true as const,
		actor,
		view: data,
		viewer: event.locals.ceruliaViewerAuth
			? { did: event.locals.ceruliaViewerAuth.did }
			: null
	};
};
