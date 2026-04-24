import { createProjectionApp } from "../app.js";
import { createScenarioCatalogService } from "../services/scenario.js";
import { SqliteCanonicalRecordSource } from "../source/sqlite.js";
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
const canonicalDbPath = process.env.CERULIA_CANONICAL_DB;

if (!canonicalDbPath) {
	throw new Error("CERULIA_CANONICAL_DB must be configured for projection E2E");
}

const driver = createBunSqliteDriver(dbPath);
const knownRepoCatalog = new SqlKnownRepoCatalog(driver);
await seedKnownRepoCatalog(
	knownRepoCatalog,
	parseSeedRepoDids(process.env.CERULIA_PROJECTION_REPOS),
);

const source = new SqliteCanonicalRecordSource(
	createBunSqliteDriver(canonicalDbPath),
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
	catalogStore,
	internalIngestToken: process.env.CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN,
});

Bun.serve({
	port,
	fetch: app.fetch,
});

console.log(`cerulia-projection-e2e listening on http://localhost:${port}`);