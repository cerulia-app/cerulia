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

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.session.list'

export type QueryParams = {
  limit?: number
  cursor?: string
}
export type InputSchema = undefined

export interface OutputSchema {
  items: SessionListItem[]
  cursor?: string
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

export interface SessionListItem {
  $type?: 'app.cerulia.session.list#sessionListItem'
  sessionRef: string
  role: 'pl' | 'gm' | (string & {})
  playedAt: string
  scenarioLabel?: string
  characterBranchRef?: string
  visibility: 'draft' | 'public' | (string & {})
}

const hashSessionListItem = 'sessionListItem'

export function isSessionListItem<V>(v: V) {
  return is$typed(v, id, hashSessionListItem)
}

export function validateSessionListItem<V>(v: V) {
  return validate<SessionListItem & V>(v, id, hashSessionListItem)
}
