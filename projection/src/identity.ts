import {
	DidPlcResolver,
	DidResolver,
	DidWebResolver,
	PoorlyFormattedDidError,
	UnsupportedDidWebPathError,
} from "@atproto/identity";

type FetchLike = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<Response>;

const DID_DOC_ACCEPT_HEADER = "application/did+ld+json,application/json";
const DID_WEB_DOC_PATH = "/.well-known/did.json";
const DEFAULT_PLC_URL = "https://plc.directory";

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