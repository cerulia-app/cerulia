/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from '@atproto/xrpc'
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../../util'
import type * as AppCeruliaDevDefs from '../defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'app.cerulia.dev.campaign.update'

export type QueryParams = {}

export interface InputSchema {
  campaignRef: string
  title?: string
  houseRef?: string
  rulesetNsid?: string
  sharedRuleProfileRefs?: string[]
  visibility?: 'draft' | 'public' | (string & {})
  archivedAt?: string
}

export type OutputSchema = AppCeruliaDevDefs.MutationAck

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
