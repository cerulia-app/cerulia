import { AUTH_SCOPES } from './constants.js'
import { ApiError } from './errors.js'

const DID_HEADER = 'x-cerulia-did'
const SCOPE_HEADER = 'x-cerulia-scopes'

export interface AuthContext {
  callerDid?: string
  scopes: Set<string>
}

export type AuthResolver = (request: Request) => AuthContext

export function createAnonymousAuthContext(): AuthContext {
  return {
    scopes: new Set(),
  }
}

export function resolveHeaderAuthContext(request: Request): AuthContext {
  const callerDid = request.headers.get(DID_HEADER) ?? undefined
  const rawScopes = request.headers.get(SCOPE_HEADER)
  const scopes = new Set(
    rawScopes
      ?.split(',')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0) ?? [],
  )

  return {
    callerDid,
    scopes,
  }
}

export function hasScope(context: AuthContext, scope: string): boolean {
  return context.scopes.has(scope)
}

export function requireReaderDid(context: AuthContext): string {
  if (!context.callerDid) {
    throw new ApiError('Unauthorized', 'Reader authentication is required', 401)
  }

  if (!hasScope(context, AUTH_SCOPES.reader)) {
    throw new ApiError('Forbidden', 'Reader scope is required', 403)
  }

  return context.callerDid
}

export function requireWriterDid(context: AuthContext): string {
  if (!context.callerDid) {
    throw new ApiError('Unauthorized', 'Writer authentication is required', 401)
  }

  if (!hasScope(context, AUTH_SCOPES.writer)) {
    throw new ApiError('Forbidden', 'Writer scope is required', 403)
  }

  return context.callerDid
}

export function isOwnerReader(
  context: AuthContext,
  ownerDid: string,
): boolean {
  return context.callerDid === ownerDid && hasScope(context, AUTH_SCOPES.reader)
}