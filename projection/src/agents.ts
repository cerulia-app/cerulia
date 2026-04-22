import { AtprotoDohHandleResolver } from "@atproto-labs/handle-resolver";
import { createIdentityResolver } from "@atproto-labs/identity-resolver";
import { getPdsEndpoint, isValidDidDoc } from "@atproto/common-web";
import { Agent } from "@atproto/api";
import { isPubliclyRoutableIpLiteral, parseIpLiteral } from "@cerulia/protocol";
import type { KnownRepoCatalog } from "./store/known-repos.js";

type FetchLike = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<Response>;

export function assertSafePublicServiceUrl(rawUrl: string): URL {
	const url = new URL(rawUrl);
	const hostname = url.hostname.toLowerCase();
	if (url.protocol !== "https:") {
		throw new Error("PDS endpoint must use https");
	}

	if (
		hostname === "localhost" ||
		hostname.endsWith(".internal") ||
		hostname.endsWith(".local") ||
		(!hostname.includes(".") && !hostname.includes(":"))
	) {
		throw new Error("PDS endpoint must not target a private or loopback host");
	}

	if (parseIpLiteral(hostname) && !isPubliclyRoutableIpLiteral(hostname)) {
		throw new Error("PDS endpoint must not target a private or loopback host");
	}

	return url;
}

function createTimeoutFetch(
	fetchImpl: FetchLike,
	timeoutMs: number,
): FetchLike {
	return async (input, init) => {
		const abortController = new AbortController();
		const timeout = setTimeout(() => abortController.abort(), timeoutMs);
		try {
			return await fetchImpl(input, {
				...init,
				redirect: init?.redirect ?? "error",
				signal: abortController.signal,
			});
		} finally {
			clearTimeout(timeout);
		}
	};
}

export interface PublicRepoListResponse {
	data: {
		records: Array<{
			uri: string;
			value: unknown;
		}>;
		cursor?: string;
	};
}

export interface PublicRepoGetRecordResponse {
	data: {
		uri: string;
		value: unknown;
	};
}

export interface PublicRepoAgent {
	com: {
		atproto: {
			repo: {
				getRecord(input: {
					repo: string;
					collection: string;
					rkey: string;
				}): Promise<PublicRepoGetRecordResponse>;
				listRecords(input: {
					repo: string;
					collection: string;
					limit: number;
					cursor?: string;
				}): Promise<PublicRepoListResponse>;
			};
		};
	};
}

export interface PublicAgentProvider {
	listRepoDids(): Promise<string[]>;
	getPublicAgent(repoDid: string): Promise<PublicRepoAgent | null>;
	rememberRepoDid(repoDid: string): Promise<void>;
}

function createPublicAgentLookup(
	fetchImpl: FetchLike,
	resolveDidDoc:
		| ((repoDid: string) => Promise<unknown | null>)
		| undefined,
	dohEndpoint?: string,
): PublicAgentProvider["getPublicAgent"] {
	const timedFetch = createTimeoutFetch(
		fetchImpl,
		1500,
	) as typeof globalThis.fetch;
	const identityResolver = createIdentityResolver({
		fetch: timedFetch,
		handleResolver: new AtprotoDohHandleResolver({
			dohEndpoint: dohEndpoint ?? "https://cloudflare-dns.com/dns-query",
			fetch: timedFetch,
		}),
	});

	return async (repoDid: string) => {
		const didDoc =
			(await resolveDidDoc?.(repoDid)) ??
			(await identityResolver.resolve(repoDid).catch(() => null))?.didDoc ??
			null;
		if (!didDoc || !isValidDidDoc(didDoc)) {
			return null;
		}

		const pdsEndpoint = getPdsEndpoint(didDoc);
		if (!pdsEndpoint) {
			return null;
		}

		const safePdsEndpoint = assertSafePublicServiceUrl(pdsEndpoint);

		return new Agent({
			service: safePdsEndpoint.toString(),
			fetch: timedFetch,
		});
	};
}

export function createPublicAgentProvider(options: {
	knownRepoCatalog: KnownRepoCatalog;
	dohEndpoint?: string;
	resolveDidDoc?: (repoDid: string) => Promise<unknown | null>;
}): PublicAgentProvider {
	const fetchImpl = globalThis.fetch.bind(globalThis) as FetchLike;
	return {
		listRepoDids() {
			return options.knownRepoCatalog.listRepoDids();
		},
		getPublicAgent: createPublicAgentLookup(
			fetchImpl,
			options.resolveDidDoc,
			options.dohEndpoint,
		),
		rememberRepoDid(repoDid: string) {
			return options.knownRepoCatalog.rememberRepoDid(repoDid);
		},
	};
}