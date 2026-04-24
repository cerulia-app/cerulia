import { Database, type Statement } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { JoseKey } from "@atproto/jwk-jose";
import { AUTH_SCOPES } from "../constants.js";
import { createWorkerApp } from "./worker.js";
import type { D1DatabaseLike, D1StatementLike } from "../store/d1.js";

class SqliteD1Statement implements D1StatementLike {
	constructor(
		private readonly statement: Statement,
		private readonly params: unknown[] = [],
	) {}

	bind(...values: unknown[]): D1StatementLike {
		return new SqliteD1Statement(this.statement, values);
	}

	async first<T>(): Promise<T | null> {
		return (this.statement.get(...this.params) as T | null) ?? null;
	}

	async all<T>() {
		return {
			results: this.statement.all(...this.params) as T[],
		};
	}

	async run(): Promise<unknown> {
		this.statement.run(...this.params);
		return {};
	}
}

class SqliteD1Database implements D1DatabaseLike {
	constructor(private readonly db: Database) {}

	prepare(sql: string): D1StatementLike {
		return new SqliteD1Statement(this.db.query(sql));
	}
}

async function applyTestMigrations(db: Database) {
	for (const filename of ["0001_initial.sql", "0002_known_repos.sql"]) {
		const migration = await Bun.file(
			new URL(`../../migrations/${filename}`, import.meta.url),
		).text();
		db.exec(migration);
	}
}

async function createWorkerEnv() {
	const db = new Database(":memory:");
	await applyTestMigrations(db);

	const key = await JoseKey.generate(["ES256"], "worker-test-key");
	if (!key.privateJwk) {
		throw new Error("test key must include a private JWK");
	}

	return {
		rawDb: db,
		env: {
			DB: new SqliteD1Database(db),
			CERULIA_APPVIEW_PUBLIC_BASE_URL: "https://app.cerulia.example.com",
			CERULIA_OAUTH_PRIVATE_JWK: JSON.stringify(key.privateJwk),
			CERULIA_OAUTH_CLIENT_NAME: "Cerulia Workers Test",
			CERULIA_APPVIEW_INTERNAL_AUTH_SECRET: "shared-secret",
			CERULIA_DOH_ENDPOINT: "https://cloudflare-dns.com/dns-query",
		} satisfies Parameters<typeof createWorkerApp>[0],
	};
}

async function createAnonymousWorkerEnv() {
	const db = new Database(":memory:");
	await applyTestMigrations(db);

	return {
		rawDb: db,
		env: {
			DB: new SqliteD1Database(db),
		} satisfies Parameters<typeof createWorkerApp>[0],
	};
}

async function createInternalAuthHeaders(options: {
	url: string;
	method?: string;
	did?: string;
	scopes?: string[];
	sharedSecret?: string;
	timestamp?: string;
	body?: BodyInit | null;
}) {
	const method = options.method ?? "GET";
	const did = options.did ?? "did:plc:alice";
	const scopes = options.scopes ?? [AUTH_SCOPES.reader, AUTH_SCOPES.writer];
	const timestamp = options.timestamp ?? `${Date.now()}`;
	const body = options.body ?? null;
	const url = new URL(options.url);
	const bodyDigest = Buffer.from(
		await crypto.subtle.digest(
			"SHA-256",
			body === null
				? new Uint8Array()
				: new Uint8Array(await new Response(body).arrayBuffer()),
		),
	).toString("base64url");
	const payload = [
		method.toUpperCase(),
		`${url.pathname}${url.search}`,
		did,
		scopes.join(","),
		timestamp,
		bodyDigest,
	].join("\n");
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(options.sharedSecret ?? "shared-secret"),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload),
	);

	return {
		"x-cerulia-did": did,
		"x-cerulia-scopes": scopes.join(","),
		"x-cerulia-auth-timestamp": timestamp,
		"x-cerulia-auth-signature": Buffer.from(signature).toString("base64url"),
	};
}

describe("createWorkerApp", () => {
	let workerEnv: Awaited<ReturnType<typeof createWorkerEnv>>;

	beforeEach(async () => {
		workerEnv = await createWorkerEnv();
	});

	test("does not expose browser-facing OAuth metadata routes", async () => {
		const app = await createWorkerApp(workerEnv.env);

		const metadataResponse = await app.request("/client-metadata.json");
		expect(metadataResponse.status).toBe(404);

		const jwksResponse = await app.request("/jwks.json");
		expect(jwksResponse.status).toBe(404);
	});

	test("rejects path-prefixed public base URLs", async () => {
		const pathWorkerEnv = await createWorkerEnv();
		pathWorkerEnv.env.CERULIA_APPVIEW_PUBLIC_BASE_URL =
			"https://cerulia.example.com/api";

		await expect(createWorkerApp(pathWorkerEnv.env)).rejects.toThrow(
			"CERULIA_APPVIEW_PUBLIC_BASE_URL must not include a path",
		);
	});

	test("rejects credential-bearing public base URLs", async () => {
		const credentialWorkerEnv = await createWorkerEnv();
		credentialWorkerEnv.env.CERULIA_APPVIEW_PUBLIC_BASE_URL =
			"https://user:secret@cerulia.example.com";

		await expect(createWorkerApp(credentialWorkerEnv.env)).rejects.toThrow(
			"CERULIA_APPVIEW_PUBLIC_BASE_URL must not include credentials",
		);
	});

	test("rejects partial AppView OAuth configuration", async () => {
		const partialWorkerEnv = await createWorkerEnv();
		const envWithoutInternalSecret = {
			...partialWorkerEnv.env,
			CERULIA_APPVIEW_INTERNAL_AUTH_SECRET: undefined,
		} as Parameters<typeof createWorkerApp>[0];

		await expect(createWorkerApp(envWithoutInternalSecret)).rejects.toThrow(
			"CERULIA_APPVIEW_PUBLIC_BASE_URL, CERULIA_OAUTH_PRIVATE_JWK, and CERULIA_APPVIEW_INTERNAL_AUTH_SECRET must be configured together",
		);
	});

	test("accepts signed internal auth on writer routes", async () => {
		const app = await createWorkerApp(workerEnv.env);
		const body = JSON.stringify({});
		const response = await app.request(
			"/xrpc/app.cerulia.rule.createSheetSchema",
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					...(await createInternalAuthHeaders({
						url: "https://api.cerulia.example.com/xrpc/app.cerulia.rule.createSheetSchema",
						method: "POST",
						body,
					})),
				},
				body,
			},
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: "InvalidRequest",
		});
	});

	test("mirrors oauth sessions through the internal route", async () => {
		const app = await createWorkerApp(workerEnv.env);
		const body = JSON.stringify({
			did: "did:plc:alice",
			session: {
				refreshJwt: "refresh-token",
				dpopJwk: { kty: "EC" },
			},
		});
		const response = await app.request("/internal/oauth/session", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				...(await createInternalAuthHeaders({
					url: "https://api.cerulia.example.com/internal/oauth/session",
					method: "POST",
					scopes: [AUTH_SCOPES.reader],
					body,
				})),
			},
			body,
		});

		expect(response.status).toBe(200);
		const row = workerEnv.rawDb
			.query(`SELECT subject FROM oauth_sessions WHERE subject = ?`)
			.get("did:plc:alice");
		expect(row).toBeTruthy();
	});

	test("fails closed without OAuth or explicit header shim", async () => {
		const anonymousWorkerEnv = await createAnonymousWorkerEnv();
		const app = await createWorkerApp(anonymousWorkerEnv.env);

		const response = await app.request(
			"/xrpc/app.cerulia.rule.createSheetSchema",
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-cerulia-did": "did:plc:spoofed",
					"x-cerulia-scopes": "app.cerulia.authCoreWriter",
				},
				body: JSON.stringify({
					baseRulesetNsid: "app.cerulia.rules.coc7",
					schemaVersion: "1.0.0",
					title: "Blocked",
					fieldDefs: [],
				}),
			},
		);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			error: "Unauthorized",
			message: "Writer authentication is required",
		});
	});
});
