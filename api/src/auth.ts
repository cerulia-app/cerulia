import { toCurrentCeruliaNsid } from "@cerulia/protocol";
import { AUTH_SCOPES } from "./constants.js";
import { ApiError } from "./errors.js";

const DID_HEADER = "x-cerulia-did";
const SCOPE_HEADER = "x-cerulia-scopes";
const INTERNAL_TIMESTAMP_HEADER = "x-cerulia-auth-timestamp";
const INTERNAL_SIGNATURE_HEADER = "x-cerulia-auth-signature";
export interface AuthContext {
	callerDid?: string;
	scopes: Set<string>;
}

export interface InternalServiceAuthOptions {
	sharedSecret: string;
	maxSkewMs?: number;
}

export type AuthResolver = (
	request: Request,
) => AuthContext | Promise<AuthContext>;

export function createAnonymousAuthContext(): AuthContext {
	return {
		scopes: new Set(),
	};
}

export function resolveHeaderAuthContext(request: Request): AuthContext {
	const callerDid = request.headers.get(DID_HEADER) ?? undefined;
	const scopes = new Set(readCanonicalScopes(request.headers.get(SCOPE_HEADER)));

	return {
		callerDid,
		scopes,
	};
}

function readCanonicalScopes(rawScopes: string | null | undefined): string[] {
	return (
		rawScopes
			?.split(",")
			.map((scope) => toCurrentCeruliaNsid(scope.trim()))
			.filter((scope) => scope.length > 0) ?? []
	);
}

function buildInternalAuthPayload(input: {
	method: string;
	pathWithQuery: string;
	did: string;
	scopes: string[];
	timestamp: string;
	bodySha256: string;
}) {
	return [
		input.method.toUpperCase(),
		input.pathWithQuery,
		input.did,
		input.scopes.join(","),
		input.timestamp,
		input.bodySha256,
	].join("\n");
}

async function digestBytes(bytes: ArrayBuffer | Uint8Array) {
	const normalized =
		bytes instanceof Uint8Array
			? (() => {
					const buffer = new ArrayBuffer(bytes.byteLength);
					new Uint8Array(buffer).set(bytes);
					return buffer;
				})()
			: bytes;
	const digest = await crypto.subtle.digest("SHA-256", normalized);
	return Buffer.from(digest).toString("base64url");
}

async function digestRequestBody(request: Request) {
	if (request.bodyUsed) {
		throw new Error("request body must not be consumed before auth resolution");
	}

	if (!request.body) {
		return digestBytes(new Uint8Array());
	}

	const cloned = request.clone();
	return digestBytes(await cloned.arrayBuffer());
}

async function signInternalAuthPayload(sharedSecret: string, payload: string) {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(sharedSecret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload),
	);
	return Buffer.from(signature).toString("base64url");
}

function constantTimeEquals(left: string, right: string) {
	if (left.length !== right.length) {
		return false;
	}

	let diff = 0;
	for (let index = 0; index < left.length; index += 1) {
		diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}

	return diff === 0;
}

export async function resolveInternalServiceAuthContext(
	request: Request,
	options: InternalServiceAuthOptions,
): Promise<AuthContext | null> {
	const callerDid = request.headers.get(DID_HEADER);
	const timestamp = request.headers.get(INTERNAL_TIMESTAMP_HEADER);
	const signature = request.headers.get(INTERNAL_SIGNATURE_HEADER);
	const scopes = readCanonicalScopes(request.headers.get(SCOPE_HEADER));
	if (!callerDid || !timestamp || !signature || scopes.length === 0) {
		return null;
	}

	const timestampMs = Number.parseInt(timestamp, 10);
	if (!Number.isFinite(timestampMs)) {
		return null;
	}

	const maxSkewMs = options.maxSkewMs ?? 60_000;
	if (Math.abs(Date.now() - timestampMs) > maxSkewMs) {
		return null;
	}

	const url = new URL(request.url);
	const bodySha256 = await digestRequestBody(request);
	const payload = buildInternalAuthPayload({
		method: request.method,
		pathWithQuery: `${url.pathname}${url.search}`,
		did: callerDid,
		scopes,
		timestamp,
		bodySha256,
	});
	const expectedSignature = await signInternalAuthPayload(
		options.sharedSecret,
		payload,
	);
	if (!constantTimeEquals(signature, expectedSignature)) {
		return null;
	}

	return {
		callerDid,
		scopes: new Set(scopes),
	};
}

export function hasScope(context: AuthContext, scope: string): boolean {
	return context.scopes.has(scope);
}

export function requireReaderDid(context: AuthContext): string {
	if (!context.callerDid) {
		throw new ApiError(
			"Unauthorized",
			"Reader authentication is required",
			401,
		);
	}

	if (!hasScope(context, AUTH_SCOPES.reader)) {
		throw new ApiError("Forbidden", "Reader scope is required", 403);
	}

	return context.callerDid;
}

export function requireWriterDid(context: AuthContext): string {
	if (!context.callerDid) {
		throw new ApiError(
			"Unauthorized",
			"Writer authentication is required",
			401,
		);
	}

	if (!hasScope(context, AUTH_SCOPES.writer)) {
		throw new ApiError("Forbidden", "Writer scope is required", 403);
	}

	return context.callerDid;
}

export function isOwnerReader(context: AuthContext, ownerDid: string): boolean {
	return (
		context.callerDid === ownerDid && hasScope(context, AUTH_SCOPES.reader)
	);
}
