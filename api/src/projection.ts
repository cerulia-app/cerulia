export interface ProjectionIngestFeature {
	noteRepoDid(repoDid: string): Promise<void>;
	replayKnownRepoDids(): Promise<void>;
}

export interface ProjectionKnownRepoCatalog {
	rememberRepoDid(repoDid: string): Promise<void>;
	listRepoDids(): Promise<string[]>;
}

type FetchLike = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<Response>;

function isPrivateIpv4(hostname: string): boolean {
	const match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
	if (!match) {
		return false;
	}

	const octets = match.slice(1).map((part) => Number.parseInt(part, 10));
	const [first, second] = octets;
	if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
		return false;
	}

	return (
		first === 10 ||
		first === 127 ||
		(first === 172 && second !== undefined && second >= 16 && second <= 31) ||
		(first === 192 && second === 168)
	);
}

function isTrustedInternalHostname(hostname: string): boolean {
	const normalized = hostname.toLowerCase();
	return (
		normalized === "localhost" ||
		normalized === "[::1]" ||
		normalized.endsWith(".internal") ||
		normalized.endsWith(".local") ||
		normalized.startsWith("[fd") ||
		normalized.startsWith("[fc") ||
		isPrivateIpv4(normalized)
	);
}

function isLoopbackHostname(hostname: string): boolean {
	const normalized = hostname.toLowerCase();
	return normalized === "localhost" || normalized === "[::1]" || normalized === "127.0.0.1";
}

function normalizeBaseUrl(value: string): URL {
	const url = new URL(value);
	if (url.username || url.password) {
		throw new Error(
			"CERULIA_PROJECTION_INTERNAL_BASE_URL must not include credentials",
		);
	}

	if (url.pathname !== "/" && url.pathname !== "") {
		throw new Error(
			"CERULIA_PROJECTION_INTERNAL_BASE_URL must not include a path",
		);
	}

	if (!isTrustedInternalHostname(url.hostname)) {
		throw new Error(
			"CERULIA_PROJECTION_INTERNAL_BASE_URL must target a trusted internal host",
		);
	}

	if (url.protocol !== "https:" && !isLoopbackHostname(url.hostname)) {
		throw new Error(
			"CERULIA_PROJECTION_INTERNAL_BASE_URL must use https outside loopback",
		);
	}

	url.pathname = url.pathname.replace(/\/+$/, "");
	url.search = "";
	url.hash = "";
	return url;
}

export function createProjectionIngestFeature(options: {
	baseUrl: string;
	token: string;
	knownRepoCatalog: ProjectionKnownRepoCatalog;
	fetchImpl?: FetchLike;
	timeoutMs?: number;
}): ProjectionIngestFeature {
	const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
	const baseUrl = normalizeBaseUrl(options.baseUrl);
	const ingestUrl = new URL("/internal/ingest/repo", baseUrl);
	const timeoutMs = options.timeoutMs ?? 1500;

	return {
		async noteRepoDid(repoDid: string) {
			await options.knownRepoCatalog.rememberRepoDid(repoDid);

			const abortController = new AbortController();
			const timeout = setTimeout(() => abortController.abort(), timeoutMs);

			let response: Response;
			try {
				response = await fetchImpl(ingestUrl, {
					method: "POST",
					headers: {
						"content-type": "application/json",
						authorization: `Bearer ${options.token}`,
					},
					body: JSON.stringify({ repoDid }),
					signal: abortController.signal,
				});
			} finally {
				clearTimeout(timeout);
			}

			if (!response.ok) {
				throw new Error(`projection ingest failed with ${response.status}`);
			}
		},

		async replayKnownRepoDids() {
			for (const repoDid of await options.knownRepoCatalog.listRepoDids()) {
				await this.noteRepoDid(repoDid);
			}
		},
	};
}