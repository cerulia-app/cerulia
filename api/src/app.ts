import { Hono } from "hono";
import {
	AppCeruliaActorUpdateProfile,
	AppCeruliaCampaignCreate,
	AppCeruliaCampaignUpdate,
	AppCeruliaCharacterCreateBranch,
	AppCeruliaCharacterCreateSheet,
	AppCeruliaCharacterRebaseSheet,
	AppCeruliaCharacterRecordAdvancement,
	AppCeruliaCharacterRecordConversion,
	AppCeruliaCharacterRetireBranch,
	AppCeruliaCharacterUpdateBranch,
	AppCeruliaCharacterUpdateSheet,
	AppCeruliaHouseCreate,
	AppCeruliaHouseUpdate,
	AppCeruliaRuleCreateSheetSchema,
	AppCeruliaRuleCreateProfile,
	AppCeruliaRuleUpdateProfile,
	AppCeruliaScenarioCreate,
	AppCeruliaScenarioUpdate,
	AppCeruliaSessionCreate,
	AppCeruliaSessionUpdate,
	getCeruliaNsidAliases,
	lexicons,
	validateById,
} from "@cerulia/protocol";
import {
	createAnonymousAuthContext,
	type AuthContext,
	type AuthResolver,
	readCookie,
} from "./auth.js";
import { toErrorResponse } from "./errors.js";
import { ApiError } from "./errors.js";
import { requireReaderDid, requireWriterDid } from "./auth.js";
import { SESSION_COOKIE_NAME, XRPC_PREFIX } from "./constants.js";
import type { ProjectionIngestFeature } from "./projection.js";
import { createServices } from "./services/index.js";
import type { AtomicRecordStore, RecordStore } from "./store/types.js";
import { jsonXrpcOutput } from "./xrpc-output.js";

export interface ApiOAuthFeature {
	clientMetadata: Record<string, unknown>;
	jwks: Record<string, unknown>;
	beginLogin(identifier: string, returnTo: string): Promise<string>;
	finishLogin(params: URLSearchParams): Promise<{
		sessionId: string;
		did: string;
		grantedScope: string;
		returnTo: string | null;
	}>;
	signOut(sessionId: string): Promise<void>;
	getBrowserSession(sessionId: string): Promise<{
		did: string;
		grantedScope: string;
	} | null>;
}

function sanitizeReturnTo(returnTo: string | null | undefined): string {
	if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
		return "/";
	}

	return returnTo;
}

function serializeSessionCookie(requestUrl: string, sessionId: string): string {
	const url = new URL(requestUrl);
	const secure = url.protocol === "https:";
	return [
		`${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		secure ? "Secure" : undefined,
	]
		.filter((fragment): fragment is string => Boolean(fragment))
		.join("; ");
}

function clearSessionCookie(requestUrl: string): string {
	const url = new URL(requestUrl);
	const secure = url.protocol === "https:";
	return [
		`${SESSION_COOKIE_NAME}=`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Expires=Thu, 01 Jan 1970 00:00:00 GMT",
		"Max-Age=0",
		secure ? "Secure" : undefined,
	]
		.filter((fragment): fragment is string => Boolean(fragment))
		.join("; ");
}

async function readJsonBody<T>(
	request: Request,
	lexiconId: string,
): Promise<T> {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		throw new ApiError(
			"InvalidRequest",
			"Request body must be valid JSON",
			400,
		);
	}

	lexicons.assertValidXrpcInput(lexiconId, payload);
	return payload as T;
}

export interface ApiAppBindings {
	Variables: {
		auth: AuthContext;
		store: RecordStore;
	};
}

export type ApiAppStore = AtomicRecordStore;

export interface ApiAppOptions {
	store: ApiAppStore;
	authResolver?: AuthResolver;
	oauthFeature?: ApiOAuthFeature;
	projectionIngestFeature?: ProjectionIngestFeature;
}

function isAcceptedMutationAck(
	payload: unknown,
): payload is { resultKind: "accepted" } {
	return (
		typeof payload === "object" &&
		payload !== null &&
		"resultKind" in payload &&
		(payload as { resultKind?: unknown }).resultKind === "accepted"
	);
}

function maybeNotifyProjectionRepo(
	feature: ProjectionIngestFeature | undefined,
	repoDid: string,
	payload: unknown,
): void {
	if (!feature || !isAcceptedMutationAck(payload)) {
		return;
	}

	void feature.noteRepoDid(repoDid).catch(() => {
		// Projection is optional. Notification failures must not reject canonical writes.
	});
}

export function createApiApp(options: ApiAppOptions) {
	if (!options.store.applyWrites) {
		throw new Error("createApiApp requires a store with applyWrites");
	}

	const app = new Hono<ApiAppBindings>();
	const store = options.store;
	const authResolver =
		options.authResolver ?? (() => createAnonymousAuthContext());
	const oauthFeature = options.oauthFeature;
	const projectionIngestFeature = options.projectionIngestFeature;
	const services = createServices(store);
	const registerCeruliaGet = (
		lexiconId: string,
		handler: (context: any) => Response | Promise<Response>,
	) => {
		for (const alias of getCeruliaNsidAliases(lexiconId)) {
			app.get(`${XRPC_PREFIX}/${alias}`, handler);
		}
	};
	const registerCeruliaPost = (
		lexiconId: string,
		handler: (context: any) => Response | Promise<Response>,
	) => {
		for (const alias of getCeruliaNsidAliases(lexiconId)) {
			app.post(`${XRPC_PREFIX}/${alias}`, handler);
		}
	};

	app.onError((error) => {
		return toErrorResponse(error);
	});

	app.use("*", async (context, next) => {
		context.set("auth", await authResolver(context.req.raw));
		context.set("store", store);
		await next();
	});

	app.get("/_health", (context) => {
		return context.json({ status: "ok" });
	});

	if (oauthFeature) {
		app.get("/client-metadata.json", (context) => {
			return context.json(oauthFeature.clientMetadata);
		});

		app.get("/jwks.json", (context) => {
			return context.json(oauthFeature.jwks);
		});

		app.get("/oauth/login", async (context) => {
			const identifier = context.req.query("identifier");
			if (!identifier) {
				throw new ApiError("InvalidRequest", "identifier is required", 400);
			}

			const redirectUrl = await oauthFeature.beginLogin(
				identifier,
				sanitizeReturnTo(context.req.query("returnTo")),
			);
			return context.redirect(redirectUrl, 302);
		});

		app.get("/oauth/callback", async (context) => {
			const result = await oauthFeature.finishLogin(
				new URL(context.req.url).searchParams,
			);
			context.header(
				"Set-Cookie",
				serializeSessionCookie(context.req.url, result.sessionId),
			);
			return context.redirect(sanitizeReturnTo(result.returnTo), 302);
		});

		app.get("/oauth/session", async (context) => {
			const auth = context.get("auth");
			return context.json({
				did: auth.callerDid ?? null,
				scopes: Array.from(auth.scopes),
			});
		});

		app.post("/oauth/logout", async (context) => {
			const sessionId = readCookie(context.req.raw, SESSION_COOKIE_NAME);
			if (sessionId) {
				await oauthFeature.signOut(sessionId);
			}
			context.header("Set-Cookie", clearSessionCookie(context.req.url));
			return context.json({ ok: true });
		});
	}

	registerCeruliaPost(
		"app.cerulia.dev.rule.createSheetSchema",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaRuleCreateSheetSchema.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.rule.createSheetSchema",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.rule.createSheetSchema",
				await services.rule.createSheetSchema(callerDid, input),
			);
		},
	);

	registerCeruliaGet("app.cerulia.dev.rule.getSheetSchema", async (context) => {
		const schemaRef = context.req.query("characterSheetSchemaRef");
		if (!schemaRef) {
			throw new ApiError(
				"InvalidRequest",
				"characterSheetSchemaRef is required",
				400,
			);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.rule.getSheetSchema",
			await services.rule.getSheetSchema(schemaRef),
		);
	});

	registerCeruliaGet(
		"app.cerulia.dev.rule.listSheetSchemas",
		async (context) => {
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.rule.listSheetSchemas",
				await services.rule.listSheetSchemas(
					context.req.query("rulesetNsid"),
					context.req.query("limit"),
					context.req.query("cursor"),
				),
			);
		},
	);

	registerCeruliaPost("app.cerulia.dev.rule.createProfile", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaRuleCreateProfile.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.rule.createProfile",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.rule.createProfile",
			await services.rule.createProfile(callerDid, input),
		);
	});

	registerCeruliaPost("app.cerulia.dev.rule.updateProfile", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaRuleUpdateProfile.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.rule.updateProfile",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.rule.updateProfile",
			await services.rule.updateProfile(callerDid, input),
		);
	});

	registerCeruliaGet("app.cerulia.dev.rule.getProfile", async (context) => {
		const callerDid = requireReaderDid(context.get("auth"));
		const ruleProfileRef = context.req.query("ruleProfileRef");
		if (!ruleProfileRef) {
			throw new ApiError("InvalidRequest", "ruleProfileRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.rule.getProfile",
			await services.rule.getProfile(callerDid, ruleProfileRef),
		);
	});

	registerCeruliaGet("app.cerulia.dev.rule.listProfiles", async (context) => {
		const callerDid = requireReaderDid(context.get("auth"));
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.rule.listProfiles",
			await services.rule.listProfiles(
				callerDid,
				context.req.query("scopeRef"),
				context.req.query("baseRulesetNsid"),
				context.req.query("limit"),
				context.req.query("cursor"),
			),
		);
	});

	registerCeruliaPost(
		"app.cerulia.dev.character.createSheet",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterCreateSheet.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.character.createSheet",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.createSheet",
				await services.character.createSheet(callerDid, input),
			);
		},
	);

	registerCeruliaPost(
		"app.cerulia.dev.character.updateSheet",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterUpdateSheet.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.character.updateSheet",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.updateSheet",
				await services.character.updateSheet(callerDid, input),
			);
		},
	);

	registerCeruliaPost(
		"app.cerulia.dev.character.rebaseSheet",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterRebaseSheet.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.character.rebaseSheet",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.rebaseSheet",
				await services.character.rebaseSheet(callerDid, input),
			);
		},
	);

	registerCeruliaPost(
		"app.cerulia.dev.character.createBranch",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterCreateBranch.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.character.createBranch",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.createBranch",
				await services.character.createBranch(callerDid, input),
			);
		},
	);

	registerCeruliaPost(
		"app.cerulia.dev.character.updateBranch",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterUpdateBranch.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.character.updateBranch",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.updateBranch",
				await services.character.updateBranch(callerDid, input),
			);
		},
	);

	registerCeruliaPost(
		"app.cerulia.dev.character.retireBranch",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterRetireBranch.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.character.retireBranch",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.retireBranch",
				await services.character.retireBranch(callerDid, input),
			);
		},
	);

	registerCeruliaPost(
		"app.cerulia.dev.character.recordAdvancement",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterRecordAdvancement.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.character.recordAdvancement",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.recordAdvancement",
				await services.character.recordAdvancement(callerDid, input),
			);
		},
	);

	registerCeruliaPost(
		"app.cerulia.dev.character.recordConversion",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterRecordConversion.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.character.recordConversion",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.recordConversion",
				await services.character.recordConversion(callerDid, input),
			);
		},
	);

	registerCeruliaGet("app.cerulia.dev.character.getHome", async (context) => {
		const callerDid = requireReaderDid(context.get("auth"));
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.character.getHome",
			await services.character.getHome(callerDid),
		);
	});

	registerCeruliaGet(
		"app.cerulia.dev.character.getBranchView",
		async (context) => {
			const branchRef = context.req.query("characterBranchRef");
			if (!branchRef) {
				throw new ApiError(
					"InvalidRequest",
					"characterBranchRef is required",
					400,
				);
			}

			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.character.getBranchView",
				await services.character.getBranchView(context.get("auth"), branchRef),
			);
		},
	);

	registerCeruliaPost("app.cerulia.dev.session.create", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaSessionCreate.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.session.create",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.session.create",
			await services.session.create(callerDid, input),
		);
	});

	registerCeruliaPost("app.cerulia.dev.session.update", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaSessionUpdate.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.session.update",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.session.update",
			await services.session.update(callerDid, input),
		);
	});

	registerCeruliaGet("app.cerulia.dev.session.list", async (context) => {
		const callerDid = requireReaderDid(context.get("auth"));
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.session.list",
			await services.session.list(
				callerDid,
				context.req.query("limit"),
				context.req.query("cursor"),
			),
		);
	});

	registerCeruliaGet("app.cerulia.dev.session.getView", async (context) => {
		const sessionRef = context.req.query("sessionRef");
		if (!sessionRef) {
			throw new ApiError("InvalidRequest", "sessionRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.session.getView",
			await services.session.getView(context.get("auth"), sessionRef),
		);
	});

	registerCeruliaPost("app.cerulia.dev.scenario.create", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaScenarioCreate.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.scenario.create",
		);
		const output = await services.scenario.create(callerDid, input);
		maybeNotifyProjectionRepo(projectionIngestFeature, callerDid, output);
		return jsonXrpcOutput(context, "app.cerulia.dev.scenario.create", output);
	});

	registerCeruliaPost("app.cerulia.dev.scenario.update", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaScenarioUpdate.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.scenario.update",
		);
		const output = await services.scenario.update(callerDid, input);
		maybeNotifyProjectionRepo(projectionIngestFeature, callerDid, output);
		return jsonXrpcOutput(context, "app.cerulia.dev.scenario.update", output);
	});

	registerCeruliaGet("app.cerulia.dev.scenario.getView", async (context) => {
		const scenarioRef = context.req.query("scenarioRef");
		if (!scenarioRef) {
			throw new ApiError("InvalidRequest", "scenarioRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.scenario.getView",
			await services.scenario.getView(context.get("auth"), scenarioRef),
		);
	});

	registerCeruliaPost("app.cerulia.dev.campaign.create", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaCampaignCreate.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.campaign.create",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.campaign.create",
			await services.campaign.create(callerDid, input),
		);
	});

	registerCeruliaPost("app.cerulia.dev.campaign.update", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaCampaignUpdate.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.campaign.update",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.campaign.update",
			await services.campaign.update(callerDid, input),
		);
	});

	registerCeruliaGet("app.cerulia.dev.campaign.getView", async (context) => {
		const campaignRef = context.req.query("campaignRef");
		if (!campaignRef) {
			throw new ApiError("InvalidRequest", "campaignRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.campaign.getView",
			await services.campaign.getView(context.get("auth"), campaignRef),
		);
	});

	registerCeruliaPost("app.cerulia.dev.house.create", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaHouseCreate.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.house.create",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.house.create",
			await services.house.create(callerDid, input),
		);
	});

	registerCeruliaPost("app.cerulia.dev.house.update", async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaHouseUpdate.InputSchema>(
			context.req.raw,
			"app.cerulia.dev.house.update",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.house.update",
			await services.house.update(callerDid, input),
		);
	});

	registerCeruliaGet("app.cerulia.dev.house.getView", async (context) => {
		const houseRef = context.req.query("houseRef");
		if (!houseRef) {
			throw new ApiError("InvalidRequest", "houseRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.dev.house.getView",
			await services.house.getView(context.get("auth"), houseRef),
		);
	});

	registerCeruliaPost(
		"app.cerulia.dev.actor.updateProfile",
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaActorUpdateProfile.InputSchema>(
					context.req.raw,
					"app.cerulia.dev.actor.updateProfile",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.actor.updateProfile",
				await services.actor.updateProfile(callerDid, input),
			);
		},
	);

	registerCeruliaGet(
		"app.cerulia.dev.actor.getProfileView",
		async (context) => {
			const did = context.req.query("did");
			if (!did) {
				throw new ApiError("InvalidRequest", "did is required", 400);
			}

			return jsonXrpcOutput(
				context,
				"app.cerulia.dev.actor.getProfileView",
				await services.actor.getProfileView(context.get("auth"), did),
			);
		},
	);

	return app;
}
