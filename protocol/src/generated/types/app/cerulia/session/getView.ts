/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as AppCeruliaCoreSession from '../core/session.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.session.getView'

export type QueryParams = {
  sessionRef: string
}
export type InputSchema = undefined

export interface OutputSchema {
  session?: AppCeruliaCoreSession.Main
  sessionSummary?: SessionSummary
}

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export function toKnownErr(e: any) {
  return e
}

/** Public-safe session summary. Excludes note and characterBranchRef. */
export interface SessionSummary {
  $type?: 'app.cerulia.session.getView#sessionSummary'
  sessionRef: string
  role: 'pl' | 'gm' | (string & {})
  playedAt: string
  scenarioLabel?: string
  hoLabel?: string
  hoSummary?: string
  outcomeSummary?: string
  visibility: 'draft' | 'public' | (string & {})
  externalArchiveUris?: string[]
}

const hashSessionSummary = 'sessionSummary'

export function isSessionSummary<V>(v: V) {
  return is$typed(v, id, hashSessionSummary)
}

export function validateSessionSummary<V>(v: V) {
  return validate<SessionSummary & V>(v, id, hashSessionSummary)
}
