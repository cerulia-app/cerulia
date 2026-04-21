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
const id = 'app.cerulia.scenario.update'

export type QueryParams = {}

export interface InputSchema {
  scenarioRef: string
  title?: string
  rulesetNsid?: string
  recommendedSheetSchemaRef?: string
  sourceCitationUri?: string
  summary?: string
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
