import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
	appviewDir,
	apiDir,
	getRuntimeEnv,
	getSuiteDefinition,
	getSuiteNames,
	localRuntimeDir,
	projectionDir,
} from "./suite-config.mjs";

const suiteArg = process.argv[2] ?? "core";
const extraArgs = process.argv.slice(3);

if (suiteArg === "all") {
	for (const suiteName of getSuiteNames()) {
		await runSuite(getSuiteDefinition(suiteName), extraArgs);
	}
	process.exit(0);
}

await runSuite(getSuiteDefinition(suiteArg), extraArgs);

async function runSuite(suite, extraPlaywrightArgs) {
	await mkdir(localRuntimeDir, { recursive: true });
	await cleanupSqliteFiles(suite.api.dbPath);
	if (suite.projection) {
		await cleanupSqliteFiles(suite.projection.dbPath);
	}

	const processes = [];
	try {
		const sharedEnv = {
			...process.env,
			...getRuntimeEnv(suite),
		};

		if (suite.projection) {
			await runShortLivedProcess(
				"projection migrate",
				[process.execPath, "run", "migrate"],
				projectionDir,
				{
					...sharedEnv,
					CERULIA_PROJECTION_DB: suite.projection.dbPath,
				},
			);

			const projectionEnv = {
				...sharedEnv,
				HOST: suite.projection.host,
				PORT: `${suite.projection.port}`,
				CERULIA_PROJECTION_DB: suite.projection.dbPath,
				CERULIA_CANONICAL_DB: suite.api.dbPath,
				CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN:
					suite.projection.internalIngestToken,
			};
			const projectionProcess = startLongRunningProcess(
				"projection",
				[process.execPath, "run", "src/entrypoints/bun-e2e.ts"],
				projectionDir,
				projectionEnv,
			);
			processes.push(projectionProcess);
			await waitForUrl(`${suite.projection.url}/_health`);
		}

		await runShortLivedProcess(
			"api migrate",
			[process.execPath, "run", "migrate"],
			apiDir,
			{
				...sharedEnv,
				CERULIA_API_DB: suite.api.dbPath,
			},
		);

		const apiEnv = {
			...sharedEnv,
			HOST: suite.api.host,
			PORT: `${suite.api.port}`,
			CERULIA_API_DB: suite.api.dbPath,
		};
		if (suite.api.mode === "shim") {
			apiEnv.CERULIA_ENABLE_HEADER_AUTH_SHIM = "1";
		}
		if (suite.api.mode === "oauth") {
			apiEnv.CERULIA_APPVIEW_PUBLIC_BASE_URL = suite.appview.publicBaseUrl;
			apiEnv.CERULIA_OAUTH_PRIVATE_JWK = suite.appview.privateJwkJson;
			apiEnv.CERULIA_OAUTH_CLIENT_NAME = suite.appview.clientName;
			apiEnv.CERULIA_APPVIEW_INTERNAL_AUTH_SECRET =
				suite.appview.internalAuthSecret;
		}
		if (suite.projection) {
			apiEnv.CERULIA_PROJECTION_INTERNAL_BASE_URL = suite.projection.url;
			apiEnv.CERULIA_PROJECTION_INTERNAL_INGEST_TOKEN =
				suite.projection.internalIngestToken;
		}

		const apiEntryPoint =
			suite.api.mode === "oauth"
				? "src/entrypoints/bun.ts"
				: "src/entrypoints/bun-e2e.ts";

		const apiProcess = startLongRunningProcess(
			"api",
			[process.execPath, "run", apiEntryPoint],
			apiDir,
			apiEnv,
		);
		processes.push(apiProcess);
		await waitForUrl(`${suite.api.url}/_health`);

		await runShortLivedProcess(
			"appview build",
			[process.execPath, "run", "build"],
			appviewDir,
			{
				...sharedEnv,
				APP_ENV: "test",
				HOST: suite.appview.host,
				PORT: `${suite.appview.port}`,
				ORIGIN: suite.appview.url,
			},
		);

		const appviewProcess = startLongRunningProcess(
			"appview",
			[process.execPath, "run", "start"],
			appviewDir,
			{
				...sharedEnv,
				APP_ENV: "test",
				HOST: suite.appview.host,
				PORT: `${suite.appview.port}`,
				ORIGIN: suite.appview.url,
				CERULIA_APPVIEW_PUBLIC_BASE_URL:
					suite.appview.publicBaseUrl ?? "",
				CERULIA_OAUTH_PRIVATE_JWK:
					suite.appview.privateJwkJson ?? "",
				CERULIA_APPVIEW_INTERNAL_AUTH_SECRET:
					suite.appview.internalAuthSecret ?? "",
				CERULIA_APPVIEW_AUTH_DB: resolve(
					localRuntimeDir,
					`${suite.name}-appview-auth.sqlite`,
				),
			},
		);
		processes.push(appviewProcess);
		await waitForUrl(suite.appview.url);

		await runShortLivedProcess(
			`playwright ${suite.name}`,
			[
				process.execPath,
				"x",
				"playwright",
				"test",
				"-c",
				"playwright.config.ts",
				suite.testPath,
				...extraPlaywrightArgs,
			],
			appviewDir,
			sharedEnv,
		);
	} finally {
		await Promise.allSettled(processes.reverse().map(stopProcess));
	}
}

function startLongRunningProcess(label, command, cwd, env) {
	const subprocess = Bun.spawn(command, {
		cwd,
		env,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "ignore",
	});

	void subprocess.exited.then((exitCode) => {
		if (exitCode !== 0) {
			console.error(`${label} exited with code ${exitCode}`);
		}
	});

	return subprocess;
}

async function runShortLivedProcess(label, command, cwd, env) {
	const subprocess = Bun.spawn(command, {
		cwd,
		env,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "ignore",
	});
	const exitCode = await subprocess.exited;
	if (exitCode !== 0) {
		throw new Error(`${label} failed with exit code ${exitCode}`);
	}
	return subprocess;
}

async function stopProcess(subprocess) {
	try {
		subprocess.kill();
	} catch {
		return;
	}

	await Promise.race([
		subprocess.exited,
		delay(5_000).then(() => {
			try {
				subprocess.kill("SIGKILL");
			} catch {
				// process already exited
			}
		}),
	]);
}

async function waitForUrl(url) {
	const timeoutAt = Date.now() + 120_000;
	while (Date.now() < timeoutAt) {
		try {
			const response = await fetch(url, { redirect: "manual" });
			if (response.status < 500) {
				return;
			}
		} catch {
			// wait for process startup
		}

		await delay(500);
	}

	throw new Error(`Timed out waiting for ${url}`);
}

async function cleanupSqliteFiles(dbPath) {
	const parentDir = dirname(dbPath);
	await mkdir(parentDir, { recursive: true });
	for (const suffix of ["", "-shm", "-wal"]) {
		await rm(`${dbPath}${suffix}`, { force: true });
	}
}