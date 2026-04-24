import { toCurrentCeruliaNsid } from "@cerulia/protocol";
import { AUTH_SCOPES } from "./constants.js";
import { ApiError } from "./errors.js";

const DID_HEADER = "x-cerulia-did";
const SCOPE_HEADER = "x-cerulia-scopes";

export interface AuthContext {
	callerDid?: string;
	scopes: Set<string>;
}

export interface BrowserSessionGrant {
	did: string;
	grantedScope: string;
}

export interface BrowserSessionLookup {
	getBrowserSession(sessionId: string): Promise<BrowserSessionGrant | null>;
}

export interface SessionAuthResolverOptions {
	allowHeaderShim?: boolean;
	cookieName?: string;
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
	const rawScopes = request.headers.get(SCOPE_HEADER);
	const scopes = new Set(
		rawScopes
			?.split(",")
			.map((scope) => toCurrentCeruliaNsid(scope.trim()))
			.filter((scope) => scope.length > 0) ?? [],
	);

	return {
		callerDid,
		scopes,
	};
}

export function readCookie(request: Request, name: string): string | undefined {
	const rawCookie = request.headers.get("cookie");
	if (!rawCookie) {
		return undefined;
	}

	for (const fragment of rawCookie.split(";")) {
		const trimmed = fragment.trim();
		if (!trimmed.startsWith(`${name}=`)) {
			continue;
		}

		const value = trimmed.slice(name.length + 1);
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	}

	return undefined;
}

function grantedScopeToAuthScopes(grantedScope: string): Set<string> {
	const granted = new Set(
		grantedScope
			.split(/\s+/)
			.map((scope) => scope.trim())
			.filter((scope) => scope.length > 0),
	);
	const scopes = new Set<string>();

	if (granted.has("atproto")) {
		scopes.add(AUTH_SCOPES.reader);
	}

	if (granted.has("transition:generic")) {
		scopes.add(AUTH_SCOPES.reader);
		scopes.add(AUTH_SCOPES.writer);
	}

	return scopes;
}

export function createSessionAuthResolver(
	lookup: BrowserSessionLookup,
	options: SessionAuthResolverOptions = {},
): AuthResolver {
	const allowHeaderShim = options.allowHeaderShim ?? false;
	const cookieName = options.cookieName ?? "cerulia_session";

	return async (request) => {
		const sessionId = readCookie(request, cookieName);
		if (sessionId) {
			const binding = await lookup.getBrowserSession(sessionId);
			if (binding) {
				return {
					callerDid: binding.did,
					scopes: grantedScopeToAuthScopes(binding.grantedScope),
				};
			}
		}

		return allowHeaderShim
			? resolveHeaderAuthContext(request)
			: createAnonymousAuthContext();
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
