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
const id = 'app.cerulia.rule.listProfiles'

export type QueryParams = {
  scopeRef?: string
  baseRulesetNsid?: string
  limit?: number
  cursor?: string
}
export type InputSchema = undefined

export interface OutputSchema {
  items: RuleProfileListItem[]
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

export interface RuleProfileListItem {
  $type?: 'app.cerulia.rule.listProfiles#ruleProfileListItem'
  ruleProfileRef: string
  baseRulesetNsid: string
  profileTitle: string
  scopeKind: 'house-shared' | 'campaign-shared' | (string & {})
  scopeRef: string
}

const hashRuleProfileListItem = 'ruleProfileListItem'

export function isRuleProfileListItem<V>(v: V) {
  return is$typed(v, id, hashRuleProfileListItem)
}

export function validateRuleProfileListItem<V>(v: V) {
  return validate<RuleProfileListItem & V>(v, id, hashRuleProfileListItem)
}
