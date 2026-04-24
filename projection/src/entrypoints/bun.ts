import { createProjectionApp } from "../app.js";
import { createPublicAgentProvider } from "../public-agent-node.js";
import { AtprotoPublicRecordSource } from "../source/atproto.js";
import { createScenarioCatalogService } from "../services/scenario.js";
import { createBunSqliteDriver } from "../store/bun-sqlite.js";
import {
	parseSeedRepoDids,
	seedKnownRepoCatalog,
	SqlKnownRepoCatalog,
} from "../store/known-repos.js";
import { SqlScenarioCatalogStore } from "../store/scenario-catalog.js";

const port = Number.parseInt(process.env.PORT ?? "8788", 10);
const dbPath =
	process.env.CERULIA_PROJECTION_DB ?? "./cerulia-projection.sqlite";

const driver = createBunSqliteDriver(dbPath);
const knownRepoCatalog = new SqlKnownRepoCatalog(driver);
await seedKnownRepoCatalog(
	knownRepoCatalog,
	parseSeedRepoDids(process.env.CERULIA_PROJECTION_REPOS),
);

const source = new AtprotoPublicRecordSource(
	createPublicAgentProvider({
		knownRepoCatalog,
		dohEndpoint: process.env.CERULIA_DOH_ENDPOINT,
	}),
);
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

const app = createProjectionApp({
	source,
	catalogStore: catalogStore,
	internalIngestToken: process.env.CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN,
});

Bun.serve({
	port,
	fetch: app.fetch,
});

console.log(`cerulia-projection listening on http://localhost:${port}`);
