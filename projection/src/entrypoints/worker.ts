import { createProjectionApp } from "../app.js";
import { createPublicAgentProvider } from "../agents.js";
import type { CanonicalRecordSource } from "../source.js";
import { AtprotoPublicRecordSource } from "../source/atproto.js";
import { createScenarioCatalogService } from "../services/scenario.js";
import { createD1Driver, type D1DatabaseLike } from "../store/d1.js";
import {
	parseSeedRepoDids,
	seedKnownRepoCatalog,
	SqlKnownRepoCatalog,
} from "../store/known-repos.js";
import { SqlScenarioCatalogStore } from "../store/scenario-catalog.js";

interface WorkerEnv {
	DB: D1DatabaseLike;
	CERULIA_PROJECTION_REPOS?: string;
	CERULIA_DOH_ENDPOINT?: string;
	CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN?: string;
}

const appCache = new WeakMap<
	D1DatabaseLike,
	Promise<ReturnType<typeof createProjectionApp>>
>();

export async function createWorkerApp(
	env: WorkerEnv,
	overrides?: {
		source?: CanonicalRecordSource;
	},
) {
	const driver = createD1Driver(env.DB);
	const knownRepoCatalog = new SqlKnownRepoCatalog(driver);
	await seedKnownRepoCatalog(
		knownRepoCatalog,
		parseSeedRepoDids(env.CERULIA_PROJECTION_REPOS),
	);

	if (!overrides?.source) {
		throw new Error(
			"Workers projection adapter requires an injected canonical source until a pre-connect-pinned public agent transport is available",
		);
	}

	const source = overrides.source;
 	const catalogStore = new SqlScenarioCatalogStore(driver);
 	const scenarioCatalog = createScenarioCatalogService({
		source,
		catalog: catalogStore,
	});
	const failedRepoDids = await scenarioCatalog.rebuildKnownRepos(
		await knownRepoCatalog.listRepoDids(),
	);
	if (failedRepoDids.length > 0) {
		queueMicrotask(() => {
			void scenarioCatalog.rebuildKnownRepos(failedRepoDids);
		});
	}

	return createProjectionApp({
		source,
		catalogStore: catalogStore,
		internalIngestToken: env.CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN,
	});
}

async function getApp(env: WorkerEnv) {
	let appPromise = appCache.get(env.DB);
	if (!appPromise) {
		appPromise = createWorkerApp(env);
		appCache.set(env.DB, appPromise);
	}

	return appPromise;
}

export default {
	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		const app = await getApp(env);
		return app.fetch(request, env);
	},
};