import { Hono } from "hono";
import { XRPC_PREFIX } from "./constants.js";
import { toErrorResponse } from "./errors.js";
import type { CanonicalRecordSource } from "./source.js";
import { createScenarioCatalogService } from "./services/scenario.js";
import { SqlScenarioCatalogStore } from "./store/scenario-catalog.js";
import { jsonXrpcOutput } from "./xrpc-output.js";

export interface ProjectionAppOptions {
	source: CanonicalRecordSource;
	catalogStore: SqlScenarioCatalogStore;
}

export function createProjectionApp(options: ProjectionAppOptions) {
	const app = new Hono();
	const scenarioCatalog = createScenarioCatalogService({
		source: options.source,
		catalog: options.catalogStore,
	});

	app.onError((error) => {
		return toErrorResponse(error);
	});

	app.get("/_health", (context) => {
		return context.json({ status: "ok" });
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.scenario.list`, async (context) => {
		return jsonXrpcOutput(
			context,
			"app.cerulia.scenario.list",
			await scenarioCatalog.list(
				context.req.query("rulesetNsid"),
				context.req.query("limit"),
				context.req.query("cursor"),
			),
		);
	});

	return app;
}