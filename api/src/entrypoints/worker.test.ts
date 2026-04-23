import { Database, type Statement } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { JoseKey } from "@atproto/jwk-jose";
import { SESSION_COOKIE_NAME } from "../constants.js";
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
			CERULIA_PUBLIC_BASE_URL: "https://cerulia.example.com",
			CERULIA_OAUTH_PRIVATE_JWK: JSON.stringify(key.privateJwk),
			CERULIA_OAUTH_CLIENT_NAME: "Cerulia Workers Test",
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

describe("createWorkerApp", () => {
	let workerEnv: Awaited<ReturnType<typeof createWorkerEnv>>;

	beforeEach(async () => {
		workerEnv = await createWorkerEnv();
	});

	test("exposes OAuth metadata routes when workers OAuth is configured", async () => {
		const app = await createWorkerApp(workerEnv.env);

		const metadataResponse = await app.request("/client-metadata.json");
		expect(metadataResponse.status).toBe(200);
		expect(await metadataResponse.json()).toMatchObject({
			client_id: "https://cerulia.example.com/client-metadata.json",
			jwks_uri: "https://cerulia.example.com/jwks.json",
		});

		const jwksResponse = await app.request("/jwks.json");
		expect(jwksResponse.status).toBe(200);
		expect(await jwksResponse.json()).toMatchObject({
			keys: expect.any(Array),
		});
	});

	test("rejects path-prefixed public base URLs", async () => {
		const pathWorkerEnv = await createWorkerEnv();
		pathWorkerEnv.env.CERULIA_PUBLIC_BASE_URL =
			"https://cerulia.example.com/api";

		await expect(createWorkerApp(pathWorkerEnv.env)).rejects.toThrow(
			"CERULIA_PUBLIC_BASE_URL must not include a path",
		);
	});

	test("rejects credential-bearing public base URLs", async () => {
		const credentialWorkerEnv = await createWorkerEnv();
		credentialWorkerEnv.env.CERULIA_PUBLIC_BASE_URL =
			"https://user:secret@cerulia.example.com";

		await expect(createWorkerApp(credentialWorkerEnv.env)).rejects.toThrow(
			"CERULIA_PUBLIC_BASE_URL must not include credentials",
		);
	});

	test("reads browser session auth from D1-backed worker stores", async () => {
		workerEnv.rawDb
			.query(
				`INSERT INTO browser_sessions (session_id, did, granted_scope, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
			)
			.run(
				"worker-browser-session",
				"did:plc:alice",
				"atproto transition:generic",
				"2026-04-21T00:00:00.000Z",
				"2026-04-21T00:00:00.000Z",
			);

		const app = await createWorkerApp(workerEnv.env);
		const response = await app.request("/oauth/session", {
			headers: {
				cookie: `${SESSION_COOKIE_NAME}=worker-browser-session`,
			},
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			did: "did:plc:alice",
			scopes: [
				"app.cerulia.dev.authCoreReader",
				"app.cerulia.dev.authCoreWriter",
			],
		});
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