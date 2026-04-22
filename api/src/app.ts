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
import { createServices } from "./services/index.js";
import type { AtomicRecordStore, RecordStore } from "./store/types.js";

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

function jsonXrpcOutput(
	context: { json: (payload: unknown) => Response },
	lexiconId: string,
	payload: unknown,
): Response {
	assertValidXrpcOutputPayload(lexiconId, payload);
	return context.json(payload);
}

function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObjectOutputSchema(
	schema: unknown,
): schema is {
	properties?: Record<string, unknown>;
	required?: string[];
} {
	return isPlainObject(schema) && schema.type === "object";
}

function assertTypedValuesAreValid(value: unknown): void {
	if (Array.isArray(value)) {
		for (const item of value) {
			assertTypedValuesAreValid(item);
		}
		return;
	}

	if (!isPlainObject(value)) {
		return;
	}

	if (typeof value.$type === "string") {
		const [lexiconId, defId = "main", ...rest] = value.$type.split("#");
		if (!lexiconId || rest.length > 0) {
			throw new Error(`Invalid $type value in XRPC output: ${value.$type}`);
		}

		const result = validateById(value, lexiconId, defId, true);
		if (!result.success) {
			throw result.error;
		}
	}

	for (const nested of Object.values(value)) {
		assertTypedValuesAreValid(nested);
	}
}

function assertFallbackXrpcOutputShape(
	lexiconId: string,
	payload: unknown,
): void {
	if (!isPlainObject(payload)) {
		throw new Error(`XRPC output for ${lexiconId} must be a JSON object`);
	}

	const definition = lexicons.getDefOrThrow(lexiconId, ["query", "procedure"]);
	const outputSchema = definition.output?.schema;
	if (!isObjectOutputSchema(outputSchema)) {
		throw new Error(`XRPC output for ${lexiconId} must use an object schema`);
	}
	const allowedProperties = new Set(
		Object.keys(outputSchema.properties ?? {}),
	);
	const requiredProperties = outputSchema.required ?? [];

	for (const requiredProperty of requiredProperties) {
		if (!(requiredProperty in payload)) {
			throw new Error(
				`XRPC output for ${lexiconId} is missing required property ${requiredProperty}`,
			);
		}
	}

	for (const property of Object.keys(payload)) {
		if (!allowedProperties.has(property)) {
			throw new Error(
				`XRPC output for ${lexiconId} contains unexpected property ${property}`,
			);
		}
	}

	assertTypedValuesAreValid(payload);
}

function assertValidXrpcOutputPayload(
	lexiconId: string,
	payload: unknown,
): void {
	try {
		lexicons.assertValidXrpcOutput(lexiconId, payload);
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes("Unexpected lexicon type: record")
		) {
			assertFallbackXrpcOutputShape(lexiconId, payload);
			return;
		}

		throw error;
	}
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
	const services = createServices(store);

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
				throw new ApiError(
					"InvalidRequest",
					"identifier is required",
					400,
				);
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

	app.post(
		`${XRPC_PREFIX}/app.cerulia.rule.createSheetSchema`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaRuleCreateSheetSchema.InputSchema>(
					context.req.raw,
					"app.cerulia.rule.createSheetSchema",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.rule.createSheetSchema",
				await services.rule.createSheetSchema(callerDid, input),
			);
		},
	);

	app.get(`${XRPC_PREFIX}/app.cerulia.rule.getSheetSchema`, async (context) => {
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
			"app.cerulia.rule.getSheetSchema",
			await services.rule.getSheetSchema(schemaRef),
		);
	});

	app.get(
		`${XRPC_PREFIX}/app.cerulia.rule.listSheetSchemas`,
		async (context) => {
			return jsonXrpcOutput(
				context,
				"app.cerulia.rule.listSheetSchemas",
				await services.rule.listSheetSchemas(
					context.req.query("rulesetNsid"),
					context.req.query("limit"),
					context.req.query("cursor"),
				),
			);
		},
	);

	app.post(`${XRPC_PREFIX}/app.cerulia.rule.createProfile`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaRuleCreateProfile.InputSchema>(
			context.req.raw,
			"app.cerulia.rule.createProfile",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.rule.createProfile",
			await services.rule.createProfile(callerDid, input),
		);
	});

	app.post(`${XRPC_PREFIX}/app.cerulia.rule.updateProfile`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaRuleUpdateProfile.InputSchema>(
			context.req.raw,
			"app.cerulia.rule.updateProfile",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.rule.updateProfile",
			await services.rule.updateProfile(callerDid, input),
		);
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.rule.getProfile`, async (context) => {
		const callerDid = requireReaderDid(context.get("auth"));
		const ruleProfileRef = context.req.query("ruleProfileRef");
		if (!ruleProfileRef) {
			throw new ApiError("InvalidRequest", "ruleProfileRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.rule.getProfile",
			await services.rule.getProfile(callerDid, ruleProfileRef),
		);
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.rule.listProfiles`, async (context) => {
		const callerDid = requireReaderDid(context.get("auth"));
		return jsonXrpcOutput(
			context,
			"app.cerulia.rule.listProfiles",
			await services.rule.listProfiles(
				callerDid,
				context.req.query("scopeRef"),
				context.req.query("baseRulesetNsid"),
				context.req.query("limit"),
				context.req.query("cursor"),
			),
		);
	});

	app.post(
		`${XRPC_PREFIX}/app.cerulia.character.createSheet`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterCreateSheet.InputSchema>(
					context.req.raw,
					"app.cerulia.character.createSheet",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.character.createSheet",
				await services.character.createSheet(callerDid, input),
			);
		},
	);

	app.post(
		`${XRPC_PREFIX}/app.cerulia.character.updateSheet`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterUpdateSheet.InputSchema>(
					context.req.raw,
					"app.cerulia.character.updateSheet",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.character.updateSheet",
				await services.character.updateSheet(callerDid, input),
			);
		},
	);

	app.post(
		`${XRPC_PREFIX}/app.cerulia.character.rebaseSheet`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterRebaseSheet.InputSchema>(
					context.req.raw,
					"app.cerulia.character.rebaseSheet",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.character.rebaseSheet",
				await services.character.rebaseSheet(callerDid, input),
			);
		},
	);

	app.post(
		`${XRPC_PREFIX}/app.cerulia.character.createBranch`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterCreateBranch.InputSchema>(
					context.req.raw,
					"app.cerulia.character.createBranch",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.character.createBranch",
				await services.character.createBranch(callerDid, input),
			);
		},
	);

	app.post(
		`${XRPC_PREFIX}/app.cerulia.character.updateBranch`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterUpdateBranch.InputSchema>(
					context.req.raw,
					"app.cerulia.character.updateBranch",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.character.updateBranch",
				await services.character.updateBranch(callerDid, input),
			);
		},
	);

	app.post(
		`${XRPC_PREFIX}/app.cerulia.character.retireBranch`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterRetireBranch.InputSchema>(
					context.req.raw,
					"app.cerulia.character.retireBranch",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.character.retireBranch",
				await services.character.retireBranch(callerDid, input),
			);
		},
	);

	app.post(
		`${XRPC_PREFIX}/app.cerulia.character.recordAdvancement`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterRecordAdvancement.InputSchema>(
					context.req.raw,
					"app.cerulia.character.recordAdvancement",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.character.recordAdvancement",
				await services.character.recordAdvancement(callerDid, input),
			);
		},
	);

	app.post(
		`${XRPC_PREFIX}/app.cerulia.character.recordConversion`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaCharacterRecordConversion.InputSchema>(
					context.req.raw,
					"app.cerulia.character.recordConversion",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.character.recordConversion",
				await services.character.recordConversion(callerDid, input),
			);
		},
	);

	app.get(`${XRPC_PREFIX}/app.cerulia.character.getHome`, async (context) => {
		const callerDid = requireReaderDid(context.get("auth"));
		return jsonXrpcOutput(
			context,
			"app.cerulia.character.getHome",
			await services.character.getHome(callerDid),
		);
	});

	app.get(
		`${XRPC_PREFIX}/app.cerulia.character.getBranchView`,
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
				"app.cerulia.character.getBranchView",
				await services.character.getBranchView(context.get("auth"), branchRef),
			);
		},
	);

	app.post(`${XRPC_PREFIX}/app.cerulia.session.create`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaSessionCreate.InputSchema>(
			context.req.raw,
			"app.cerulia.session.create",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.session.create",
			await services.session.create(callerDid, input),
		);
	});

	app.post(`${XRPC_PREFIX}/app.cerulia.session.update`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaSessionUpdate.InputSchema>(
			context.req.raw,
			"app.cerulia.session.update",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.session.update",
			await services.session.update(callerDid, input),
		);
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.session.list`, async (context) => {
		const callerDid = requireReaderDid(context.get("auth"));
		return jsonXrpcOutput(
			context,
			"app.cerulia.session.list",
			await services.session.list(
				callerDid,
				context.req.query("limit"),
				context.req.query("cursor"),
			),
		);
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.session.getView`, async (context) => {
		const sessionRef = context.req.query("sessionRef");
		if (!sessionRef) {
			throw new ApiError("InvalidRequest", "sessionRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.session.getView",
			await services.session.getView(context.get("auth"), sessionRef),
		);
	});

	app.post(`${XRPC_PREFIX}/app.cerulia.scenario.create`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaScenarioCreate.InputSchema>(
			context.req.raw,
			"app.cerulia.scenario.create",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.scenario.create",
			await services.scenario.create(callerDid, input),
		);
	});

	app.post(`${XRPC_PREFIX}/app.cerulia.scenario.update`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaScenarioUpdate.InputSchema>(
			context.req.raw,
			"app.cerulia.scenario.update",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.scenario.update",
			await services.scenario.update(callerDid, input),
		);
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.scenario.getView`, async (context) => {
		const scenarioRef = context.req.query("scenarioRef");
		if (!scenarioRef) {
			throw new ApiError("InvalidRequest", "scenarioRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.scenario.getView",
			await services.scenario.getView(context.get("auth"), scenarioRef),
		);
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.scenario.list`, async (context) => {
		return jsonXrpcOutput(
			context,
			"app.cerulia.scenario.list",
			await services.scenario.list(
				context.req.query("rulesetNsid"),
				context.req.query("limit"),
				context.req.query("cursor"),
			),
		);
	});

	app.post(`${XRPC_PREFIX}/app.cerulia.campaign.create`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaCampaignCreate.InputSchema>(
			context.req.raw,
			"app.cerulia.campaign.create",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.campaign.create",
			await services.campaign.create(callerDid, input),
		);
	});

	app.post(`${XRPC_PREFIX}/app.cerulia.campaign.update`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaCampaignUpdate.InputSchema>(
			context.req.raw,
			"app.cerulia.campaign.update",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.campaign.update",
			await services.campaign.update(callerDid, input),
		);
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.campaign.getView`, async (context) => {
		const campaignRef = context.req.query("campaignRef");
		if (!campaignRef) {
			throw new ApiError("InvalidRequest", "campaignRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.campaign.getView",
			await services.campaign.getView(context.get("auth"), campaignRef),
		);
	});

	app.post(`${XRPC_PREFIX}/app.cerulia.house.create`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaHouseCreate.InputSchema>(
			context.req.raw,
			"app.cerulia.house.create",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.house.create",
			await services.house.create(callerDid, input),
		);
	});

	app.post(`${XRPC_PREFIX}/app.cerulia.house.update`, async (context) => {
		const callerDid = requireWriterDid(context.get("auth"));
		const input = await readJsonBody<AppCeruliaHouseUpdate.InputSchema>(
			context.req.raw,
			"app.cerulia.house.update",
		);
		return jsonXrpcOutput(
			context,
			"app.cerulia.house.update",
			await services.house.update(callerDid, input),
		);
	});

	app.get(`${XRPC_PREFIX}/app.cerulia.house.getView`, async (context) => {
		const houseRef = context.req.query("houseRef");
		if (!houseRef) {
			throw new ApiError("InvalidRequest", "houseRef is required", 400);
		}

		return jsonXrpcOutput(
			context,
			"app.cerulia.house.getView",
			await services.house.getView(context.get("auth"), houseRef),
		);
	});

	app.post(
		`${XRPC_PREFIX}/app.cerulia.actor.updateProfile`,
		async (context) => {
			const callerDid = requireWriterDid(context.get("auth"));
			const input =
				await readJsonBody<AppCeruliaActorUpdateProfile.InputSchema>(
					context.req.raw,
					"app.cerulia.actor.updateProfile",
				);
			return jsonXrpcOutput(
				context,
				"app.cerulia.actor.updateProfile",
				await services.actor.updateProfile(callerDid, input),
			);
		},
	);

	app.get(
		`${XRPC_PREFIX}/app.cerulia.actor.getProfileView`,
		async (context) => {
			const did = context.req.query("did");
			if (!did) {
				throw new ApiError("InvalidRequest", "did is required", 400);
			}

			return jsonXrpcOutput(
				context,
				"app.cerulia.actor.getProfileView",
				await services.actor.getProfileView(context.get("auth"), did),
			);
		},
	);

	return app;
}
