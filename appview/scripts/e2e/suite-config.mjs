import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));

export const appviewDir = resolve(scriptDir, "..", "..");
export const workspaceRoot = resolve(appviewDir, "..");
export const apiDir = resolve(workspaceRoot, "api");
export const projectionDir = resolve(workspaceRoot, "projection");
export const localRuntimeDir = resolve(workspaceRoot, ".local", "appview-e2e");

const host = "127.0.0.1";
const projectionIngestToken = "projection-e2e-token";
const oauthPrivateJwk = JSON.stringify({
	kty: "EC",
	kid: "appview-e2e-test-key",
	crv: "P-256",
	x: "p8hew5e-EPvqHGMWpxgshHV0Dxhc1tO9vpa3NrXLlKY",
	y: "4tC1dl0QCLNp8QVPe6Uq3p6V7mVgLhvp8iiT9zs2tIo",
	d: "9UYVgU8AgHiEXC7h9VGJHcS-Z7gfXuvkfMiFxjsyG84",
});

function createUrl(port) {
	return `http://${host}:${port}`;
}

export const suiteDefinitions = {
	core: {
		name: "core",
		testPath: "e2e/core",
		appview: {
			url: createUrl(3000),
			port: 3000,
			host,
		},
		api: {
			url: createUrl(8787),
			port: 8787,
			host,
			dbPath: resolve(localRuntimeDir, "core-api.sqlite"),
			mode: "shim",
		},
	},
	discovery: {
		name: "discovery",
		testPath: "e2e/discovery",
		appview: {
			url: createUrl(3001),
			port: 3001,
			host,
		},
		api: {
			url: createUrl(8789),
			port: 8789,
			host,
			dbPath: resolve(localRuntimeDir, "discovery-api.sqlite"),
			mode: "shim",
		},
		projection: {
			url: createUrl(8788),
			port: 8788,
			host,
			dbPath: resolve(localRuntimeDir, "discovery-projection.sqlite"),
			internalIngestToken: projectionIngestToken,
		},
	},
	oauth: {
		name: "oauth",
		testPath: "e2e/oauth",
		appview: {
			url: createUrl(3002),
			port: 3002,
			host,
			publicBaseUrl: "https://cerulia.example.com",
			privateJwkJson: oauthPrivateJwk,
			clientName: "Cerulia AppView E2E",
			internalAuthSecret: "appview-internal-secret",
		},
		api: {
			url: createUrl(8797),
			port: 8797,
			host,
			dbPath: resolve(localRuntimeDir, "oauth-api.sqlite"),
			mode: "oauth",
		},
	},
};

export function getSuiteDefinition(name) {
	const suiteName = name ?? "core";
	const suite = suiteDefinitions[suiteName];
	if (!suite) {
		throw new Error(`Unknown E2E suite: ${suiteName}`);
	}

	return suite;
}

export function getSuiteNames() {
	return Object.keys(suiteDefinitions);
}

export function getRuntimeEnv(suite) {
	return {
		CERULIA_E2E_SUITE: suite.name,
		CERULIA_E2E_APPVIEW_BASE_URL: suite.appview.url,
		CERULIA_API_BASE_URL: suite.api.url,
		CERULIA_E2E_API_BASE_URL: suite.api.url,
		CERULIA_E2E_API_DB_PATH: suite.api.dbPath,
		CERULIA_E2E_APPVIEW_PUBLIC_BASE_URL:
			suite.appview.publicBaseUrl ?? suite.api.url,
		CERULIA_PROJECTION_BASE_URL: suite.projection?.url ?? "",
		CERULIA_E2E_PROJECTION_BASE_URL: suite.projection?.url ?? "",
		CERULIA_E2E_PROJECTION_INTERNAL_INGEST_TOKEN:
			suite.projection?.internalIngestToken ?? "",
	};
}
