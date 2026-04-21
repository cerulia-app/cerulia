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
import type * as AppCeruliaDefs from '../defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.session.update'

export type QueryParams = {}

export interface InputSchema {
  sessionRef: string
  scenarioRef?: string
  scenarioLabel?: string
  characterBranchRef?: string
  role?: 'pl' | 'gm' | (string & {})
  campaignRef?: string
  playedAt?: string
  hoLabel?: string
  hoSummary?: string
  outcomeSummary?: string
  externalArchiveUris?: string[]
  visibility?: 'draft' | 'public' | (string & {})
  note?: string
}

export type OutputSchema = AppCeruliaDefs.MutationAck

export interface CallOptions {
  signal?: AbortSignal
  headers?: HeadersMap
  qp?: QueryParams
  encoding?: 'application/json'
}

export interface Response {
  success: boolean
  headers: HeadersMap
  data: OutputSchema
}

export function toKnownErr(e: any) {
  return e
}
