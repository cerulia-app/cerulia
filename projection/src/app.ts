import { Hono } from "hono";
import { getCeruliaNsidAliases } from "@cerulia/protocol";
import { XRPC_PREFIX } from "./constants.js";
import { toErrorResponse } from "./errors.js";
import { ProjectionError } from "./errors.js";
import type { CanonicalRecordSource } from "./source.js";
import { createScenarioCatalogService } from "./services/scenario.js";
import { SqlScenarioCatalogStore } from "./store/scenario-catalog.js";
import { jsonXrpcOutput } from "./xrpc-output.js";

export interface ProjectionAppOptions {
	source: CanonicalRecordSource;
	catalogStore: SqlScenarioCatalogStore;
	internalIngestToken?: string;
}

export function createProjectionApp(options: ProjectionAppOptions) {
	const app = new Hono();
	const scenarioCatalog = createScenarioCatalogService({
		source: options.source,
		catalog: options.catalogStore,
	});
	const registerCeruliaGet = (
		lexiconId: string,
		handler: (context: any) => Response | Promise<Response>,
	) => {
		for (const alias of getCeruliaNsidAliases(lexiconId)) {
			app.get(`${XRPC_PREFIX}/${alias}`, handler);
		}
	};

	app.onError((error) => {
		return toErrorResponse(error);
	});

	app.get("/_health", (context) => {
		return context.json({ status: "ok" });
	});

	if (options.internalIngestToken) {
		app.post("/internal/ingest/repo", async (context) => {
			const authorization = context.req.header("authorization");
			if (authorization !== `Bearer ${options.internalIngestToken}`) {
				throw new ProjectionError("Unauthorized", "invalid ingest token", 401);
			}

			let payload: unknown;
			try {
				payload = await context.req.json();
			} catch {
				throw new ProjectionError(
					"InvalidRequest",
					"request body must be valid JSON",
					400,
				);
			}

			const repoDid =
				typeof payload === "object" && payload !== null && "repoDid" in payload
					? (payload as { repoDid?: unknown }).repoDid
					: undefined;
			if (typeof repoDid !== "string" || repoDid.length === 0) {
				throw new ProjectionError("InvalidRequest", "repoDid is required", 400);
			}

			await scenarioCatalog.ingestRepo(repoDid);
			return context.json({ ok: true });
		});
	}

	registerCeruliaGet("app.cerulia.dev.scenario.list", async (context) => {
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.scenario.list",
			await scenarioCatalog.list(
				context.req.query("rulesetNsid"),
				context.req.query("limit"),
				context.req.query("cursor"),
				context.req.query("ownerDid"),
			),
		);
	});

	return app;
}
