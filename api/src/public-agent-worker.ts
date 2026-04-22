import {
	isPubliclyRoutableIpLiteral,
	parseIpLiteral,
	sameIpLiteral,
	selectPinnedPublicAddress,
} from "@cerulia/protocol";

type FetchLike = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<Response>;

interface DnsJsonAnswer {
	type?: number;
	data?: string;
}

interface DnsJsonResponse {
	Status?: number;
	Answer?: DnsJsonAnswer[];
}

interface WorkerSocketInfo {
	remoteAddress: string | null;
}

interface WorkerSocket {
	readable: ReadableStream<Uint8Array<ArrayBufferLike>>;
	writable: WritableStream<Uint8Array<ArrayBufferLike>>;
	opened: Promise<WorkerSocketInfo>;
	close(): Promise<void>;
}

type WorkerSocketConnect = (address: {
	hostname: string;
	port: number;
}, options?: {
	secureTransport?: "off" | "on" | "starttls";
	allowHalfOpen?: boolean;
}) => WorkerSocket;

const DEFAULT_DOH_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const headerDecoder = new TextDecoder();
const requestEncoder = new TextEncoder();

async function loadWorkerSocketConnect(): Promise<WorkerSocketConnect> {
	const module = await import("cloudflare:sockets");
	return module.connect as WorkerSocketConnect;
}

function stripBracketedHostname(hostname: string): string {
	return hostname.startsWith("[") && hostname.endsWith("]")
		? hostname.slice(1, -1)
		: hostname;
}

async function fetchDnsAnswers(
	fetchImpl: FetchLike,
	dohEndpoint: string,
	hostname: string,
	recordType: "A" | "AAAA",
): Promise<string[]> {
	const url = new URL(dohEndpoint);
	url.searchParams.set("name", hostname);
	url.searchParams.set("type", recordType);

	const response = await fetchImpl(url, {
		headers: {
			accept: "application/dns-json",
		},
		redirect: "error",
	});
	if (!response.ok) {
		throw new Error("DoH lookup failed");
	}

	const payload = (await response.json()) as DnsJsonResponse;
	const expectedType = recordType === "A" ? 1 : 28;
	return (payload.Answer ?? [])
		.filter(
			(answer): answer is { type: number; data: string } =>
				answer.type === expectedType && typeof answer.data === "string",
		)
		.map((answer) => answer.data);
}

async function resolveAllowedPublicAddresses(
	fetchImpl: FetchLike,
	hostname: string,
	dohEndpoint: string,
): Promise<string[]> {
	if (parseIpLiteral(hostname)) {
		if (!isPubliclyRoutableIpLiteral(hostname)) {
			throw new Error(
				"PDS endpoint host must resolve only to public IP addresses",
			);
		}

		return [hostname];
	}

	const [ipv4, ipv6] = await Promise.all([
		fetchDnsAnswers(fetchImpl, dohEndpoint, hostname, "A").catch(() => []),
		fetchDnsAnswers(fetchImpl, dohEndpoint, hostname, "AAAA").catch(() => []),
	]);
	const addresses = [...ipv4, ...ipv6];
	selectPinnedPublicAddress(addresses);
	return addresses;
}

function concatBytes(
	chunks: Uint8Array<ArrayBufferLike>[],
	totalLength: number,
): Uint8Array<ArrayBufferLike> {
	const combined = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}
	return combined;
}

async function readAllBytes(
	stream: ReadableStream<Uint8Array<ArrayBufferLike>>,
): Promise<Uint8Array<ArrayBufferLike>> {
	const reader = stream.getReader();
	const chunks: Uint8Array<ArrayBufferLike>[] = [];
	let totalLength = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			if (!value) {
				continue;
			}

			chunks.push(value);
			totalLength += value.length;
		}
	} finally {
		reader.releaseLock();
	}

	return concatBytes(chunks, totalLength);
}

function findCrlf(bytes: Uint8Array<ArrayBufferLike>, start: number): number {
	for (let index = start; index < bytes.length - 1; index += 1) {
		if (bytes[index] === 13 && bytes[index + 1] === 10) {
			return index;
		}
	}

	return -1;
}

function findHeaderBoundary(bytes: Uint8Array<ArrayBufferLike>): number {
	for (let index = 0; index < bytes.length - 3; index += 1) {
		if (
			bytes[index] === 13 &&
			bytes[index + 1] === 10 &&
			bytes[index + 2] === 13 &&
			bytes[index + 3] === 10
		) {
			return index;
		}
	}

	return -1;
}

function decodeChunkedBody(
	bytes: Uint8Array<ArrayBufferLike>,
): Uint8Array<ArrayBufferLike> {
	const chunks: Uint8Array<ArrayBufferLike>[] = [];
	let totalLength = 0;
	let offset = 0;

	while (offset < bytes.length) {
		const lineEnd = findCrlf(bytes, offset);
		if (lineEnd < 0) {
			throw new Error("Invalid chunked HTTP response");
		}

		const rawLength = headerDecoder.decode(bytes.slice(offset, lineEnd));
		const chunkLength = Number.parseInt(rawLength.split(";", 1)[0]?.trim() ?? "", 16);
		if (!Number.isFinite(chunkLength)) {
			throw new Error("Invalid chunked HTTP response");
		}

		offset = lineEnd + 2;
		if (chunkLength === 0) {
			return concatBytes(chunks, totalLength);
		}

		const chunkEnd = offset + chunkLength;
		if (chunkEnd + 2 > bytes.length) {
			throw new Error("Invalid chunked HTTP response");
		}

		chunks.push(bytes.slice(offset, chunkEnd));
		totalLength += chunkLength;
		offset = chunkEnd;
		if (bytes[offset] !== 13 || bytes[offset + 1] !== 10) {
			throw new Error("Invalid chunked HTTP response");
		}
		offset += 2;
	}

	throw new Error("Invalid chunked HTTP response");
}

function toHttpResponse(
	bytes: Uint8Array<ArrayBufferLike>,
	method: string,
): Response {
	const headerBoundary = findHeaderBoundary(bytes);
	if (headerBoundary < 0) {
		throw new Error("Invalid HTTP response");
	}

	const headerText = headerDecoder.decode(bytes.slice(0, headerBoundary));
	const [statusLine, ...headerLines] = headerText.split("\r\n");
	const statusMatch = /^HTTP\/\d\.\d\s+(\d{3})(?:\s+(.*))?$/.exec(statusLine ?? "");
	if (!statusMatch) {
		throw new Error("Invalid HTTP response");
	}

	const headers = new Headers();
	for (const headerLine of headerLines) {
		const separatorIndex = headerLine.indexOf(":");
		if (separatorIndex <= 0) {
			continue;
		}

		headers.append(
			headerLine.slice(0, separatorIndex).trim(),
			headerLine.slice(separatorIndex + 1).trim(),
		);
	}

	let bodyBytes: Uint8Array<ArrayBufferLike> = bytes.slice(headerBoundary + 4);
	if (method === "HEAD") {
		bodyBytes = new Uint8Array(0);
	} else if (
		headers.get("transfer-encoding")?.toLowerCase().includes("chunked")
	) {
		bodyBytes = decodeChunkedBody(bodyBytes);
	} else {
		const contentLength = headers.get("content-length");
		if (contentLength) {
			const parsedLength = Number.parseInt(contentLength, 10);
			if (Number.isFinite(parsedLength) && parsedLength >= 0) {
				bodyBytes = bodyBytes.slice(0, parsedLength);
			}
		}
	}

	return new Response(
		bodyBytes.length > 0 ? new Uint8Array(bodyBytes) : null,
		{
		status: Number.parseInt(statusMatch[1] ?? "500", 10),
		statusText: statusMatch[2] ?? "",
		headers,
		},
	);
}

function toHttpRequestBytes(request: Request): Uint8Array<ArrayBufferLike> {
	const url = new URL(request.url);
	const headers = new Headers(request.headers);
	headers.set("host", url.port.length > 0 ? `${url.hostname}:${url.port}` : url.hostname);
	headers.set("connection", "close");
	headers.set("accept-encoding", "identity");

	const path = `${url.pathname || "/"}${url.search}`;
	const lines = [`${request.method} ${path} HTTP/1.1`];
	headers.forEach((value, key) => {
		lines.push(`${key}: ${value}`);
	});
	lines.push("", "");
	return requestEncoder.encode(lines.join("\r\n"));
}

export function createVerifiedWorkerFetch(
	fetchImpl: FetchLike,
	dohEndpoint?: string,
): (input: URL | RequestInfo, init?: RequestInit) => Promise<Response> {
	const resolverEndpoint = dohEndpoint ?? DEFAULT_DOH_ENDPOINT;

	return async (input, init) => {
		const request = new Request(input, init);
		if (request.method !== "GET" && request.method !== "HEAD") {
			throw new Error("Pinned public fetch supports GET and HEAD only");
		}

		const url = new URL(request.url);
		if (url.protocol !== "https:") {
			throw new Error("Pinned public fetch requires https");
		}

		const hostname = stripBracketedHostname(url.hostname);
		const allowedAddresses = await resolveAllowedPublicAddresses(
			fetchImpl,
			hostname,
			resolverEndpoint,
		);
		const connect = await loadWorkerSocketConnect();
		const socket = connect(
			{
				hostname,
				port: url.port.length > 0 ? Number.parseInt(url.port, 10) : 443,
			},
			{ secureTransport: "on" },
		);

		const abortRequest = () => socket.close().catch(() => undefined);
		if (request.signal?.aborted) {
			await abortRequest();
			throw new DOMException("The operation was aborted", "AbortError");
		}

		const onAbort = () => {
			void abortRequest();
		};
		request.signal?.addEventListener("abort", onAbort, { once: true });

		try {
			const socketInfo = await socket.opened;
			const remoteAddress = socketInfo.remoteAddress;
			if (
				!remoteAddress ||
				!allowedAddresses.some((address) => sameIpLiteral(address, remoteAddress))
			) {
				throw new Error("Pinned public fetch remote address mismatch");
			}

			const writer = socket.writable.getWriter();
			try {
				await writer.write(toHttpRequestBytes(request));
			} finally {
				await writer.close().catch(() => undefined);
				writer.releaseLock();
			}

			const bytes = await readAllBytes(socket.readable);
			return toHttpResponse(bytes, request.method);
		} finally {
			request.signal?.removeEventListener("abort", onAbort);
			await socket.close().catch(() => undefined);
		}
	};
}