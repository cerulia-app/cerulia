import { AtprotoDohHandleResolver } from "@atproto-labs/handle-resolver";
import { createIdentityResolver } from "@atproto-labs/identity-resolver";
import { getPdsEndpoint, isValidDidDoc } from "@atproto/common-web";
import { Agent } from "@atproto/api";
import {
	isPubliclyRoutableIpLiteral,
	parseIpLiteral,
	sameIpLiteral,
	selectPinnedPublicAddress,
} from "@cerulia/protocol";
import * as dnsPromises from "node:dns/promises";
import * as https from "node:https";
import { Readable } from "node:stream";
import {
	assertSafePublicServiceUrl,
	type PublicAgentProvider,
} from "./agents.js";
import type { KnownRepoCatalog } from "./store/known-repos.js";

type FetchLike = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<Response>;

function createTimeoutFetch(fetchImpl: FetchLike, timeoutMs: number): FetchLike {
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

function requestHeaders(headers: Headers): Record<string, string> {
	const values: Record<string, string> = {};
	headers.forEach((value, key) => {
		values[key] = value;
	});
	return values;
}

function responseHeaders(
	headers: NodeJS.Dict<string | string[]>,
): Headers {
	const values = new Headers();
	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				values.append(key, item);
			}
			continue;
		}

		values.append(key, value);
	}

	return values;
}

async function resolvePinnedAddress(hostname: string): Promise<string> {
	if (parseIpLiteral(hostname)) {
		if (!isPubliclyRoutableIpLiteral(hostname)) {
			throw new Error("PDS endpoint host must resolve only to public IP addresses");
		}

		return hostname;
	}

	const [ipv4, ipv6] = await Promise.all([
		dnsPromises.resolve4(hostname).catch(() => []),
		dnsPromises.resolve6(hostname).catch(() => []),
	]);
	return selectPinnedPublicAddress([
		...ipv4,
		...ipv6,
	]);
}

function createPinnedFetch(): FetchLike {
	return async (input, init) => {
		const request = new Request(input, init);
		if (request.method !== "GET" && request.method !== "HEAD") {
			throw new Error("Pinned public fetch supports GET and HEAD only");
		}

		const url = new URL(request.url);
		if (url.protocol !== "https:") {
			throw new Error("Pinned public fetch requires https");
		}

		const hostname = url.hostname.startsWith("[") && url.hostname.endsWith("]")
			? url.hostname.slice(1, -1)
			: url.hostname;
		const pinnedAddress = await resolvePinnedAddress(hostname);
		const family = pinnedAddress.includes(":") ? 6 : 4;

		return await new Promise<Response>((resolve, reject) => {
			const nodeRequest = https.request(
				{
					protocol: url.protocol,
					hostname,
					port: url.port.length > 0 ? Number.parseInt(url.port, 10) : 443,
					path: `${url.pathname}${url.search}`,
					method: request.method,
					headers: requestHeaders(request.headers),
					agent: false,
					lookup(_host, _options, callback) {
						callback(null, pinnedAddress, family);
					},
				},
				(nodeResponse) => {
					const body =
						request.method === "HEAD"
							? null
							: (Readable.toWeb(nodeResponse) as unknown as ReadableStream);
					resolve(
						new Response(body, {
							status: nodeResponse.statusCode ?? 500,
							statusText: nodeResponse.statusMessage,
							headers: responseHeaders(nodeResponse.headers),
						}),
					);
				},
			);

			nodeRequest.on("socket", (socket) => {
				socket.once("secureConnect", () => {
					const remoteAddress =
						(socket as { remoteAddress?: string }).remoteAddress ?? null;
					if (!remoteAddress || !sameIpLiteral(remoteAddress, pinnedAddress)) {
						nodeRequest.destroy(
							new Error("Pinned public fetch remote address mismatch"),
						);
					}
				});
			});
			nodeRequest.once("error", reject);

			if (request.signal) {
				const abortRequest = () => {
					nodeRequest.destroy(
						new DOMException("The operation was aborted", "AbortError"),
					);
				};

				if (request.signal.aborted) {
					abortRequest();
					return;
				}

				request.signal.addEventListener("abort", abortRequest, { once: true });
				nodeRequest.once("close", () => {
					request.signal?.removeEventListener("abort", abortRequest);
				});
			}

			nodeRequest.end();
		});
	};
}

export function createNodePublicAgentLookup(
	dohEndpoint?: string,
): PublicAgentProvider["getPublicAgent"] {
	const pinnedFetch = createTimeoutFetch(createPinnedFetch(), 1500) as typeof fetch;
	const identityResolver = createIdentityResolver({
		fetch: pinnedFetch,
		handleResolver: new AtprotoDohHandleResolver({
			dohEndpoint: dohEndpoint ?? "https://cloudflare-dns.com/dns-query",
			fetch: pinnedFetch,
		}),
	});

	return async (repoDid: string) => {
		const identity = await identityResolver.resolve(repoDid).catch(() => null);
		if (!identity || !isValidDidDoc(identity.didDoc)) {
			return null;
		}

		const pdsEndpoint = getPdsEndpoint(identity.didDoc);
		if (!pdsEndpoint) {
			return null;
		}

		const safePdsEndpoint = assertSafePublicServiceUrl(pdsEndpoint);
		return new Agent({
			service: safePdsEndpoint.toString(),
			fetch: pinnedFetch,
		});
	};
}

export function createPublicAgentProvider(options: {
	knownRepoCatalog: KnownRepoCatalog;
	dohEndpoint?: string;
}): PublicAgentProvider {
	return {
		listRepoDids() {
			return options.knownRepoCatalog.listRepoDids();
		},
		getPublicAgent: createNodePublicAgentLookup(options.dohEndpoint),
		rememberRepoDid(repoDid: string) {
			return options.knownRepoCatalog.rememberRepoDid(repoDid);
		},
	};
}