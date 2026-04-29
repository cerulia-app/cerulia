import {
	DidPlcResolver,
	DidResolver,
	DidWebResolver,
	PoorlyFormattedDidError,
	UnsupportedDidWebPathError,
} from "@atproto/identity";
import type { HandleResolver } from "@atproto/oauth-client";

type FetchLike = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<Response>;

type ResolveHandleOptions = Parameters<HandleResolver["resolve"]>[1];
type ResolvedHandle = Awaited<ReturnType<HandleResolver["resolve"]>>;

const DEFAULT_DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DEFAULT_PLC_URL = "https://plc.directory";
const DID_DOC_ACCEPT_HEADER = "application/did+ld+json,application/json";
const DID_PREFIX = "did=";
const DID_WEB_DOC_PATH = "/.well-known/did.json";
const DOH_ACCEPT_HEADER = "application/dns-json";

function throwIfAborted(signal?: AbortSignal): void {
	if (!signal?.aborted) {
		return;
	}

	const { reason } = signal;
	if (reason instanceof Error) {
		throw reason;
	}

	throw new DOMException("The operation was aborted", "AbortError");
}

function isResolvedHandle(value: string): value is Exclude<ResolvedHandle, null> {
	return value.startsWith("did:");
}

async function withTimeout<T>(
	timeoutMs: number,
	run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const abortController = new AbortController();
	const timeout = setTimeout(() => abortController.abort(), timeoutMs);

	try {
		return await run(abortController.signal);
	} finally {
		clearTimeout(timeout);
		abortController.abort();
	}
}

function decodeTxtRecord(value: string): string {
	const quotedSegments = [...value.matchAll(/"((?:[^"\\]|\\.)*)"/g)];
	if (quotedSegments.length === 0) {
		return value;
	}

	return quotedSegments
		.map((segment) => segment[1]?.replace(/\\([\\"])/g, "$1") ?? "")
		.join("");
}

class FetchDidPlcResolver extends DidPlcResolver {
	constructor(
		plcUrl: string,
		timeout: number,
		private readonly fetchImpl: FetchLike,
	) {
		super(plcUrl, timeout);
	}

	override async resolveNoCheck(did: string): Promise<unknown> {
		return withTimeout(this.timeout, async (signal) => {
			const url = new URL(`/${encodeURIComponent(did)}`, this.plcUrl);
			const response = await this.fetchImpl(url, {
				redirect: "error",
				headers: { accept: DID_DOC_ACCEPT_HEADER },
				signal,
			});

			if (response.status === 404) {
				return null;
			}

			if (!response.ok) {
				throw Object.assign(new Error(response.statusText), {
					status: response.status,
				});
			}

			return response.json();
		});
	}
}

class FetchDidWebResolver extends DidWebResolver {
	constructor(
		timeout: number,
		private readonly fetchImpl: FetchLike,
	) {
		super(timeout);
	}

	override async resolveNoCheck(did: string): Promise<unknown> {
		const parsedId = did.split(":").slice(2).join(":");
		const parts = parsedId.split(":").map(decodeURIComponent);

		let path: string;
		if (parts.length < 1) {
			throw new PoorlyFormattedDidError(did);
		}
		if (parts.length === 1) {
			path = parts[0] + DID_WEB_DOC_PATH;
		} else {
			throw new UnsupportedDidWebPathError(did);
		}

		const url = new URL(`https://${path}`);
		if (url.hostname === "localhost") {
			url.protocol = "http";
		}

		return withTimeout(this.timeout, async (signal) => {
			const response = await this.fetchImpl(url, {
				redirect: "error",
				headers: { accept: DID_DOC_ACCEPT_HEADER },
				signal,
			});

			if (!response.ok) {
				return null;
			}

			return response.json();
		});
	}
}

async function resolveHandleViaWellKnown(
	fetchImpl: FetchLike,
	handle: string,
	options?: ResolveHandleOptions,
): Promise<ResolvedHandle> {
	const url = new URL("/.well-known/atproto-did", `https://${handle}`);

	try {
		const response = await fetchImpl(url, {
			cache: options?.noCache ? "no-cache" : undefined,
			redirect: "error",
			signal: options?.signal,
		});
		if (!response.ok) {
			return null;
		}

		const did = response
			? (await response.text()).split("\n")[0]?.trim() ?? null
			: null;
		return did && isResolvedHandle(did) ? did : null;
	} catch {
		throwIfAborted(options?.signal);
		return null;
	}
}

async function resolveHandleViaDoh(
	fetchImpl: FetchLike,
	handle: string,
	dohEndpoint: string,
	options?: ResolveHandleOptions,
): Promise<ResolvedHandle> {
	const url = new URL(dohEndpoint);
	url.searchParams.set("name", `_atproto.${handle}`);
	url.searchParams.set("type", "TXT");

	try {
		const response = await fetchImpl(url, {
			cache: options?.noCache ? "no-cache" : undefined,
			redirect: "error",
			headers: { accept: DOH_ACCEPT_HEADER },
			signal: options?.signal,
		});
		if (!response.ok) {
			return null;
		}

		const payload = (await response.json()) as {
			Answer?: Array<{ data?: string }>;
			Status?: number;
		};
		if (
			typeof payload.Status === "number" &&
			payload.Status !== 0 &&
			payload.Status !== 3
		) {
			return null;
		}

		const resolvedDids =
			payload.Answer?.flatMap((answer) => {
				if (typeof answer.data !== "string") {
					return [];
				}

				const decoded = decodeTxtRecord(answer.data);
				return decoded.startsWith(DID_PREFIX)
					? [decoded.slice(DID_PREFIX.length)]
					: [];
			}) ?? [];

		if (resolvedDids.length !== 1) {
			return null;
		}

		const did = resolvedDids[0];
		return did && isResolvedHandle(did) ? did : null;
	} catch {
		throwIfAborted(options?.signal);
		return null;
	}
}

export function createDidResolverWithFetch(options: {
	fetch: FetchLike;
	timeoutMs: number;
	plcUrl?: string;
}): DidResolver {
	const plcUrl = options.plcUrl ?? DEFAULT_PLC_URL;
	const didResolver = new DidResolver({
		plcUrl,
		timeout: options.timeoutMs,
	});

	didResolver.methods.clear();
	didResolver.methods.set(
		"plc",
		new FetchDidPlcResolver(plcUrl, options.timeoutMs, options.fetch),
	);
	didResolver.methods.set(
		"web",
		new FetchDidWebResolver(options.timeoutMs, options.fetch),
	);

	return didResolver;
}

export class DohHandleResolver implements HandleResolver {
	private readonly dohEndpoint: string;

	constructor(
		private readonly options: {
			dohEndpoint?: string;
			fetch: FetchLike;
		},
	) {
		this.dohEndpoint = options.dohEndpoint ?? DEFAULT_DOH_ENDPOINT;
	}

	async resolve(
		handle: string,
		options?: ResolveHandleOptions,
	): Promise<ResolvedHandle> {
		throwIfAborted(options?.signal);

		const httpAbortController = new AbortController();
		const abortHttp = () => httpAbortController.abort();
		options?.signal?.addEventListener("abort", abortHttp, { once: true });

		try {
			const dnsPromise = resolveHandleViaDoh(
				this.options.fetch,
				handle,
				this.dohEndpoint,
				options,
			);
			const httpPromise = resolveHandleViaWellKnown(
				this.options.fetch,
				handle,
				{
					...options,
					signal: httpAbortController.signal,
				},
			).catch(() => null);

			const dnsResolvedDid = await dnsPromise;
			if (dnsResolvedDid) {
				httpAbortController.abort();
				return dnsResolvedDid;
			}

			throwIfAborted(options?.signal);
			return await httpPromise;
		} finally {
			options?.signal?.removeEventListener("abort", abortHttp);
			httpAbortController.abort();
		}
	}
}